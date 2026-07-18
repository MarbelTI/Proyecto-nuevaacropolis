-- ============================================================
-- MIGRACIÓN COMPLETA SISFIA
-- Ejecutar una sola vez en SQL Editor
-- ============================================================

-- 1. Tablas financieras
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  fecha       text not null,
  mes         text not null,
  tipo        text not null check (tipo in ('Ingreso', 'Gasto', '')),
  categoria   text not null default '',
  descripcion text not null default '',
  mensualidad text not null default '',
  moneda      text not null default '' check (moneda in ('USD', 'Bolívares', 'Pesos', '')),
  monto       numeric not null default 0,
  tasa        numeric,
  monto_usd   numeric not null default 0,
  banco       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.bcv_rates (
  iso_date text primary key,
  rate     numeric not null,
  source   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  aulas      text[] not null default '{}',
  condicion  text check (condicion in ('Miembro', 'Probacionista', 'ClasePorClase')),
  actividad  text not null default 'Activo' check (actividad in ('Activo', 'Retirado')),
  celador    boolean not null default false,
  cuota_override numeric,
  cuota_overrides_temporales jsonb,
  telefono   text,
  fecha_ingreso text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indices
create index if not exists idx_transactions_fecha on public.transactions (fecha);
create index if not exists idx_transactions_mes on public.transactions (mes);
create index if not exists idx_transactions_tipo on public.transactions (tipo);
create index if not exists idx_transactions_categoria on public.transactions (categoria);
create index if not exists idx_bcv_rates_iso_date on public.bcv_rates (iso_date);

-- 3. Función helper updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4. Triggers updated_at
drop trigger if exists set_updated_at_transactions on public.transactions;
create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_bcv_rates on public.bcv_rates;
create trigger set_updated_at_bcv_rates
  before update on public.bcv_rates
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_students on public.students;
create trigger set_updated_at_students
  before update on public.students
  for each row execute function public.update_updated_at();

-- 5. RLS en tablas financieras
alter table public.transactions enable row level security;
alter table public.bcv_rates enable row level security;
alter table public.students enable row level security;

-- 6. Enum de roles
do $$ begin
  create type public.user_role as enum (
    'super_admin', 'finanzas', 'director', 'celador', 'celador_estudios'
  );
exception when duplicate_object then null;
end $$;

-- 7. Tabla de perfiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text not null default '',
  role          public.user_role not null default 'celador',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- 8. Trigger: crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
  user_email text;
begin
  user_email := lower(new.email);
  assigned_role := case
    when user_email in ('margelys.invermapa@gmail.com', 'tecnologiasnuevaacropolissc@gmail.com')
      then 'super_admin'::public.user_role
    when user_email = 'manuelajesusa2018@gmail.com'
      then 'finanzas'::public.user_role
    when user_email = 'rgr486@gmail.com'
      then 'director'::public.user_role
    when user_email in ('kairobeor08@gmail.com', 'aliciachacongarcia94@gmail.com', 'ajjm.1996@gmail.com')
      then 'celador'::public.user_role
    when user_email in ('cejc.fundazoo@gmail.com', 'ekarinarodriguez@gmail.com')
      then 'celador_estudios'::public.user_role
    else 'celador'::public.user_role
  end;
  insert into public.profiles (id, email, full_name, role)
  values (new.id, user_email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), assigned_role);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. Políticas RLS en profiles
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "super_admin_read_all_profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- 10. Funciones helper para RLS
create or replace function public.is_super_admin() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$ language sql security definer;

create or replace function public.is_finanzas() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('super_admin', 'finanzas'));
$$ language sql security definer;

create or replace function public.is_director() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'director');
$$ language sql security definer;

create or replace function public.is_celador_estudios() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('celador_estudios', 'super_admin'));
$$ language sql security definer;

create or replace function public.can_edit() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role != 'director');
$$ language sql security definer;

-- 11. RLS policies para transactions
create policy "finanzas_all" on public.transactions
  for all using (public.is_finanzas());
create policy "director_read_transactions" on public.transactions
  for select using (public.is_director());

-- 12. RLS policies para bcv_rates
create policy "finanzas_all_bcv" on public.bcv_rates
  for all using (public.is_finanzas());
create policy "director_read_bcv" on public.bcv_rates
  for select using (public.is_director());
create policy "everyone_read_bcv" on public.bcv_rates
  for select using (true);

-- 13. RLS policies para students
create policy "super_admin_all_students" on public.students
  for all using (public.is_super_admin());
create policy "finanzas_read_students" on public.students
  for select using (public.is_finanzas());
create policy "director_read_students" on public.students
  for select using (public.is_director());
create policy "celador_estudios_all_students" on public.students
  for all using (public.is_celador_estudios());
