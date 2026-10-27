-- USAR 242 · base de datos compartida del equipo
-- Pega todo esto en Supabase → SQL Editor → New query → Run. Se puede volver a ejecutar sin perder datos
-- (sirve también para actualizar una base de datos creada con una versión anterior de este archivo).
-- Ejecutado entero deja el MODO SEGURO (cada persona entra con su usuario). Para el acceso abierto con el enlace
-- de invitación, ejecuta solo hasta la línea «MODO SEGURO».

create table if not exists public.usar_records (
  kind        text        not null,           -- gear, epis, operators, missions, images… (ver KINDS en js/config.js)
  id          text        not null,
  data        jsonb,
  deleted     boolean     not null default false,
  updated_at  timestamptz not null default now(),
  primary key (kind, id)
);

create index if not exists usar_records_updated_at on public.usar_records (updated_at);

-- Identificadores con la misma forma que acepta la app (SAFE_ID en js/data.js): una fila con otra forma se rechaza
-- ya en el servidor. «not valid»: solo se comprueban las filas nuevas o modificadas, no las que ya hay.
alter table public.usar_records drop constraint if exists usar_records_ids_ok;
alter table public.usar_records add constraint usar_records_ids_ok
  check (kind ~ '^[a-z]{1,30}$' and id ~ '^[A-Za-z0-9_.:@-]{1,120}$') not valid;

-- La hora de cada cambio la pone el servidor, así no importa si un móvil tiene la hora mal
create or replace function public.usar_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.usar_touch() from public, anon, authenticated;

drop trigger if exists usar_touch on public.usar_records;
create trigger usar_touch before insert or update on public.usar_records
  for each row execute function public.usar_touch();

-- Acceso con la clave pública de la app: quien tenga el enlace de invitación puede leer y editar.
-- OJO: así cualquiera con el enlace ve también DNI, pasaportes y datos médicos. Para datos reales, ejecuta el MODO SEGURO.
-- Sin DELETE: la app nunca borra filas, las marca como borradas (deleted = true).
alter table public.usar_records enable row level security;
drop policy if exists "equipo usar" on public.usar_records;
create policy "equipo usar" on public.usar_records
  for all to anon using (true) with check (true);

grant select, insert, update on public.usar_records to anon;

-- =====================================================================================
-- MODO SEGURO (recomendado): acceso con usuario y contraseña y permisos por rol
-- Con esto, el enlace de invitación ya NO basta: cada persona entra con su usuario.
--   · jefe:    ve y edita todo, da de alta a los miembros y es el único que da de alta o elimina material, cajas,
--              consumibles y vehículos
--   · miembro: ve y usa todo (mueve material, lo pasa a revisión, ajusta el stock…), pero no da de alta ni elimina
--              material, cajas, consumibles ni vehículos
-- Pasos: 1) En Authentication → Sign In / Providers → Email, deja activado «Confirm email» (si no, alguien podría
--           registrarse con el correo de un jefe antes que él). Si todos los usuarios los creas tú, desactiva además
--           «Allow new users to sign up».
--        2) Ejecuta este bloque.  3) En Authentication → Users crea (o deja que se registren desde la app) los usuarios.
--        4) Da de alta al primer jefe con la línea del final (cambia el correo). Después, los jefes añaden al resto desde la app.
-- =====================================================================================
create table if not exists public.usar_members (
  email text primary key,
  role  text not null check (role in ('jefe', 'miembro')),
  name  text
);
-- El correo siempre en minúsculas (la app lo compara así)
update public.usar_members set email = lower(email) where email <> lower(email);
alter table public.usar_members drop constraint if exists usar_members_email_lower;
alter table public.usar_members add constraint usar_members_email_lower check (email = lower(email));

-- Rol de quien hace la consulta. Va en un esquema que no se publica en la API (antes estaba en «public» y se podía
-- llamar desde fuera) y solo lo pueden usar los usuarios con sesión, a través de las reglas de abajo.
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.usar_role() returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.usar_members m where m.email = lower((select auth.jwt()) ->> 'email')
$$;
revoke execute on function private.usar_role() from public, anon;
grant execute on function private.usar_role() to authenticated;

alter table public.usar_members enable row level security;
drop policy if exists "ver miembros" on public.usar_members;
create policy "ver miembros" on public.usar_members for select to authenticated
  using ((select private.usar_role()) is not null);
-- Los jefes dan de alta, cambian y quitan miembros. Una regla por acción (no «for all») para que la lectura tenga una
-- sola regla y no se evalúen dos en cada consulta.
drop policy if exists "jefes gestionan miembros" on public.usar_members;
drop policy if exists "jefes: alta de miembros" on public.usar_members;
drop policy if exists "jefes: cambiar miembros" on public.usar_members;
drop policy if exists "jefes: quitar miembros" on public.usar_members;
create policy "jefes: alta de miembros" on public.usar_members for insert to authenticated
  with check ((select private.usar_role()) = 'jefe');
create policy "jefes: cambiar miembros" on public.usar_members for update to authenticated
  using ((select private.usar_role()) = 'jefe') with check ((select private.usar_role()) = 'jefe');
create policy "jefes: quitar miembros" on public.usar_members for delete to authenticated
  using ((select private.usar_role()) = 'jefe');
revoke all on public.usar_members from anon;
grant select, insert, update, delete on public.usar_members to authenticated;

-- Sustituye el acceso abierto por acceso con usuario
-- «(select …)»: el rol se calcula una vez por consulta y no una vez por fila (mucho más rápido al descargar)
drop policy if exists "equipo usar" on public.usar_records;
drop policy if exists "equipo usar con usuario" on public.usar_records;
drop policy if exists "equipo usar: ver" on public.usar_records;
drop policy if exists "equipo usar: crear" on public.usar_records;
drop policy if exists "equipo usar: cambiar" on public.usar_records;
create policy "equipo usar: ver" on public.usar_records for select to authenticated
  using ((select private.usar_role()) is not null);
-- Material (gear), cajas (boxes), consumibles y vehículos: solo un jefe los da de alta (los ids de FLOTA_KINDS en js/sesion.js)
create policy "equipo usar: crear" on public.usar_records for insert to authenticated
  with check ((select private.usar_role()) = 'jefe'
    or ((select private.usar_role()) is not null and kind not in ('gear', 'boxes', 'consumables', 'vehicles')));
-- Todos cambian lo que ya existe (estado, ubicación, stock…), pero solo un jefe elimina material, cajas, consumibles o vehículos
create policy "equipo usar: cambiar" on public.usar_records for update to authenticated
  using ((select private.usar_role()) is not null)
  with check ((select private.usar_role()) = 'jefe'
    or ((select private.usar_role()) is not null and (not deleted or kind not in ('gear', 'boxes', 'consumables', 'vehicles'))));
-- Si más adelante queréis que la documentación del personal solo la vean los jefes, cambiad el «using» de «ver» por:
--   using ((select private.usar_role()) is not null and (kind not in ('readiness', 'docs', 'images') or (select private.usar_role()) = 'jefe'))
revoke all on public.usar_records from anon;
grant select, insert, update on public.usar_records to authenticated;

-- La función antigua (versiones anteriores de este archivo) ya no la usa ninguna regla
drop function if exists public.usar_role();

-- Primer jefe (cambia el correo):
-- insert into public.usar_members (email, role, name) values ('jefe@ejemplo.com', 'jefe', 'RODRI');

-- =====================================================================================
-- ACCESO CON NOMBRE Y PIN (sin correo). Requiere el MODO SEGURO de arriba.
-- Cada móvil entra como invitado (Authentication → Sign In / Providers → activa «Allow anonymous sign-ins») y la base
-- de datos comprueba su nombre y su PIN: hasta entonces ese invitado no ve nada (no tiene rol). Los PIN los pone un jefe
-- desde la app (Ajustes → Miembros y permisos) y cada uno puede cambiar el suyo. Se guarda solo su huella (bcrypt).
-- Tras 5 fallos seguidos con un nombre, ese nombre espera 5 min (y 5 min más por cada fallo siguiente).
-- Las cuentas con correo de antes siguen valiendo.
-- =====================================================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists private.usar_pins (
  name         text primary key check (name = upper(name)),   -- nombre del equipo, como en la app
  role         text not null check (role in ('jefe', 'miembro')),
  pin_hash     text not null,
  fails        int  not null default 0,
  locked_until timestamptz
);
create table if not exists private.usar_sesiones (
  uid        uuid primary key,                                 -- el invitado de un móvil
  name       text not null references private.usar_pins (name) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.usar_pins enable row level security;       -- solo se usan a través de las funciones de abajo
alter table private.usar_sesiones enable row level security;
revoke all on private.usar_pins, private.usar_sesiones from public, anon, authenticated;

-- Rol: el del PIN con el que entró este móvil o, si no, el de su cuenta con correo
create or replace function private.usar_role() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role from private.usar_sesiones s join private.usar_pins p on p.name = s.name where s.uid = (select auth.uid())),
    (select m.role from public.usar_members m where m.email = lower((select auth.jwt()) ->> 'email')))
$$;
revoke execute on function private.usar_role() from public, anon;
grant execute on function private.usar_role() to authenticated;

-- Nombres que pueden entrar (para la lista de la pantalla de entrada; solo los nombres)
create or replace function public.usar_nombres() returns table (name text)
language sql stable security definer set search_path = '' as $$
  select p.name from private.usar_pins p order by p.name
$$;

-- Entrar con nombre y PIN: si es correcto, este móvil (su usuario invitado) queda con ese nombre y su rol
create or replace function public.usar_entrar(p_name text, p_pin text) returns json
language plpgsql security definer set search_path = '' as $$
declare r private.usar_pins;
begin
  if (select auth.uid()) is null then return json_build_object('error', 'Sin sesión'); end if;
  select * into r from private.usar_pins where name = upper(trim(p_name)) for update;
  if not found then return json_build_object('error', 'Ese nombre no tiene PIN: pide a un jefe que te lo ponga'); end if;
  if r.locked_until > now() then
    return json_build_object('error', 'Demasiados intentos. Espera ' || ceil(extract(epoch from r.locked_until - now()) / 60) || ' min o pide a un jefe un PIN nuevo');
  end if;
  if r.pin_hash <> extensions.crypt(coalesce(p_pin, ''), r.pin_hash) then
    update private.usar_pins set fails = fails + 1,
      locked_until = case when fails + 1 >= 5 then now() + make_interval(mins => 5 * (fails + 1 - 4)) end
      where name = r.name;
    return json_build_object('error', 'PIN incorrecto');
  end if;
  update private.usar_pins set fails = 0, locked_until = null where name = r.name;
  insert into private.usar_sesiones (uid, name) values ((select auth.uid()), r.name)
    on conflict (uid) do update set name = excluded.name, created_at = now();
  return json_build_object('name', r.name, 'role', r.role);
end $$;

-- Salir: este móvil deja de tener nombre (y rol)
create or replace function public.usar_salir() returns void
language sql security definer set search_path = '' as $$
  delete from private.usar_sesiones where uid = (select auth.uid())
$$;

-- Cambiar el PIN propio (con el actual)
create or replace function public.usar_cambiar_mi_pin(p_old text, p_new text) returns json
language plpgsql security definer set search_path = '' as $$
declare r private.usar_pins;
begin
  select p.* into r from private.usar_pins p join private.usar_sesiones s on s.name = p.name where s.uid = (select auth.uid());
  if not found then return json_build_object('error', 'Entra con tu nombre y PIN'); end if;
  if p_new !~ '^[0-9]{4,8}$' then return json_build_object('error', 'El PIN son de 4 a 8 cifras'); end if;
  if r.pin_hash <> extensions.crypt(coalesce(p_old, ''), r.pin_hash) then return json_build_object('error', 'El PIN actual no es correcto'); end if;
  update private.usar_pins set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf')), fails = 0, locked_until = null where name = r.name;
  return json_build_object('ok', true);
end $$;

-- Jefes: ver quién tiene PIN, ponerlo (alta o PIN nuevo, también desbloquea) y quitarlo
create or replace function public.usar_personas() returns table (name text, role text, bloqueado boolean)
language sql stable security definer set search_path = '' as $$
  select p.name, p.role, coalesce(p.locked_until > now(), false) from private.usar_pins p
  where (select private.usar_role()) = 'jefe' order by p.name
$$;
create or replace function public.usar_poner_pin(p_name text, p_role text, p_pin text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  if (select private.usar_role()) is distinct from 'jefe' then return json_build_object('error', 'Solo un jefe pone los PIN'); end if;
  if coalesce(trim(p_name), '') = '' or p_role not in ('jefe', 'miembro') then return json_build_object('error', 'Faltan el nombre o el permiso'); end if;
  if p_pin !~ '^[0-9]{4,8}$' then return json_build_object('error', 'El PIN son de 4 a 8 cifras'); end if;
  insert into private.usar_pins (name, role, pin_hash) values (upper(trim(p_name)), p_role, extensions.crypt(p_pin, extensions.gen_salt('bf')))
    on conflict (name) do update set role = excluded.role, pin_hash = excluded.pin_hash, fails = 0, locked_until = null;
  return json_build_object('ok', true);
end $$;
create or replace function public.usar_cambiar_permiso(p_name text, p_role text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  if (select private.usar_role()) is distinct from 'jefe' then return json_build_object('error', 'Solo un jefe cambia permisos'); end if;
  if p_role not in ('jefe', 'miembro') then return json_build_object('error', 'Permiso no válido'); end if;
  update private.usar_pins set role = p_role where name = upper(trim(p_name));
  return json_build_object('ok', true);
end $$;
create or replace function public.usar_quitar(p_name text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  if (select private.usar_role()) is distinct from 'jefe' then return json_build_object('error', 'Solo un jefe quita personas'); end if;
  delete from private.usar_pins where name = upper(trim(p_name));   -- sus móviles dejan de tener acceso
  return json_build_object('ok', true);
end $$;

revoke execute on function public.usar_nombres(), public.usar_entrar(text, text), public.usar_salir(), public.usar_cambiar_mi_pin(text, text),
  public.usar_personas(), public.usar_poner_pin(text, text, text), public.usar_cambiar_permiso(text, text), public.usar_quitar(text) from public, anon;
grant execute on function public.usar_nombres(), public.usar_entrar(text, text), public.usar_salir(), public.usar_cambiar_mi_pin(text, text),
  public.usar_personas(), public.usar_poner_pin(text, text, text), public.usar_cambiar_permiso(text, text), public.usar_quitar(text) to authenticated;
grant execute on function public.usar_nombres() to anon;   -- la lista de nombres de la entrada, antes de entrar

-- Invitados de móviles que ya no se usan (más de 60 días sin nombre): se pueden borrar de vez en cuando con
-- delete from auth.users u where u.is_anonymous and u.created_at < now() - interval '60 days'
--   and not exists (select 1 from private.usar_sesiones s where s.uid = u.id);
