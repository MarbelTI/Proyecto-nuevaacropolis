-- ============================================================
-- Migración: segunda cuenta de administradora + corrección de la 006
-- ============================================================
-- Reemplaza a: 20260805000006_limpiar_correos_desconocidos.sql
--
-- Qué pasó:
--   La 006 quitó del trigger 4 correos que no se pudieron identificar,
--   uno de ellos con rol super_admin. Resultó que ese correo es
--   tecnologiasnuevaacropolissc@gmail.com — la segunda cuenta de la
--   propia administradora. La 006, de haberse ejecutado, le habría
--   quitado el acceso a su propia cuenta.
--
--   Esta migración lo devuelve a la lista y lo deja aprobado.
--
-- Los otros 3 correos siguen sin identificar y se quedan FUERA de la
-- aprobación automática. No es un bloqueo: si alguno es legítimo, esa
-- persona se registra, cae en "pendiente" y la administradora le asigna
-- el rol correcto desde el panel. Es la diferencia entre entrar sola y
-- entrar con permiso.
--
-- Es seguro ejecutarla se haya corrido la 006 o no.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  assigned_aula integer;
  es_conocido boolean;
  user_email text;
begin
  user_email := lower(new.email);

  -- Los 10 correos confirmados del personal de la escuela.
  es_conocido := md5(user_email) in (
    'b4280c3d035dba77e903747052e521bc',  -- super_admin (Nancy)
    '031aecdbef22c085378acbed0c5e6813',  -- super_admin (tecnologias… — 2da cuenta de Nancy)
    '5c5d3a6a8159ca93d763e2a63618219a',  -- finanzas (Manuela)
    '2f1d5ce1e1cbce56254c606a79475b8e',  -- director (Ricardo)
    '85dc525f05801acb77f29d5e59d11955',  -- celador / Krishna VI (Kairo)
    '13d6ad2bda108b44a7c1bcea0eb70de3',  -- celador / Arjuna II (Alicia)
    'df03bb09ec08510d24de8731fcd292fe',  -- celador / Arjuna I (Javier)
    'b4c4c31570f355cd08268db177f466cf',  -- control de estudio (Karina)
    'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',  -- control de estudio (Milagro)
    'edd47a1ea754936f7c73699459bbb03a'   -- control de estudio (Reflexiones NA)
  );

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
      '85dc525f05801acb77f29d5e59d11955',
      '13d6ad2bda108b44a7c1bcea0eb70de3',
      'df03bb09ec08510d24de8731fcd292fe'
    ) then 'celador'::public.user_role

    when md5(user_email) in (
      'b4c4c31570f355cd08268db177f466cf',
      'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',
      'edd47a1ea754936f7c73699459bbb03a'
    ) then 'celador_estudios'::public.user_role

    -- Desconocido: rol más bajo y SIN aprobar, así que no ve nada hasta
    -- que un super_admin lo habilite desde la app.
    else 'celador'::public.user_role
  end;

  assigned_aula := case
    when md5(user_email) = '85dc525f05801acb77f29d5e59d11955'
      then (select id from public.aulas where nombre = 'Krishna VI')
    when md5(user_email) = '13d6ad2bda108b44a7c1bcea0eb70de3'
      then (select id from public.aulas where nombre = 'Arjuna II')
    when md5(user_email) = 'df03bb09ec08510d24de8731fcd292fe'
      then (select id from public.aulas where nombre = 'Arjuna I')
    else null
  end;

  insert into public.profiles (id, email, full_name, role, aula_id, aprobado)
  values (
    new.id,
    user_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    assigned_role,
    assigned_aula,
    es_conocido
  );

  return new;
end;
$$ language plpgsql security definer;

-- ---------- Dejar aprobadas las 10 cuentas conocidas ----------
-- Incluye devolverle el acceso a tecnologias… si la 006 se llegó a correr.
update public.profiles set aprobado = true
  where md5(lower(email)) in (
    'b4280c3d035dba77e903747052e521bc',
    '031aecdbef22c085378acbed0c5e6813',
    '5c5d3a6a8159ca93d763e2a63618219a',
    '2f1d5ce1e1cbce56254c606a79475b8e',
    '85dc525f05801acb77f29d5e59d11955',
    '13d6ad2bda108b44a7c1bcea0eb70de3',
    'df03bb09ec08510d24de8731fcd292fe',
    'b4c4c31570f355cd08268db177f466cf',
    'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',
    'edd47a1ea754936f7c73699459bbb03a'
  );

-- La segunda cuenta debe además tener rol de administradora, por si se
-- registró antes de esta migración y quedó con otro rol.
update public.profiles
   set role = 'super_admin'::public.user_role, aprobado = true
 where md5(lower(email)) = '031aecdbef22c085378acbed0c5e6813';

-- ---------- Los 3 correos aún sin identificar quedan sin aprobar ----------
update public.profiles set aprobado = false
 where md5(lower(email)) in (
   '166e35c4905efb2eb2af8a895349586c',
   '91690fe772669e34990109f4cbc6cb85',
   '6516d9e4ce381053f09b0a0dd045f835'
 );

-- ---------- Verificación ----------
-- select email, role, aprobado from public.profiles order by aprobado, role;
