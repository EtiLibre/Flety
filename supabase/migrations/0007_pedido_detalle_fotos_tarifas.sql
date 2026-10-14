-- App Expo, paso 2: detalle del pedido, tarifas con precio estimado y fotos
-- de la carga (Supabase Storage).

-- ── Detalle del pedido ──────────────────────────────────────────────────
alter table public.orders
  add column tamano text check (tamano in ('chico', 'mediano', 'grande')),
  add column ayudantes integer not null default 0 check (ayudantes between 0 and 4),
  add column programado_para timestamptz,  -- null = "ahora"
  add column nota text check (char_length(nota) <= 500),
  add column vehiculo text check (vehiculo in ('utilitario', 'camioneta', 'camion')),
  add column distancia_km numeric(8, 2) check (distancia_km >= 0 and distancia_km <= 2000),
  add column precio_estimado numeric(12, 2);

-- ── Tarifas (precio estimado = base + por_km × km + por_ayudante × ayudantes) ──
create table public.tarifas (
  vehiculo text primary key check (vehiculo in ('utilitario', 'camioneta', 'camion')),
  base numeric(12, 2) not null check (base >= 0),
  por_km numeric(12, 2) not null check (por_km >= 0),
  por_ayudante numeric(12, 2) not null check (por_ayudante >= 0),
  updated_at timestamptz not null default now()
);

-- VALORES DE EJEMPLO (no son precios reales): ajustarlos antes de lanzar.
insert into public.tarifas (vehiculo, base, por_km, por_ayudante) values
  ('utilitario', 15000, 900, 12000),
  ('camioneta', 25000, 1200, 12000),
  ('camion', 45000, 1800, 12000)
on conflict (vehiculo) do nothing;

alter table public.tarifas enable row level security;

create policy "tarifas_select" on public.tarifas
  for select to authenticated
  using (true);

create policy "tarifas_update" on public.tarifas
  for update to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');

-- El precio estimado lo calcula la base al crear el pedido: la app muestra
-- la misma fórmula como vista previa, pero el valor guardado no se puede falsear.
create function public.set_precio_estimado()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  t public.tarifas;
begin
  new.precio_estimado := null;
  if new.vehiculo is not null and new.distancia_km is not null then
    select * into t from public.tarifas where vehiculo = new.vehiculo;
    if found then
      new.precio_estimado := round(t.base + t.por_km * new.distancia_km + t.por_ayudante * new.ayudantes, -2);
    end if;
  end if;
  return new;
end;
$$;

create trigger set_precio_estimado_trg
  before insert on public.orders
  for each row execute function public.set_precio_estimado();

-- Después de creado, vehículo/distancia/ayudantes/precio solo los cambia
-- superadmin o una conexión de confianza (el cliente puede cancelar, no repreciar).
create function public.protect_pedido_cotizacion()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    new.vehiculo is distinct from old.vehiculo
    or new.distancia_km is distinct from old.distancia_km
    or new.ayudantes is distinct from old.ayudantes
    or new.precio_estimado is distinct from old.precio_estimado
  ) and auth.uid() is not null
    and public.current_user_role() is distinct from 'superadmin' then
    raise exception 'La cotización del pedido no se puede modificar una vez creado';
  end if;
  return new;
end;
$$;

create trigger protect_pedido_cotizacion_trg
  before update on public.orders
  for each row execute function public.protect_pedido_cotizacion();

-- ── Fotos de la carga ───────────────────────────────────────────────────
create table public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  path text not null unique,  -- ruta en el bucket: <order_id>/<archivo>
  created_at timestamptz not null default now()
);

create index order_photos_order_id_idx on public.order_photos (order_id);

alter table public.order_photos enable row level security;

-- Una foto es visible si el pedido es visible: el subselect sobre orders corre
-- con los permisos (RLS) de quien consulta. Así la ven el cliente dueño, las
-- empresas mientras el pedido está en la cola, la empresa que lo tomó y el
-- chofer asignado, sin duplicar reglas.
create policy "order_photos_select" on public.order_photos
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_photos.order_id));

create policy "order_photos_insert" on public.order_photos
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_photos.order_id and o.cliente_id = auth.uid()
  ));

create policy "order_photos_delete" on public.order_photos
  for delete to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_photos.order_id and o.cliente_id = auth.uid()
  ));

-- Bucket privado (máx. 10 MB por foto, solo imágenes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pedido-fotos', 'pedido-fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "pedido_fotos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pedido-fotos'
    and exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[1])
  );

create policy "pedido_fotos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pedido-fotos'
    and exists (
      select 1 from public.orders o
      where o.id::text = (storage.foldername(name))[1] and o.cliente_id = auth.uid()
    )
  );

create policy "pedido_fotos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pedido-fotos'
    and exists (
      select 1 from public.orders o
      where o.id::text = (storage.foldername(name))[1] and o.cliente_id = auth.uid()
    )
  );
