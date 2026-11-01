-- 1. Búsqueda de lugares más tolerante a errores de tipeo ("wabbi" → Wabi).
create or replace function public.buscar_lugares(
  p_q text,
  p_lat double precision default -32.8895,
  p_lng double precision default -68.8458,
  p_limite int default 6
)
returns table (
  id text,
  nombre text,
  categoria text,
  direccion text,
  localidad text,
  lat double precision,
  lng double precision,
  fuente text
)
language sql stable security invoker set search_path = public, extensions
as $$
  with q as (select public.texto_busqueda(trim(p_q)) t)
  select l.id, l.nombre, l.categoria, l.direccion, l.localidad, l.lat, l.lng, l.fuente
  from public.lugares l, q
  where l.activo
    and char_length(q.t) >= 2
    and (public.texto_busqueda(l.nombre) like '%' || q.t || '%'
         or word_similarity(q.t, public.texto_busqueda(l.nombre)) >= 0.35)
  order by
    (public.texto_busqueda(l.nombre) like q.t || '%') desc,
    word_similarity(q.t, public.texto_busqueda(l.nombre)) desc,
    ((l.lat - p_lat) ^ 2 + (l.lng - p_lng) ^ 2) asc
  limit least(greatest(coalesce(p_limite, 6), 1), 10);
$$;
revoke execute on function public.buscar_lugares(text, double precision, double precision, int) from anon;
grant execute on function public.buscar_lugares(text, double precision, double precision, int) to authenticated;

-- 2. La clave de servidor (solo scripts del equipo y futuras funciones de
--    pago, nunca la app) puede operar el esquema gruas.
grant usage on schema gruas to service_role;
grant all on all tables in schema gruas to service_role;
grant all on all sequences in schema gruas to service_role;
grant execute on all functions in schema gruas to service_role;
alter default privileges in schema gruas grant all on tables to service_role;
alter default privileges in schema gruas grant execute on functions to service_role;
