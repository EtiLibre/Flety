-- VERIFICACIÓN DEL TELÉFONO POR WHATSAPP ("al revés", sin costo por mensaje).
-- La app muestra un código (FLETY 123456) y el usuario lo manda por WhatsApp
-- al número de Flety. Meta avisa al webhook (Edge Function whatsapp-webhook),
-- que llama a confirmar_verificacion_whatsapp: el número desde el que llegó
-- el mensaje queda como teléfono verificado de esa cuenta.
--
-- Se exige solo si config.verificar_telefono = true (arranca apagado, hasta
-- que esté configurado el número de WhatsApp de Flety):
--   · clientes: para pedir una mudanza/flete o una grúa;
--   · choferes y gruistas: para ponerse disponibles.

alter table public.users add column telefono_verificado_at timestamptz;

insert into public.config (clave, valor) values
  ('verificar_telefono', 'false'),
  ('whatsapp_flety', 'null')
on conflict (clave) do nothing;

create function public.exige_telefono()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select valor = 'true'::jsonb from public.config where clave = 'verificar_telefono'), false);
$$;

create function public.telefono_verificado(p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select telefono_verificado_at is not null from public.users where id = p_user), false);
$$;
revoke execute on function public.telefono_verificado(uuid) from public, anon;
grant execute on function public.telefono_verificado(uuid) to authenticated;

-- Nadie se marca "verificado" a mano; y si cambia el número, hay que volver a verificarlo.
create function public.proteger_telefono_verificado()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(current_setting('flety.tel_ok', true), '') = 'on' then
    return new;
  end if;
  if new.telefono_verificado_at is distinct from old.telefono_verificado_at
     and auth.uid() is not null
     and public.current_user_role() is distinct from 'superadmin' then
    raise exception 'El teléfono se verifica por WhatsApp';
  end if;
  if new.telefono is distinct from old.telefono then
    new.telefono_verificado_at := null;
  end if;
  return new;
end;
$$;

create trigger proteger_telefono_verificado_trg
  before update on public.users
  for each row execute function public.proteger_telefono_verificado();

-- ── Códigos ─────────────────────────────────────────────────────────────
create table public.verificaciones_telefono (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  codigo text not null check (codigo ~ '^[0-9]{6}$'),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'verificado', 'vencido')),
  telefono text,
  created_at timestamptz not null default now(),
  expira_at timestamptz not null default now() + interval '30 minutes',
  verificado_at timestamptz
);
create unique index verificaciones_codigo_pendiente on public.verificaciones_telefono (codigo) where estado = 'pendiente';
create index verificaciones_usuario_idx on public.verificaciones_telefono (user_id, created_at desc);

alter table public.verificaciones_telefono enable row level security;
revoke all on public.verificaciones_telefono from anon, authenticated;
grant select on public.verificaciones_telefono to authenticated;
create policy "verificacion_propia" on public.verificaciones_telefono for select to authenticated
  using (user_id = auth.uid());

-- Mensajes con códigos equivocados, para frenar a quien prueba códigos al azar.
create table public.verificaciones_fallidas (
  id bigint generated always as identity primary key,
  telefono text not null,
  created_at timestamptz not null default now()
);
create index verificaciones_fallidas_idx on public.verificaciones_fallidas (telefono, created_at desc);
alter table public.verificaciones_fallidas enable row level security;
revoke all on public.verificaciones_fallidas from anon, authenticated;

-- La app pide un código (si ya tiene uno vigente, devuelve el mismo).
create function public.iniciar_verificacion_telefono()
returns table (id uuid, codigo text, whatsapp text, expira_at timestamptz)
language plpgsql volatile security definer set search_path = public
as $$
declare
  v public.verificaciones_telefono;
  v_wa text := (select valor #>> '{}' from public.config where clave = 'whatsapp_flety');
begin
  if auth.uid() is null then
    raise exception 'Iniciá sesión para verificar tu teléfono';
  end if;
  if v_wa is null then
    raise exception 'La verificación por WhatsApp todavía no está disponible';
  end if;

  update public.verificaciones_telefono t set estado = 'vencido'
  where t.estado = 'pendiente' and t.expira_at < now();

  select * into v from public.verificaciones_telefono t
  where t.user_id = auth.uid() and t.estado = 'pendiente' and t.expira_at > now() + interval '5 minutes'
  order by t.created_at desc limit 1;

  if not found then
    if (select count(*) from public.verificaciones_telefono t
        where t.user_id = auth.uid() and t.created_at > now() - interval '1 hour') >= 6 then
      raise exception 'Pediste muchos códigos. Probá de nuevo en un rato';
    end if;
    update public.verificaciones_telefono t set estado = 'vencido'
    where t.user_id = auth.uid() and t.estado = 'pendiente';
    loop
      begin
        insert into public.verificaciones_telefono (user_id, codigo)
        values (auth.uid(), lpad(floor(random() * 1000000)::int::text, 6, '0'))
        returning * into v;
        exit;
      exception when unique_violation then
        null; -- código repetido entre los pendientes: se prueba otro.
      end;
    end loop;
  end if;

  return query select v.id, v.codigo, v_wa, v.expira_at;
end;
$$;
revoke execute on function public.iniciar_verificacion_telefono() from public, anon;
grant execute on function public.iniciar_verificacion_telefono() to authenticated;

-- La llama solo el webhook de WhatsApp (con la clave de servidor).
-- Devuelve: verificado | invalido | bloqueado.
create function public.confirmar_verificacion_whatsapp(p_codigo text, p_telefono text)
returns text
language plpgsql volatile security definer set search_path = public, gruas
as $$
declare
  v public.verificaciones_telefono;
  v_tel text := '+' || regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
begin
  if char_length(v_tel) not between 9 and 17 then
    return 'invalido';
  end if;
  if (select count(*) from public.verificaciones_fallidas f
      where f.telefono = v_tel and f.created_at > now() - interval '1 hour') >= 10 then
    return 'bloqueado';
  end if;

  select * into v from public.verificaciones_telefono t
  where t.codigo = p_codigo and t.estado = 'pendiente' and t.expira_at > now()
  for update;
  if not found then
    insert into public.verificaciones_fallidas (telefono) values (v_tel);
    return 'invalido';
  end if;

  perform set_config('flety.tel_ok', 'on', true);
  -- Un número verificado vale para una sola cuenta de cliente: si otra cuenta
  -- de cliente lo tenía, lo pierde (los choferes y gruistas pueden tener
  -- además su cuenta de cliente con el mismo número).
  update public.users u set telefono_verificado_at = null
  where u.telefono = v_tel and u.id <> v.user_id and u.telefono_verificado_at is not null
    and u.role = 'cliente'
    and not exists (select 1 from gruas.prestadores p where p.user_id = u.id);
  update public.users set telefono = v_tel, telefono_verificado_at = now() where id = v.user_id;
  perform set_config('flety.tel_ok', 'off', true);

  update public.verificaciones_telefono set estado = 'verificado', telefono = v_tel, verificado_at = now()
  where id = v.id;
  return 'verificado';
end;
$$;
revoke execute on function public.confirmar_verificacion_whatsapp(text, text) from public, anon, authenticated;
grant execute on function public.confirmar_verificacion_whatsapp(text, text) to service_role;

-- ── Dónde se exige ──────────────────────────────────────────────────────
create function public.exigir_telefono_cliente()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and public.exige_telefono() and not public.telefono_verificado(new.cliente_id) then
    raise exception 'Verificá tu teléfono para pedir';
  end if;
  return new;
end;
$$;

create trigger exigir_telefono_trg
  before insert on public.orders
  for each row execute function public.exigir_telefono_cliente();

create trigger exigir_telefono_trg
  before insert on gruas.solicitudes
  for each row execute function public.exigir_telefono_cliente();

create function public.exigir_telefono_disponible()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  -- drivers.disponibilidad / gruas.prestadores.disponible (por jsonb: la misma función sirve a las dos tablas).
  v_campo text := case when tg_table_name = 'drivers' then 'disponibilidad' else 'disponible' end;
  v_nuevo boolean := coalesce((to_jsonb(new) ->> v_campo)::boolean, false);
  v_viejo boolean := coalesce((to_jsonb(old) ->> v_campo)::boolean, false);
begin
  if v_nuevo and not v_viejo and auth.uid() is not null
     and public.exige_telefono() and not public.telefono_verificado(new.user_id) then
    raise exception 'Verificá tu teléfono para ponerte disponible';
  end if;
  return new;
end;
$$;

create trigger exigir_telefono_trg
  before update on public.drivers
  for each row execute function public.exigir_telefono_disponible();

create trigger exigir_telefono_trg
  before update on gruas.prestadores
  for each row execute function public.exigir_telefono_disponible();
