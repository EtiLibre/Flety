-- Perfil público del fletero (marketplace y seguimiento): datos del vehículo,
-- reputación, viajes y reseñas. La patente completa solo la ven quienes tienen
-- un pedido con ese chofer asignado, el propio chofer, su empresa y el superadmin;
-- el resto la ve parcialmente tapada.
--
-- drivers.vehiculo (jsonb) suma: marca, modelo, anio, color (además de tipo y patente).

-- "AE 123 FT" -> "AE 1•• FT"; "ABC123" -> "AB••23" (deja el principio y el final).
create function public.patente_tapada(p text)
returns text
language sql immutable
as $$
  select case
    when p is null or char_length(p) < 5 then p
    when char_length(p) >= 8 then left(p, 4) || repeat('•', char_length(p) - 7) || right(p, 3)
    else left(p, 2) || repeat('•', char_length(p) - 4) || right(p, 2)
  end;
$$;

create function public.puede_ver_patente(p_driver uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.current_user_role() = 'superadmin'
    or p_driver = public.current_driver_id()
    or exists (
      select 1 from public.drivers d
      where d.id = p_driver and public.current_user_role() = 'empresa'
        and d.company_id = public.current_user_company_id()
    )
    or exists (
      select 1 from public.orders o
      where o.driver_id = p_driver and o.cliente_id = auth.uid()
        and o.estado in ('asignado', 'en_camino_origen', 'cargando', 'en_camino_destino', 'entregado', 'confirmado', 'liquidado', 'en_disputa')
    );
$$;

create function public.perfil_fletero(p_driver uuid)
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
      'patente_completa', ver_patente
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

revoke execute on function public.perfil_fletero(uuid) from public, anon;
grant execute on function public.perfil_fletero(uuid) to authenticated;
revoke execute on function public.puede_ver_patente(uuid) from public, anon;
grant execute on function public.puede_ver_patente(uuid) to authenticated;

-- El marketplace suma los datos del vehículo para dibujarlo en la lista (sin patente).
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
        'color', d.vehiculo ->> 'color'
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

revoke execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) from public, anon;
grant execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) to authenticated;
