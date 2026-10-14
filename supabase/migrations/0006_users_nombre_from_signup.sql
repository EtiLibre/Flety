-- El registro (web y app) manda el nombre en los metadatos de Supabase Auth
-- (options.data.nombre), pero handle_new_user de 0001 solo copiaba id y email.
-- Ahora también copia el nombre a public.users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, nombre)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''));
  return new;
end;
$$;
