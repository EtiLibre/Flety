-- Mi cuenta y ayuda.
--
-- 1. public.users suma apellido, teléfono y nombre de usuario (único, sin
--    importar mayúsculas). "nombre" sigue siendo el nombre completo que se
--    muestra en toda la app; la app lo arma con nombre + apellido.
-- 2. Si alguien cambia su correo (Supabase Auth lo confirma por mail), se
--    copia a public.users.
-- 3. Consultas a soporte: el usuario escribe desde Ayuda cuando el asistente
--    no le resuelve el problema; el superadmin responde desde el panel.

-- ── Cuenta ──────────────────────────────────────────────────────────────
alter table public.users
  add column apellido text check (char_length(apellido) <= 60),
  add column telefono text check (char_length(telefono) between 6 and 30),
  add column username text check (username ~ '^[a-z0-9._]{3,20}$');

create unique index users_username_unico on public.users (lower(username));

-- ¿Está libre este nombre de usuario? (users_select solo deja ver la fila propia.)
create function public.usuario_disponible(p_username text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.users
    where lower(username) = lower(trim(p_username)) and id <> auth.uid()
  );
$$;

revoke execute on function public.usuario_disponible(text) from public, anon;
grant execute on function public.usuario_disponible(text) to authenticated;

create function public.sync_user_email()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.sync_user_email();

-- ── Soporte ─────────────────────────────────────────────────────────────
create table public.soporte_consultas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  rol text,
  asunto text not null check (char_length(asunto) between 3 and 120),
  mensaje text not null check (char_length(mensaje) between 5 and 2000),
  order_id uuid references public.orders (id) on delete set null,
  estado text not null default 'abierta' check (estado in ('abierta', 'respondida', 'cerrada')),
  respuesta text check (char_length(respuesta) <= 2000),
  respondida_at timestamptz,
  created_at timestamptz not null default now()
);

create index soporte_consultas_user_idx on public.soporte_consultas (user_id, created_at desc);
create index soporte_consultas_estado_idx on public.soporte_consultas (estado, created_at desc);

alter table public.soporte_consultas enable row level security;

create policy "soporte_select" on public.soporte_consultas
  for select to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'superadmin');

-- Cada uno crea las suyas, siempre abiertas y sin respuesta.
create policy "soporte_insert" on public.soporte_consultas
  for insert to authenticated
  with check (user_id = auth.uid() and estado = 'abierta' and respuesta is null);

-- Solo el superadmin responde o cierra.
create policy "soporte_update" on public.soporte_consultas
  for update to authenticated
  using (public.current_user_role() = 'superadmin')
  with check (public.current_user_role() = 'superadmin');
