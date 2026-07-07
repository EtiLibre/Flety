-- Fase 1: modelo de datos inicial (sección 5 del doc), sin tabla payments ni
-- columnas payment-adjacent (paymentGatewayConfig, paymentId, montoRetenido,
-- montoLiberado) — el modelo de retención está pendiente de decisión (sección 10.1).

create extension if not exists pgcrypto;

create type public.user_role as enum (
  'superadmin',
  'empresa',
  'chofer',
  'cliente',
  'contabilidad'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuit text,
  estado_aprobacion text not null default 'pendiente'
    check (estado_aprobacion in ('pendiente', 'aprobada', 'rechazada')),
  comision_pct numeric(5, 2),
  created_at timestamptz not null default now()
);

-- Extiende auth.users (Supabase Auth) con los datos de perfil/rol de la app.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text,
  role public.user_role not null default 'cliente',
  company_id uuid references public.companies (id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  disponibilidad boolean not null default false,
  ubicacion_actual jsonb,
  vehiculo jsonb,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  driver_id uuid references public.drivers (id) on delete set null,
  tipo text not null check (tipo in ('flete', 'mudanza', 'larga_distancia')),
  origen jsonb,
  destino jsonb,
  -- Ciclo de vida completo de la sección 7.1. Los estados "pagado"/"liquidado"/
  -- "reembolsado" son labels de estado del pedido, no implican integración de
  -- pagos real (eso queda pendiente, sección 10.1).
  estado text not null default 'pendiente' check (
    estado in (
      'pendiente', 'pagado', 'buscando_asignacion', 'asignado',
      'en_camino_origen', 'cargando', 'en_camino_destino', 'entregado',
      'confirmado', 'liquidado',
      'cancelado_cliente', 'cancelado_empresa', 'en_disputa', 'reembolsado'
    )
  ),
  monto_total numeric(12, 2),
  created_at timestamptz not null default now()
);

create index orders_cliente_id_idx on public.orders (cliente_id);
create index orders_company_id_idx on public.orders (company_id);
create index orders_driver_id_idx on public.orders (driver_id);
create index drivers_company_id_idx on public.drivers (company_id);
create index users_company_id_idx on public.users (company_id);

-- Crea automáticamente la fila de perfil en public.users cuando alguien se
-- registra vía Supabase Auth. Rol por defecto: 'cliente' (el flujo público de
-- registro es para clientes; empresa/chofer/contabilidad/superadmin se dan de
-- alta y se les cambia el rol manualmente, ver sección 3 del doc).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
