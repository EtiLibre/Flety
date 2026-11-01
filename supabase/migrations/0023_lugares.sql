-- LUGARES: buscador de comercios y lugares por nombre ("Wabi", "Hospital
-- Central", "Mendoza Plaza Shopping"), sin depender de Google.
--
-- 1. public.lugares: base abierta de Overture Maps Places (licencia CDLA
--    Permissive 2.0, uso comercial permitido citando la fuente) + lugares que
--    cargan los usuarios y aprueba el equipo de Flety.
-- 2. public.lugares_sugeridos: lo que proponen los usuarios cuando no
--    encuentran un lugar y lo marcan en el mapa.
-- 3. public.buscar_lugares(): búsqueda tolerante a errores de tipeo y
--    tildes, priorizando los más cercanos.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent no es "immutable": este envoltorio sí, para poder indexar.
create or replace function public.texto_busqueda(t text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')));
$$;

create table public.lugares (
  id text primary key,
  nombre text not null check (char_length(nombre) between 2 and 160),
  categoria text,
  direccion text,
  localidad text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  fuente text not null default 'overture' check (fuente in ('overture', 'usuario', 'flety')),
  confianza numeric,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index lugares_nombre_trgm on public.lugares
  using gin (public.texto_busqueda(nombre) extensions.gin_trgm_ops);
create index lugares_pos on public.lugares (lat, lng);

alter table public.lugares enable row level security;
revoke all on public.lugares from anon;
grant select on public.lugares to authenticated;
create policy "lugares_select" on public.lugares for select to authenticated using (activo);
create policy "lugares_admin" on public.lugares for all to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');
grant insert, update, delete on public.lugares to authenticated;

-- Sugerencias de los usuarios.
create table public.lugares_sugeridos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  nombre text not null check (char_length(trim(nombre)) between 2 and 120),
  direccion text check (char_length(direccion) <= 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  lugar_id text references public.lugares (id) on delete set null,
  created_at timestamptz not null default now(),
  revisado_at timestamptz
);
create index lugares_sugeridos_estado on public.lugares_sugeridos (estado, created_at desc);

alter table public.lugares_sugeridos enable row level security;
revoke all on public.lugares_sugeridos from anon;
grant select, insert on public.lugares_sugeridos to authenticated;
grant update on public.lugares_sugeridos to authenticated;
create policy "sugeridos_insert" on public.lugares_sugeridos for insert to authenticated
  with check (user_id = auth.uid() and estado = 'pendiente');
create policy "sugeridos_select" on public.lugares_sugeridos for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'superadmin');
create policy "sugeridos_admin" on public.lugares_sugeridos for update to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');

-- Freno a abusos: hasta 20 sugerencias por usuario por día.
create or replace function public.limitar_sugerencias()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.lugares_sugeridos
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Llegaste al máximo de lugares sugeridos por hoy';
  end if;
  new.nombre := trim(new.nombre);
  return new;
end;
$$;
create trigger limitar_sugerencias_trg before insert on public.lugares_sugeridos
  for each row execute function public.limitar_sugerencias();

-- Búsqueda: parecido por palabras (tolera errores y tildes) y cercanía.
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
         or q.t <% public.texto_busqueda(l.nombre))
  order by
    (public.texto_busqueda(l.nombre) like q.t || '%') desc,
    word_similarity(q.t, public.texto_busqueda(l.nombre)) desc,
    ((l.lat - p_lat) ^ 2 + (l.lng - p_lng) ^ 2) asc
  limit least(greatest(coalesce(p_limite, 6), 1), 10);
$$;
revoke execute on function public.buscar_lugares(text, double precision, double precision, int) from anon;
grant execute on function public.buscar_lugares(text, double precision, double precision, int) to authenticated;

-- Superadmin: aprobar o rechazar una sugerencia (al aprobar, pasa a lugares).
create or replace function public.revisar_lugar_sugerido(p_id uuid, p_aprobar boolean, p_nombre text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s public.lugares_sugeridos;
  nuevo text;
begin
  if public.current_user_role() is distinct from 'superadmin' then
    raise exception 'Solo el equipo de Flety revisa lugares';
  end if;
  select * into s from public.lugares_sugeridos where id = p_id for update;
  if not found or s.estado <> 'pendiente' then
    raise exception 'La sugerencia ya fue revisada';
  end if;
  if p_aprobar then
    nuevo := 'u-' || s.id::text;
    insert into public.lugares (id, nombre, direccion, lat, lng, fuente, confianza)
    values (nuevo, coalesce(nullif(trim(p_nombre), ''), s.nombre), s.direccion, s.lat, s.lng, 'usuario', 1)
    on conflict (id) do nothing;
  end if;
  update public.lugares_sugeridos
  set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
      lugar_id = nuevo,
      revisado_at = now()
  where id = s.id;
end;
$$;
revoke execute on function public.revisar_lugar_sugerido(uuid, boolean, text) from anon;
grant execute on function public.revisar_lugar_sugerido(uuid, boolean, text) to authenticated;
