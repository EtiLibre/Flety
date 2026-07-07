-- Row Level Security: barrera real de datos por rol (sección 3 del doc).
-- El guard de cada layout.tsx por sección es solo UX (redirect); esto es lo
-- que de verdad impide leer/escribir filas que no correspondan.

-- Funciones SECURITY DEFINER: evitan la recursión de RLS al consultar el rol
-- del propio usuario dentro de una policy sobre la tabla users.
create function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create function public.current_user_company_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select company_id from public.users where id = auth.uid();
$$;

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.drivers enable row level security;
alter table public.orders enable row level security;

-- ── users ────────────────────────────────────────────────────────────────

create policy "users_select" on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'superadmin'
    or (
      public.current_user_role() = 'empresa'
      and company_id = public.current_user_company_id()
    )
  );

create policy "users_update" on public.users
  for update to authenticated
  using (id = auth.uid() or public.current_user_role() = 'superadmin')
  with check (id = auth.uid() or public.current_user_role() = 'superadmin');

-- Nadie inserta manualmente: la fila la crea el trigger on_auth_user_created
-- (security definer) cuando alguien se registra en Supabase Auth.

-- Evita que un usuario se autoasigne un rol o empresa distinta al hacer
-- update de su propia fila (users_update permite el update, pero no que
-- cambie estas columnas si no es superadmin).
create function public.prevent_role_self_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.company_id is distinct from old.company_id)
     and public.current_user_role() is distinct from 'superadmin' then
    raise exception 'Solo superadmin puede modificar role o company_id';
  end if;
  return new;
end;
$$;

create trigger prevent_role_self_escalation_trg
  before update on public.users
  for each row execute function public.prevent_role_self_escalation();

-- ── companies ────────────────────────────────────────────────────────────

create policy "companies_select" on public.companies
  for select to authenticated
  using (
    public.current_user_role() in ('superadmin', 'contabilidad')
    or id = public.current_user_company_id()
    or exists (
      select 1 from public.orders o
      where o.company_id = companies.id and o.cliente_id = auth.uid()
    )
  );

-- Alta de empresa: autoservicio, pero siempre arranca "pendiente" salvo que
-- la cree superadmin directamente (curaduría, sección 3/10.3).
create policy "companies_insert" on public.companies
  for insert to authenticated
  with check (
    public.current_user_role() = 'superadmin' or estado_aprobacion = 'pendiente'
  );

create policy "companies_update" on public.companies
  for update to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or id = public.current_user_company_id()
  )
  with check (
    public.current_user_role() = 'superadmin'
    or id = public.current_user_company_id()
  );

-- Solo superadmin aprueba/rechaza o fija comisión (curaduría: la empresa no
-- se autoaprueba ni se autoasigna comisión).
create function public.prevent_company_self_approval()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    new.estado_aprobacion is distinct from old.estado_aprobacion
    or new.comision_pct is distinct from old.comision_pct
  ) and public.current_user_role() is distinct from 'superadmin' then
    raise exception 'Solo superadmin puede aprobar la empresa o fijar la comisión';
  end if;
  return new;
end;
$$;

create trigger prevent_company_self_approval_trg
  before update on public.companies
  for each row execute function public.prevent_company_self_approval();

-- ── drivers ──────────────────────────────────────────────────────────────

create policy "drivers_select" on public.drivers
  for select to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or company_id = public.current_user_company_id()
    or user_id = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.driver_id = drivers.id and o.cliente_id = auth.uid()
    )
  );

create policy "drivers_insert" on public.drivers
  for insert to authenticated
  with check (
    public.current_user_role() = 'superadmin'
    or (
      public.current_user_role() = 'empresa'
      and company_id = public.current_user_company_id()
    )
  );

create policy "drivers_update" on public.drivers
  for update to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or (
      public.current_user_role() = 'empresa'
      and company_id = public.current_user_company_id()
    )
    or user_id = auth.uid()
  )
  with check (
    public.current_user_role() = 'superadmin'
    or (
      public.current_user_role() = 'empresa'
      and company_id = public.current_user_company_id()
    )
    or user_id = auth.uid()
  );

create policy "drivers_delete" on public.drivers
  for delete to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or (
      public.current_user_role() = 'empresa'
      and company_id = public.current_user_company_id()
    )
  );

-- ── orders ───────────────────────────────────────────────────────────────
-- Nota: en Fase 1 no se valida a nivel DB qué transición de `estado` puede
-- hacer cada rol (ej. que un cliente no marque "entregado" a sí mismo) — eso
-- es lógica de proceso de la sección 7.1, pendiente para cuando se construya
-- el flujo de estados (Fase 2).

create policy "orders_select" on public.orders
  for select to authenticated
  using (
    public.current_user_role() in ('superadmin', 'contabilidad')
    or cliente_id = auth.uid()
    or company_id = public.current_user_company_id()
    or driver_id in (select id from public.drivers where user_id = auth.uid())
  );

create policy "orders_insert" on public.orders
  for insert to authenticated
  with check (cliente_id = auth.uid());

create policy "orders_update" on public.orders
  for update to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or cliente_id = auth.uid()
    or company_id = public.current_user_company_id()
    or driver_id in (select id from public.drivers where user_id = auth.uid())
  )
  with check (
    public.current_user_role() = 'superadmin'
    or cliente_id = auth.uid()
    or company_id = public.current_user_company_id()
    or driver_id in (select id from public.drivers where user_id = auth.uid())
  );
