-- ============================================================
-- Migración: arreglar recursión infinita en las policies de `profiles`
-- ============================================================
-- Depende de: 20260805000003_backfill_roles_existentes.sql
--
-- Problema:
--   La policy `super_admin_read_all_profiles` está definida SOBRE
--   public.profiles y a la vez hace `select ... from public.profiles`
--   dentro del USING. Postgres evalúa RLS otra vez al leer esa
--   subconsulta, lo que produce:
--     ERROR 42P17: infinite recursion detected in policy for
--     relation "profiles"
--
--   Como consecuencia, CUALQUIER lectura de profiles desde la app
--   (con la anon key + JWT del usuario) falla. El rol llega vacío,
--   la app asume "unknown" y no muestra ninguna pestaña del menú.
--
-- Solución:
--   Usar la función `public.is_super_admin()`, que ya existe y es
--   SECURITY DEFINER: corre con los permisos del dueño de la tabla,
--   por lo que NO vuelve a evaluar RLS y no hay recursión.
-- ============================================================

drop policy if exists "super_admin_read_all_profiles" on public.profiles;
create policy "super_admin_read_all_profiles" on public.profiles
  for select using (public.is_super_admin());

-- La policy base (cada quien lee su propio perfil) no tiene subconsulta,
-- así que no recursa — se deja igual, pero se re-declara para que esta
-- migración sea auto-contenida y re-ejecutable sin errores.
drop policy if exists "users_read_own_profile" on public.profiles;
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

-- Permitir que super_admin corrija roles/aulas desde la app (antes solo
-- se podía desde el SQL Editor).
drop policy if exists "super_admin_update_profiles" on public.profiles;
create policy "super_admin_update_profiles" on public.profiles
  for update using (public.is_super_admin());

comment on table public.profiles is
  'Perfiles y roles. RLS: cada usuario lee el suyo; super_admin lee/edita todos (vía is_super_admin(), SECURITY DEFINER, para evitar recursión).';
