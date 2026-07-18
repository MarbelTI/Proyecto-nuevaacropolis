-- Tabla de transacciones financieras
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  fecha       text not null,            -- dd/mm/yyyy
  mes         text not null,            -- yyyy-mm
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

comment on table public.transactions is 'Transacciones financieras (ingresos y gastos)';

-- Tabla de tasas BCV históricas
create table if not exists public.bcv_rates (
  iso_date text primary key,            -- yyyy-mm-dd
  rate     numeric not null,
  source   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.bcv_rates is 'Tasas de cambio BCV históricas';

-- Tabla de alumnos (persistencia en la nube)
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

comment on table public.students is 'Alumnos de Nueva Acrópolis';

-- Índices
create index if not exists idx_transactions_fecha on public.transactions (fecha);
create index if not exists idx_transactions_mes on public.transactions (mes);
create index if not exists idx_transactions_tipo on public.transactions (tipo);
create index if not exists idx_transactions_categoria on public.transactions (categoria);
create index if not exists idx_bcv_rates_iso_date on public.bcv_rates (iso_date);

-- RLS (misma política: service_role hasta implementar Auth)
alter table public.transactions enable row level security;
alter table public.bcv_rates enable row level security;
alter table public.students enable row level security;

comment on table public.transactions is 'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';
comment on table public.bcv_rates is 'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';
comment on table public.students is 'RLS activo sin policies — acceso solo vía service_role hasta implementar Auth.';

-- Trigger para updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute function public.update_updated_at();

create trigger set_updated_at_bcv_rates
  before update on public.bcv_rates
  for each row execute function public.update_updated_at();

create trigger set_updated_at_students
  before update on public.students
  for each row execute function public.update_updated_at();
