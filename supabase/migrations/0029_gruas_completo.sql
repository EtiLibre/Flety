-- GRÚAS: pedido más completo.
--   1. Catálogos con todas las opciones habituales (vehículos, problemas y situaciones).
--      Los problemas "en el lugar" (batería, rueda, combustible…) no necesitan destino.
--   2. Foto obligatoria del vehículo o del lugar (bucket privado gruas-fotos).
--   3. Elegir grúa: el cliente puede pedirle a una grúa o empresa en particular;
--      si no acepta a tiempo, se ofrece a la más cercana como siempre.

-- ── 1. Catálogos ────────────────────────────────────────────────────────
insert into gruas.tipos_vehiculo (id, nombre, orden) values
  ('auto', 'Auto', 1),
  ('camioneta', 'Camioneta o SUV', 2),
  ('pickup', 'Pick-up o 4x4', 3),
  ('utilitario', 'Utilitario o furgón', 4),
  ('moto', 'Moto', 5),
  ('cuatri', 'Cuatriciclo o UTV', 6),
  ('bici', 'Bicicleta o monopatín', 7),
  ('clasico', 'Auto clásico o de colección', 8),
  ('camion_liviano', 'Camión liviano (hasta 3,5 t)', 9),
  ('casa_rodante', 'Casa rodante o tráiler', 10),
  ('otro', 'Otro vehículo', 11)
on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden;

alter table gruas.motivos add column en_el_lugar boolean not null default false;

insert into gruas.motivos (id, nombre, orden, en_el_lugar) values
  ('no_arranca', 'No arranca', 1, false),
  ('bateria', 'Batería descargada', 2, true),
  ('pinchadura', 'Rueda pinchada', 3, true),
  ('choque', 'Choque o accidente', 4, false),
  ('falla_mecanica', 'Falla mecánica', 5, false),
  ('recalentado', 'Se recalentó el motor', 6, false),
  ('falla_electrica', 'Falla eléctrica', 7, false),
  ('sin_combustible', 'Sin combustible', 8, true),
  ('encajado', 'Encajado (barro, arena o nieve)', 9, true),
  ('llaves_adentro', 'Llaves adentro o perdidas', 10, true),
  ('traslado', 'Traslado programado', 11, false),
  ('taller', 'Llevar al taller o service', 12, false),
  ('compra_venta', 'Traslado por compra o venta', 13, false),
  ('otro', 'Otro', 14, false)
on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden, en_el_lugar = excluded.en_el_lugar;

insert into gruas.situaciones (id, nombre, orden) values
  ('subsuelo', 'Está en un subsuelo o cochera', 1),
  ('techo_bajo', 'Cochera con techo bajo', 2),
  ('sin_llaves', 'Sin llaves o volante trabado', 3),
  ('ruedas_trabadas', 'Ruedas trabadas o sin girar', 4),
  ('sin_rueda', 'Le falta una rueda', 5),
  ('automatico_4x4', 'Caja automática o 4x4 (va en plancha)', 6),
  ('rebajado', 'Vehículo rebajado o muy bajo', 7),
  ('volcado', 'Volcado o fuera del camino', 8),
  ('ruta', 'En ruta o autopista', 9),
  ('tierra', 'Camino de tierra o ripio', 10),
  ('con_carga', 'Con carga o acoplado', 11)
on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden;

-- ── 2. Fotos del vehículo ───────────────────────────────────────────────
-- La app las sube a <cliente_id>/… antes de pedir y solicitar() las asocia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gruas-fotos', 'gruas-fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create table gruas.fotos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references gruas.solicitudes (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now(),
  unique (solicitud_id, path)
);
create index fotos_solicitud_idx on gruas.fotos (solicitud_id);

alter table gruas.fotos enable row level security;
revoke all on gruas.fotos from anon, authenticated;
grant select on gruas.fotos to authenticated;
grant all on gruas.fotos to service_role;

-- Las ven el cliente, la grúa asignada (y su empresa), el admin y las grúas a
-- las que se les ofreció el servicio (para decidir si lo toman).
create function gruas.puede_ver_fotos(p_solicitud uuid)
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select gruas.es_parte(p_solicitud) or exists (
    select 1 from gruas.ofertas o where o.solicitud_id = p_solicitud and o.prestador_id = gruas.mi_prestador()
  );
$$;

revoke execute on function gruas.puede_ver_fotos(uuid) from public, anon;
grant execute on function gruas.puede_ver_fotos(uuid) to authenticated;

create policy "fotos_select" on gruas.fotos for select to authenticated
  using (gruas.puede_ver_fotos(solicitud_id));

create policy "gruas_fotos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'gruas-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "gruas_fotos_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'gruas-fotos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from gruas.fotos f where f.path = objects.name and gruas.puede_ver_fotos(f.solicitud_id))
    )
  );

-- ── 3. Grúa elegida por el cliente ──────────────────────────────────────
alter table gruas.solicitudes add column prestador_solicitado uuid references gruas.prestadores (id) on delete set null;

-- Cotizar: además del precio, quién es cada grúa (para poder elegirla).
create or replace function gruas.cotizar(
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
    'prestador_id', c.prestador_id,
    'nombre', coalesce(nullif(split_part(trim(u.nombre), ' ', 1), ''), 'Gruista'),
    'empresa', e.nombre,
    'foto', p.foto,
    'modalidad', un.modalidad,
    'unidad', jsonb_build_object('marca', un.marca, 'modelo', un.modelo),
    'estrellas', r.estrellas,
    'calificaciones', coalesce(r.cantidad, 0),
    'distancia_km', c.distancia_km, 'eta_min', c.eta_min, 'lat', c.lat, 'lng', c.lng,
    'total', c.total, 'cotizacion', c.cotizacion
  ) order by c.distancia_km), '[]'::jsonb)
  into opciones
  from gruas.candidatos((p_origen ->> 'lat')::float8, (p_origen ->> 'lng')::float8, p_tipo, km,
    p_situaciones, zid, '{}') c
  join gruas.prestadores p on p.id = c.prestador_id
  join public.users u on u.id = p.user_id
  left join gruas.empresas e on e.id = p.empresa_id
  left join gruas.unidades un on un.id = c.unidad_id
  left join lateral (
    select round(avg(k.estrellas)::numeric, 1) as estrellas, count(*)::int as cantidad
    from gruas.calificaciones k where k.prestador_id = c.prestador_id
  ) r on true;

  return jsonb_build_object(
    'cobertura', true,
    'zona', jsonb_build_object('id', z.id, 'ciudad', z.ciudad, 'provincia', z.provincia),
    'km', km,
    'opciones', opciones
  );
end;
$$;

-- Despacho: primero a la grúa elegida (una vez); después, la más cercana.
create or replace function gruas.despachar(p_solicitud uuid)
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

  if s.prestador_solicitado is not null and not (s.prestador_solicitado = any(excluir)) then
    select * into c from gruas.candidatos(
      (s.origen ->> 'lat')::float8, (s.origen ->> 'lng')::float8, s.tipo_vehiculo, s.distancia_km,
      s.situaciones, s.zona_id, excluir
    ) x
    where x.prestador_id = s.prestador_solicitado
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
  end if;

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

-- Pedir: con fotos (obligatorio) y, si eligió, la grúa preferida.
drop function gruas.solicitar(jsonb, jsonb, numeric, text, jsonb, text, text[], text, numeric);
create function gruas.solicitar(
  p_origen jsonb, p_destino jsonb, p_distancia_km numeric, p_tipo text, p_vehiculo jsonb,
  p_motivo text, p_situaciones text[], p_nota text, p_precio_max numeric,
  p_fotos text[], p_prestador uuid default null
)
returns uuid
language plpgsql volatile security definer set search_path = gruas, public
as $$
declare
  zid uuid;
  nuevo uuid;
  en_lugar boolean;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  if (p_origen ->> 'lat') is null or (p_origen ->> 'lng') is null then
    raise exception 'Falta indicar dónde está el vehículo';
  end if;
  select m.en_el_lugar into en_lugar from gruas.motivos m where m.id = p_motivo;
  if not found then
    raise exception 'Elegí qué le pasa al vehículo';
  end if;
  if not en_lugar and (p_destino ->> 'lat') is null then
    raise exception 'Falta indicar a dónde lo llevamos';
  end if;
  if coalesce(array_length(p_fotos, 1), 0) < 1 then
    raise exception 'Subí al menos una foto del vehículo';
  end if;
  if array_length(p_fotos, 1) > 6 then
    raise exception 'Podés subir hasta 6 fotos';
  end if;
  if exists (
    select 1 from unnest(p_fotos) f(path)
    where split_part(f.path, '/', 1) <> auth.uid()::text
      or not exists (select 1 from storage.objects o where o.bucket_id = 'gruas-fotos' and o.name = f.path)
  ) then
    raise exception 'No pudimos leer una de las fotos. Subila de nuevo';
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
    vehiculo, motivo, situaciones, nota, precio_max, prestador_solicitado)
  values (auth.uid(), zid, p_origen, gruas.punto((p_origen ->> 'lat')::float8, (p_origen ->> 'lng')::float8),
    case when (p_destino ->> 'lat') is null then null else p_destino end,
    gruas.km_traslado(p_origen, p_destino, p_distancia_km), p_tipo, coalesce(p_vehiculo, '{}'),
    p_motivo, coalesce(p_situaciones, '{}'), nullif(left(trim(coalesce(p_nota, '')), 500), ''), p_precio_max,
    p_prestador)
  returning id into nuevo;

  insert into gruas.fotos (solicitud_id, path)
  select nuevo, f.path from unnest(p_fotos) f(path)
  on conflict do nothing;

  perform gruas.despachar(nuevo);
  return nuevo;
end;
$$;
revoke execute on function gruas.solicitar(jsonb, jsonb, numeric, text, jsonb, text, text[], text, numeric, text[], uuid)
  from public, anon;
grant execute on function gruas.solicitar(jsonb, jsonb, numeric, text, jsonb, text, text[], text, numeric, text[], uuid)
  to authenticated;
