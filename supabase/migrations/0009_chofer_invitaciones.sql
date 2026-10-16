-- Paso 4 (app del chofer): invitaciones de empresa a chofer, el chofer ve el
-- nombre del cliente de sus viajes, y un chofer no puede cambiarse de empresa.

-- ── El chofer ve al cliente de los pedidos que tiene asignados ──────────
create function public.es_cliente_de_mis_viajes(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    join public.drivers d on d.id = o.driver_id
    where o.cliente_id = uid and d.user_id = auth.uid()
  );
$$;

create policy "users_select_cliente_del_chofer" on public.users
  for select to authenticated
  using (public.es_cliente_de_mis_viajes(id));

-- ── drivers: empresa y usuario fijos ────────────────────────────────────
-- drivers_update (0002) deja que el chofer edite su propia fila (disponibilidad,
-- ubicación, vehículo), pero también le permitía cambiar company_id/user_id.
-- Pasarse de empresa es vía invitación (canjear_invitacion, con la marca de
-- abajo) o superadmin.
create function public.protect_driver_identity()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.company_id is distinct from old.company_id or new.user_id is distinct from old.user_id)
     and auth.uid() is not null
     and public.current_user_role() is distinct from 'superadmin'
     and coalesce(current_setting('flety.canje_invitacion', true), '') <> 'on' then
    raise exception 'Solo superadmin puede cambiar la empresa o el usuario de un chofer';
  end if;
  return new;
end;
$$;

create trigger protect_driver_identity_trg
  before update on public.drivers
  for each row execute function public.protect_driver_identity();

-- ── Invitaciones ────────────────────────────────────────────────────────
create table public.company_invites (
  code text primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references public.users (id) on delete set null,
  used_at timestamptz
);

create index company_invites_company_id_idx on public.company_invites (company_id);

alter table public.company_invites enable row level security;

-- La empresa ve y borra los códigos de su flota; se crean solo con crear_invitacion().
create policy "company_invites_select" on public.company_invites
  for select to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or (public.current_user_role() = 'empresa' and company_id = public.current_user_company_id())
  );

create policy "company_invites_delete" on public.company_invites
  for delete to authenticated
  using (
    public.current_user_role() = 'superadmin'
    or (public.current_user_role() = 'empresa' and company_id = public.current_user_company_id())
  );

-- El trigger de 0003 impide cambiar role/company_id salvo superadmin. El canje
-- de un código válido es la otra vía legítima: lo habilita solo dentro de
-- canjear_invitacion() con una marca local a la transacción.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.company_id is distinct from old.company_id)
     and auth.uid() is not null
     and public.current_user_role() is distinct from 'superadmin'
     and coalesce(current_setting('flety.canje_invitacion', true), '') <> 'on' then
    raise exception 'Solo superadmin puede modificar role o company_id';
  end if;
  return new;
end;
$$;

-- Código de 6 caracteres sin letras/números que se confundan (0/O, 1/I/L).
create function public.crear_invitacion()
returns public.company_invites
language plpgsql volatile security definer set search_path = public
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  nuevo text;
  invite public.company_invites;
begin
  if public.current_user_role() is distinct from 'empresa' or not public.current_company_aprobada() then
    raise exception 'Solo una empresa aprobada puede invitar choferes';
  end if;
  loop
    nuevo := '';
    for i in 1..6 loop
      nuevo := nuevo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    begin
      insert into public.company_invites (code, company_id, created_by)
      values (nuevo, public.current_user_company_id(), auth.uid())
      returning * into invite;
      return invite;
    exception when unique_violation then
      null; -- muy improbable: se genera otro
    end;
  end loop;
end;
$$;

-- El usuario logueado (cuenta nueva, rol cliente) se suma como chofer a la
-- empresa del código. Devuelve el nombre de la empresa.
create function public.canjear_invitacion(p_code text)
returns text
language plpgsql volatile security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  perfil public.users;
  invite public.company_invites;
  empresa text;
begin
  if uid is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select * into perfil from public.users where id = uid;
  if perfil.role = 'chofer' and perfil.company_id is not null then
    raise exception 'Ya sos chofer de una empresa';
  end if;
  if perfil.role is distinct from 'cliente' and perfil.role is distinct from 'chofer' then
    raise exception 'Esta cuenta no puede sumarse como chofer';
  end if;

  select * into invite from public.company_invites
  where code = upper(trim(p_code))
  for update;
  if not found or invite.used_at is not null or invite.expires_at < now() then
    raise exception 'El código no es válido o ya se usó';
  end if;

  perform set_config('flety.canje_invitacion', 'on', true);
  update public.users set role = 'chofer', company_id = invite.company_id where id = uid;
  insert into public.drivers (user_id, company_id, disponibilidad)
  values (uid, invite.company_id, false)
  on conflict (user_id) do update set company_id = excluded.company_id;
  perform set_config('flety.canje_invitacion', 'off', true);

  update public.company_invites set used_by = uid, used_at = now() where code = invite.code;

  select nombre into empresa from public.companies where id = invite.company_id;
  return empresa;
end;
$$;

revoke execute on function public.crear_invitacion() from public, anon;
revoke execute on function public.canjear_invitacion(text) from public, anon;
grant execute on function public.crear_invitacion() to authenticated;
grant execute on function public.canjear_invitacion(text) to authenticated;
