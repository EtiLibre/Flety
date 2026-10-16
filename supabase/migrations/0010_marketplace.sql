-- Marketplace: el cliente puede elegir un fletero disponible (o dejar el pedido
-- en la cola abierta, como hasta ahora). El elegido tiene unos minutos para
-- aceptarlo; si no, el pedido queda abierto para cualquier empresa aprobada.
-- Cada empresa carga sus propias tarifas (si no, se usan las de Flety).

-- ── Tarifas por empresa ─────────────────────────────────────────────────
create table public.company_tarifas (
  company_id uuid not null references public.companies (id) on delete cascade,
  vehiculo text not null check (vehiculo in ('utilitario', 'camioneta', 'camion')),
  base numeric(12, 2) not null check (base >= 0),
  por_km numeric(12, 2) not null check (por_km >= 0),
  por_ayudante numeric(12, 2) not null check (por_ayudante >= 0),
  updated_at timestamptz not null default now(),
  primary key (company_id, vehiculo)
);

alter table public.company_tarifas enable row level security;

-- Son públicas para los usuarios logueados: el cliente compara precios.
create policy "company_tarifas_select" on public.company_tarifas
  for select to authenticated
  using (true);

create policy "company_tarifas_write" on public.company_tarifas
  for all to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or (public.current_user_role() = 'empresa' and company_id = public.current_user_company_id())
  )
  with check (
    public.current_user_role() = 'superadmin'
    or (public.current_user_role() = 'empresa' and company_id = public.current_user_company_id())
  );

-- Precio estimado con las tarifas de la empresa (o las de Flety si no cargó).
create function public.precio_para(p_company uuid, p_vehiculo text, p_km numeric, p_ayudantes integer)
returns numeric
language sql stable security definer set search_path = public
as $$
  select round(t.base + t.por_km * p_km + t.por_ayudante * p_ayudantes, -2)
  from (
    select base, por_km, por_ayudante, 0 as prioridad
    from public.company_tarifas where company_id = p_company and vehiculo = p_vehiculo
    union all
    select base, por_km, por_ayudante, 1 from public.tarifas where vehiculo = p_vehiculo
  ) t
  order by t.prioridad
  limit 1;
$$;

-- ── Ubicación "fresca" del chofer ───────────────────────────────────────
alter table public.drivers add column ubicacion_at timestamptz;

create function public.set_ubicacion_at()
returns trigger
language plpgsql
as $$
begin
  if new.ubicacion_actual is distinct from old.ubicacion_actual then
    new.ubicacion_at := now();
  end if;
  return new;
end;
$$;

create trigger set_ubicacion_at_trg
  before update on public.drivers
  for each row execute function public.set_ubicacion_at();

create function public.current_driver_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.drivers where user_id = auth.uid();
$$;

-- ── Pedido dirigido a un fletero ────────────────────────────────────────
alter table public.orders
  add column company_solicitada uuid references public.companies (id) on delete set null,
  add column driver_solicitado uuid references public.drivers (id) on delete set null,
  -- Hasta cuándo el pedido está reservado para el fletero elegido.
  add column solicitado_hasta timestamptz;

-- Reemplaza la de 0007: valida el fletero elegido y usa las tarifas de su empresa.
create or replace function public.set_precio_estimado()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
begin
  new.solicitado_hasta := null;
  if new.driver_solicitado is not null then
    select d.company_id into cid
    from public.drivers d join public.companies c on c.id = d.company_id
    where d.id = new.driver_solicitado and d.disponibilidad and c.estado_aprobacion = 'aprobada';
    if not found then
      raise exception 'Ese fletero ya no está disponible. Elegí otro o pedí a cualquier empresa.';
    end if;
    new.company_solicitada := cid;
  elsif new.company_solicitada is not null then
    if not exists (select 1 from public.companies where id = new.company_solicitada and estado_aprobacion = 'aprobada') then
      raise exception 'Esa empresa no está disponible.';
    end if;
  end if;

  new.precio_estimado := null;
  if new.vehiculo is not null and new.distancia_km is not null then
    new.precio_estimado := public.precio_para(new.company_solicitada, new.vehiculo, new.distancia_km, new.ayudantes);
  end if;
  return new;
end;
$$;

-- Máquina de estados (reemplaza la de 0004): el chofer elegido puede tomar el
-- pedido él mismo; todo lo demás queda igual.
create or replace function public.validate_order_transition()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  actor public.user_role := public.current_user_role();
  is_trusted boolean := auth.uid() is null;
  mi_driver uuid := public.current_driver_id();
  is_own_driver boolean := old.driver_id is not null and old.driver_id = mi_driver;
  chofer_elegido_acepta boolean := actor = 'chofer'
    and old.driver_solicitado is not null
    and old.driver_solicitado = mi_driver
    and old.estado = 'buscando_asignacion'
    and new.driver_id = mi_driver
    and new.company_id = (select company_id from public.drivers where id = mi_driver);
begin
  if new.estado is distinct from old.estado then
    if is_trusted or actor = 'superadmin' then
      null;
    elsif (old.estado, new.estado) = ('pendiente', 'pagado') then
      raise exception 'pendiente->pagado requiere una conexión de confianza (simulación manual o webhook de pago)';
    elsif (old.estado, new.estado) = ('buscando_asignacion', 'asignado') then
      if not (
        (actor = 'empresa' and old.company_id is null and new.company_id = public.current_user_company_id())
        or (chofer_elegido_acepta and old.company_id is null)
      ) then
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

  if new.driver_id is distinct from old.driver_id and not (is_trusted or actor = 'superadmin' or chofer_elegido_acepta) then
    if not (
      actor = 'empresa'
      and new.company_id = public.current_user_company_id()
      and new.driver_id in (select id from public.drivers where company_id = public.current_user_company_id())
    ) then
      raise exception 'Solo la empresa dueña del pedido puede asignar un chofer de su propia flota';
    end if;
  end if;

  if new.estado = 'pagado' then
    new.estado := 'buscando_asignacion';
  end if;

  if new.estado = 'cancelado_empresa' then
    new.estado := 'buscando_asignacion';
    new.company_id := null;
    new.driver_id := null;
  end if;

  return new;
end;
$$;

-- Reserva del fletero elegido. Corre después de validate_order_transition
-- (los triggers BEFORE van por orden alfabético de nombre: "zz_" queda último).
create function public.manejar_solicitud()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  actor public.user_role := public.current_user_role();
  is_trusted boolean := auth.uid() is null;
begin
  -- A quién se le pidió no se cambia; el elegido solo puede liberarlo (rechazar).
  if (
    new.company_solicitada is distinct from old.company_solicitada
    or new.driver_solicitado is distinct from old.driver_solicitado
    or new.solicitado_hasta is distinct from old.solicitado_hasta
  ) and not (is_trusted or actor = 'superadmin') then
    if not (
      new.company_solicitada is null and new.driver_solicitado is null
      and old.estado = 'buscando_asignacion'
      and (
        (actor = 'empresa' and old.company_solicitada = public.current_user_company_id())
        or (actor = 'chofer' and old.driver_solicitado = public.current_driver_id())
      )
    ) then
      raise exception 'No podés cambiar a quién se le pidió el pedido';
    end if;
    new.solicitado_hasta := null;
  end if;

  -- Al entrar a la cola arranca la reserva (5 minutos). Si una empresa lo había
  -- aceptado y lo rechaza, vuelve a la cola abierta para todas.
  if new.estado = 'buscando_asignacion' and old.estado is distinct from 'buscando_asignacion' then
    if old.estado = 'asignado' then
      new.company_solicitada := null;
      new.driver_solicitado := null;
      new.solicitado_hasta := null;
    elsif new.company_solicitada is not null then
      new.solicitado_hasta := now() + interval '5 minutes';
    end if;
  end if;

  if old.estado = 'buscando_asignacion' and new.estado = 'asignado' and not (is_trusted or actor = 'superadmin') then
    if old.company_solicitada is not null and old.solicitado_hasta > now()
       and new.company_id is distinct from old.company_solicitada then
      raise exception 'Este pedido está reservado unos minutos para el fletero que eligió el cliente';
    end if;
    -- Si eligieron un chofer y lo acepta su empresa, queda asignado a ese chofer.
    if new.driver_id is null and old.driver_solicitado is not null and new.company_id = old.company_solicitada then
      new.driver_id := old.driver_solicitado;
    end if;
  end if;

  return new;
end;
$$;

create trigger zz_manejar_solicitud_trg
  before update on public.orders
  for each row execute function public.manejar_solicitud();

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Cola para empresas aprobadas: abiertos, reservados para mí, o con la reserva vencida.
drop policy "orders_select_queue_for_empresa" on public.orders;

create policy "orders_select_queue_for_empresa" on public.orders
  for select to authenticated
  using (
    public.current_user_role() = 'empresa'
    and public.current_company_aprobada()
    and estado = 'buscando_asignacion'
    and company_id is null
    and (
      company_solicitada is null
      or company_solicitada = public.current_user_company_id()
      or solicitado_hasta < now()
    )
  );

-- El chofer elegido ve la solicitud y puede aceptarla o liberarla.
create policy "orders_select_solicitud_chofer" on public.orders
  for select to authenticated
  using (driver_solicitado = public.current_driver_id() and estado = 'buscando_asignacion');

create policy "orders_update_solicitud_chofer" on public.orders
  for update to authenticated
  using (driver_solicitado = public.current_driver_id() and estado = 'buscando_asignacion')
  with check (
    driver_id = public.current_driver_id()
    or (driver_solicitado is null and company_solicitada is null and estado = 'buscando_asignacion')
  );

-- El cliente ve nombre y vehículo del fletero que eligió mientras espera la
-- respuesta (amplía las funciones de 0008, que solo miraban driver_id).
create or replace function public.es_driver_de_mis_pedidos(driver uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where (o.driver_id = driver or o.driver_solicitado = driver) and o.cliente_id = auth.uid()
  );
$$;

create or replace function public.es_chofer_de_mis_pedidos(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    join public.drivers d on d.id = o.driver_id or d.id = o.driver_solicitado
    where o.cliente_id = auth.uid() and d.user_id = uid
  );
$$;

-- ── Fleteros disponibles cerca (para el marketplace) ────────────────────
-- Solo datos públicos: nombre de pila, empresa, vehículo, distancia, ubicación
-- aproximada (~100 m) y el precio con las tarifas de su empresa.
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
  precio numeric
)
language sql stable security definer set search_path = public
as $$
  select f_driver, f_nombre, f_empresa, f_company, f_vehiculo, distancia, f_lat, f_lng, f_precio from (
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
  where f.distancia <= 40
  order by f.distancia
  limit 20;
$$;

revoke execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) from public, anon;
grant execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) to authenticated;
