-- Alta de empresas desde la app, calificaciones del cliente y chat del pedido.

-- ── Alta de empresa ─────────────────────────────────────────────────────
-- Una cuenta nueva (rol cliente) registra su empresa: queda "pendiente" hasta
-- que el superadmin la aprueba (curaduría, sección 10.3). Igual que el canje de
-- invitación (0009), el cambio de rol se habilita solo dentro de la función.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.company_id is distinct from old.company_id)
     and auth.uid() is not null
     and public.current_user_role() is distinct from 'superadmin'
     and coalesce(current_setting('flety.canje_invitacion', true), '') <> 'on'
     and coalesce(current_setting('flety.alta_empresa', true), '') <> 'on' then
    raise exception 'Solo superadmin puede modificar role o company_id';
  end if;
  return new;
end;
$$;

create function public.registrar_empresa(p_nombre text, p_cuit text)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  perfil public.users;
  nombre_ok text := trim(p_nombre);
  cuit_ok text := regexp_replace(coalesce(p_cuit, ''), '[^0-9]', '', 'g');
  nueva uuid;
begin
  if uid is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  select * into perfil from public.users where id = uid;
  if perfil.role is distinct from 'cliente' or perfil.company_id is not null then
    raise exception 'Esta cuenta ya está asociada a una empresa o no puede registrar una';
  end if;
  if char_length(nombre_ok) < 2 or char_length(nombre_ok) > 80 then
    raise exception 'El nombre de la empresa tiene que tener entre 2 y 80 caracteres';
  end if;
  if char_length(cuit_ok) <> 11 then
    raise exception 'El CUIT tiene que tener 11 números';
  end if;

  insert into public.companies (nombre, cuit, estado_aprobacion)
  values (nombre_ok, cuit_ok, 'pendiente')
  returning id into nueva;

  perform set_config('flety.alta_empresa', 'on', true);
  update public.users set role = 'empresa', company_id = nueva where id = uid;
  perform set_config('flety.alta_empresa', 'off', true);

  return nueva;
end;
$$;

revoke execute on function public.registrar_empresa(text, text) from public, anon;
grant execute on function public.registrar_empresa(text, text) to authenticated;

-- ── Calificaciones (cliente → empresa/chofer) ───────────────────────────
create table public.calificaciones (
  order_id uuid primary key references public.orders (id) on delete cascade,
  cliente_id uuid not null references public.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  driver_id uuid references public.drivers (id) on delete set null,
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text check (char_length(comentario) <= 500),
  created_at timestamptz not null default now()
);

create index calificaciones_driver_id_idx on public.calificaciones (driver_id);
create index calificaciones_company_id_idx on public.calificaciones (company_id);

-- Empresa y chofer salen del pedido (no del cliente), y solo se califica un
-- pedido propio ya confirmado.
create function public.set_calificacion()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = new.order_id;
  if not found or o.cliente_id <> auth.uid() or o.estado not in ('confirmado', 'liquidado') then
    raise exception 'Solo podés calificar tus pedidos ya entregados y confirmados';
  end if;
  new.cliente_id := o.cliente_id;
  new.company_id := o.company_id;
  new.driver_id := o.driver_id;
  return new;
end;
$$;

create trigger set_calificacion_trg
  before insert on public.calificaciones
  for each row execute function public.set_calificacion();

alter table public.calificaciones enable row level security;

create policy "calificaciones_insert" on public.calificaciones
  for insert to authenticated
  with check (cliente_id = auth.uid());

create policy "calificaciones_select" on public.calificaciones
  for select to authenticated
  using (
    cliente_id = auth.uid()
    or public.current_user_role() in ('superadmin', 'contabilidad')
    or (company_id is not null and company_id = public.current_user_company_id())
    or (driver_id is not null and driver_id = public.current_driver_id())
  );

-- Reputación pública (promedio y cantidad), sin exponer los comentarios.
create function public.reputacion_chofer(p_driver uuid)
returns table (estrellas numeric, cantidad integer)
language sql stable security definer set search_path = public
as $$
  select round(avg(c.estrellas)::numeric, 1), count(*)::integer
  from public.calificaciones c where c.driver_id = p_driver;
$$;

-- El marketplace suma la reputación (cambia la forma del resultado de 0010).
drop function public.fleteros_disponibles(double precision, double precision, numeric, integer, text);

create function public.fleteros_disponibles(
  p_lat double precision,
  p_lng double precision,
  p_km numeric,
  p_ayudantes integer,
  p_vehiculo text
)
returns table (
  driver_id uuid,
  nombre text,
  empresa text,
  company_id uuid,
  vehiculo text,
  distancia_km numeric,
  lat double precision,
  lng double precision,
  precio numeric,
  estrellas numeric,
  calificaciones integer
)
language sql stable security definer set search_path = public
as $$
  select f_driver, f_nombre, f_empresa, f_company, f_vehiculo, distancia, f_lat, f_lng, f_precio, r.estrellas, coalesce(r.cantidad, 0)
  from (
    select
      d.id as f_driver,
      coalesce(nullif(split_part(trim(u.nombre), ' ', 1), ''), 'Fletero') as f_nombre,
      c.nombre as f_empresa,
      c.id as f_company,
      coalesce(d.vehiculo ->> 'tipo', p_vehiculo) as f_vehiculo,
      round((6371 * 2 * asin(sqrt(
        power(sin(radians(((d.ubicacion_actual ->> 'lat')::float8 - p_lat) / 2)), 2)
        + cos(radians(p_lat)) * cos(radians((d.ubicacion_actual ->> 'lat')::float8))
          * power(sin(radians(((d.ubicacion_actual ->> 'lng')::float8 - p_lng) / 2)), 2)
      )))::numeric, 1) as distancia,
      round((d.ubicacion_actual ->> 'lat')::numeric, 3)::float8 as f_lat,
      round((d.ubicacion_actual ->> 'lng')::numeric, 3)::float8 as f_lng,
      public.precio_para(c.id, coalesce(d.vehiculo ->> 'tipo', p_vehiculo), p_km, p_ayudantes) as f_precio
    from public.drivers d
    join public.companies c on c.id = d.company_id and c.estado_aprobacion = 'aprobada'
    join public.users u on u.id = d.user_id
    where d.disponibilidad
      and d.ubicacion_actual ? 'lat'
      and d.ubicacion_at > now() - interval '30 minutes'
      and not exists (
        select 1 from public.orders o
        where o.driver_id = d.id and o.estado in ('asignado', 'en_camino_origen', 'cargando', 'en_camino_destino')
      )
  ) f
  left join lateral public.reputacion_chofer(f.f_driver) r on true
  where f.distancia <= 40
  order by f.distancia
  limit 20;
$$;

revoke execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) from public, anon;
grant execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) to authenticated;

-- ── Chat del pedido (cliente ↔ chofer/empresa) ──────────────────────────
create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  autor_id uuid not null references public.users (id) on delete cascade,
  autor_rol public.user_role not null,
  texto text not null check (char_length(trim(texto)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index mensajes_order_id_idx on public.mensajes (order_id, created_at);

-- Parte del pedido: el cliente, la empresa que lo tomó y el chofer asignado.
create function public.es_parte_del_pedido(p_order uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order
      and (
        o.cliente_id = auth.uid()
        or (public.current_user_role() = 'empresa' and o.company_id is not null and o.company_id = public.current_user_company_id())
        or (o.driver_id is not null and o.driver_id = public.current_driver_id())
      )
  );
$$;

-- Se puede escribir mientras el pedido está asignado, en curso o en revisión.
create function public.chat_abierto(p_order uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order
      and o.estado in ('asignado', 'en_camino_origen', 'cargando', 'en_camino_destino', 'entregado', 'en_disputa')
  );
$$;

-- Autor y rol los pone la base (no se pueden falsear desde la app).
create function public.set_mensaje_autor()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.autor_id := auth.uid();
  new.autor_rol := public.current_user_role();
  new.texto := trim(new.texto);
  return new;
end;
$$;

create trigger set_mensaje_autor_trg
  before insert on public.mensajes
  for each row execute function public.set_mensaje_autor();

alter table public.mensajes enable row level security;

create policy "mensajes_select" on public.mensajes
  for select to authenticated
  using (public.es_parte_del_pedido(order_id) or public.current_user_role() = 'superadmin');

create policy "mensajes_insert" on public.mensajes
  for insert to authenticated
  with check (public.es_parte_del_pedido(order_id) and public.chat_abierto(order_id));

do $$
begin
  execute 'alter publication supabase_realtime add table public.mensajes';
exception when duplicate_object then null;
end $$;
