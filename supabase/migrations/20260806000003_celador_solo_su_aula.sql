-- ============================================================
-- Migración: cada celador ve solo su aula
--
-- DOS PROBLEMAS QUE ARREGLA
--
-- 1. El celador veía todas las aulas en la base de datos.
--    La aplicación sí lo limitaba en pantalla, pero quien supiera consultar
--    la base directamente veía el resto. Ahora lo impide Postgres.
--
-- 2. handle_new_user() estaba ROTO.
--    La migración 20260805000002 asigna el aula así:
--        (select id from public.aulas where nombre = 'Krishna VI')
--    pero `public.aulas` no existe: ninguna migración la crea, solo se la
--    menciona. Esa función corre en cada registro nuevo, así que cualquier
--    persona que intentara crear su cuenta obtenía un error.
--
--    Se sustituye por una columna de texto `aula_nombre`, que además es como
--    trabaja la aplicación (las aulas se identifican por nombre, no por id).
--    `aula_id` se deja donde está para no romper nada, pero ya no se usa.
-- ============================================================

-- ------------------------------------------------------------
-- 1. El aula del celador, por nombre
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists aula_nombre text;

comment on column public.profiles.aula_nombre is
  'Aula del celador, por nombre. Sustituye a aula_id, que apuntaba a una tabla inexistente.';

-- ------------------------------------------------------------
-- 2. Registro de usuarios nuevos, sin depender de la tabla fantasma
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  assigned_aula text;
  user_email text;
begin
  user_email := lower(new.email);

  assigned_role := case
    when md5(user_email) in (
      'b4280c3d035dba77e903747052e521bc',
      '031aecdbef22c085378acbed0c5e6813'
    ) then 'super_admin'::public.user_role

    when md5(user_email) = '5c5d3a6a8159ca93d763e2a63618219a'
      then 'finanzas'::public.user_role

    when md5(user_email) = '2f1d5ce1e1cbce56254c606a79475b8e'
      then 'director'::public.user_role

    when md5(user_email) in (
      '85dc525f05801acb77f29d5e59d11955',  -- Kairo
      '13d6ad2bda108b44a7c1bcea0eb70de3',  -- Alicia
      '166e35c4905efb2eb2af8a895349586c',
      'df03bb09ec08510d24de8731fcd292fe'   -- Javier
    ) then 'celador'::public.user_role

    when md5(user_email) in (
      '91690fe772669e34990109f4cbc6cb85',
      '6516d9e4ce381053f09b0a0dd045f835',
      'b4c4c31570f355cd08268db177f466cf',  -- Karina
      'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',  -- Milagro Elena
      'edd47a1ea754936f7c73699459bbb03a'
    ) then 'celador_estudios'::public.user_role

    else 'celador'::public.user_role
  end;

  -- Ahora es texto plano: no hace falta que exista ninguna tabla de aulas.
  -- Control de estudio no lleva aula porque no está limitado a una.
  assigned_aula := case
    when md5(user_email) = '85dc525f05801acb77f29d5e59d11955' then 'Krishna VI'
    when md5(user_email) = '13d6ad2bda108b44a7c1bcea0eb70de3' then 'Arjuna II'
    when md5(user_email) = 'df03bb09ec08510d24de8731fcd292fe' then 'Arjuna I'
    else null
  end;

  insert into public.profiles (id, email, full_name, role, aula_nombre)
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

-- ------------------------------------------------------------
-- 3. Corregir a quien ya se había registrado antes de este cambio
-- ------------------------------------------------------------
update public.profiles set aula_nombre = 'Krishna VI'
  where md5(email) = '85dc525f05801acb77f29d5e59d11955' and aula_nombre is null;

update public.profiles set aula_nombre = 'Arjuna II'
  where md5(email) = '13d6ad2bda108b44a7c1bcea0eb70de3' and aula_nombre is null;

update public.profiles set aula_nombre = 'Arjuna I'
  where md5(email) = 'df03bb09ec08510d24de8731fcd292fe' and aula_nombre is null;

-- ------------------------------------------------------------
-- 4. Funciones de apoyo para las políticas
-- ------------------------------------------------------------

-- El aula del celador que está consultando. null = no es celador, o no
-- tiene aula asignada (en cuyo caso no verá nada, que es lo correcto).
create or replace function public.aula_del_celador()
returns text as $$
  select aula_nombre from public.profiles
  where id = auth.uid() and aprobado = true and role = 'celador';
$$ language sql security definer stable;

-- Ve todas las aulas: tecnología, control de estudio y dirección.
create or replace function public.ve_todas_las_aulas()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and aprobado = true
      and role in ('super_admin', 'celador_estudios', 'director')
  );
$$ language sql security definer stable;

-- Escribe: tecnología y control de estudio, en cualquier aula.
-- (El celador también escribe, pero solo la suya — eso lo resuelve cada
-- política por separado, más abajo.)
create or replace function public.puede_escribir_asistencias()
returns boolean as $$
  select public.is_super_admin() or public.is_celador_estudios();
$$ language sql security definer stable;

-- Ya no hace falta: la reemplazan ve_todas_las_aulas() + aula_del_celador().
drop function if exists public.puede_leer_asistencias();

-- ------------------------------------------------------------
-- 5. Políticas nuevas
--
--   Tecnología / control de estudio ... leen y escriben todo
--   Dirección ........................ lee todo, no escribe
--   Celador .......................... lee y escribe SOLO su aula
--   Finanzas ......................... no entra
--
-- El celador escribe porque marcar la asistencia de su aula es su trabajo.
-- Lo que no puede es tocar —ni ver— las demás.
-- ------------------------------------------------------------

do $$
declare
  t text;
  col text;
begin
  -- att_aulas identifica el aula por `nombre`; las otras tres por `aula`.
  foreach t in array array[
    'att_aulas', 'att_asistencias', 'att_reflexiones', 'att_reflexion_asistencia'
  ] loop
    col := case when t = 'att_aulas' then 'nombre' else 'aula' end;

    -- Fuera las políticas anteriores, que daban lectura total al celador.
    execute format('drop policy if exists "asist_lectura" on public.%I', t);
    execute format('drop policy if exists "asist_escritura" on public.%I', t);
    execute format('drop policy if exists "asist_lectura_general" on public.%I', t);
    execute format('drop policy if exists "asist_escritura_general" on public.%I', t);
    execute format('drop policy if exists "asist_celador_su_aula" on public.%I', t);

    -- Lectura amplia.
    execute format(
      'create policy "asist_lectura_general" on public.%I
         for select using (public.ve_todas_las_aulas())', t);

    -- Escritura amplia.
    execute format(
      'create policy "asist_escritura_general" on public.%I
         for all using (public.puede_escribir_asistencias())
         with check (public.puede_escribir_asistencias())', t);

    -- El celador, solo su aula. `using` filtra lo que puede ver y modificar;
    -- `with check` impide que escriba una fila de otra aula.
    execute format(
      'create policy "asist_celador_su_aula" on public.%I
         for all using (%I = public.aula_del_celador())
         with check (%I = public.aula_del_celador())', t, col, col);
  end loop;
end $$;

comment on table public.att_aulas is
  'Aulas del control de asistencia — RLS: tecnologia y control de estudio RW todo; direccion R todo; celador RW solo su aula; finanzas sin acceso.';

-- ------------------------------------------------------------
-- 6. Comprobación (ejecutar aparte)
-- ------------------------------------------------------------
-- Cada celador debe salir con su aula; el resto de roles con null.
--
-- select email, role, aula_nombre from public.profiles order by role, email;
