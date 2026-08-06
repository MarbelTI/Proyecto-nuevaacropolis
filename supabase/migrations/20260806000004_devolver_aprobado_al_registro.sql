-- ============================================================
-- Corrección: el registro volvía a dejar a TODOS sin aprobar
--
-- QUÉ PASÓ
-- La migración 20260806000003 reescribió handle_new_user() para quitarle la
-- dependencia de la tabla `aulas`, que no existe. Pero al reescribirla se
-- perdió una columna del insert: `aprobado`.
--
-- La columna tiene default false, así que la función seguía funcionando sin
-- dar error — simplemente TODA cuenta nueva quedaba sin aprobar, incluidas
-- las diez del personal de la escuela, que hasta entonces se aprobaban solas.
-- Manuela se habría registrado y habría quedado en "pendiente" sin ver nada,
-- sin ningún mensaje que explicara por qué.
--
-- Es el tipo de fallo que no avisa: nada peta, solo deja de pasar algo.
--
-- Esta migración devuelve `aprobado` a su sitio, conservando lo que arregló
-- la 003 (aula_nombre en texto, sin la tabla fantasma).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  assigned_aula text;
  es_conocido boolean;
  user_email text;
begin
  user_email := lower(new.email);

  -- Los correos confirmados del personal de la escuela. Solo estos entran
  -- aprobados; cualquier otro queda esperando que un super_admin lo habilite.
  es_conocido := md5(user_email) in (
    'b4280c3d035dba77e903747052e521bc',  -- super_admin (Nancy)
    '031aecdbef22c085378acbed0c5e6813',  -- super_admin (2da cuenta de Nancy)
    '5c5d3a6a8159ca93d763e2a63618219a',  -- finanzas (Manuela)
    '2f1d5ce1e1cbce56254c606a79475b8e',  -- director (Ricardo)
    '85dc525f05801acb77f29d5e59d11955',  -- celador / Krishna VI (Kairo)
    '13d6ad2bda108b44a7c1bcea0eb70de3',  -- celador / Arjuna II (Alicia)
    'df03bb09ec08510d24de8731fcd292fe',  -- celador / Arjuna I (Javier)
    'b4c4c31570f355cd08268db177f466cf',  -- control de estudio (Karina)
    'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',  -- control de estudio (Milagro Elena)
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
      '166e35c4905efb2eb2af8a895349586c',
      'df03bb09ec08510d24de8731fcd292fe'
    ) then 'celador'::public.user_role

    when md5(user_email) in (
      '91690fe772669e34990109f4cbc6cb85',
      '6516d9e4ce381053f09b0a0dd045f835',
      'b4c4c31570f355cd08268db177f466cf',
      'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',
      'edd47a1ea754936f7c73699459bbb03a'
    ) then 'celador_estudios'::public.user_role

    -- Desconocido: el rol más bajo y SIN aprobar, así que no ve nada hasta
    -- que un super_admin lo habilite.
    else 'celador'::public.user_role
  end;

  -- Texto plano: no depende de ninguna tabla de aulas. Control de estudio no
  -- lleva aula porque no está limitado a una.
  assigned_aula := case
    when md5(user_email) = '85dc525f05801acb77f29d5e59d11955' then 'Krishna VI'
    when md5(user_email) = '13d6ad2bda108b44a7c1bcea0eb70de3' then 'Arjuna II'
    when md5(user_email) = 'df03bb09ec08510d24de8731fcd292fe' then 'Arjuna I'
    else null
  end;

  insert into public.profiles (id, email, full_name, role, aula_nombre, aprobado)
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

-- Por si alguien del personal alcanzó a registrarse mientras la función
-- estaba incompleta: se le devuelve la aprobación.
update public.profiles set aprobado = true
  where aprobado = false
    and md5(lower(email)) in (
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

-- ---------- Comprobación (ejecutar aparte) ----------
-- Las diez cuentas de la escuela deben salir con aprobado = true.
--
-- select email, role, aprobado, aula_nombre from public.profiles
-- order by aprobado, role, email;
