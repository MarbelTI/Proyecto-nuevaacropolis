-- ============================================================
-- Migración: backfill de roles para cuentas YA registradas
-- ============================================================
-- Depende de: 20260805000002_aula_id_celadores_y_tu_cuenta.sql
--
-- El trigger `handle_new_user` solo corre en el momento del signup.
-- Las cuentas que ya existían antes de actualizar el trigger se
-- quedaron con el rol que se les asignó en su momento (o con el rol
-- por defecto 'celador'). Esto sincroniza los roles de las cuentas
-- existentes con el mapeo actual.
--
-- Se compara por md5(email) para no escribir correos en claro en el
-- repositorio, igual que en las migraciones anteriores.
-- ============================================================

-- super_admin
update public.profiles set role = 'super_admin'
  where md5(lower(email)) in (
    'b4280c3d035dba77e903747052e521bc',
    '031aecdbef22c085378acbed0c5e6813'
  ) and role is distinct from 'super_admin';

-- finanzas
update public.profiles set role = 'finanzas'
  where md5(lower(email)) = '5c5d3a6a8159ca93d763e2a63618219a'
    and role is distinct from 'finanzas';

-- director
update public.profiles set role = 'director'
  where md5(lower(email)) = '2f1d5ce1e1cbce56254c606a79475b8e'
    and role is distinct from 'director';

-- celador
update public.profiles set role = 'celador'
  where md5(lower(email)) in (
    '85dc525f05801acb77f29d5e59d11955',  -- Kairo
    '13d6ad2bda108b44a7c1bcea0eb70de3',  -- Alicia
    '166e35c4905efb2eb2af8a895349586c',
    'df03bb09ec08510d24de8731fcd292fe'   -- Javier
  ) and role is distinct from 'celador';

-- celador_estudios
update public.profiles set role = 'celador_estudios'
  where md5(lower(email)) in (
    '91690fe772669e34990109f4cbc6cb85',
    '6516d9e4ce381053f09b0a0dd045f835',
    'b4c4c31570f355cd08268db177f466cf',  -- Karina
    'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',  -- Milagro
    'edd47a1ea754936f7c73699459bbb03a'   -- cuenta de control de estudio
  ) and role is distinct from 'celador_estudios';

-- ---------- Verificación ----------
-- select email, role,
--        (select nombre from public.aulas a where a.id = profiles.aula_id) as aula
-- from public.profiles order by role, email;
