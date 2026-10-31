-- GRÚAS (unidad de negocio independiente) · 1/3: esquema, tablas y permisos.
--
-- Todo vive en el esquema "gruas": nada de lo de Flety (public.orders,
-- drivers, companies, tarifas…) se toca ni se reutiliza. Se comparte solo la
-- cuenta (public.users) y el rol de superadmin para administrar.
-- Plan: docs/plan-plataforma-gruas.md.
--
-- Paso previo en Supabase (una vez): Settings → API → Exposed schemas → sumar "gruas".

create extension if not exists postgis with schema extensions;

create schema if not exists gruas;
grant usage on schema gruas to authenticated;

-- Las funciones de este esquema solo se ejecutan con sesión.
alter default privileges in schema gruas revoke execute on functions from public, anon;
alter default privileges in schema gruas grant execute on functions to authenticated;

-- ── Configuración y catálogos (editables desde el panel) ────────────────
create table gruas.config (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

insert into gruas.config (clave, valor) values
  ('comision_pct', '10'),            -- comisión de la plataforma sobre la tarifa del prestador
  ('segundos_oferta', '30'),         -- tiempo que tiene cada grúa para aceptar
  ('radio_km', '25'),                -- distancia máxima de la grúa al vehículo
  ('max_ofertas', '8'),              -- grúas a las que se ofrece antes de "sin grúa"
  ('velocidad_kmh', '35'),           -- para estimar la llegada
  ('exigir_documentos', 'true'),     -- licencia y seguro verificados y vigentes para recibir ofertas
  ('cancelacion', '{"buscando": 0, "asignada": 0, "en_camino": 20, "en_origen": 50}');

-- Zonas de cobertura: todo el país, se activan de a una. Arranca Mendoza.
create table gruas.zonas (
  id uuid primary key default gen_random_uuid(),
  provincia text not null check (char_length(provincia) between 2 and 60),
  ciudad text not null check (char_length(ciudad) between 2 and 80),
  lat double precision not null check (lat between -56 and -21),
  lng double precision not null check (lng between -74 and -53),
  radio_km numeric not null default 40 check (radio_km between 1 and 500),
  recargo_pct numeric not null default 0 check (recargo_pct between 0 and 300),
  comision_pct numeric check (comision_pct between 0 and 50),
  activa boolean not null default false,
  created_at timestamptz not null default now(),
  unique (provincia, ciudad)
);

insert into gruas.zonas (provincia, ciudad, lat, lng, radio_km, activa) values
  ('Mendoza', 'Gran Mendoza', -32.8895, -68.8458, 45, true),
  ('Buenos Aires', 'Ciudad de Buenos Aires y AMBA', -34.6037, -58.3816, 50, false),
  ('Buenos Aires', 'La Plata', -34.9214, -57.9545, 25, false),
  ('Buenos Aires', 'Mar del Plata', -38.0055, -57.5426, 25, false),
  ('Buenos Aires', 'Bahía Blanca', -38.7183, -62.2663, 20, false),
  ('Córdoba', 'Gran Córdoba', -31.4201, -64.1888, 35, false),
  ('Santa Fe', 'Rosario', -32.9442, -60.6505, 30, false),
  ('Santa Fe', 'Santa Fe', -31.6333, -60.7000, 25, false),
  ('San Juan', 'Gran San Juan', -31.5375, -68.5364, 30, false),
  ('San Luis', 'San Luis', -33.3017, -66.3378, 20, false),
  ('Tucumán', 'Gran San Miguel de Tucumán', -26.8083, -65.2176, 30, false),
  ('Salta', 'Salta', -24.7821, -65.4232, 25, false),
  ('Neuquén', 'Neuquén y Cipolletti', -38.9516, -68.0591, 30, false);

create table gruas.tipos_vehiculo (
  id text primary key,
  nombre text not null,
  orden int not null default 0,
  activo boolean not null default true
);

insert into gruas.tipos_vehiculo (id, nombre, orden) values
  ('auto', 'Auto', 1),
  ('camioneta', 'Camioneta o SUV', 2),
  ('moto', 'Moto', 3),
  ('utilitario', 'Utilitario', 4),
  ('otro', 'Otro vehículo', 5);

create table gruas.modalidades (
  id text primary key,
  nombre text not null,
  descripcion text
);

insert into gruas.modalidades (id, nombre, descripcion) values
  ('plancha', 'Plancha o camilla', 'El vehículo va arriba de la plancha'),
  ('arrastre', 'Arrastre con levante', 'Se levanta de un eje y se remolca'),
  ('moto', 'Grúa para motos', 'Traslado de motos');

create table gruas.motivos (
  id text primary key,
  nombre text not null,
  orden int not null default 0,
  activo boolean not null default true
);

insert into gruas.motivos (id, nombre, orden) values
  ('no_arranca', 'No arranca', 1),
  ('choque', 'Choque', 2),
  ('pinchadura', 'Pinchadura sin auxilio', 3),
  ('sin_combustible', 'Sin combustible', 4),
  ('traslado', 'Traslado programado', 5),
  ('otro', 'Otro', 6);

-- Situaciones que suman un adicional (cada prestador pone su precio).
create table gruas.situaciones (
  id text primary key,
  nombre text not null,
  orden int not null default 0,
  activo boolean not null default true
);

insert into gruas.situaciones (id, nombre, orden) values
  ('subsuelo', 'Está en un subsuelo o cochera', 1),
  ('sin_llaves', 'Sin llaves o volante trabado', 2),
  ('ruedas_trabadas', 'Ruedas trabadas o sin girar', 3),
  ('volcado', 'Volcado o fuera del camino', 4);

-- ── Prestadores: empresas de auxilio y gruistas ─────────────────────────
create table gruas.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  cuit text check (cuit ~ '^[0-9]{11}$'),
  owner_id uuid not null unique references public.users (id) on delete cascade,
  zona_id uuid references gruas.zonas (id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada', 'suspendida')),
  motivo text check (char_length(motivo) <= 300),
  created_at timestamptz not null default now()
);

create table gruas.prestadores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  empresa_id uuid references gruas.empresas (id) on delete set null,
  zona_id uuid references gruas.zonas (id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado', 'suspendido')),
  motivo text check (char_length(motivo) <= 300),
  telefono text check (char_length(telefono) between 6 and 30),
  foto text,
  disponible boolean not null default false,
  ubicacion extensions.geography(Point, 4326),
  lat double precision,
  lng double precision,
  ubicacion_at timestamptz,
  created_at timestamptz not null default now()
);

create index prestadores_ubicacion_idx on gruas.prestadores using gist (ubicacion);
create index prestadores_disponibles_idx on gruas.prestadores (disponible) where disponible;
create index prestadores_empresa_idx on gruas.prestadores (empresa_id);

-- La grúa (vehículo de trabajo) de cada gruista.
create table gruas.unidades (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references gruas.prestadores (id) on delete cascade,
  patente text not null check (char_length(patente) between 6 and 10),
  marca text check (char_length(marca) <= 40),
  modelo text check (char_length(modelo) <= 40),
  modalidad text not null default 'plancha' references gruas.modalidades (id),
  capacidad_kg int check (capacidad_kg between 300 and 40000),
  tipos_vehiculo text[] not null default '{auto,camioneta}',
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create index unidades_prestador_idx on gruas.unidades (prestador_id);

create table gruas.documentos (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references gruas.prestadores (id) on delete cascade,
  tipo text not null check (tipo in ('licencia', 'seguro', 'vtv', 'habilitacion', 'dni')),
  archivo text not null,
  vence date,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'verificado', 'rechazado')),
  motivo text check (char_length(motivo) <= 300),
  created_at timestamptz not null default now()
);

create index documentos_prestador_idx on gruas.documentos (prestador_id, tipo);

create table gruas.invitaciones (
  code text primary key,
  empresa_id uuid not null references gruas.empresas (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references public.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Tarifas: cada empresa (o gruista independiente) cotiza lo suyo ──────
-- El cliente ve la tarifa del prestador + la comisión de la plataforma.
create table gruas.tarifas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references gruas.empresas (id) on delete cascade,
  prestador_id uuid references gruas.prestadores (id) on delete cascade,
  tipo_vehiculo text not null references gruas.tipos_vehiculo (id),
  base numeric not null check (base >= 0),
  por_km numeric not null check (por_km >= 0),
  km_incluidos numeric not null default 0 check (km_incluidos >= 0),
  minimo numeric not null default 0 check (minimo >= 0),
  updated_at timestamptz not null default now(),
  check ((empresa_id is null) <> (prestador_id is null))
);

create unique index tarifas_empresa_tipo on gruas.tarifas (empresa_id, tipo_vehiculo) where empresa_id is not null;
create unique index tarifas_prestador_tipo on gruas.tarifas (prestador_id, tipo_vehiculo) where prestador_id is not null;

create table gruas.tarifa_recargos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references gruas.empresas (id) on delete cascade,
  prestador_id uuid references gruas.prestadores (id) on delete cascade,
  nocturno_pct numeric not null default 0 check (nocturno_pct between 0 and 300),
  nocturno_desde time not null default '22:00',
  nocturno_hasta time not null default '06:00',
  finde_pct numeric not null default 0 check (finde_pct between 0 and 300),
  check ((empresa_id is null) <> (prestador_id is null))
);

create unique index recargos_empresa on gruas.tarifa_recargos (empresa_id) where empresa_id is not null;
create unique index recargos_prestador on gruas.tarifa_recargos (prestador_id) where prestador_id is not null;

create table gruas.tarifa_adicionales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references gruas.empresas (id) on delete cascade,
  prestador_id uuid references gruas.prestadores (id) on delete cascade,
  situacion_id text not null references gruas.situaciones (id),
  monto numeric not null check (monto >= 0),
  check ((empresa_id is null) <> (prestador_id is null))
);

create unique index adicionales_empresa on gruas.tarifa_adicionales (empresa_id, situacion_id) where empresa_id is not null;
create unique index adicionales_prestador on gruas.tarifa_adicionales (prestador_id, situacion_id) where prestador_id is not null;

-- ── Solicitudes y despacho ──────────────────────────────────────────────
create table gruas.solicitudes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.users (id) on delete cascade,
  zona_id uuid references gruas.zonas (id) on delete set null,
  origen jsonb not null,
  origen_geo extensions.geography(Point, 4326) not null,
  destino jsonb,
  distancia_km numeric not null default 0 check (distancia_km between 0 and 3000),
  tipo_vehiculo text not null references gruas.tipos_vehiculo (id),
  vehiculo jsonb not null default '{}',
  motivo text not null references gruas.motivos (id),
  situaciones text[] not null default '{}',
  nota text check (char_length(nota) <= 500),
  estado text not null default 'buscando' check (estado in (
    'buscando', 'asignada', 'en_camino', 'en_origen', 'trasladando', 'finalizada',
    'sin_grua', 'cancelada_cliente', 'cancelada_admin'
  )),
  -- Precio que el cliente aceptó (tope para ofrecer) y, si solo hay grúas más
  -- caras, el precio que tiene que confirmar.
  precio_max numeric,
  precio_sugerido numeric,
  prestador_id uuid references gruas.prestadores (id) on delete set null,
  unidad_id uuid references gruas.unidades (id) on delete set null,
  cotizacion jsonb,
  precio_total numeric,
  precio_prestador numeric,
  comision numeric,
  cargo_cancelacion numeric,
  motivo_cancelacion text check (char_length(motivo_cancelacion) <= 300),
  created_at timestamptz not null default now(),
  asignada_at timestamptz,
  en_camino_at timestamptz,
  en_origen_at timestamptz,
  trasladando_at timestamptz,
  finalizada_at timestamptz,
  cancelada_at timestamptz,
  updated_at timestamptz not null default now()
);

create index solicitudes_cliente_idx on gruas.solicitudes (cliente_id, created_at desc);
create index solicitudes_prestador_idx on gruas.solicitudes (prestador_id, created_at desc);
create index solicitudes_estado_idx on gruas.solicitudes (estado, created_at desc);

create table gruas.ofertas (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references gruas.solicitudes (id) on delete cascade,
  prestador_id uuid not null references gruas.prestadores (id) on delete cascade,
  unidad_id uuid references gruas.unidades (id) on delete set null,
  cotizacion jsonb not null,
  precio_total numeric not null,
  precio_prestador numeric not null,
  comision numeric not null,
  distancia_km numeric not null,
  eta_min int not null,
  estado text not null default 'enviada' check (estado in ('enviada', 'aceptada', 'rechazada', 'expirada', 'cancelada')),
  enviada_at timestamptz not null default now(),
  vence_at timestamptz not null,
  respondida_at timestamptz,
  unique (solicitud_id, prestador_id)
);

create index ofertas_prestador_idx on gruas.ofertas (prestador_id, estado);
create index ofertas_vigentes_idx on gruas.ofertas (vence_at) where estado = 'enviada';

create table gruas.eventos (
  id bigserial primary key,
  solicitud_id uuid not null references gruas.solicitudes (id) on delete cascade,
  estado text not null,
  actor text,
  detalle text,
  created_at timestamptz not null default now()
);

create index eventos_solicitud_idx on gruas.eventos (solicitud_id, created_at);

create table gruas.calificaciones (
  solicitud_id uuid primary key references gruas.solicitudes (id) on delete cascade,
  cliente_id uuid not null references public.users (id) on delete cascade,
  prestador_id uuid not null references gruas.prestadores (id) on delete cascade,
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text check (char_length(comentario) <= 500),
  created_at timestamptz not null default now()
);

create index calificaciones_prestador_idx on gruas.calificaciones (prestador_id);

create table gruas.mensajes (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references gruas.solicitudes (id) on delete cascade,
  autor_id uuid not null references public.users (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index mensajes_solicitud_idx on gruas.mensajes (solicitud_id, created_at);

-- ── Funciones de ayuda para los permisos ────────────────────────────────
create function gruas.es_admin()
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select coalesce(public.current_user_role() = 'superadmin', false);
$$;

create function gruas.mi_prestador()
returns uuid
language sql stable security definer set search_path = gruas, public
as $$
  select id from gruas.prestadores where user_id = auth.uid();
$$;

create function gruas.mi_empresa()
returns uuid
language sql stable security definer set search_path = gruas, public
as $$
  select id from gruas.empresas where owner_id = auth.uid();
$$;

-- Quién ve los datos de un gruista: él, el dueño de su empresa y el superadmin.
create function gruas.puede_ver_prestador(p_prestador uuid)
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select gruas.es_admin()
    or p_prestador = gruas.mi_prestador()
    or exists (
      select 1 from gruas.prestadores p
      where p.id = p_prestador and p.empresa_id is not null and p.empresa_id = gruas.mi_empresa()
    );
$$;

-- Quién gestiona las tarifas de un dueño (empresa o gruista independiente).
create function gruas.gestiona_tarifas(p_empresa uuid, p_prestador uuid)
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select gruas.es_admin()
    or (p_empresa is not null and p_empresa = gruas.mi_empresa())
    or (
      p_prestador is not null and p_prestador = gruas.mi_prestador()
      and exists (select 1 from gruas.prestadores where id = p_prestador and empresa_id is null)
    );
$$;

-- Quién participa de una solicitud.
create function gruas.es_parte(p_solicitud uuid)
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select gruas.es_admin() or exists (
    select 1 from gruas.solicitudes s
    left join gruas.prestadores p on p.id = s.prestador_id
    where s.id = p_solicitud and (
      s.cliente_id = auth.uid()
      or (s.prestador_id is not null and s.prestador_id = gruas.mi_prestador())
      or (p.empresa_id is not null and p.empresa_id = gruas.mi_empresa())
    )
  );
$$;

-- El gruista ve la solicitud mientras tiene una oferta vigente.
create function gruas.tiene_oferta(p_solicitud uuid)
returns boolean
language sql stable security definer set search_path = gruas, public
as $$
  select exists (
    select 1 from gruas.ofertas o
    where o.solicitud_id = p_solicitud and o.prestador_id = gruas.mi_prestador() and o.estado = 'enviada'
  );
$$;

-- ── Permisos por fila ───────────────────────────────────────────────────
alter table gruas.config enable row level security;
alter table gruas.zonas enable row level security;
alter table gruas.tipos_vehiculo enable row level security;
alter table gruas.modalidades enable row level security;
alter table gruas.motivos enable row level security;
alter table gruas.situaciones enable row level security;
alter table gruas.empresas enable row level security;
alter table gruas.prestadores enable row level security;
alter table gruas.unidades enable row level security;
alter table gruas.documentos enable row level security;
alter table gruas.invitaciones enable row level security;
alter table gruas.tarifas enable row level security;
alter table gruas.tarifa_recargos enable row level security;
alter table gruas.tarifa_adicionales enable row level security;
alter table gruas.solicitudes enable row level security;
alter table gruas.ofertas enable row level security;
alter table gruas.eventos enable row level security;
alter table gruas.calificaciones enable row level security;
alter table gruas.mensajes enable row level security;

grant select on all tables in schema gruas to authenticated;
grant insert, update, delete on gruas.zonas, gruas.tipos_vehiculo, gruas.motivos, gruas.situaciones, gruas.config,
  gruas.prestadores, gruas.empresas, gruas.unidades, gruas.documentos, gruas.tarifas, gruas.tarifa_recargos,
  gruas.tarifa_adicionales, gruas.mensajes to authenticated;
grant usage on all sequences in schema gruas to authenticated;

-- Catálogos: los lee cualquiera con sesión; los edita el superadmin.
create policy "zonas_select" on gruas.zonas for select to authenticated using (true);
create policy "zonas_admin" on gruas.zonas for all to authenticated using (gruas.es_admin()) with check (gruas.es_admin());
create policy "tipos_select" on gruas.tipos_vehiculo for select to authenticated using (true);
create policy "tipos_admin" on gruas.tipos_vehiculo for all to authenticated using (gruas.es_admin()) with check (gruas.es_admin());
create policy "modalidades_select" on gruas.modalidades for select to authenticated using (true);
create policy "motivos_select" on gruas.motivos for select to authenticated using (true);
create policy "motivos_admin" on gruas.motivos for all to authenticated using (gruas.es_admin()) with check (gruas.es_admin());
create policy "situaciones_select" on gruas.situaciones for select to authenticated using (true);
create policy "situaciones_admin" on gruas.situaciones for all to authenticated using (gruas.es_admin()) with check (gruas.es_admin());
-- La configuración (comisión, reglas) solo la ve y edita el superadmin.
create policy "config_admin" on gruas.config for all to authenticated using (gruas.es_admin()) with check (gruas.es_admin());

create policy "empresas_select" on gruas.empresas for select to authenticated
  using (gruas.es_admin() or owner_id = auth.uid()
    or exists (select 1 from gruas.prestadores p where p.empresa_id = empresas.id and p.user_id = auth.uid()));
create policy "empresas_update" on gruas.empresas for update to authenticated
  using (gruas.es_admin() or owner_id = auth.uid())
  with check (gruas.es_admin() or owner_id = auth.uid());

create policy "prestadores_select" on gruas.prestadores for select to authenticated
  using (gruas.puede_ver_prestador(id));
create policy "prestadores_update" on gruas.prestadores for update to authenticated
  using (gruas.es_admin() or user_id = auth.uid())
  with check (gruas.es_admin() or user_id = auth.uid());

create policy "unidades_select" on gruas.unidades for select to authenticated
  using (gruas.puede_ver_prestador(prestador_id));
create policy "unidades_write" on gruas.unidades for all to authenticated
  using (gruas.puede_ver_prestador(prestador_id))
  with check (gruas.puede_ver_prestador(prestador_id));

create policy "documentos_select" on gruas.documentos for select to authenticated
  using (gruas.puede_ver_prestador(prestador_id));
create policy "documentos_insert" on gruas.documentos for insert to authenticated
  with check (gruas.puede_ver_prestador(prestador_id));
create policy "documentos_delete" on gruas.documentos for delete to authenticated
  using (gruas.es_admin() or (estado <> 'verificado' and gruas.puede_ver_prestador(prestador_id)));

create policy "invitaciones_select" on gruas.invitaciones for select to authenticated
  using (gruas.es_admin() or empresa_id = gruas.mi_empresa());

create policy "tarifas_select" on gruas.tarifas for select to authenticated
  using (gruas.gestiona_tarifas(empresa_id, prestador_id));
create policy "tarifas_write" on gruas.tarifas for all to authenticated
  using (gruas.gestiona_tarifas(empresa_id, prestador_id))
  with check (gruas.gestiona_tarifas(empresa_id, prestador_id));
create policy "recargos_select" on gruas.tarifa_recargos for select to authenticated
  using (gruas.gestiona_tarifas(empresa_id, prestador_id));
create policy "recargos_write" on gruas.tarifa_recargos for all to authenticated
  using (gruas.gestiona_tarifas(empresa_id, prestador_id))
  with check (gruas.gestiona_tarifas(empresa_id, prestador_id));
create policy "adicionales_select" on gruas.tarifa_adicionales for select to authenticated
  using (gruas.gestiona_tarifas(empresa_id, prestador_id));
create policy "adicionales_write" on gruas.tarifa_adicionales for all to authenticated
  using (gruas.gestiona_tarifas(empresa_id, prestador_id))
  with check (gruas.gestiona_tarifas(empresa_id, prestador_id));

-- Solicitudes, ofertas y eventos: solo lectura directa; se escriben con funciones.
create policy "solicitudes_select" on gruas.solicitudes for select to authenticated
  using (gruas.es_parte(id) or gruas.tiene_oferta(id));
create policy "ofertas_select" on gruas.ofertas for select to authenticated
  using (gruas.es_admin() or prestador_id = gruas.mi_prestador());
create policy "eventos_select" on gruas.eventos for select to authenticated
  using (gruas.es_parte(solicitud_id));
create policy "calificaciones_select" on gruas.calificaciones for select to authenticated
  using (gruas.es_admin() or cliente_id = auth.uid() or gruas.puede_ver_prestador(prestador_id));

create policy "mensajes_select" on gruas.mensajes for select to authenticated
  using (gruas.es_parte(solicitud_id));
create policy "mensajes_insert" on gruas.mensajes for insert to authenticated
  with check (
    autor_id = auth.uid()
    and gruas.es_parte(solicitud_id)
    and exists (
      select 1 from gruas.solicitudes s
      where s.id = solicitud_id and s.estado in ('asignada', 'en_camino', 'en_origen', 'trasladando')
    )
  );

-- Campos que el gruista o la empresa no pueden cambiar a mano.
create function gruas.proteger_prestador()
returns trigger
language plpgsql security definer set search_path = gruas, public
as $$
begin
  -- Las funciones de la base (p. ej. actualizar_ubicacion) marcan la transacción.
  if gruas.es_admin() or auth.uid() is null or coalesce(current_setting('gruas.sistema', true), '') = 'on' then
    return new;
  end if;
  if new.estado is distinct from old.estado or new.motivo is distinct from old.motivo
     or new.empresa_id is distinct from old.empresa_id or new.user_id is distinct from old.user_id
     or new.ubicacion is distinct from old.ubicacion or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng or new.ubicacion_at is distinct from old.ubicacion_at then
    raise exception 'Ese dato no se puede cambiar desde acá';
  end if;
  if new.disponible and new.estado <> 'aprobado' then
    raise exception 'Tu cuenta de gruista todavía no está aprobada';
  end if;
  if new.foto is not null and new.foto not like new.id::text || '/%' then
    raise exception 'Foto inválida';
  end if;
  return new;
end;
$$;

create trigger proteger_prestador_trg
  before update on gruas.prestadores
  for each row execute function gruas.proteger_prestador();

create function gruas.proteger_empresa()
returns trigger
language plpgsql security definer set search_path = gruas, public
as $$
begin
  if gruas.es_admin() or auth.uid() is null then
    return new;
  end if;
  if new.estado is distinct from old.estado or new.motivo is distinct from old.motivo
     or new.owner_id is distinct from old.owner_id then
    raise exception 'Ese dato no se puede cambiar desde acá';
  end if;
  return new;
end;
$$;

create trigger proteger_empresa_trg
  before update on gruas.empresas
  for each row execute function gruas.proteger_empresa();

-- Documentos: siempre arrancan pendientes y el archivo es de la carpeta del gruista.
create function gruas.preparar_documento()
returns trigger
language plpgsql security definer set search_path = gruas, public
as $$
begin
  if new.archivo not like new.prestador_id::text || '/%' then
    raise exception 'Archivo inválido';
  end if;
  if not gruas.es_admin() then
    new.estado := 'pendiente';
    new.motivo := null;
  end if;
  return new;
end;
$$;

create trigger preparar_documento_trg
  before insert on gruas.documentos
  for each row execute function gruas.preparar_documento();

-- Archivos: documentos (privados) y fotos de perfil (públicas), carpeta <prestador_id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gruas-documentos', 'gruas-documentos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gruas-perfiles', 'gruas-perfiles', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "gruas_docs_select" on storage.objects for select to authenticated
  using (case when bucket_id = 'gruas-documentos' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    then gruas.puede_ver_prestador(((storage.foldername(name))[1])::uuid) else false end);
create policy "gruas_docs_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'gruas-documentos' and (storage.foldername(name))[1] = gruas.mi_prestador()::text);
create policy "gruas_docs_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gruas-documentos' and (storage.foldername(name))[1] = gruas.mi_prestador()::text);

create policy "gruas_perfiles_select" on storage.objects for select to authenticated
  using (bucket_id = 'gruas-perfiles' and (storage.foldername(name))[1] = gruas.mi_prestador()::text);
create policy "gruas_perfiles_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'gruas-perfiles' and (storage.foldername(name))[1] = gruas.mi_prestador()::text);
create policy "gruas_perfiles_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gruas-perfiles' and (storage.foldername(name))[1] = gruas.mi_prestador()::text);

revoke execute on all functions in schema gruas from public, anon;
grant execute on all functions in schema gruas to authenticated;
