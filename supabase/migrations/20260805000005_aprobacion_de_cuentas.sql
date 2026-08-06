-- ============================================================
-- Migración: aprobación de cuentas nuevas
-- ============================================================
-- Depende de: 20260805000004_fix_recursion_rls_profiles.sql
--
-- Problema que cierra:
--   El trigger asignaba rol 'celador' a CUALQUIER correo que se
--   registrara, y la pantalla de login permite registrarse. Es decir,
--   cualquier persona con el enlace podía crear una cuenta y entrar a
--   asistencias.
--
-- Solución:
--   Se agrega `profiles.aprobado`. Los correos conocidos (los de la
--   escuela) quedan aprobados automáticamente con su rol. Cualquier otro
--   queda SIN aprobar y sin acceso a nada hasta que un super_admin lo
--   apruebe desde la app.
--
-- La aprobación es independiente del rol a propósito: permite bloquear a
-- alguien sin borrar su perfil ni perder su historial.
-- ============================================================

alter table public.profiles
  add column if not exists aprobado boolean not null default false;

comment on column public.profiles.aprobado is
  'false = cuenta creada pero sin acceso, esperando que un super_admin la habilite.';

-- ---------- 1. Trigger: aprobar solo los correos conocidos ----------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  assigned_aula integer;
  es_conocido boolean;
  user_email text;
begin
  user_email := lower(new.email);

  es_conocido := md5(user_email) in (
    'b4280c3d035dba77e903747052e521bc',  -- super_admin
    '031aecdbef22c085378acbed0c5e6813',
    '5c5d3a6a8159ca93d763e2a63618219a',  -- finanzas
    '2f1d5ce1e1cbce56254c606a79475b8e',  -- director
    '85dc525f05801acb77f29d5e59d11955',  -- celadores
    '13d6ad2bda108b44a7c1bcea0eb70de3',
    '166e35c4905efb2eb2af8a895349586c',
    'df03bb09ec08510d24de8731fcd292fe',
    '91690fe772669e34990109f4cbc6cb85',  -- celador_estudios
    '6516d9e4ce381053f09b0a0dd045f835',
    'b4c4c31570f355cd08268db177f466cf',
    'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',
    'edd47a1ea754936f7c73699459bbb03a'
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

    -- Desconocido: se le pone el rol más bajo, pero queda SIN aprobar,
    -- así que igual no tiene acceso a nada hasta que se le habilite.
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

-- ---------- 2. Aprobar a los que ya estaban registrados ----------
update public.profiles set aprobado = true
  where md5(lower(email)) in (
    'b4280c3d035dba77e903747052e521bc',
    '031aecdbef22c085378acbed0c5e6813',
    '5c5d3a6a8159ca93d763e2a63618219a',
    '2f1d5ce1e1cbce56254c606a79475b8e',
    '85dc525f05801acb77f29d5e59d11955',
    '13d6ad2bda108b44a7c1bcea0eb70de3',
    '166e35c4905efb2eb2af8a895349586c',
    'df03bb09ec08510d24de8731fcd292fe',
    '91690fe772669e34990109f4cbc6cb85',
    '6516d9e4ce381053f09b0a0dd045f835',
    'b4c4c31570f355cd08268db177f466cf',
    'c3d2436bdc3cdbce9e8b34dcd8f6fbc3',
    'edd47a1ea754936f7c73699459bbb03a'
  );

-- ---------- 3. Las funciones de permisos exigen cuenta aprobada ----------
-- Esto es lo que realmente bloquea el acceso: aunque alguien manipule la
-- app, RLS le niega los datos porque estas funciones devuelven false.
create or replace function public.is_super_admin() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and aprobado and role = 'super_admin'
  );
$$ language sql security definer;

create or replace function public.is_finanzas() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and aprobado and role in ('super_admin', 'finanzas')
  );
$$ language sql security definer;

create or replace function public.is_director() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and aprobado and role = 'director'
  );
$$ language sql security definer;

create or replace function public.is_celador_estudios() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and aprobado and role in ('celador_estudios', 'super_admin')
  );
$$ language sql security definer;

-- La policy de celador sobre asistencias también exige aprobación.
drop policy if exists "celador_su_aula_asistencias" on public.asistencias;
create policy "celador_su_aula_asistencias" on public.asistencias
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.aprobado
        and p.role = 'celador'
        and p.aula_id = asistencias.aula_id
    )
  );

-- ---------- Verificación ----------
-- select email, role, aprobado from public.profiles order by aprobado, role;
