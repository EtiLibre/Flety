-- Fix: los triggers de 0002 bloqueaban también al SQL Editor / conexiones
-- admin (donde auth.uid() es NULL), impidiendo crear el primer superadmin.
-- Ahora solo bloquean cuando hay un actor autenticado vía la app que no es
-- superadmin; el acceso administrativo directo (auth.uid() IS NULL) queda
-- permitido, como corresponde a una conexión de confianza.

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.company_id is distinct from old.company_id)
     and auth.uid() is not null
     and public.current_user_role() is distinct from 'superadmin' then
    raise exception 'Solo superadmin puede modificar role o company_id';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_company_self_approval()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    new.estado_aprobacion is distinct from old.estado_aprobacion
    or new.comision_pct is distinct from old.comision_pct
  ) and auth.uid() is not null
    and public.current_user_role() is distinct from 'superadmin' then
    raise exception 'Solo superadmin puede aprobar la empresa o fijar la comisión';
  end if;
  return new;
end;
$$;
