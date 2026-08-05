-- ============================================================
-- Migración: Perfil completo de alumnos + nuevos roles + acceso
-- restringido por columna (finanzas / celador vs celador_estudios)
-- ============================================================
-- Depende de: 20260717000001_auth_profiles_and_rls.sql
--
-- Contexto:
--   - Se incorpora el formulario de Google (Ficha) como perfil
--     completo de alumnos: cédula, correo, dirección, redes
--     sociales, fechas, sede, instructor, celador, horario,
--     materias, etc.
--   - Esos datos personales son solo para "control de estudio"
--     (rol celador_estudios) y super_admin.
--   - Finanzas solo necesita nombre + teléfono (para WhatsApp) +
--     lo que ya usaba para cuotas/solvencias — nunca cédula,
--     correo, dirección, etc.
--   - Celador (general, por aula) solo necesita nombre + aula de
--     SU aula — nada de datos personales ni financieros.
--   - Se agregan 2 celador_estudios (Karina, Milagro) y 1 celador
--     (Javier, aula Arjuna) que además colabora en el código del
--     proyecto (acceso a GitHub, NO a datos de producción).
-- ============================================================

-- ---------- 1. Nuevos roles asignados por email (hash md5) ----------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  user_email text;
begin
  user_email := lower(new.email);

  assigned_role := case
    when md5(user_email) in (
      'b4280c3d035dba77e903747052e521bc',  -- super_admin
      '031aecdbef22c085378acbed0c5e6813'
    ) then 'super_admin'::public.user_role

    when md5(user_email) = '5c5d3a6a8159ca93d763e2a63618219a'
      then 'finanzas'::public.user_role

    when md5(user_email) = '2f1d5ce1e1cbce56254c606a79475b8e'
      then 'director'::public.user_role

    when md5(user_email) in (
      '85dc525f05801acb77f29d5e59d11955',  -- celador
      '13d6ad2bda108b44a7c1bcea0eb70de3',
      '166e35c4905efb2eb2af8a895349586c',
      'df03bb09ec08510d24de8731fcd292fe'   -- Javier (celador Arjuna, dev)
    ) then 'celador'::public.user_role

    when md5(user_email) in (
      '91690fe772669e34990109f4cbc6cb85',  -- celador_estudios
      '6516d9e4ce381053f09b0a0dd045f835',
      'b4c4c31570f355cd08268db177f466cf',  -- Karina (control de estudio)
      'c3d2436bdc3cdbce9e8b34dcd8f6fbc3'   -- Milagro (control de estudio)
    ) then 'celador_estudios'::public.user_role

    else 'celador'::public.user_role -- por defecto
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    user_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    assigned_role
  );

  return new;
end;
$$ language plpgsql security definer;

-- ---------- 2. Perfil completo de alumnos (columnas del Google Form) ----------
alter table public.students
  add column if not exists cedula               text,
  add column if not exists correo                text,
  add column if not exists direccion             text,
  add column if not exists redes_sociales         text,
  add column if not exists ocupacion              text,
  add column if not exists habilidades            text,
  add column if not exists grado_participacion    text,
  add column if not exists fecha_miembro          text,
  add column if not exists fecha_ffvv             text,
  add column if not exists sede                   text,
  add column if not exists instructor             text,
  add column if not exists celador_nombre         text,
  add column if not exists horario                text,
  add column if not exists materias               text;

comment on column public.students.cedula is 'Documento de identidad — visible solo para celador_estudios/super_admin';
comment on column public.students.correo is 'Correo del alumno — visible solo para celador_estudios/super_admin';
comment on column public.students.direccion is 'Dirección — visible solo para celador_estudios/super_admin';

-- ---------- 3. Fix: la policy de celador en asistencias comparaba mal
--    (aulas.nombre contra profiles.aula_id::text, nunca hacía match).
--    profiles.aula_id y asistencias.aula_id son del mismo tipo (integer,
--    referencian aulas.id): se comparan directamente, sin pasar por aulas.
-- ----------
drop policy if exists "celador_su_aula_asistencias" on public.asistencias;
create policy "celador_su_aula_asistencias" on public.asistencias
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'celador'
        and p.aula_id = asistencias.aula_id
    )
  );

-- ---------- 4. Acceso a `students` restringido por columna ----------
-- La tabla base solo la puede leer/escribir completa super_admin y
-- celador_estudios (ya definido en la migración anterior). Se quita el
-- acceso de lectura total que tenía finanzas: de ahora en adelante pasa
-- por una vista con solo las columnas que necesita.
drop policy if exists "finanzas_read_students" on public.students;

-- Vista para finanzas (y super_admin): nombre, teléfono, aula, estado y
-- lo que ya usaban para cuotas/solvencias. Sin cédula/correo/dirección/etc.
-- Nota: las vistas en Postgres corren con los permisos del dueño (bypass
-- RLS de la tabla base), por eso el filtro de rol va explícito aquí adentro.
create or replace view public.students_finanzas as
  select
    id, nombre, telefono, aulas, actividad, condicion,
    cuota_override, cuota_overrides_temporales
  from public.students
  where public.is_finanzas() or public.is_super_admin();

grant select on public.students_finanzas to authenticated;

-- Vista para celador (general, no celador_estudios): solo nombre + aula
-- de SU propia aula, para pasar lista. Sin teléfono, sin datos de cuotas.
create or replace view public.students_celador as
  select s.id, s.nombre, s.aulas, s.actividad
  from public.students s
  where public.is_super_admin()
     or exists (
          select 1 from public.profiles p
          join public.aulas a on a.id = p.aula_id
          where p.id = auth.uid()
            and p.role = 'celador'
            and a.nombre = any(s.aulas)
        );

grant select on public.students_celador to authenticated;

comment on view public.students_finanzas is 'Solo nombre/telefono/aula/cuotas — sin datos personales. Para rol finanzas.';
comment on view public.students_celador is 'Solo nombre/aula de su propia aula — sin telefono ni cuotas. Para rol celador.';
