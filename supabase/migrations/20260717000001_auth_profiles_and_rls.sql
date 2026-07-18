-- ============================================================
-- Migración: Auth, Profiles y RLS Policies
-- ============================================================
-- Depende de: 20260715223600_rls_active_no_policies.sql
--             + 20260716000001_transactions_and_bcv_rates.sql
--
-- Uso:
--   1. Activar Google OAuth en Supabase Dashboard → Authentication → Providers
--   2. Agregar en Authorized redirect URIs: https://*.vercel.app/**
--      y http://localhost:8080/**
--   3. Ejecutar esta migración en SQL Editor
-- ============================================================

-- 1. Enum de roles
do $$ begin
  create type public.user_role as enum (
    'super_admin',    -- Margelys, Tecnologías — acceso total
    'finanzas',       -- Manuela — solo finanzas
    'director',       -- Ricardo — solo lectura en todo
    'celador',        -- Kairo, Alicia, Alejandro — asistencia de su aula
    'celador_estudios' -- Milagro, Karina — asistencia + control de estudios
  );
exception when duplicate_object then null;
end $$;

-- 2. Tabla de perfiles (vinculada a auth.users)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text not null default '',
  role          public.user_role not null default 'celador',
  aula_id       uuid references public.aulas(id) on delete set null, -- para celadores
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Perfiles de usuario con roles y permisos';

-- 3. Trigger: crear profile automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  user_email text;
begin
  user_email := lower(new.email);
  
  -- Asignar rol según email conocido
  assigned_role := case
    when user_email in (
      'margelys.invermapa@gmail.com',
      'tecnologiasnuevaacropolissc@gmail.com'
    ) then 'super_admin'::public.user_role
    
    when user_email = 'manuelajesusa2018@gmail.com'
      then 'finanzas'::public.user_role
    
    when user_email = 'rgr486@gmail.com'
      then 'director'::public.user_role
    
    when user_email in (
      'kairobeor08@gmail.com',
      'aliciachacongarcia94@gmail.com',
      'ajjm.1996@gmail.com'
    ) then 'celador'::public.user_role
    
    when user_email in (
      'cejc.fundazoo@gmail.com',
      'ekarinarodriguez@gmail.com'
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Trigger updated_at
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- 5. RLS en profiles
alter table public.profiles enable row level security;

-- Cada usuario ve su propio perfil
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

-- super_admin puede leer todos los perfiles
create policy "super_admin_read_all_profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- ============================================================
-- RLS POLICIES PARA CADA TABLA
-- ============================================================

-- Helper: el usuario es super_admin
create or replace function public.is_super_admin()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$ language sql security definer;

-- Helper: el usuario es finanzas
create or replace function public.is_finanzas()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('super_admin', 'finanzas'));
$$ language sql security definer;

-- Helper: el usuario es director (solo lectura)
create or replace function public.is_director()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'director');
$$ language sql security definer;

-- Helper: el usuario es celador_estudios
create or replace function public.is_celador_estudios()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('celador_estudios', 'super_admin'));
$$ language sql security definer;

-- ---------- TRANSACCIONES ----------
drop policy if exists "finanzas_all" on public.transactions;
create policy "finanzas_all" on public.transactions
  for all using (public.is_finanzas());

drop policy if exists "director_read_transactions" on public.transactions;
create policy "director_read_transactions" on public.transactions
  for select using (public.is_director());

drop policy if exists "super_admin_all_transactions" on public.transactions;
create policy "super_admin_all_transactions" on public.transactions
  for all using (public.is_super_admin());

-- ---------- BCV RATES ----------
drop policy if exists "finanzas_all_bcv" on public.bcv_rates;
create policy "finanzas_all_bcv" on public.bcv_rates
  for all using (public.is_finanzas());

drop policy if exists "director_read_bcv" on public.bcv_rates;
create policy "director_read_bcv" on public.bcv_rates
  for select using (public.is_director());

drop policy if exists "everyone_read_bcv" on public.bcv_rates;
create policy "everyone_read_bcv" on public.bcv_rates
  for select using (true);

-- ---------- STUDENTS ----------
drop policy if exists "super_admin_all_students" on public.students;
create policy "super_admin_all_students" on public.students
  for all using (public.is_super_admin());

drop policy if exists "finanzas_read_students" on public.students;
create policy "finanzas_read_students" on public.students
  for select using (public.is_finanzas());

drop policy if exists "director_read_students" on public.students;
create policy "director_read_students" on public.students
  for select using (public.is_director());

drop policy if exists "celador_estudios_all_students" on public.students;
create policy "celador_estudios_all_students" on public.students
  for all using (public.is_celador_estudios());

-- ---------- AULAS ----------
drop policy if exists "super_admin_all_aulas" on public.aulas;
create policy "super_admin_all_aulas" on public.aulas
  for all using (public.is_super_admin());

drop policy if exists "director_read_aulas" on public.aulas;
create policy "director_read_aulas" on public.aulas
  for select using (public.is_director());

drop policy if exists "celador_read_aulas" on public.aulas;
create policy "celador_read_aulas" on public.aulas
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('celador', 'celador_estudios', 'super_admin'))
  );

-- ---------- PARTICIPANTES ----------
drop policy if exists "super_admin_all_participantes" on public.participantes;
create policy "super_admin_all_participantes" on public.participantes
  for all using (public.is_super_admin());

drop policy if exists "celador_estudios_all_participantes" on public.participantes;
create policy "celador_estudios_all_participantes" on public.participantes
  for all using (public.is_celador_estudios());

drop policy if exists "director_read_participantes" on public.participantes;
create policy "director_read_participantes" on public.participantes
  for select using (public.is_director());

drop policy if exists "celador_read_participantes" on public.participantes;
create policy "celador_read_participantes" on public.participantes
  for select using (true);

-- ---------- AULA_PARTICIPANTES ----------
drop policy if exists "super_admin_all_ap" on public.aula_participantes;
create policy "super_admin_all_ap" on public.aula_participantes
  for all using (public.is_super_admin());

drop policy if exists "celador_estudios_all_ap" on public.aula_participantes;
create policy "celador_estudios_all_ap" on public.aula_participantes
  for all using (public.is_celador_estudios());

drop policy if exists "director_read_ap" on public.aula_participantes;
create policy "director_read_ap" on public.aula_participantes
  for select using (public.is_director());

-- ---------- ASISTENCIAS ----------
drop policy if exists "super_admin_all_asistencias" on public.asistencias;
create policy "super_admin_all_asistencias" on public.asistencias
  for all using (public.is_super_admin());

drop policy if exists "celador_estudios_all_asistencias" on public.asistencias;
create policy "celador_estudios_all_asistencias" on public.asistencias
  for all using (public.is_celador_estudios());

drop policy if exists "celador_su_aula_asistencias" on public.asistencias;
create policy "celador_su_aula_asistencias" on public.asistencias
  for all using (
    exists (
      select 1 from public.profiles p
      join public.aulas a on a.nombre = p.aula_id::text -- simplificado
      where p.id = auth.uid() and p.role = 'celador'
    )
  );

drop policy if exists "director_read_asistencias" on public.asistencias;
create policy "director_read_asistencias" on public.asistencias
  for select using (public.is_director());

-- ---------- TEMAS ----------
drop policy if exists "super_admin_all_temas" on public.temas;
create policy "super_admin_all_temas" on public.temas
  for all using (public.is_super_admin());

drop policy if exists "celador_estudios_all_temas" on public.temas;
create policy "celador_estudios_all_temas" on public.temas
  for all using (public.is_celador_estudios());

drop policy if exists "celador_su_aula_temas" on public.temas;
create policy "celador_su_aula_temas" on public.temas
  for all using (public.is_celador_estudios());

drop policy if exists "director_read_temas" on public.temas;
create policy "director_read_temas" on public.temas
  for select using (public.is_director());

-- ============================================================
-- Actualizar comentarios de las tablas
-- ============================================================
comment on table public.transactions is 'Transacciones financieras — RLS: finanzas RW, director R';
comment on table public.bcv_rates is 'Tasas BCV — RLS: finanzas RW, todos R';
comment on table public.students is 'Alumnos — RLS: super_admin RW, finanzas R, director R, celador_estudios RW';
comment on table public.aulas is 'Aulas — RLS: super_admin RW, director R, celadores R';
comment on table public.asistencias is 'Asistencias — RLS: super_admin RW, celador_estudios RW, celador su aula RW, director R';
