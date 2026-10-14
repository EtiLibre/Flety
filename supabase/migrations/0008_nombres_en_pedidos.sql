-- Paso 3 (panel de empresas): nombres visibles entre las partes de un pedido.
-- Antes, una empresa solo veía usuarios de su propia empresa (users_select de
-- 0002), así que no podía mostrar quién pidió el servicio. Se suma una policy
-- de solo lectura, acotada a las partes de pedidos que cada uno ya puede ver.
-- Las policies de SELECT se combinan con OR: la de 0002 queda igual.
--
-- Las comprobaciones cruzadas van en funciones SECURITY DEFINER (como
-- current_user_role) para que una policy no dispare las de otra tabla que a
-- su vez vuelven a consultar la primera (recursión orders <-> drivers <-> users).

-- ¿El usuario `uid` es cliente de algún pedido tomado por mi empresa?
create function public.es_cliente_de_mi_empresa(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.cliente_id = uid
      and o.company_id is not null
      and o.company_id = public.current_user_company_id()
  );
$$;

-- ¿El usuario `uid` es el chofer asignado a algún pedido mío (como cliente)?
create function public.es_chofer_de_mis_pedidos(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    join public.drivers d on d.id = o.driver_id
    where o.cliente_id = auth.uid() and d.user_id = uid
  );
$$;

-- ¿El chofer `driver` está asignado a algún pedido mío (como cliente)?
create function public.es_driver_de_mis_pedidos(driver uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.driver_id = driver and o.cliente_id = auth.uid()
  );
$$;

create policy "users_select_partes_del_pedido" on public.users
  for select to authenticated
  using (public.es_cliente_de_mi_empresa(id) or public.es_chofer_de_mis_pedidos(id));

-- Misma regla que drivers_select de 0002, pero sin la subconsulta directa a
-- orders (orders_select ya consulta drivers: así no se cruzan).
drop policy "drivers_select" on public.drivers;

create policy "drivers_select" on public.drivers
  for select to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or company_id = public.current_user_company_id()
    or user_id = auth.uid()
    or public.es_driver_de_mis_pedidos(id)
  );

-- Curaduría (sección 3/10.3 del doc): solo las empresas aprobadas ven la cola.
create function public.current_company_aprobada()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select estado_aprobacion = 'aprobada' from public.companies
     where id = public.current_user_company_id()),
    false
  );
$$;

drop policy "orders_select_queue_for_empresa" on public.orders;

create policy "orders_select_queue_for_empresa" on public.orders
  for select to authenticated
  using (
    public.current_user_role() = 'empresa'
    and public.current_company_aprobada()
    and estado = 'buscando_asignacion'
    and company_id is null
  );
