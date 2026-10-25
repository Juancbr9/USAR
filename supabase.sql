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
