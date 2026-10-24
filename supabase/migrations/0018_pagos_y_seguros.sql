-- Pagos de los fletes y seguros de los choferes.
--
-- Hoy el cliente le paga a la empresa que hace el flete, al terminar el viaje:
-- en efectivo (al chofer) o por transferencia (a la cuenta de la empresa).
-- Cuando se sume Mercado Pago (docs/pagos-contable-legal.md), el método
-- 'mercadopago' entra por acá mismo.
--
-- 1. La empresa carga sus datos de cobro (alias, CBU, titular) y qué acepta.
-- 2. Un pago por flete (pagos): el cliente avisa que pagó, el chofer registra
--    que cobró y la empresa confirma (o marca que no le llegó).
-- 3. Las calificaciones se pueden dejar también con el flete entregado (antes
--    de confirmarlo): la app confirma y califica en un solo paso.

-- ── Datos de cobro de la empresa ────────────────────────────────────────
alter table public.companies
  add column cobro_alias text check (cobro_alias ~ '^[A-Za-z0-9.\-]{6,20}$'),
  add column cobro_cbu text check (cobro_cbu ~ '^[0-9]{22}$'),
  add column cobro_titular text check (char_length(cobro_titular) <= 80),
  add column cobro_banco text check (char_length(cobro_banco) <= 60),
  add column acepta_efectivo boolean not null default true,
  add column acepta_transferencia boolean not null default true;

-- ── Pagos ───────────────────────────────────────────────────────────────
create table public.pagos (
  order_id uuid primary key references public.orders (id) on delete cascade,
  cliente_id uuid not null references public.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  driver_id uuid references public.drivers (id) on delete set null,
  monto numeric(12, 2) not null check (monto >= 0),
  metodo text not null check (metodo in ('efectivo', 'transferencia', 'mercadopago')),
  -- informado: el cliente avisó que pagó; confirmado: la empresa (o el chofer,
  -- en efectivo) lo recibió; rechazado: la empresa dice que no le llegó.
  estado text not null check (estado in ('informado', 'confirmado', 'rechazado')),
  informado_por text not null check (informado_por in ('cliente', 'chofer', 'empresa')),
  referencia text check (char_length(referencia) <= 80),
  created_at timestamptz not null default now(),
  confirmado_at timestamptz,
  updated_at timestamptz not null default now()
);

create index pagos_company_idx on public.pagos (company_id, created_at desc);
create index pagos_cliente_idx on public.pagos (cliente_id, created_at desc);

alter table public.pagos enable row level security;

-- Se lee directo; se escribe solo con las funciones de abajo.
create policy "pagos_select" on public.pagos
  for select to authenticated
  using (
    cliente_id = auth.uid()
    or public.current_user_role() in ('superadmin', 'contabilidad')
    or (company_id is not null and company_id = public.current_user_company_id())
    or (driver_id is not null and driver_id = public.current_driver_id())
  );

-- Estados del flete en los que ya se puede pagar (desde que cargan la cosas).
create function public.flete_pagable(p_estado text)
returns boolean
language sql immutable
as $$
  select p_estado in ('cargando', 'en_camino_destino', 'entregado', 'confirmado', 'liquidado', 'en_disputa');
$$;

-- El cliente avisa que pagó (efectivo o transferencia).
create function public.informar_pago(p_order uuid, p_metodo text, p_referencia text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  o public.orders;
  actual public.pagos;
begin
  select * into o from public.orders where id = p_order;
  if not found or o.cliente_id <> auth.uid() then
    raise exception 'Solo podés informar el pago de tus fletes';
  end if;
  if o.company_id is null or not public.flete_pagable(o.estado::text) then
    raise exception 'Este flete todavía no se puede pagar';
  end if;
  if p_metodo not in ('efectivo', 'transferencia') then
    raise exception 'Método de pago inválido';
  end if;
  select * into actual from public.pagos where order_id = p_order;
  if found and actual.estado = 'confirmado' then
    raise exception 'Este pago ya está confirmado';
  end if;

  insert into public.pagos (order_id, cliente_id, company_id, driver_id, monto, metodo, estado, informado_por, referencia)
  values (p_order, o.cliente_id, o.company_id, o.driver_id, coalesce(o.precio_estimado, 0), p_metodo, 'informado', 'cliente',
    nullif(left(trim(coalesce(p_referencia, '')), 80), ''))
  on conflict (order_id) do update
    set metodo = excluded.metodo, estado = 'informado', informado_por = 'cliente',
        referencia = excluded.referencia, updated_at = now(), confirmado_at = null;
end;
$$;

-- El chofer asignado o la empresa registran que cobraron (queda confirmado).
create function public.registrar_cobro(p_order uuid, p_metodo text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  o public.orders;
  rol text := public.current_user_role();
  quien text;
begin
  select * into o from public.orders where id = p_order;
  if not found then
    raise exception 'No encontramos el flete';
  end if;
  if o.driver_id is not null and o.driver_id = public.current_driver_id() then
    quien := 'chofer';
  elsif (rol = 'empresa' and o.company_id = public.current_user_company_id()) or rol = 'superadmin' then
    quien := 'empresa';
  else
    raise exception 'Solo el chofer o la empresa del flete pueden registrar el cobro';
  end if;
  if not public.flete_pagable(o.estado::text) then
    raise exception 'Este flete todavía no se puede cobrar';
  end if;
  if p_metodo not in ('efectivo', 'transferencia', 'mercadopago') then
    raise exception 'Método de pago inválido';
  end if;

  insert into public.pagos (order_id, cliente_id, company_id, driver_id, monto, metodo, estado, informado_por, confirmado_at)
  values (p_order, o.cliente_id, o.company_id, o.driver_id, coalesce(o.precio_estimado, 0), p_metodo, 'confirmado', quien, now())
  on conflict (order_id) do update
    set metodo = excluded.metodo, estado = 'confirmado', confirmado_at = now(), updated_at = now(),
        informado_por = case when pagos.estado = 'informado' then pagos.informado_por else excluded.informado_por end;
end;
$$;

-- La empresa marca que el pago informado no le llegó.
create function public.rechazar_pago(p_order uuid)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  rol text := public.current_user_role();
begin
  update public.pagos p
  set estado = 'rechazado', confirmado_at = null, updated_at = now()
  where p.order_id = p_order
    and p.estado = 'informado'
    and ((rol = 'empresa' and p.company_id = public.current_user_company_id()) or rol = 'superadmin');
  if not found then
    raise exception 'No hay un pago informado para rechazar';
  end if;
end;
$$;

revoke execute on function public.informar_pago(uuid, text, text) from public, anon;
grant execute on function public.informar_pago(uuid, text, text) to authenticated;
revoke execute on function public.registrar_cobro(uuid, text) from public, anon;
grant execute on function public.registrar_cobro(uuid, text) to authenticated;
revoke execute on function public.rechazar_pago(uuid) from public, anon;
grant execute on function public.rechazar_pago(uuid) to authenticated;

-- ── Calificar con el flete entregado ────────────────────────────────────
create or replace function public.set_calificacion()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = new.order_id;
  if not found or o.cliente_id <> auth.uid() or o.estado not in ('entregado', 'confirmado', 'liquidado') then
    raise exception 'Solo podés calificar tus fletes ya entregados';
  end if;
  new.cliente_id := o.cliente_id;
  new.company_id := o.company_id;
  new.driver_id := o.driver_id;
  return new;
end;
$$;

-- ── Seguros ─────────────────────────────────────────────────────────────
-- El chofer (o su empresa) carga la póliza: certificado en foto o PDF, con
-- aseguradora, número, patente y vigencia. No hay un servicio público para
-- consultar pólizas, así que Flety la revisa a mano (el certificado, la app
-- "Mi Seguro" de la SSN por patente o la autogestión de la aseguradora) y la
-- marca verificada. La vigencia se controla sola por fecha.
create table public.seguros (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- La póliza del vehículo de un chofer (null: póliza de la empresa, p. ej. de carga).
  driver_id uuid references public.drivers (id) on delete cascade,
  -- automotor: responsabilidad civil obligatoria del vehículo; carga: mercadería
  -- transportada; personas: accidentes personales del chofer y los ayudantes.
  tipo text not null check (tipo in ('automotor', 'carga', 'personas')),
  aseguradora text not null check (char_length(aseguradora) between 2 and 80),
  numero_poliza text not null check (char_length(numero_poliza) between 3 and 40),
  patente text check (char_length(patente) <= 10),
  vigencia_desde date not null,
  vigencia_hasta date not null,
  archivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'verificada', 'rechazada')),
  motivo_rechazo text check (char_length(motivo_rechazo) <= 300),
  verificado_por uuid references public.users (id) on delete set null,
  verificado_at timestamptz,
  created_at timestamptz not null default now(),
  check (vigencia_hasta >= vigencia_desde)
);

create index seguros_driver_idx on public.seguros (driver_id, vigencia_hasta desc);
create index seguros_company_idx on public.seguros (company_id, vigencia_hasta desc);
create index seguros_estado_idx on public.seguros (estado, created_at);

-- Empresa del chofer logueado (para la carpeta de archivos).
create function public.mi_empresa_de_chofer()
returns uuid
language sql stable security definer set search_path = public
as $$
  select company_id from public.drivers where user_id = auth.uid();
$$;

-- Quién ve las pólizas de una empresa/chofer.
create function public.puede_ver_seguro(p_company uuid, p_driver uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.current_user_role() in ('superadmin', 'contabilidad')
    or (public.current_user_role() = 'empresa' and p_company = public.current_user_company_id())
    or (p_driver is not null and p_driver = public.current_driver_id());
$$;

-- Al cargar: la empresa sale del chofer y siempre arranca "pendiente".
create function public.preparar_seguro()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.driver_id is not null then
    select company_id into new.company_id from public.drivers where id = new.driver_id;
  end if;
  if new.archivo not like new.company_id::text || '/%' then
    raise exception 'Archivo de póliza inválido';
  end if;
  new.estado := 'pendiente';
  new.motivo_rechazo := null;
  new.verificado_por := null;
  new.verificado_at := null;
  new.patente := upper(nullif(trim(coalesce(new.patente, '')), ''));
  return new;
end;
$$;

create trigger preparar_seguro_trg
  before insert on public.seguros
  for each row execute function public.preparar_seguro();

alter table public.seguros enable row level security;

create policy "seguros_select" on public.seguros
  for select to authenticated
  using (public.puede_ver_seguro(company_id, driver_id));

create policy "seguros_insert" on public.seguros
  for insert to authenticated
  with check (
    public.current_user_role() = 'superadmin'
    or (driver_id is not null and driver_id = public.current_driver_id())
    or (public.current_user_role() = 'empresa' and company_id = public.current_user_company_id())
  );

-- Se borra (para reemplazarla) solo mientras no está verificada.
create policy "seguros_delete" on public.seguros
  for delete to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or (
      estado <> 'verificada'
      and public.current_user_role() <> 'contabilidad'
      and public.puede_ver_seguro(company_id, driver_id)
    )
  );

-- Flety verifica o rechaza (con motivo).
create function public.verificar_seguro(p_id uuid, p_ok boolean, p_motivo text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'superadmin' then
    raise exception 'Solo el equipo de Flety verifica pólizas';
  end if;
  update public.seguros
  set estado = case when p_ok then 'verificada' else 'rechazada' end,
      motivo_rechazo = case when p_ok then null else nullif(left(trim(coalesce(p_motivo, '')), 300), '') end,
      verificado_por = auth.uid(),
      verificado_at = now()
  where id = p_id;
  if not found then
    raise exception 'No encontramos la póliza';
  end if;
end;
$$;

revoke execute on function public.verificar_seguro(uuid, boolean, text) from public, anon;
grant execute on function public.verificar_seguro(uuid, boolean, text) to authenticated;

-- Estado del seguro del vehículo de un chofer: verificado / por_vencer
-- (verificado, vence en 15 días o menos) / en_revision / rechazado / vencido / sin_seguro.
create function public.estado_seguro(p_driver uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when exists (select 1 from public.seguros s where s.driver_id = p_driver and s.tipo = 'automotor'
                 and s.estado = 'verificada' and current_date between s.vigencia_desde and s.vigencia_hasta
                 and s.vigencia_hasta > current_date + 15) then 'verificado'
    when exists (select 1 from public.seguros s where s.driver_id = p_driver and s.tipo = 'automotor'
                 and s.estado = 'verificada' and current_date between s.vigencia_desde and s.vigencia_hasta) then 'por_vencer'
    when exists (select 1 from public.seguros s where s.driver_id = p_driver and s.tipo = 'automotor'
                 and s.estado = 'pendiente' and s.vigencia_hasta >= current_date) then 'en_revision'
    when exists (select 1 from public.seguros s where s.driver_id = p_driver and s.tipo = 'automotor'
                 and s.estado = 'rechazada' and s.vigencia_hasta >= current_date) then 'rechazado'
    when exists (select 1 from public.seguros s where s.driver_id = p_driver and s.tipo = 'automotor') then 'vencido'
    else 'sin_seguro'
  end;
$$;

revoke execute on function public.estado_seguro(uuid) from public, anon;
grant execute on function public.estado_seguro(uuid) to authenticated;

-- ¿Flety exige seguro verificado para aparecer en el marketplace? (Arranca en no.)
insert into public.config (clave, valor) values ('exigir_seguro', 'false')
on conflict (clave) do nothing;

create function public.exige_seguro()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select valor = 'true'::jsonb from public.config where clave = 'exigir_seguro'), false);
$$;

-- Archivos de las pólizas: bucket privado, carpeta <company_id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seguros', 'seguros', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy "seguros_archivos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'seguros'
    and (
      public.current_user_role() in ('superadmin', 'contabilidad')
      or (storage.foldername(name))[1] = public.current_user_company_id()::text
      or (storage.foldername(name))[1] = public.mi_empresa_de_chofer()::text
    )
  );

create policy "seguros_archivos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'seguros'
    and (
      public.current_user_role() = 'superadmin'
      or (public.current_user_role() = 'empresa' and (storage.foldername(name))[1] = public.current_user_company_id()::text)
      or (storage.foldername(name))[1] = public.mi_empresa_de_chofer()::text
    )
  );

create policy "seguros_archivos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'seguros'
    and (
      public.current_user_role() = 'superadmin'
      or (public.current_user_role() = 'empresa' and (storage.foldername(name))[1] = public.current_user_company_id()::text)
      or (storage.foldername(name))[1] = public.mi_empresa_de_chofer()::text
    )
  );

-- ── Perfil y marketplace: suman el estado del seguro ────────────────────
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
    'foto_perfil', case when d.foto_perfil like d.id::text || '/%' then d.foto_perfil end,
    'seguro', public.estado_seguro(d.id),
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
  auto jsonb,
  foto_perfil text,
  seguro text
)
language sql stable security definer set search_path = public
as $$
  select f_driver, f_nombre, f_empresa, f_company, f_vehiculo, distancia, f_lat, f_lng, f_precio,
    r.estrellas, coalesce(r.cantidad, 0), f_auto, f_foto, f_seguro
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
      ) as f_auto,
      case when d.foto_perfil like d.id::text || '/%' then d.foto_perfil end as f_foto,
      public.estado_seguro(d.id) as f_seguro
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
    -- Si Flety exige seguro (config exigir_seguro), solo choferes con la póliza verificada y vigente.
    and (not public.exige_seguro() or f.f_seguro in ('verificado', 'por_vencer'))
  order by f.distancia
  limit 20;
$$;

revoke execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) from public, anon;
grant execute on function public.fleteros_disponibles(double precision, double precision, numeric, integer, text) to authenticated;
