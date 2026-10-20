-- Contabilidad (comisiones y liquidaciones), marketing (estadísticas de uso)
-- y anuncios/pop-ups. Requiere la 0012 (rol marketing) ya aplicada.

-- ── Configuración global ────────────────────────────────────────────────
create table public.config (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.config enable row level security;

create policy "config_select" on public.config
  for select to authenticated
  using (true);

create policy "config_write" on public.config
  for all to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');

-- Comisión de Flety por defecto (%), si la empresa no tiene una propia (companies.comision_pct).
insert into public.config (clave, valor) values ('comision_pct_default', '10')
on conflict (clave) do nothing;

-- ── Visitas (estadísticas de uso, anónimas) ─────────────────────────────
-- No se guarda IP ni ubicación precisa: solo tipo de dispositivo, sistema,
-- navegador, pantalla y rol (si hay sesión).
create table public.visitas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  sesion text not null check (char_length(sesion) between 8 and 64),
  user_id uuid references public.users (id) on delete set null,
  rol text,
  plataforma text not null check (plataforma in ('web', 'ios', 'android')),
  dispositivo text not null check (dispositivo in ('mobile', 'tablet', 'desktop')),
  sistema text check (char_length(sistema) <= 40),
  navegador text check (char_length(navegador) <= 40),
  pantalla text check (char_length(pantalla) <= 80),
  origen text check (char_length(origen) <= 120)
);

create index visitas_created_at_idx on public.visitas (created_at);

create function public.set_visita_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.rol := case when auth.uid() is null then 'visitante' else public.current_user_role()::text end;
  new.created_at := now();
  return new;
end;
$$;

create trigger set_visita_usuario_trg
  before insert on public.visitas
  for each row execute function public.set_visita_usuario();

alter table public.visitas enable row level security;

-- Cualquiera registra su visita; solo marketing/superadmin leen (vía la función de abajo).
create policy "visitas_insert" on public.visitas
  for insert to anon, authenticated
  with check (true);

create policy "visitas_select" on public.visitas
  for select to authenticated
  using (public.current_user_role() in ('marketing', 'superadmin'));

-- ── Anuncios / pop-ups ──────────────────────────────────────────────────
create table public.anuncios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 2 and 80),
  texto text check (char_length(texto) <= 300),
  imagen_url text check (imagen_url ~ '^https://'),
  cta_texto text check (char_length(cta_texto) <= 30),
  cta_url text check (cta_url ~ '^(https://|/)'),
  -- A quién se le muestra: visitante (sin sesión), cliente, chofer, empresa.
  audiencia text[] not null default array['visitante', 'cliente'],
  activo boolean not null default false,
  desde timestamptz,
  hasta timestamptz,
  created_by uuid references public.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.anuncios enable row level security;

-- Los activos y vigentes los ve cualquiera (la app elige según la audiencia).
create policy "anuncios_select_publico" on public.anuncios
  for select to anon, authenticated
  using (activo and (desde is null or desde <= now()) and (hasta is null or hasta > now()));

create policy "anuncios_select_marketing" on public.anuncios
  for select to authenticated
  using (public.current_user_role() in ('marketing', 'superadmin'));

create policy "anuncios_write" on public.anuncios
  for all to authenticated
  using (public.current_user_role() in ('marketing', 'superadmin'))
  with check (public.current_user_role() in ('marketing', 'superadmin'));

create table public.anuncio_eventos (
  id bigint generated always as identity primary key,
  anuncio_id uuid not null references public.anuncios (id) on delete cascade,
  tipo text not null check (tipo in ('vista', 'click', 'cierre')),
  created_at timestamptz not null default now()
);

create index anuncio_eventos_anuncio_idx on public.anuncio_eventos (anuncio_id, tipo);

alter table public.anuncio_eventos enable row level security;

create policy "anuncio_eventos_insert" on public.anuncio_eventos
  for insert to anon, authenticated
  with check (true);

create policy "anuncio_eventos_select" on public.anuncio_eventos
  for select to authenticated
  using (public.current_user_role() in ('marketing', 'superadmin'));

-- ── Estadísticas para el panel de marketing ─────────────────────────────
-- Todo agregado: el panel nunca recibe filas de usuarios.
create function public.estadisticas_marketing(p_desde timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  r jsonb;
begin
  if coalesce(public.current_user_role()::text, '') not in ('marketing', 'superadmin') then
    raise exception 'Solo marketing o superadmin';
  end if;

  select jsonb_build_object(
    'visitas', (select count(*) from visitas where created_at >= p_desde),
    'sesiones', (select count(distinct sesion) from visitas where created_at >= p_desde),
    'registros', (select count(*) from users where created_at >= p_desde),
    'pedidos', (select count(*) from orders where created_at >= p_desde),
    'completados', (select count(*) from orders where created_at >= p_desde and estado in ('entregado', 'confirmado', 'liquidado')),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', dia, 'sesiones', ses, 'pedidos', ped) order by dia)
      from (
        select d::date as dia,
          (select count(distinct sesion) from visitas v where v.created_at::date = d::date) as ses,
          (select count(*) from orders o where o.created_at::date = d::date) as ped
        from generate_series(p_desde::date, now()::date, interval '1 day') d
      ) t
    ), '[]'::jsonb),
    'dispositivos', coalesce((
      select jsonb_object_agg(dispositivo, n) from (
        select dispositivo, count(distinct sesion) n from visitas where created_at >= p_desde group by dispositivo
      ) t
    ), '{}'::jsonb),
    'sistemas', coalesce((
      select jsonb_object_agg(coalesce(sistema, 'Otro'), n) from (
        select sistema, count(distinct sesion) n from visitas where created_at >= p_desde group by sistema
      ) t
    ), '{}'::jsonb),
    'navegadores', coalesce((
      select jsonb_object_agg(coalesce(navegador, 'Otro'), n) from (
        select navegador, count(distinct sesion) n from visitas where created_at >= p_desde group by navegador
      ) t
    ), '{}'::jsonb),
    'roles', coalesce((
      select jsonb_object_agg(coalesce(rol, 'visitante'), n) from (
        select rol, count(distinct sesion) n from visitas where created_at >= p_desde group by rol
      ) t
    ), '{}'::jsonb),
    'pantallas', coalesce((
      select jsonb_agg(jsonb_build_object('pantalla', pantalla, 'n', n)) from (
        select pantalla, count(*) n from visitas where created_at >= p_desde and pantalla is not null
        group by pantalla order by n desc limit 8
      ) t
    ), '[]'::jsonb),
    -- Zonas: la localidad del retiro (lo que va después de la última coma de la dirección).
    'zonas', coalesce((
      select jsonb_agg(jsonb_build_object('zona', zona, 'n', n)) from (
        select trim(regexp_replace(origen ->> 'direccion', '^.*,', '')) as zona, count(*) n
        from orders where created_at >= p_desde and origen ? 'direccion'
        group by 1 order by n desc limit 8
      ) t
    ), '[]'::jsonb),
    'tipos', coalesce((
      select jsonb_object_agg(tipo, n) from (
        select tipo, count(*) n from orders where created_at >= p_desde group by tipo
      ) t
    ), '{}'::jsonb),
    'horas', coalesce((
      select jsonb_agg(jsonb_build_object('hora', h, 'n', n) order by h) from (
        select extract(hour from created_at at time zone 'America/Argentina/Mendoza')::int h, count(*) n
        from orders where created_at >= p_desde group by 1
      ) t
    ), '[]'::jsonb),
    'anuncios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'titulo', a.titulo, 'activo', a.activo,
        'vistas', (select count(*) from anuncio_eventos e where e.anuncio_id = a.id and e.tipo = 'vista' and e.created_at >= p_desde),
        'clicks', (select count(*) from anuncio_eventos e where e.anuncio_id = a.id and e.tipo = 'click' and e.created_at >= p_desde)
      ) order by a.created_at desc)
      from anuncios a
    ), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;

revoke execute on function public.estadisticas_marketing(timestamptz) from public, anon;
grant execute on function public.estadisticas_marketing(timestamptz) to authenticated;

-- Marketing necesita ver su propio perfil (ya cubierto por users_select de 0002).
