-- Papelera compartida de transacciones + registro de actividad del sistema.
--
-- Motivo: una transacción eliminada hoy desaparece sin dejar rastro (vive
-- solo en el `localStorage` de quien la borró). Estas dos tablas nuevas dan
-- a super_admin una papelera visible desde cualquier equipo y un resumen de
-- quién hizo qué en las acciones que pasan por el servidor. Ver
-- openspec/changes/add-activity-log-and-tx-trash/design.md para el porqué de
-- cada decisión.
--
-- NO EJECUTAR contra el proyecto real hasta que Nancy avise (mismo criterio
-- que las migraciones anteriores de este proyecto).

-- 1. Última conexión, para el panel de usuarios.
alter table public.profiles
  add column if not exists ultimo_acceso timestamptz;

comment on column public.profiles.ultimo_acceso is
  'Última vez que la cuenta inició sesión (no cada carga de página ni refresco de token).';

-- 2. Papelera de transacciones eliminadas.
create table if not exists public.transactions_papelera (
  id                uuid primary key default gen_random_uuid(),
  transaction_id    text not null,           -- id original de la transacción, para restaurarla igual
  fecha             text not null,
  mes               text not null,
  tipo              text not null,
  categoria         text not null default '',
  descripcion       text not null default '',
  mensualidad       text not null default '',
  moneda            text not null default '',
  monto             numeric not null default 0,
  tasa              numeric,
  monto_usd         numeric not null default 0,
  banco             text not null default '',
  revisar           text not null default '',
  accion            text not null default 'fila' check (accion in ('fila', 'sobrantes', 'rango')),
  eliminado_por      uuid references public.profiles(id) on delete set null,
  eliminado_por_email text not null default '',
  eliminado_en       timestamptz not null default now()
);

comment on table public.transactions_papelera is
  'Copia de cada transacción eliminada, para que super_admin pueda verla y restaurarla desde cualquier equipo. Se purga sola a los 30 días.';

create index if not exists idx_transactions_papelera_eliminado_en
  on public.transactions_papelera (eliminado_en);

alter table public.transactions_papelera enable row level security;

drop policy if exists "super_admin_lee_papelera" on public.transactions_papelera;
create policy "super_admin_lee_papelera" on public.transactions_papelera
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists "super_admin_borra_papelera" on public.transactions_papelera;
create policy "super_admin_borra_papelera" on public.transactions_papelera
  for delete to authenticated
  using (public.is_super_admin());

-- Insertar (mover algo a la papelera) es una acción de bajo riesgo — es un
-- registro, no el dato real — así que basta con estar aprobado. El permiso
-- real sobre la transacción ya se validó en el servidor antes de llegar aquí
-- (canManageFinanzas), igual que en el resto de tablas de este proyecto.
drop policy if exists "aprobados_insertan_papelera" on public.transactions_papelera;
create policy "aprobados_insertan_papelera" on public.transactions_papelera
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.aprobado)
  );

-- 3. Registro de actividad.
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_email text not null default '',
  actor_role  text not null default '',
  accion      text not null,              -- ej. "transacciones:subir", "sesion:iniciar"
  resumen     text not null default '',   -- ej. "5 filas"
  created_at  timestamptz not null default now()
);

comment on table public.activity_log is
  'Quién hizo qué y cuándo, a nivel de resumen por acción — no el detalle campo por campo de cada cambio.';

create index if not exists idx_activity_log_created_at on public.activity_log (created_at);
create index if not exists idx_activity_log_actor on public.activity_log (actor_id);

alter table public.activity_log enable row level security;

drop policy if exists "super_admin_lee_actividad" on public.activity_log;
create policy "super_admin_lee_actividad" on public.activity_log
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists "aprobados_insertan_actividad" on public.activity_log;
create policy "aprobados_insertan_actividad" on public.activity_log
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.aprobado)
  );
