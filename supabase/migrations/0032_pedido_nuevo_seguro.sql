-- PEDIDOS NUEVOS (Mudanzas): dos correcciones.
--
-- 1. Seguridad: al crear un pedido, la app mandaba todos los campos y la base
--    no los controlaba (solo al modificarlo). Alguien podía crear un pedido ya
--    "confirmado" a nombre de cualquier empresa/chofer y después calificarlo.
--    Ahora el estado, la empresa, el chofer y la fecha los pone el servidor.
--
-- 2. Cobro: todavía no hay pago online (Mercado Pago), así que el pedido
--    quedaba "pendiente" para siempre y no llegaba a las empresas. Mientras
--    config.cobro_anticipado no esté en true, entra directo a la cola (y, si
--    eligió un fletero, con su reserva de 5 minutos). El cobro sigue como hoy:
--    el cliente le paga a la empresa y ella lo confirma en Cobros.

insert into public.config (clave, valor) values ('cobro_anticipado', 'false')
on conflict (clave) do nothing;

create function public.preparar_pedido_nuevo()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Conexiones de confianza (sin usuario, p. ej. el SQL Editor): sin cambios.
  if auth.uid() is null then
    return new;
  end if;
  new.company_id := null;
  new.driver_id := null;
  new.created_at := now();
  if coalesce((select valor = 'true'::jsonb from public.config where clave = 'cobro_anticipado'), false) then
    new.estado := 'pendiente';
    new.solicitado_hasta := null;
  else
    new.estado := 'buscando_asignacion';
    new.solicitado_hasta := case when new.company_solicitada is not null then now() + interval '5 minutes' end;
  end if;
  return new;
end;
$$;

-- "zz_": corre después de set_precio_estimado_trg (que valida al fletero
-- elegido y completa company_solicitada); los BEFORE van por orden alfabético.
create trigger zz_preparar_pedido_nuevo_trg
  before insert on public.orders
  for each row execute function public.preparar_pedido_nuevo();

-- Los pedidos que quedaron trabados esperando un pago que no existe pasan a la cola.
update public.orders set estado = 'pagado' where estado = 'pendiente';
