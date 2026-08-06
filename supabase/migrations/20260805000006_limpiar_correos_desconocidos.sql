-- ============================================================
-- Migración: quitar correos no identificados del trigger
-- ============================================================
-- Depende de: 20260805000005_aprobacion_de_cuentas.sql
--
-- Problema que cierra:
--   El trigger heredaba 13 correos de las migraciones originales
--   (20260717000001 / full_setup.sql). Solo 9 corresponden al personal
--   de la escuela; los otros 4 no se pudieron identificar y uno de ellos
--   recibía rol super_admin con aprobación automática.
--
--   Es decir: si esa persona se registraba, entraba como administradora
--   total sin pedir permiso a nadie.
--
-- Solución:
--   La lista queda solo con los 9 correos confirmados. Cualquier otro
--   correo -- incluidos esos 4 -- cae en "pendiente" y necesita que un
--   super_admin lo habilite desde la app.
--
-- Esto NO borra cuentas ni historial: solo cambia lo que pasa al
-- registrarse. Si alguno de esos 4 resulta legítimo, aparece en el panel
-- de cuentas pendientes y se le asigna el rol correcto ahí.
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

  -- Solo los 9 correos confirmados del personal de la escuela.
  es_conocido := md5(user_email) in (
    'b4280c3d035dba77e903747052e521bc',  -- super_admin
    '5c5d3a6a8159ca93d763e2a63618219a',  -- finanzas
    '2f1d5ce1e1cbce56254c606a79475b8e',  -- director
    '85dc525f05801acb77f29d5e59d11955',  -- celador / Krishna VI
    '13d6ad2bda108b44a7c1bcea0eb70de3',  -- celador / Arjuna II
    'df03bb09ec08510d24de8731fcd292fe',  -- celador / Arjuna I
    'b4c4c31570f355cd08268db177f466cf',  -- celador_estudios
    'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',  -- celador_estudios
    'edd47a1ea754936f7c73699459bbb03a'   -- celador_estudios
  );

  assigned_role := case
    when md5(user_email) = 'b4280c3d035dba77e903747052e521bc'
      then 'super_admin'::public.user_role

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

    -- Desconocido: rol más bajo y SIN aprobar. No tiene acceso a nada
    -- hasta que un super_admin lo habilite desde la app.
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

-- ---------- Retirar la aprobación si alguno ya alcanzó a registrarse ----------
-- Precisa a propósito: toca únicamente esos 4 correos, nadie más.
update public.profiles
   set aprobado = false
 where md5(lower(email)) in (
   '031aecdbef22c085378acbed0c5e6813',
   '166e35c4905efb2eb2af8a895349586c',
   '91690fe772669e34990109f4cbc6cb85',
   '6516d9e4ce381053f09b0a0dd045f835'
 );

-- ---------- Verificación ----------
-- Debe salir solo tu cuenta, con aprobado = true:
--   select email, role, aprobado from public.profiles order by aprobado, role;
