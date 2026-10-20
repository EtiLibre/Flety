-- Rol nuevo: marketing (estadísticas de uso y anuncios/pop-ups).
-- Va en una migración propia: Postgres no deja usar un valor nuevo de un enum
-- en la misma transacción en que se agrega. Correr esto solo y después la 0013.
alter type public.user_role add value if not exists 'marketing';
