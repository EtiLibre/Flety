-- Endurecimiento de seguridad (auditoría).
--
-- 1. Sin cuenta (rol anon) no se ejecuta ninguna función de la base. Por
--    defecto Postgres deja ejecutar funciones a todos; acá solo quedan para
--    usuarios con sesión, y lo mismo para las funciones que se creen después.
-- 2. Pedidos: el cliente, la empresa o el chofer no pueden cambiar a mano la
--    empresa asignada, el cliente ni los datos del viaje (origen, destino,
--    tipo, tamaño, fecha). La empresa solo se asigna con las transiciones
--    válidas (tomar de la cola, el chofer elegido acepta, la empresa rechaza).
-- 3. El correo de public.users solo cambia cuando se confirma en Auth.
-- 4. Visitas y eventos de anuncios (lo único que se escribe sin cuenta, para las
--    estadísticas): límite para que nadie llene la base.
-- 5. La configuración (comisión de Flety, etc.) solo la ve el equipo de Flety.

-- ── 1. Funciones: solo con sesión ───────────────────────────────────────
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated;

-- ── 2. Pedidos: campos que no se tocan a mano ───────────────────────────
create function public.proteger_pedido()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  actor public.user_role := public.current_user_role();
  mi_driver uuid := public.current_driver_id();
begin
  -- Conexiones de confianza (sin usuario) y superadmin: sin restricciones.
  if auth.uid() is null or actor = 'superadmin' then
    return new;
  end if;

  if new.cliente_id is distinct from old.cliente_id
     or new.tipo is distinct from old.tipo
     or new.origen is distinct from old.origen
     or new.destino is distinct from old.destino
     or new.tamano is distinct from old.tamano
     or new.programado_para is distinct from old.programado_para
     or new.created_at is distinct from old.created_at then
    raise exception 'Los datos del pedido no se pueden modificar una vez creado';
  end if;

  if new.company_id is distinct from old.company_id then
    -- Una empresa toma un pedido de la cola (buscando -> asignado, a su nombre).
    if actor = 'empresa'
       and old.company_id is null
       and old.estado = 'buscando_asignacion'
       and new.estado = 'asignado'
       and new.company_id = public.current_user_company_id() then
      null;
    -- El chofer elegido en el marketplace acepta (su empresa queda asignada).
    elsif actor = 'chofer'
       and old.company_id is null
       and old.estado = 'buscando_asignacion'
       and new.estado = 'asignado'
       and old.driver_solicitado = mi_driver
       and new.company_id = (select company_id from public.drivers where id = mi_driver) then
      null;
    -- La empresa asignada rechaza: vuelve a la cola (lo resuelve validate_order_transition).
    elsif actor = 'empresa'
       and old.company_id = public.current_user_company_id()
       and old.estado = 'asignado'
       and new.estado in ('cancelado_empresa', 'buscando_asignacion')
       and new.company_id is null then
      null;
    else
      raise exception 'La empresa del pedido solo cambia al tomarlo de la cola o al rechazarlo';
    end if;
  end if;

  return new;
end;
$$;

-- Corre antes que validate_order_transition (orden alfabético de los BEFORE).
create trigger a_proteger_pedido_trg
  before update on public.orders
  for each row execute function public.proteger_pedido();

-- ── 3. Correo de public.users ───────────────────────────────────────────
create function public.proteger_email_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- El cambio real lo hace sync_user_email (desde Auth, sin sesión de usuario).
  if new.email is distinct from old.email
     and auth.uid() is not null
     and public.current_user_role() is distinct from 'superadmin' then
    raise exception 'El correo se cambia desde Mi cuenta (con confirmación por mail)';
  end if;
  return new;
end;
$$;

create trigger proteger_email_usuario_trg
  before update on public.users
  for each row execute function public.proteger_email_usuario();

-- ── 4. Límites a lo que se escribe sin cuenta ───────────────────────────
create function public.limitar_visitas()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.visitas
      where sesion = new.sesion and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Demasiadas visitas seguidas';
  end if;
  if (select count(*) from public.visitas where created_at > now() - interval '1 minute') >= 3000 then
    raise exception 'Demasiadas visitas seguidas';
  end if;
  return new;
end;
$$;

create trigger limitar_visitas_trg
  before insert on public.visitas
  for each row execute function public.limitar_visitas();

create function public.limitar_anuncio_eventos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.anuncio_eventos
      where anuncio_id = new.anuncio_id and created_at > now() - interval '1 minute') >= 1000 then
    raise exception 'Demasiados eventos seguidos';
  end if;
  return new;
end;
$$;

create trigger limitar_anuncio_eventos_trg
  before insert on public.anuncio_eventos
  for each row execute function public.limitar_anuncio_eventos();

-- ── 5. Configuración: solo el equipo de Flety ──────────────────────────
drop policy "config_select" on public.config;

create policy "config_select" on public.config
  for select to authenticated
  using (public.current_user_role() in ('superadmin', 'contabilidad', 'marketing'));

-- Las funciones nuevas de esta migración también quedan solo para usuarios con sesión.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
