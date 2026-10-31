-- GRÚAS · 3/3: reloj automático (pg_cron, gratis en Supabase).
-- Cada 15 segundos vence las ofertas que nadie respondió y pasa a la próxima
-- grúa. Si pg_cron no se puede activar, la app igual empuja el despacho
-- (gruas.revisar) mientras el cliente espera.

do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'No se pudo activar pg_cron: %', sqlerrm;
end $$;

do $$
begin
  perform cron.schedule('gruas-vencer-ofertas', '15 seconds', 'select gruas.vencer_ofertas()');
exception when others then
  raise notice 'No se pudo programar el reloj de Grúas: %', sqlerrm;
end $$;
