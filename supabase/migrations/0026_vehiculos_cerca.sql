-- Vehículos disponibles cerca, para el mapa del inicio del cliente (como en
-- DiDi/Uber: se ven los móviles dando vueltas antes de pedir).
--
-- Solo datos reales: fleteros de Mudanzas y gruistas que están disponibles,
-- libres y mandaron su ubicación hace poco. Por privacidad no devuelve ids,
-- nombres ni patentes, y la posición va redondeada a ~100 m.

create function public.vehiculos_cerca(p_lat double precision, p_lng double precision)
returns table (servicio text, lat double precision, lng double precision)
language sql stable security definer set search_path = public, gruas, extensions
as $$
  (
    select 'mudanzas'::text,
      round((d.ubicacion_actual ->> 'lat')::numeric, 3)::float8,
      round((d.ubicacion_actual ->> 'lng')::numeric, 3)::float8
    from public.drivers d
    join public.companies c on c.id = d.company_id and c.estado_aprobacion = 'aprobada'
    where d.disponibilidad
      and d.ubicacion_actual ? 'lat'
      and d.ubicacion_at > now() - interval '15 minutes'
      and abs((d.ubicacion_actual ->> 'lat')::float8 - p_lat) < 0.15
      and abs((d.ubicacion_actual ->> 'lng')::float8 - p_lng) < 0.18
      and not exists (
        select 1 from public.orders o
        where o.driver_id = d.id and o.estado in ('asignado', 'en_camino_origen', 'cargando', 'en_camino_destino')
      )
    order by power((d.ubicacion_actual ->> 'lat')::float8 - p_lat, 2)
      + power((d.ubicacion_actual ->> 'lng')::float8 - p_lng, 2)
    limit 12
  )
  union all
  (
    select 'gruas'::text, round(p.lat::numeric, 3)::float8, round(p.lng::numeric, 3)::float8
    from gruas.prestadores p
    left join gruas.empresas e on e.id = p.empresa_id
    where p.estado = 'aprobado'
      and p.disponible
      and p.ubicacion is not null
      and p.ubicacion_at > now() - interval '15 minutes'
      and (p.empresa_id is null or e.estado = 'aprobada')
      and extensions.st_dwithin(p.ubicacion, gruas.punto(p_lat, p_lng), 15000)
      and gruas.documentacion_ok(p.id)
      and not exists (
        select 1 from gruas.solicitudes s
        where s.prestador_id = p.id and s.estado in ('asignada', 'en_camino', 'en_origen', 'trasladando')
      )
    order by extensions.st_distance(p.ubicacion, gruas.punto(p_lat, p_lng))
    limit 12
  );
$$;

revoke execute on function public.vehiculos_cerca(double precision, double precision) from public, anon;
grant execute on function public.vehiculos_cerca(double precision, double precision) to authenticated;
