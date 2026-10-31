-- GRÚAS · 2/3: reglas de negocio (cotización, despacho tipo Uber, estados,
-- cancelaciones, altas, verificación y reportes). Todo en la base: la app no
-- puede saltear pasos ni cambiar precios.

-- ── Utilidades ──────────────────────────────────────────────────────────
create function gruas.config_num(p_clave text, p_defecto numeric)
returns numeric
language sql stable security definer set search_path = gruas, public
as $$
  select coalesce((select (valor #>> '{}')::numeric from gruas.config where clave = p_clave), p_defecto);
$$;

create function gruas.config_bool(p_clave text, p_defecto boolean)
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select coalesce((select (valor #>> '{}')::boolean from gruas.config where clave = p_clave), p_defecto);
$$;

create function gruas.punto(p_lat double precision, p_lng double precision)
returns extensions.geography
language sql immutable set search_path = gruas, public, extensions
as $$
  select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
$$;

-- Zona activa que cubre un punto (la más cercana).
create function gruas.zona_de(p_lat double precision, p_lng double precision)
returns uuid
language sql stable security definer set search_path = gruas, public, extensions
as $$
  select z.id from gruas.zonas z
  where z.activa
    and extensions.st_dwithin(gruas.punto(z.lat, z.lng), gruas.punto(p_lat, p_lng), z.radio_km * 1000)
  order by extensions.st_distance(gruas.punto(z.lat, z.lng), gruas.punto(p_lat, p_lng))
  limit 1;
$$;

-- Distancia del traslado: se acepta la que calcula la app por calles si es
-- razonable; si no, línea recta × 1,3.
create function gruas.km_traslado(o jsonb, d jsonb, p_km numeric)
returns numeric
language plpgsql stable security definer set search_path = gruas, public, extensions
as $$
declare
  linea numeric;
begin
  if d is null or d ->> 'lat' is null then
    return 0;
  end if;
  linea := extensions.st_distance(
    gruas.punto((o ->> 'lat')::float8, (o ->> 'lng')::float8),
    gruas.punto((d ->> 'lat')::float8, (d ->> 'lng')::float8)
  ) / 1000;
  if p_km is not null and p_km >= linea * 0.9 and p_km <= linea * 3 + 5 then
    return round(p_km, 1);
  end if;
  return round(linea * 1.3, 1);
end;
$$;

-- ── Cotización de un prestador (su tarifa + comisión de la plataforma) ──
create function gruas.cotizar_dueno(
  p_empresa uuid, p_prestador uuid, p_tipo text, p_km numeric, p_situaciones text[], p_zona uuid
)
returns jsonb
language plpgsql stable security definer set search_path = gruas, public
as $$
declare
  t gruas.tarifas;
  r gruas.tarifa_recargos;
  z gruas.zonas;
  ahora timestamp := now() at time zone 'America/Argentina/Buenos_Aires';
  km_cobrados numeric;
  subtotal numeric;
  nocturno numeric := 0;
  finde numeric := 0;
  rec_zona numeric := 0;
  adicionales numeric := 0;
  tarifa numeric;
  comision_pct numeric;
  total numeric;
begin
  select * into t from gruas.tarifas
  where tipo_vehiculo = p_tipo
    and ((p_empresa is not null and empresa_id = p_empresa) or (p_empresa is null and prestador_id = p_prestador));
  if not found then
    return null;
  end if;

  km_cobrados := greatest(0, p_km - t.km_incluidos);
  subtotal := greatest(t.base + t.por_km * km_cobrados, t.minimo);

  select * into r from gruas.tarifa_recargos
  where (p_empresa is not null and empresa_id = p_empresa) or (p_empresa is null and prestador_id = p_prestador);
  if found then
    if (r.nocturno_desde > r.nocturno_hasta and (ahora::time >= r.nocturno_desde or ahora::time < r.nocturno_hasta))
       or (r.nocturno_desde < r.nocturno_hasta and ahora::time >= r.nocturno_desde and ahora::time < r.nocturno_hasta) then
      nocturno := round(subtotal * r.nocturno_pct / 100);
    end if;
    if extract(isodow from ahora) in (6, 7) then
      finde := round(subtotal * r.finde_pct / 100);
    end if;
  end if;

  select coalesce(sum(a.monto), 0) into adicionales from gruas.tarifa_adicionales a
  where a.situacion_id = any(coalesce(p_situaciones, '{}'))
    and ((p_empresa is not null and a.empresa_id = p_empresa) or (p_empresa is null and a.prestador_id = p_prestador));

  select * into z from gruas.zonas where id = p_zona;
  rec_zona := round(subtotal * coalesce(z.recargo_pct, 0) / 100);

  tarifa := subtotal + nocturno + finde + rec_zona + adicionales;
  comision_pct := coalesce(z.comision_pct, gruas.config_num('comision_pct', 10));
  total := round(tarifa * (1 + comision_pct / 100) / 100) * 100;

  return jsonb_build_object(
    'base', t.base, 'por_km', t.por_km, 'km', p_km, 'km_incluidos', t.km_incluidos, 'km_cobrados', km_cobrados,
    'subtotal', subtotal, 'nocturno', nocturno, 'fin_de_semana', finde, 'zona', rec_zona,
    'adicionales', adicionales, 'tarifa_prestador', tarifa, 'comision_pct', comision_pct,
    'comision', total - tarifa, 'total', total
  );
end;
$$;

-- ¿Tiene la documentación al día? (licencia y seguro verificados y vigentes)
create function gruas.documentacion_ok(p_prestador uuid)
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select not gruas.config_bool('exigir_documentos', true)
    or (
      exists (select 1 from gruas.documentos d where d.prestador_id = p_prestador and d.tipo = 'licencia'
              and d.estado = 'verificado' and (d.vence is null or d.vence >= current_date))
      and exists (select 1 from gruas.documentos d where d.prestador_id = p_prestador and d.tipo = 'seguro'
              and d.estado = 'verificado' and (d.vence is null or d.vence >= current_date))
    );
$$;

-- Grúas que pueden tomar un servicio, de la más cercana a la más lejana, con su precio.
create function gruas.candidatos(
  p_lat double precision, p_lng double precision, p_tipo text, p_km numeric, p_situaciones text[],
  p_zona uuid, p_excluir uuid[]
)
returns table (
  prestador_id uuid, unidad_id uuid, distancia_km numeric, eta_min int,
  lat double precision, lng double precision, cotizacion jsonb, total numeric
)
language sql stable security definer set search_path = gruas, public, extensions
as $$
  select p.id, u.id,
    round((extensions.st_distance(p.ubicacion, gruas.punto(p_lat, p_lng)) / 1000)::numeric, 1),
    greatest(3, ceil(extensions.st_distance(p.ubicacion, gruas.punto(p_lat, p_lng)) / 1000
      / gruas.config_num('velocidad_kmh', 35) * 60)::int + 2),
    round(p.lat::numeric, 3)::float8, round(p.lng::numeric, 3)::float8,
    q.c, (q.c ->> 'total')::numeric
  from gruas.prestadores p
  join lateral (
    select un.id from gruas.unidades un
    where un.prestador_id = p.id and un.activa and p_tipo = any(un.tipos_vehiculo)
    order by un.created_at desc limit 1
  ) u on true
  left join gruas.empresas e on e.id = p.empresa_id
  cross join lateral (
    select gruas.cotizar_dueno(p.empresa_id, case when p.empresa_id is null then p.id end,
      p_tipo, p_km, p_situaciones, p_zona) as c
  ) q
  where p.estado = 'aprobado'
    and p.disponible
    and p.ubicacion is not null
    and p.ubicacion_at > now() - interval '15 minutes'
    and (p.empresa_id is null or e.estado = 'aprobada')
    and extensions.st_dwithin(p.ubicacion, gruas.punto(p_lat, p_lng), gruas.config_num('radio_km', 25) * 1000)
    and q.c is not null
    and not (p.id = any(coalesce(p_excluir, '{}')))
    and gruas.documentacion_ok(p.id)
    and not exists (
      select 1 from gruas.solicitudes s
      where s.prestador_id = p.id and s.estado in ('asignada', 'en_camino', 'en_origen', 'trasladando')
    )
    and not exists (
      select 1 from gruas.ofertas o where o.prestador_id = p.id and o.estado = 'enviada' and o.vence_at > now()
    )
  order by 3
  limit 20;
$$;

-- ── Cliente: cotizar antes de pedir ─────────────────────────────────────
create function gruas.cotizar(
  p_origen jsonb, p_destino jsonb, p_distancia_km numeric, p_tipo text, p_situaciones text[]
)
returns jsonb
language plpgsql stable security definer set search_path = gruas, public
as $$
declare
  z gruas.zonas;
  zid uuid;
  km numeric;
  opciones jsonb;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  zid := gruas.zona_de((p_origen ->> 'lat')::float8, (p_origen ->> 'lng')::float8);
  if zid is null then
    return jsonb_build_object('cobertura', false);
  end if;
  select * into z from gruas.zonas where id = zid;
  km := gruas.km_traslado(p_origen, p_destino, p_distancia_km);

  select coalesce(jsonb_agg(jsonb_build_object(
    'distancia_km', c.distancia_km, 'eta_min', c.eta_min, 'lat', c.lat, 'lng', c.lng,
    'total', c.total, 'cotizacion', c.cotizacion
  )), '[]'::jsonb)
  into opciones
  from gruas.candidatos((p_origen ->> 'lat')::float8, (p_origen ->> 'lng')::float8, p_tipo, km,
    p_situaciones, zid, '{}') c;

  return jsonb_build_object(
    'cobertura', true,
    'zona', jsonb_build_object('id', z.id, 'ciudad', z.ciudad, 'provincia', z.provincia),
    'km', km,
    'opciones', opciones
  );
end;
$$;

-- ── Despacho: se ofrece a la grúa más cercana; si no responde, a la siguiente ──
create function gruas.despachar(p_solicitud uuid)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  s gruas.solicitudes;
  c record;
  enviadas int;
  mas_barato numeric;
  excluir uuid[];
begin
  select * into s from gruas.solicitudes where id = p_solicitud for update;
  if not found or s.estado <> 'buscando' then
    return;
  end if;
  if exists (select 1 from gruas.ofertas where solicitud_id = s.id and estado = 'enviada' and vence_at > now()) then
    return;
  end if;

  select count(*) into enviadas from gruas.ofertas where solicitud_id = s.id;
  if enviadas >= gruas.config_num('max_ofertas', 8) then
    update gruas.solicitudes set estado = 'sin_grua', updated_at = now() where id = s.id;
    return;
  end if;

  select coalesce(array_agg(prestador_id), '{}') into excluir from gruas.ofertas where solicitud_id = s.id;

  select * into c from gruas.candidatos(
    (s.origen ->> 'lat')::float8, (s.origen ->> 'lng')::float8, s.tipo_vehiculo, s.distancia_km,
    s.situaciones, s.zona_id, excluir
  ) x
  where s.precio_max is null or x.total <= s.precio_max
  limit 1;

  if found then
    insert into gruas.ofertas (solicitud_id, prestador_id, unidad_id, cotizacion, precio_total, precio_prestador,
      comision, distancia_km, eta_min, vence_at)
    values (s.id, c.prestador_id, c.unidad_id, c.cotizacion, c.total, (c.cotizacion ->> 'tarifa_prestador')::numeric,
      (c.cotizacion ->> 'comision')::numeric, c.distancia_km, c.eta_min,
      now() + make_interval(secs => gruas.config_num('segundos_oferta', 30)::int));
    update gruas.solicitudes set precio_sugerido = null, updated_at = now() where id = s.id;
    return;
  end if;

  -- Solo hay grúas más caras: el cliente tiene que confirmar el nuevo precio.
  select min(x.total) into mas_barato from gruas.candidatos(
    (s.origen ->> 'lat')::float8, (s.origen ->> 'lng')::float8, s.tipo_vehiculo, s.distancia_km,
    s.situaciones, s.zona_id, excluir
  ) x;
  if mas_barato is not null then
    update gruas.solicitudes set precio_sugerido = mas_barato, updated_at = now() where id = s.id;
    return;
  end if;

  update gruas.solicitudes set estado = 'sin_grua', updated_at = now() where id = s.id;
end;
$$;

-- Vence las ofertas sin respuesta y sigue con la próxima grúa.
create function gruas.vencer_ofertas()
returns int
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  sol uuid;
  n int := 0;
begin
  for sol in
    update gruas.ofertas set estado = 'expirada', respondida_at = now()
    where estado = 'enviada' and vence_at <= now()
    returning solicitud_id
  loop
    perform gruas.despachar(sol);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- El cliente (o la app del gruista) empuja el despacho de una solicitud: sirve
-- aunque no esté activo el reloj automático (pg_cron).
create function gruas.revisar(p_solicitud uuid)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
begin
  if not gruas.es_parte(p_solicitud) then
    raise exception 'No tenés acceso a esta solicitud';
  end if;
  update gruas.ofertas set estado = 'expirada', respondida_at = now()
  where solicitud_id = p_solicitud and estado = 'enviada' and vence_at <= now();
  if exists (select 1 from gruas.solicitudes where id = p_solicitud and estado = 'buscando' and precio_sugerido is null) then
    perform gruas.despachar(p_solicitud);
  end if;
end;
$$;

-- ── Cliente: pedir, confirmar precio y cancelar ─────────────────────────
create function gruas.solicitar(
  p_origen jsonb, p_destino jsonb, p_distancia_km numeric, p_tipo text, p_vehiculo jsonb,
  p_motivo text, p_situaciones text[], p_nota text, p_precio_max numeric
)
returns uuid
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  zid uuid;
  nuevo uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  if (p_origen ->> 'lat') is null or (p_origen ->> 'lng') is null then
    raise exception 'Falta indicar dónde está el vehículo';
  end if;
  if exists (
    select 1 from gruas.solicitudes
    where cliente_id = auth.uid() and estado in ('buscando', 'asignada', 'en_camino', 'en_origen', 'trasladando')
  ) then
    raise exception 'Ya tenés una grúa en curso';
  end if;
  zid := gruas.zona_de((p_origen ->> 'lat')::float8, (p_origen ->> 'lng')::float8);
  if zid is null then
    raise exception 'Todavía no llegamos a tu zona';
  end if;

  insert into gruas.solicitudes (cliente_id, zona_id, origen, origen_geo, destino, distancia_km, tipo_vehiculo,
    vehiculo, motivo, situaciones, nota, precio_max)
  values (auth.uid(), zid, p_origen, gruas.punto((p_origen ->> 'lat')::float8, (p_origen ->> 'lng')::float8),
    p_destino, gruas.km_traslado(p_origen, p_destino, p_distancia_km), p_tipo, coalesce(p_vehiculo, '{}'),
    p_motivo, coalesce(p_situaciones, '{}'), nullif(left(trim(coalesce(p_nota, '')), 500), ''), p_precio_max)
  returning id into nuevo;

  perform gruas.despachar(nuevo);
  return nuevo;
end;
$$;

create function gruas.confirmar_precio(p_solicitud uuid, p_precio_max numeric)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  s gruas.solicitudes;
begin
  select * into s from gruas.solicitudes where id = p_solicitud for update;
  if not found or s.cliente_id <> auth.uid() then
    raise exception 'No encontramos tu solicitud';
  end if;
  if s.estado <> 'buscando' or s.precio_sugerido is null or p_precio_max < s.precio_sugerido then
    raise exception 'Este precio ya no está disponible';
  end if;
  update gruas.solicitudes set precio_max = p_precio_max, precio_sugerido = null, updated_at = now() where id = s.id;
  perform gruas.despachar(s.id);
end;
$$;

-- Cancelar: el cliente (con cargo según en qué etapa), el gruista (la
-- solicitud vuelve a buscar otra grúa) o el superadmin.
create function gruas.cancelar(p_solicitud uuid, p_motivo text)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  s gruas.solicitudes;
  reglas jsonb;
  pct numeric;
begin
  select * into s from gruas.solicitudes where id = p_solicitud for update;
  if not found then
    raise exception 'No encontramos la solicitud';
  end if;
  if s.estado not in ('buscando', 'asignada', 'en_camino', 'en_origen', 'trasladando') then
    raise exception 'Esta solicitud ya terminó';
  end if;

  if s.cliente_id = auth.uid() then
    if s.estado = 'trasladando' then
      raise exception 'El traslado ya está en curso: hablá con el gruista por el chat';
    end if;
    select valor into reglas from gruas.config where clave = 'cancelacion';
    pct := coalesce((reglas ->> s.estado)::numeric, 0);
    update gruas.ofertas set estado = 'cancelada' where solicitud_id = s.id and estado = 'enviada';
    update gruas.solicitudes set estado = 'cancelada_cliente', cancelada_at = now(), updated_at = now(),
      motivo_cancelacion = nullif(left(trim(coalesce(p_motivo, '')), 300), ''),
      cargo_cancelacion = case when s.precio_total is null then 0 else round(s.precio_total * pct / 100) end
    where id = s.id;
  elsif s.prestador_id is not null and s.prestador_id = gruas.mi_prestador() then
    if s.estado not in ('asignada', 'en_camino') then
      raise exception 'En esta etapa no podés cancelar: avisale al cliente por el chat';
    end if;
    update gruas.ofertas set estado = 'cancelada' where solicitud_id = s.id and prestador_id = s.prestador_id;
    insert into gruas.eventos (solicitud_id, estado, actor, detalle)
    values (s.id, 'cancelada_prestador', 'prestador', nullif(left(trim(coalesce(p_motivo, '')), 300), ''));
    update gruas.solicitudes set estado = 'buscando', prestador_id = null, unidad_id = null, cotizacion = null,
      precio_total = null, precio_prestador = null, comision = null, asignada_at = null, en_camino_at = null,
      updated_at = now()
    where id = s.id;
    perform gruas.despachar(s.id);
  elsif gruas.es_admin() then
    update gruas.ofertas set estado = 'cancelada' where solicitud_id = s.id and estado = 'enviada';
    update gruas.solicitudes set estado = 'cancelada_admin', cancelada_at = now(), updated_at = now(),
      motivo_cancelacion = nullif(left(trim(coalesce(p_motivo, '')), 300), '')
    where id = s.id;
  else
    raise exception 'No podés cancelar esta solicitud';
  end if;
end;
$$;

create function gruas.calificar(p_solicitud uuid, p_estrellas int, p_comentario text)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  s gruas.solicitudes;
begin
  select * into s from gruas.solicitudes where id = p_solicitud;
  if not found or s.cliente_id <> auth.uid() or s.estado <> 'finalizada' then
    raise exception 'Solo podés calificar tus servicios finalizados';
  end if;
  if p_estrellas not between 1 and 5 then
    raise exception 'Elegí de 1 a 5 estrellas';
  end if;
  insert into gruas.calificaciones (solicitud_id, cliente_id, prestador_id, estrellas, comentario)
  values (s.id, s.cliente_id, s.prestador_id, p_estrellas, nullif(left(trim(coalesce(p_comentario, '')), 500), ''));
end;
$$;

-- Datos del gruista asignado para el cliente (sin datos privados).
create function gruas.grua_asignada(p_solicitud uuid)
returns jsonb
language plpgsql stable security definer set search_path = gruas, public
as $$
declare
  r jsonb;
begin
  if not gruas.es_parte(p_solicitud) then
    raise exception 'No tenés acceso a esta solicitud';
  end if;
  select jsonb_build_object(
    'nombre', trim(split_part(trim(coalesce(u.nombre, 'Gruista')), ' ', 1) || ' ' ||
      coalesce(nullif(left(split_part(trim(coalesce(u.nombre, '')), ' ', 2), 1), '') || '.', '')),
    'foto', p.foto,
    'empresa', e.nombre,
    'lat', p.lat, 'lng', p.lng, 'ubicacion_at', p.ubicacion_at,
    'unidad', jsonb_build_object('patente', un.patente, 'marca', un.marca, 'modelo', un.modelo, 'modalidad', m.nombre),
    'estrellas', (select round(avg(estrellas)::numeric, 1) from gruas.calificaciones where prestador_id = p.id),
    'calificaciones', (select count(*) from gruas.calificaciones where prestador_id = p.id),
    'servicios', (select count(*) from gruas.solicitudes where prestador_id = p.id and estado = 'finalizada')
  ) into r
  from gruas.solicitudes s
  join gruas.prestadores p on p.id = s.prestador_id
  join public.users u on u.id = p.user_id
  left join gruas.empresas e on e.id = p.empresa_id
  left join gruas.unidades un on un.id = s.unidad_id
  left join gruas.modalidades m on m.id = un.modalidad
  where s.id = p_solicitud;
  return r;
end;
$$;

-- ── Gruista: ubicación, disponibilidad, ofertas y etapas ────────────────
create function gruas.actualizar_ubicacion(p_lat double precision, p_lng double precision)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
begin
  if p_lat not between -56 and -21 or p_lng not between -74 and -53 then
    raise exception 'Ubicación fuera de Argentina';
  end if;
  perform set_config('gruas.sistema', 'on', true);
  update gruas.prestadores set ubicacion = gruas.punto(p_lat, p_lng), lat = p_lat, lng = p_lng, ubicacion_at = now()
  where user_id = auth.uid();
end;
$$;

create function gruas.responder_oferta(p_oferta uuid, p_acepta boolean)
returns text
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  o gruas.ofertas;
  s gruas.solicitudes;
begin
  select * into o from gruas.ofertas where id = p_oferta for update;
  if not found or o.prestador_id is distinct from gruas.mi_prestador() then
    raise exception 'No encontramos esta oferta';
  end if;
  if o.estado <> 'enviada' or o.vence_at < now() - interval '3 seconds' then
    raise exception 'La oferta ya no está disponible';
  end if;

  if not p_acepta then
    update gruas.ofertas set estado = 'rechazada', respondida_at = now() where id = o.id;
    perform gruas.despachar(o.solicitud_id);
    return 'rechazada';
  end if;

  select * into s from gruas.solicitudes where id = o.solicitud_id for update;
  if s.estado <> 'buscando' then
    update gruas.ofertas set estado = 'cancelada', respondida_at = now() where id = o.id;
    raise exception 'El cliente canceló la solicitud';
  end if;

  update gruas.ofertas set estado = 'aceptada', respondida_at = now() where id = o.id;
  update gruas.solicitudes set estado = 'asignada', prestador_id = o.prestador_id, unidad_id = o.unidad_id,
    cotizacion = o.cotizacion, precio_total = o.precio_total, precio_prestador = o.precio_prestador,
    comision = o.comision, asignada_at = now(), updated_at = now()
  where id = s.id;
  return 'aceptada';
end;
$$;

create function gruas.avanzar(p_solicitud uuid, p_estado text)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  s gruas.solicitudes;
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

-- ── Altas: gruista independiente, empresa de auxilio o invitado ─────────
create function gruas.alta(p_tipo text, p_empresa_nombre text, p_cuit text, p_zona uuid, p_telefono text)
returns uuid
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  emp uuid;
  nuevo uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  if exists (select 1 from gruas.prestadores where user_id = auth.uid()) then
    raise exception 'Ya estás registrado como gruista';
  end if;
  if p_tipo = 'empresa' then
    insert into gruas.empresas (nombre, cuit, owner_id, zona_id)
    values (trim(p_empresa_nombre), nullif(regexp_replace(coalesce(p_cuit, ''), '[^0-9]', '', 'g'), ''), auth.uid(), p_zona)
    returning id into emp;
  elsif p_tipo <> 'independiente' then
    raise exception 'Tipo de alta inválido';
  end if;
  insert into gruas.prestadores (user_id, empresa_id, zona_id, telefono)
  values (auth.uid(), emp, p_zona, nullif(trim(coalesce(p_telefono, '')), ''))
  returning id into nuevo;
  return nuevo;
end;
$$;

create function gruas.crear_invitacion()
returns gruas.invitaciones
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  nuevo text;
  inv gruas.invitaciones;
  emp uuid := gruas.mi_empresa();
begin
  if emp is null or not exists (select 1 from gruas.empresas where id = emp and estado = 'aprobada') then
    raise exception 'Solo una empresa aprobada puede invitar gruistas';
  end if;
  loop
    nuevo := 'G';
    for i in 1..6 loop
      nuevo := nuevo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    begin
      insert into gruas.invitaciones (code, empresa_id) values (nuevo, emp) returning * into inv;
      return inv;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

create function gruas.canjear_invitacion(p_code text, p_telefono text)
returns uuid
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  inv gruas.invitaciones;
  emp gruas.empresas;
  nuevo uuid;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  if exists (select 1 from gruas.prestadores where user_id = auth.uid()) then
    raise exception 'Ya estás registrado como gruista';
  end if;
  select * into inv from gruas.invitaciones where code = upper(trim(p_code)) for update;
  if not found or inv.used_at is not null or inv.expires_at < now() then
    raise exception 'El código no es válido o ya venció';
  end if;
  select * into emp from gruas.empresas where id = inv.empresa_id;
  insert into gruas.prestadores (user_id, empresa_id, zona_id, telefono)
  values (auth.uid(), emp.id, emp.zona_id, nullif(trim(coalesce(p_telefono, '')), ''))
  returning id into nuevo;
  update gruas.invitaciones set used_by = auth.uid(), used_at = now() where code = inv.code;
  return nuevo;
end;
$$;

-- ── Superadmin: verificación y suspensión ───────────────────────────────
create function gruas.verificar_prestador(p_prestador uuid, p_estado text, p_motivo text)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
begin
  if not gruas.es_admin() then
    raise exception 'Solo el equipo de la plataforma verifica gruistas';
  end if;
  if p_estado not in ('aprobado', 'rechazado', 'suspendido', 'pendiente') then
    raise exception 'Estado inválido';
  end if;
  update gruas.prestadores set estado = p_estado,
    motivo = case when p_estado = 'aprobado' then null else nullif(left(trim(coalesce(p_motivo, '')), 300), '') end,
    disponible = case when p_estado = 'aprobado' then disponible else false end
  where id = p_prestador;
end;
$$;

create function gruas.verificar_empresa(p_empresa uuid, p_estado text, p_motivo text)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
begin
  if not gruas.es_admin() then
    raise exception 'Solo el equipo de la plataforma verifica empresas';
  end if;
  if p_estado not in ('aprobada', 'rechazada', 'suspendida', 'pendiente') then
    raise exception 'Estado inválido';
  end if;
  update gruas.empresas set estado = p_estado,
    motivo = case when p_estado = 'aprobada' then null else nullif(left(trim(coalesce(p_motivo, '')), 300), '') end
  where id = p_empresa;
end;
$$;

create function gruas.verificar_documento(p_documento uuid, p_ok boolean, p_motivo text)
returns void
language plpgsql volatile security definer set search_path = gruas, public
as $$
begin
  if not gruas.es_admin() then
    raise exception 'Solo el equipo de la plataforma verifica documentos';
  end if;
  update gruas.documentos set estado = case when p_ok then 'verificado' else 'rechazado' end,
    motivo = case when p_ok then null else nullif(left(trim(coalesce(p_motivo, '')), 300), '') end
  where id = p_documento;
end;
$$;

-- ── Reportes (superadmin) ───────────────────────────────────────────────
create function gruas.reporte(p_desde timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = gruas, public
as $$
declare
  r jsonb;
begin
  if not gruas.es_admin() then
    raise exception 'Solo el equipo de la plataforma ve los reportes';
  end if;
  select jsonb_build_object(
    'solicitudes', count(*),
    'finalizadas', count(*) filter (where estado = 'finalizada'),
    'en_curso', count(*) filter (where estado in ('buscando', 'asignada', 'en_camino', 'en_origen', 'trasladando')),
    'sin_grua', count(*) filter (where estado = 'sin_grua'),
    'canceladas_cliente', count(*) filter (where estado = 'cancelada_cliente'),
    'canceladas_admin', count(*) filter (where estado = 'cancelada_admin'),
    'facturacion', coalesce(sum(precio_total) filter (where estado = 'finalizada'), 0),
    'comisiones', coalesce(sum(comision) filter (where estado = 'finalizada'), 0),
    'pago_prestadores', coalesce(sum(precio_prestador) filter (where estado = 'finalizada'), 0),
    'min_asignacion', round(avg(extract(epoch from asignada_at - created_at) / 60) filter (where asignada_at is not null)::numeric, 1),
    'min_llegada', round(avg(extract(epoch from en_origen_at - asignada_at) / 60) filter (where en_origen_at is not null)::numeric, 1),
    'por_zona', coalesce((
      select jsonb_agg(jsonb_build_object('zona', z.ciudad, 'n', x.n) order by x.n desc)
      from (select zona_id, count(*) n from gruas.solicitudes where created_at >= p_desde group by zona_id) x
      join gruas.zonas z on z.id = x.zona_id
    ), '[]'::jsonb),
    'por_tipo', coalesce((
      select jsonb_object_agg(tipo_vehiculo, n)
      from (select tipo_vehiculo, count(*) n from gruas.solicitudes where created_at >= p_desde group by tipo_vehiculo) x
    ), '{}'::jsonb),
    'ofertas', (select jsonb_build_object(
        'enviadas', count(*),
        'aceptadas', count(*) filter (where estado = 'aceptada'),
        'rechazadas', count(*) filter (where estado = 'rechazada'),
        'expiradas', count(*) filter (where estado = 'expirada'))
      from gruas.ofertas where enviada_at >= p_desde),
    'prestadores', (select jsonb_build_object(
        'aprobados', count(*) filter (where estado = 'aprobado'),
        'pendientes', count(*) filter (where estado = 'pendiente'),
        'disponibles', count(*) filter (where estado = 'aprobado' and disponible and ubicacion_at > now() - interval '15 minutes'))
      from gruas.prestadores)
  ) into r
  from gruas.solicitudes
  where created_at >= p_desde;
  return r;
end;
$$;

-- ── Historial de estados ────────────────────────────────────────────────
create function gruas.registrar_evento()
returns trigger
language plpgsql security definer set search_path = gruas, public
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into gruas.eventos (solicitud_id, estado, actor)
    values (new.id, new.estado, coalesce(public.current_user_role()::text, 'sistema'));
  end if;
  return new;
end;
$$;

create trigger registrar_evento_trg
  after insert or update of estado on gruas.solicitudes
  for each row execute function gruas.registrar_evento();

-- ── Tiempo real: estado de la solicitud, ofertas y chat ────────────────
do $$
begin
  execute 'alter publication supabase_realtime add table gruas.solicitudes';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table gruas.ofertas';
exception when duplicate_object then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table gruas.mensajes';
exception when duplicate_object then null;
end $$;

-- Funciones internas: no se llaman desde la app.
revoke execute on all functions in schema gruas from public, anon;
grant execute on all functions in schema gruas to authenticated;
revoke execute on function gruas.despachar(uuid) from authenticated;
revoke execute on function gruas.vencer_ofertas() from authenticated;
revoke execute on function gruas.cotizar_dueno(uuid, uuid, text, numeric, text[], uuid) from authenticated;
revoke execute on function gruas.candidatos(double precision, double precision, text, numeric, text[], uuid, uuid[]) from authenticated;
