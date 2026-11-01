-- LUGARES GUARDADOS (privados) y freno a nombres personales en las sugerencias.
--
-- "Casa", "Trabajo", "Depto de mamá"… son de cada usuario: se guardan acá y
-- solo los ve quien los guardó (como en DiDi/Uber). La sugerencia pública de
-- lugares (0023) queda solo para comercios y lugares públicos: si el nombre es
-- personal, se rechaza (además lo revisa el admin antes de publicarlo).

create table public.lugares_guardados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  etiqueta text not null check (char_length(trim(etiqueta)) between 1 and 40),
  direccion text check (char_length(direccion) <= 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_at timestamptz not null default now()
);
create unique index lugares_guardados_etiqueta on public.lugares_guardados (user_id, lower(trim(etiqueta)));

alter table public.lugares_guardados enable row level security;
revoke all on public.lugares_guardados from anon;
grant select, insert, update, delete on public.lugares_guardados to authenticated;
create policy "guardados_propios" on public.lugares_guardados for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create function public.limitar_guardados()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.lugares_guardados where user_id = new.user_id) >= 15 then
    raise exception 'Podés guardar hasta 15 lugares';
  end if;
  new.etiqueta := trim(new.etiqueta);
  return new;
end;
$$;
create trigger limitar_guardados_trg before insert on public.lugares_guardados
  for each row execute function public.limitar_guardados();

-- ¿Es un nombre de lugar personal? (casa, trabajo, mi depto, casa de mamá…)
create function public.es_nombre_personal(p_nombre text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select t ~ '^(casa|hogar|trabajo|laburo|oficina|depto|dpto|departamento|domicilio|aca|aqui|home|work)$'
      or t ~ '^(mi|mis) (casa|hogar|trabajo|laburo|oficina|depto|dpto|departamento|lugar|domicilio)'
      or t ~ '^(la )?(casa|depto|dpto|departamento|lo) (de|del) (mi |mis |la |el )?(mama|papa|abuela|abuelo|abuelos|suegra|suegro|suegros|novia|novio|tia|tio|hermana|hermano|hijo|hija|amiga|amigo)( |$)'
      or t ~ '^(mama|papa|abuela|abuelo|abuelos|suegra|suegro|suegros|novia|novio|tia|tio|hermana|hermano)$'
      or t ~ '^[0-9 ]+$'
  from (select regexp_replace(trim(public.texto_busqueda(p_nombre)), '\s+', ' ', 'g') as t) x;
$$;

create or replace function public.limitar_sugerencias()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.lugares_sugeridos
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Llegaste al máximo de lugares sugeridos por hoy';
  end if;
  if public.es_nombre_personal(new.nombre) then
    raise exception 'Ese nombre es personal: guardalo como lugar tuyo (solo lo ves vos)';
  end if;
  new.nombre := trim(new.nombre);
  return new;
end;
$$;
