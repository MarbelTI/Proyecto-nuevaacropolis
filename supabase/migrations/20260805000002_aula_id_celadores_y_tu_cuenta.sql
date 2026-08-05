-- ============================================================
-- Migración: aula_id para celadores + cuenta de control de estudio
-- ============================================================
-- Depende de: 20260805000001_students_perfil_completo_y_roles.sql
--
-- Contexto: los roles de Ricardo (director), Alicia (celador), Kairo
-- (celador), Nancy Margelys (super_admin) y Manuela (finanzas) ya
-- estaban en la migración original (20260717000001). Lo que faltaba:
--   1. Tu propia cuenta (celador_estudios).
--   2. El aula_id de cada celador (Alicia, Kairo, Javier) — sin esto,
--      la vista `students_celador` y la policy de asistencias por aula
--      no tienen forma de saber cuál es "su aula".
--
-- OJO: esto asume que en la tabla `aulas` el campo `nombre` tiene
-- EXACTAMENTE estos valores: 'Arjuna I', 'Arjuna II', 'Krishna VI'.
-- Si no coinciden tal cual (mayúsculas, tildes, espacios), la
-- asignación no va a hacer match y quedará en null. Al final de este
-- archivo hay una consulta para verificarlo.
-- ============================================================

-- La tabla `profiles` real se creó vía full_setup.sql, que no incluía
-- aula_id (a diferencia de la migración 20260717000001) — se agrega aquí.
alter table public.profiles
  add column if not exists aula_id integer references public.aulas(id) on delete set null;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  assigned_aula integer;
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
      '85dc525f05801acb77f29d5e59d11955',  -- celador (Kairo)
      '13d6ad2bda108b44a7c1bcea0eb70de3',  -- celador (Alicia)
      '166e35c4905efb2eb2af8a895349586c',
      'df03bb09ec08510d24de8731fcd292fe'   -- celador (Javier)
    ) then 'celador'::public.user_role

    when md5(user_email) in (
      '91690fe772669e34990109f4cbc6cb85',
      '6516d9e4ce381053f09b0a0dd045f835',
      'b4c4c31570f355cd08268db177f466cf',  -- Karina
      'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',  -- Milagro
      'edd47a1ea754936f7c73699459bbb03a'   -- tu cuenta
    ) then 'celador_estudios'::public.user_role

    else 'celador'::public.user_role
  end;

  -- Aula asignada según el email, solo para celador (no aplica a
  -- celador_estudios, que ya tiene acceso completo sin restricción de aula).
  assigned_aula := case
    when md5(user_email) = '85dc525f05801acb77f29d5e59d11955'
      then (select id from public.aulas where nombre = 'Krishna VI')
    when md5(user_email) = '13d6ad2bda108b44a7c1bcea0eb70de3'
      then (select id from public.aulas where nombre = 'Arjuna II')
    when md5(user_email) = 'df03bb09ec08510d24de8731fcd292fe'
      then (select id from public.aulas where nombre = 'Arjuna I')
    else null
  end;

  insert into public.profiles (id, email, full_name, role, aula_id)
  values (
    new.id,
    user_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    assigned_role,
    assigned_aula
  );

  return new;
end;
$$ language plpgsql security definer;

-- Backfill: si Alicia/Kairo/Javier YA se habían registrado antes de este
-- cambio, su perfil existe pero sin aula_id — se corrige aquí. (El email
-- ya está en texto plano en `profiles.email` porque lo llenó el trigger
-- al momento del signup; comparamos por md5 solo para no escribir el
-- email en claro en este archivo.)
update public.profiles set aula_id = (select id from public.aulas where nombre = 'Krishna VI')
  where md5(email) = '85dc525f05801acb77f29d5e59d11955' and aula_id is null;

update public.profiles set aula_id = (select id from public.aulas where nombre = 'Arjuna II')
  where md5(email) = '13d6ad2bda108b44a7c1bcea0eb70de3' and aula_id is null;

update public.profiles set aula_id = (select id from public.aulas where nombre = 'Arjuna I')
  where md5(email) = 'df03bb09ec08510d24de8731fcd292fe' and aula_id is null;

-- ---------- Verificación (ejecutar aparte y revisar el resultado) ----------
-- select email, role, aula_id,
--        (select nombre from public.aulas a where a.id = profiles.aula_id) as aula_nombre
-- from public.profiles
-- order by role;
