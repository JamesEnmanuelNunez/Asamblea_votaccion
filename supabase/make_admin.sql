-- Ejecutar DESPUÉS de crear el usuario admin en Authentication -> Users.
-- Sustituye el email por el que hayas usado (debe coincidir con VITE_ADMIN_EMAIL).

insert into public.admins (user_id)
select id from auth.users where email = 'admin@asamblea.com'
on conflict (user_id) do nothing;
