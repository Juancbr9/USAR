-- USAR Matrix · base de datos compartida del equipo
-- Pega todo esto en Supabase → SQL Editor → New query → Run. Solo hay que hacerlo una vez.

create table if not exists public.usar_records (
  kind        text        not null,           -- gear, epis, consumables, operators, logs, inspections, meta
  id          text        not null,
  data        jsonb,
  deleted     boolean     not null default false,
  updated_at  timestamptz not null default now(),
  primary key (kind, id)
);

create index if not exists usar_records_updated_at on public.usar_records (updated_at);

-- La hora de cada cambio la pone el servidor, así no importa si un móvil tiene la hora mal
create or replace function public.usar_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists usar_touch on public.usar_records;
create trigger usar_touch before insert or update on public.usar_records
  for each row execute function public.usar_touch();

-- Acceso con la clave pública de la app (quien tenga el enlace de invitación puede leer y editar)
alter table public.usar_records enable row level security;
drop policy if exists "equipo usar" on public.usar_records;
create policy "equipo usar" on public.usar_records
  for all to anon using (true) with check (true);

grant select, insert, update on public.usar_records to anon;

-- =====================================================================================
-- MODO SEGURO (opcional, recomendado): acceso con usuario y contraseña y permisos por rol
-- Con esto, el enlace de invitación ya NO basta: cada persona entra con su usuario.
--   · jefe:    ve y edita todo y da de alta a los miembros
--   · miembro: ve y edita todo (de momento todo el personal accede a todo)
-- Pasos: 1) Ejecuta este bloque.  2) En Authentication → Users crea (o deja que se registren desde la app) los usuarios.
--        3) Da de alta al primer jefe con la línea de abajo (cambia el correo). Después, los jefes añaden al resto desde la app.
-- =====================================================================================
create table if not exists public.usar_members (
  email text primary key,
  role  text not null check (role in ('jefe', 'miembro')),
  name  text
);

create or replace function public.usar_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.usar_members where email = lower(auth.jwt() ->> 'email')
$$;

alter table public.usar_members enable row level security;
drop policy if exists "ver miembros" on public.usar_members;
create policy "ver miembros" on public.usar_members for select to authenticated using (public.usar_role() is not null);
drop policy if exists "jefes gestionan miembros" on public.usar_members;
create policy "jefes gestionan miembros" on public.usar_members for all to authenticated
  using (public.usar_role() = 'jefe') with check (public.usar_role() = 'jefe');
grant select, insert, update, delete on public.usar_members to authenticated;

-- Sustituye el acceso abierto por acceso con usuario
drop policy if exists "equipo usar" on public.usar_records;
drop policy if exists "equipo usar con usuario" on public.usar_records;
create policy "equipo usar con usuario" on public.usar_records for all to authenticated
  using (public.usar_role() is not null)
  with check (public.usar_role() is not null);
-- Si más adelante queréis que la documentación del personal solo la vean los jefes, cambiad las dos líneas de arriba por:
--   using (public.usar_role() is not null and (kind not in ('readiness', 'docs', 'images') or public.usar_role() = 'jefe'))
revoke select, insert, update on public.usar_records from anon;
grant select, insert, update on public.usar_records to authenticated;

-- Primer jefe (cambia el correo):
-- insert into public.usar_members (email, role, name) values ('jefe@ejemplo.com', 'jefe', 'GRANADOS');
