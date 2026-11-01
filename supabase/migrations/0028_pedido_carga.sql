-- Qué se va a transportar (obligatorio al pedir): lo ven la empresa y el
-- chofer para cotizar y preparar el viaje. Los pedidos anteriores quedan sin dato.
alter table public.orders add column carga text check (char_length(trim(carga)) between 3 and 300);
