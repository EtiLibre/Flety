-- Fotos reales del vehículo del fletero.
--
-- 1. El chofer sube fotos de su propio vehículo (bucket público "vehiculos",
--    carpeta <driver_id>/). Se guardan las rutas en drivers.vehiculo.fotos.
-- 2. Si no sube ninguna, elige una foto de referencia de su modelo (Wikimedia
--    Commons, con autor y licencia): drivers.vehiculo.foto_modelo.
-- 3. Sin ninguna de las dos, la app muestra el dibujo generado.
--
-- Son fotos que ve cualquier cliente del marketplace: el bucket es público (las
-- rutas llevan el id del chofer y un nombre al azar). Solo el chofer escribe en
-- su carpeta (y el superadmin).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehiculos', 'vehiculos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "vehiculos_select_propias" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehiculos'
    and (
      (storage.foldername(name))[1] = public.current_driver_id()::text
      or public.current_user_role() = 'superadmin'
    )
  );

create policy "vehiculos_insert_propias" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehiculos'
    and (
      (storage.foldername(name))[1] = public.current_driver_id()::text
      or public.current_user_role() = 'superadmin'
    )
  );

create policy "vehiculos_delete_propias" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehiculos'
    and (
      (storage.foldername(name))[1] = public.current_driver_id()::text
      or public.current_user_role() = 'superadmin'
    )
  );

-- Solo rutas de la carpeta del propio chofer (hasta 3).
create function public.fotos_vehiculo(p_driver uuid, p_vehiculo jsonb)
returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_agg(f.value order by f.ord), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_vehiculo -> 'fotos') = 'array' then p_vehiculo -> 'fotos' else '[]'::jsonb end
  ) with ordinality as f(value, ord)
  where jsonb_typeof(f.value) = 'string'
    and (f.value #>> '{}') like p_driver::text || '/%'
    and f.ord <= 3;
$$;

-- Solo fotos de Wikimedia Commons (url y página), con autor y licencia.
create function public.foto_modelo_vehiculo(p_vehiculo jsonb)
returns jsonb
language sql immutable
as $$
  select case
    when p_vehiculo -> 'foto_modelo' = '"ninguna"'::jsonb then '"ninguna"'::jsonb
    when jsonb_typeof(p_vehiculo -> 'foto_modelo') = 'object'
      and (p_vehiculo #>> '{foto_modelo,url}') ~ '^https://(upload|thumb)\.wikimedia\.org/'
      and coalesce(p_vehiculo #>> '{foto_modelo,pagina}', '') like 'https://commons.wikimedia.org/%'
    then jsonb_build_object(
      'url', p_vehiculo #>> '{foto_modelo,url}',
      'autor', left(p_vehiculo #>> '{foto_modelo,autor}', 120),
      'licencia', left(p_vehiculo #>> '{foto_modelo,licencia}', 40),
      'pagina', p_vehiculo #>> '{foto_modelo,pagina}'
    )
  end;
$$;

-- Perfil del fletero: suma fotos y foto_modelo al vehículo.
create or replace function public.perfil_fletero(p_driver uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  r jsonb;
  ver_patente boolean := public.puede_ver_patente(p_driver);
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select jsonb_build_object(
    'driver_id', d.id,
    -- Nombre de pila + inicial del apellido.
    'nombre', trim(split_part(trim(coalesce(u.nombre, 'Fletero')), ' ', 1) || ' ' ||
      coalesce(nullif(left(split_part(trim(coalesce(u.nombre, '')), ' ', 2), 1), '') || '.', '')),
    'empresa', c.nombre,
    'empresa_verificada', c.estado_aprobacion = 'aprobada',
    'desde', d.created_at,
    'vehiculo', jsonb_build_object(
      'tipo', d.vehiculo ->> 'tipo',
      'marca', d.vehiculo ->> 'marca',
      'modelo', d.vehiculo ->> 'modelo',
      'anio', d.vehiculo ->> 'anio',
      'color', d.vehiculo ->> 'color',
      'patente', case when ver_patente then d.vehiculo ->> 'patente' else public.patente_tapada(d.vehiculo ->> 'patente') end,
      'patente_completa', ver_patente,
      'fotos', public.fotos_vehiculo(d.id, d.vehiculo),
      'foto_modelo', public.foto_modelo_vehiculo(d.vehiculo)
    ),
    'estrellas', (select round(avg(estrellas)::numeric, 1) from calificaciones where driver_id = d.id),
    'calificaciones', (select count(*) from calificaciones where driver_id = d.id),
    'viajes', (select count(*) from orders where driver_id = d.id and estado in ('entregado', 'confirmado', 'liquidado')),
    -- Últimas reseñas con comentario (sin datos del cliente).
    'resenas', coalesce((
      select jsonb_agg(jsonb_build_object('estrellas', x.estrellas, 'comentario', x.comentario, 'fecha', x.created_at) order by x.created_at desc)
      from (
        select estrellas, comentario, created_at from calificaciones
        where driver_id = d.id and comentario is not null
        order by created_at desc limit 5
      ) x
    ), '[]'::jsonb)
  )
  into r
  from drivers d
  join companies c on c.id = d.company_id
  join users u on u.id = d.user_id
  where d.id = p_driver
    -- Públicos solo los de empresas aprobadas; los demás, solo para quien ya puede ver la patente.
    and (c.estado_aprobacion = 'aprobada' or ver_patente);

  return r;
end;
$$;

-- El marketplace suma las fotos (o la del modelo) para la miniatura.
create or replace function public.fleteros_disponibles(
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
  calificaciones integer,
  auto jsonb
)
language sql stable security definer set search_path = public
as $$
  select f_driver, f_nombre, f_empresa, f_company, f_vehiculo, distancia, f_lat, f_lng, f_precio,
    r.estrellas, coalesce(r.cantidad, 0), f_auto
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
      public.precio_para(c.id, coalesce(d.vehiculo ->> 'tipo', p_vehiculo), p_km, p_ayudantes) as f_precio,
      jsonb_build_object(
        'marca', d.vehiculo ->> 'marca',
        'modelo', d.vehiculo ->> 'modelo',
        'anio', d.vehiculo ->> 'anio',
        'color', d.vehiculo ->> 'color',
        'fotos', public.fotos_vehiculo(d.id, d.vehiculo),
        'foto_modelo', public.foto_modelo_vehiculo(d.vehiculo)
      ) as f_auto
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
