-- Fase 2: cola de asignación manual (sección 7.3) + máquina de estados
-- completa (sección 7.1). Reemplaza el comentario de 0002 que decía "no se
-- valida qué transición puede hacer cada rol, pendiente para Fase 2".

-- ── RLS: acceso de fila ampliado para la cola ───────────────────────────
-- Quién puede TOCAR una fila (row access). Qué transición de estado es
-- legal lo resuelve el trigger validate_order_transition más abajo, no esto.

create policy "orders_select_queue_for_empresa" on public.orders
  for select to authenticated
  using (
    public.current_user_role() = 'empresa'
    and estado = 'buscando_asignacion'
    and company_id is null
  );

drop policy "orders_update" on public.orders;

create policy "orders_update" on public.orders
  for update to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or cliente_id = auth.uid()
    or company_id = public.current_user_company_id()
    or driver_id in (select id from public.drivers where user_id = auth.uid())
    or (
      public.current_user_role() = 'empresa'
      and estado = 'buscando_asignacion'
      and company_id is null
    )
  )
  with check (
    public.current_user_role() = 'superadmin'
    or cliente_id = auth.uid()
    or company_id = public.current_user_company_id()
    or driver_id in (select id from public.drivers where user_id = auth.uid())
    -- Permite que quede "reencolado" tras el auto-revert de
    -- validate_order_transition() cuando una empresa rechaza un pedido
    -- (la autorización de esa transición ya la resolvió el trigger).
    or (estado = 'buscando_asignacion' and company_id is null)
  );

-- ── Máquina de estados (sección 7.1) ────────────────────────────────────
-- Única fuente de verdad de qué (estado_viejo -> estado_nuevo) puede hacer
-- cada rol. Las policies de arriba solo controlan qué filas se pueden tocar;
-- esto controla qué transición específica es legal.
--
-- Dos transiciones se auto-avanzan en la misma escritura (ver el final de
-- la función): pagado -> buscando_asignacion, y cancelado_empresa -> vuelve
-- a la cola (sección 7.1: "vuelve a buscar otra").

create function public.validate_order_transition()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  actor public.user_role := public.current_user_role();
  is_trusted boolean := auth.uid() is null; -- conexión directa (SQL editor, admin)
  is_own_driver boolean := old.driver_id in (
    select id from public.drivers where user_id = auth.uid()
  );
begin
  if new.estado is distinct from old.estado then
    if is_trusted or actor = 'superadmin' then
      -- conexión de confianza o superadmin: cualquier transición permitida
      null;
    elsif (old.estado, new.estado) = ('pendiente', 'pagado') then
      raise exception 'pendiente->pagado requiere una conexión de confianza (simulación manual o webhook de pago)';
    elsif (old.estado, new.estado) = ('buscando_asignacion', 'asignado') then
      if not (actor = 'empresa' and old.company_id is null and new.company_id = public.current_user_company_id()) then
        raise exception 'Solo una empresa puede reclamar un pedido de la cola';
      end if;
    elsif old.estado = 'asignado' and new.estado = 'en_camino_origen'
       or old.estado = 'en_camino_origen' and new.estado = 'cargando'
       or old.estado = 'cargando' and new.estado = 'en_camino_destino'
       or old.estado = 'en_camino_destino' and new.estado = 'entregado' then
      if not (actor = 'chofer' and is_own_driver) then
        raise exception 'Solo el chofer asignado puede avanzar el estado del viaje';
      end if;
    elsif (old.estado, new.estado) = ('entregado', 'confirmado') then
      if not (actor = 'cliente' and old.cliente_id = auth.uid()) then
        raise exception 'Solo el cliente puede confirmar la entrega';
      end if;
    elsif (old.estado, new.estado) = ('confirmado', 'liquidado') then
      if not (actor = 'contabilidad') then
        raise exception 'Solo contabilidad puede marcar un pedido como liquidado';
      end if;
    elsif old.estado in ('pendiente', 'pagado', 'buscando_asignacion', 'asignado')
      and new.estado = 'cancelado_cliente' then
      if not (actor = 'cliente' and old.cliente_id = auth.uid()) then
        raise exception 'Solo el cliente puede cancelar su propio pedido';
      end if;
    elsif (old.estado, new.estado) = ('asignado', 'cancelado_empresa') then
      if not (actor = 'empresa' and old.company_id = public.current_user_company_id()) then
        raise exception 'Solo la empresa asignada puede rechazar el pedido';
      end if;
    elsif old.estado in ('entregado', 'confirmado') and new.estado = 'en_disputa' then
      if not (actor = 'cliente' and old.cliente_id = auth.uid()) then
        raise exception 'Solo el cliente puede reportar una disputa';
      end if;
    elsif old.estado = 'en_disputa' and new.estado in ('confirmado', 'reembolsado') then
      raise exception 'Solo superadmin puede resolver una disputa';
    else
      raise exception 'Transición de estado % -> % no permitida', old.estado, new.estado;
    end if;
  end if;

  -- Reasignar chofer: solo la empresa dueña del pedido, y el chofer debe
  -- pertenecer a esa misma empresa.
  if new.driver_id is distinct from old.driver_id and not (is_trusted or actor = 'superadmin') then
    if not (
      actor = 'empresa'
      and new.company_id = public.current_user_company_id()
      and new.driver_id in (select id from public.drivers where company_id = public.current_user_company_id())
    ) then
      raise exception 'Solo la empresa dueña del pedido puede asignar un chofer de su propia flota';
    end if;
  end if;

  -- Auto-avance: pagado siempre pasa directo a buscando_asignacion.
  if new.estado = 'pagado' then
    new.estado := 'buscando_asignacion';
  end if;

  -- Auto-avance: la empresa rechaza -> vuelve a la cola sin empresa/chofer.
  if new.estado = 'cancelado_empresa' then
    new.estado := 'buscando_asignacion';
    new.company_id := null;
    new.driver_id := null;
  end if;

  return new;
end;
$$;

create trigger validate_order_transition_trg
  before update on public.orders
  for each row execute function public.validate_order_transition();

-- ── Realtime: seguimiento en vivo del pedido y del chofer ───────────────

do $$
begin
  execute 'alter publication supabase_realtime add table public.orders';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.drivers';
exception when duplicate_object then null;
end $$;
