-- PIN DEL VIAJE (como DiDi/Uber): cada pedido de Mudanzas y cada solicitud de
-- Grúas tiene un PIN de 4 dígitos que solo ve el cliente. El chofer o gruista
-- se lo pide al llegar y lo escribe para empezar la carga (Mudanzas) o el
-- traslado (Grúas). Así se confirma que es el vehículo y el cliente correctos.
-- Los PIN viven en tablas aparte porque el chofer sí puede leer el pedido.

create or replace function public.nuevo_pin()
returns text
language sql volatile set search_path = ''
as $$
  select lpad(floor(random() * 10000)::int::text, 4, '0');
$$;
revoke execute on function public.nuevo_pin() from public, anon, authenticated;

-- ── Mudanzas ────────────────────────────────────────────────────────────
create table public.pines_viaje (
  order_id uuid primary key references public.orders (id) on delete cascade,
  pin text not null check (pin ~ '^[0-9]{4}$'),
  intentos int not null default 0,
  ultimo_intento timestamptz,
  verificado_at timestamptz
);
alter table public.pines_viaje enable row level security;
revoke all on public.pines_viaje from anon, authenticated;
grant select on public.pines_viaje to authenticated;
create policy "pin_solo_cliente" on public.pines_viaje for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.cliente_id = auth.uid()));

create or replace function public.crear_pin_pedido()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.pines_viaje (order_id, pin) values (new.id, public.nuevo_pin()) on conflict do nothing;
  return new;
end;
$$;
create trigger crear_pin_pedido_trg after insert on public.orders
  for each row execute function public.crear_pin_pedido();

-- Pedidos ya creados que todavía no empezaron la carga.
insert into public.pines_viaje (order_id, pin)
select id, public.nuevo_pin() from public.orders
where estado in ('pendiente', 'pagado', 'buscando_asignacion', 'asignado', 'en_camino_origen')
on conflict do nothing;

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
      -- Empezar la carga exige el PIN del cliente (public.iniciar_carga).
      if (old.estado, new.estado) = ('en_camino_origen', 'cargando')
         and coalesce(current_setting('flety.pin_ok', true), '') <> 'on'
         and exists (select 1 from public.pines_viaje where order_id = old.id) then
        raise exception 'Pedile al cliente el PIN del viaje para empezar la carga';
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


-- El chofer escribe el PIN al llegar al retiro: valida y empieza la carga.
create or replace function public.iniciar_carga(p_order uuid, p_pin text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders;
  p public.pines_viaje;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.driver_id is distinct from public.current_driver_id() then
    raise exception 'Solo el chofer asignado puede empezar la carga';
  end if;
  if o.estado <> 'en_camino_origen' then
    raise exception 'El viaje no está esperando la carga';
  end if;
  select * into p from public.pines_viaje where order_id = o.id for update;
  if found then
    if p.intentos >= 5 and p.ultimo_intento > now() - interval '10 minutes' then
      raise exception 'Demasiados intentos. Esperá unos minutos y volvé a probar';
    end if;
    if trim(coalesce(p_pin, '')) <> p.pin then
      update public.pines_viaje
      set intentos = case when ultimo_intento < now() - interval '10 minutes' then 1 else intentos + 1 end,
          ultimo_intento = now()
      where order_id = o.id;
      raise exception 'El PIN no coincide. Pedíselo de nuevo al cliente';
    end if;
    update public.pines_viaje set verificado_at = now() where order_id = o.id;
  end if;
  perform set_config('flety.pin_ok', 'on', true);
  update public.orders set estado = 'cargando' where id = o.id;
  perform set_config('flety.pin_ok', 'off', true);
end;
$$;
revoke execute on function public.iniciar_carga(uuid, text) from public, anon;
grant execute on function public.iniciar_carga(uuid, text) to authenticated;

-- ── Grúas ───────────────────────────────────────────────────────────────
create table gruas.pines (
  solicitud_id uuid primary key references gruas.solicitudes (id) on delete cascade,
  pin text not null check (pin ~ '^[0-9]{4}$'),
  intentos int not null default 0,
  ultimo_intento timestamptz,
  verificado_at timestamptz
);
alter table gruas.pines enable row level security;
revoke all on gruas.pines from anon, authenticated;
grant select on gruas.pines to authenticated;
grant all on gruas.pines to service_role;
create policy "pin_solo_cliente" on gruas.pines for select to authenticated
  using (exists (select 1 from gruas.solicitudes s where s.id = solicitud_id and s.cliente_id = auth.uid()));

create or replace function gruas.crear_pin()
returns trigger
language plpgsql security definer set search_path = gruas, public
as $$
begin
  insert into gruas.pines (solicitud_id, pin) values (new.id, public.nuevo_pin()) on conflict do nothing;
  return new;
end;
$$;
create trigger crear_pin_trg after insert on gruas.solicitudes
  for each row execute function gruas.crear_pin();

insert into gruas.pines (solicitud_id, pin)
select id, public.nuevo_pin() from gruas.solicitudes
where estado in ('buscando', 'asignada', 'en_camino', 'en_origen')
on conflict do nothing;

-- avanzar() ahora pide el PIN para empezar el traslado.
drop function gruas.avanzar(uuid, text);
create function gruas.avanzar(p_solicitud uuid, p_estado text, p_pin text default null)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  s gruas.solicitudes;
  p gruas.pines;
begin
  select * into s from gruas.solicitudes where id = p_solicitud for update;
  if not found or s.prestador_id is distinct from gruas.mi_prestador() then
    raise exception 'Solo el gruista asignado puede avanzar el servicio';
  end if;
  if not (
    (s.estado = 'asignada' and p_estado = 'en_camino')
    or (s.estado = 'en_camino' and p_estado = 'en_origen')
    or (s.estado = 'en_origen' and p_estado = 'trasladando')
    or (s.estado = 'trasladando' and p_estado = 'finalizada')
  ) then
    raise exception 'Paso no permitido';
  end if;
  if p_estado = 'trasladando' then
    select * into p from gruas.pines where solicitud_id = s.id for update;
    if found then
      if p.intentos >= 5 and p.ultimo_intento > now() - interval '10 minutes' then
        raise exception 'Demasiados intentos. Esperá unos minutos y volvé a probar';
      end if;
      if trim(coalesce(p_pin, '')) <> p.pin then
        update gruas.pines
        set intentos = case when ultimo_intento < now() - interval '10 minutes' then 1 else intentos + 1 end,
            ultimo_intento = now()
        where solicitud_id = s.id;
        raise exception 'El PIN no coincide. Pedíselo de nuevo al cliente';
      end if;
      update gruas.pines set verificado_at = now() where solicitud_id = s.id;
    end if;
  end if;
  update gruas.solicitudes set
    estado = p_estado,
    en_camino_at = case when p_estado = 'en_camino' then now() else en_camino_at end,
    en_origen_at = case when p_estado = 'en_origen' then now() else en_origen_at end,
    trasladando_at = case when p_estado = 'trasladando' then now() else trasladando_at end,
    finalizada_at = case when p_estado = 'finalizada' then now() else finalizada_at end,
    updated_at = now()
  where id = s.id;
end;
$$;
revoke execute on function gruas.avanzar(uuid, text, text) from public, anon;
grant execute on function gruas.avanzar(uuid, text, text) to authenticated;

-- ── Registro: apellido y teléfono además del nombre ──────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, nombre, apellido, telefono)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'apellido'), 60), ''),
    case
      when char_length(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefono', ''), '[^0-9+]', '', 'g')) between 6 and 30
      then regexp_replace(new.raw_user_meta_data ->> 'telefono', '[^0-9+]', '', 'g')
    end
  );
  return new;
end;
$$;
