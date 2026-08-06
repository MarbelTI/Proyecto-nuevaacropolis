-- ============================================================
-- Migración: asistencias y reflexiones en la nube
--
-- Hasta ahora el módulo de asistencias vivía SOLO en el navegador
-- (localStorage). Eso significaba dos cosas malas:
--   1. Nadie más podía ver lo que cargaba la persona que importó el Excel.
--   2. Si ese navegador se borraba, el trabajo del año se perdía y no
--      había copia en ningún lado.
--
-- Esta migración crea las cuatro tablas que faltaban.
--
-- SOBRE EL PREFIJO att_
-- La migración 20260717000001 escribió políticas para unas tablas
-- `aulas`, `asistencias`, `temas` y `aula_participantes` que NUNCA se
-- llegaron a crear (ninguna migración las crea; solo se las menciona).
-- Además `profiles.aula_id` declara una clave foránea contra
-- `public.aulas(id)` con tipo integer.
--
-- Para no chocar con esos restos ni depender de un diseño que nunca
-- existió, las tablas nuevas llevan prefijo `att_` y se identifican por
-- NOMBRE de aula, que es exactamente como trabaja la aplicación. Si
-- algún día se limpian los restos, estas tablas no se enteran.
-- ============================================================

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------

-- Un aula, con su celador, su día de clase y sus temas del año.
-- `temas` es un objeto {fecha ISO -> nombre del tema}, igual que en la app.
create table if not exists public.att_aulas (
  nombre      text primary key,
  celador     text not null default '',
  dia_semana  text not null default '',
  condicion   text not null default 'Miembro'
              check (condicion in ('Miembro', 'Probacionista')),
  year        integer not null,
  temas       jsonb not null default '{}'::jsonb,
  -- false = aula archivada (el grupo se graduó). No se borra: su historial
  -- sigue haciendo falta para los reportes del año.
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- La marca de asistencia de un alumno en una fecha concreta.
-- La clave es (aula, alumno, fecha): un alumno no puede tener dos marcas
-- el mismo día en la misma aula, así que volver a subir corrige en vez
-- de duplicar.
create table if not exists public.att_asistencias (
  aula        text not null references public.att_aulas(nombre) on delete cascade,
  alumno      text not null,
  fecha       date not null,
  asistencia  text not null default '' check (asistencia in ('', 'A', 'I', 'NC')),
  reflexion   text not null default '' check (reflexion in ('', 'E', 'NE', 'SE')),
  updated_at  timestamptz not null default now(),
  primary key (aula, alumno, fecha)
);

-- Las reflexiones. El id lo genera el importador de forma estable
-- (ref_<hoja>_<n>), por eso es texto y no un uuid: al reimportar el mismo
-- Excel se obtienen los mismos ids y las entregas no se pierden.
create table if not exists public.att_reflexiones (
  id          text primary key,
  aula        text not null references public.att_aulas(nombre) on delete cascade,
  year        integer not null,
  titulo      text not null default '',
  fecha       date,
  -- Fecha del tema al que pertenece. Un tema que dura dos semanas tiene
  -- dos reflexiones apuntando a la misma tema_fecha.
  tema_fecha  date,
  updated_at  timestamptz not null default now()
);

-- Si un alumno entregó o no una reflexión.
create table if not exists public.att_reflexion_asistencia (
  reflexion_id text not null references public.att_reflexiones(id) on delete cascade,
  alumno       text not null,
  aula         text not null,
  estado       text not null default '' check (estado in ('', 'E', 'NE')),
  updated_at   timestamptz not null default now(),
  primary key (reflexion_id, alumno)
);

-- ------------------------------------------------------------
-- Índices: las consultas siempre filtran por aula.
-- ------------------------------------------------------------
create index if not exists idx_att_asist_aula on public.att_asistencias (aula);
create index if not exists idx_att_asist_fecha on public.att_asistencias (fecha);
create index if not exists idx_att_reflex_aula on public.att_reflexiones (aula);
create index if not exists idx_att_refasist_aula on public.att_reflexion_asistencia (aula);

-- ------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------
create or replace function public.att_touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_att_aulas_updated on public.att_aulas;
create trigger trg_att_aulas_updated before update on public.att_aulas
  for each row execute function public.att_touch_updated_at();

drop trigger if exists trg_att_asist_updated on public.att_asistencias;
create trigger trg_att_asist_updated before update on public.att_asistencias
  for each row execute function public.att_touch_updated_at();

drop trigger if exists trg_att_reflex_updated on public.att_reflexiones;
create trigger trg_att_reflex_updated before update on public.att_reflexiones
  for each row execute function public.att_touch_updated_at();

drop trigger if exists trg_att_refasist_updated on public.att_reflexion_asistencia;
create trigger trg_att_refasist_updated before update on public.att_reflexion_asistencia
  for each row execute function public.att_touch_updated_at();

-- ------------------------------------------------------------
-- Permisos (RLS)
--
-- Quién escribe:  super_admin y control de estudio (celador_estudios).
-- Quién lee:      además, director y celadores.
-- Quién NO entra: finanzas. Manuela no necesita las asistencias, y lo que
--                 no hace falta no se concede.
--
-- NOTA HONESTA sobre los celadores: aquí leen TODAS las aulas, no solo la
-- suya. La aplicación sí les restringe a su aula en pantalla, pero la base
-- de datos no puede hacer lo mismo todavía porque `profiles.aula_id` es un
-- integer que apunta a una tabla `aulas` que no existe. Cuando eso se
-- arregle, se cambia el `using` de las políticas de celador por una
-- comparación con su aula. Lo que se expone mientras tanto son nombres y
-- marcas de asistencia — no hay datos personales ni financieros aquí.
-- ------------------------------------------------------------

alter table public.att_aulas enable row level security;
alter table public.att_asistencias enable row level security;
alter table public.att_reflexiones enable row level security;
alter table public.att_reflexion_asistencia enable row level security;

-- Escritura: super_admin y control de estudio.
create or replace function public.puede_escribir_asistencias()
returns boolean as $$
  select public.is_super_admin() or public.is_celador_estudios();
$$ language sql security definer stable;

-- Lectura: los anteriores, más director y celadores.
create or replace function public.puede_leer_asistencias()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and aprobado = true
      and role in ('super_admin', 'celador_estudios', 'director', 'celador')
  );
$$ language sql security definer stable;

do $$
declare
  t text;
begin
  foreach t in array array[
    'att_aulas', 'att_asistencias', 'att_reflexiones', 'att_reflexion_asistencia'
  ] loop
    execute format('drop policy if exists "asist_lectura" on public.%I', t);
    execute format(
      'create policy "asist_lectura" on public.%I for select using (public.puede_leer_asistencias())', t
    );

    execute format('drop policy if exists "asist_escritura" on public.%I', t);
    execute format(
      'create policy "asist_escritura" on public.%I for all using (public.puede_escribir_asistencias()) with check (public.puede_escribir_asistencias())', t
    );
  end loop;
end $$;

comment on table public.att_aulas is
  'Aulas del control de asistencia — RLS: super_admin y control de estudio escriben; director y celadores leen; finanzas no entra.';
comment on table public.att_asistencias is
  'Marcas de asistencia por alumno y fecha — misma RLS que att_aulas.';
comment on table public.att_reflexiones is
  'Reflexiones por aula y año — misma RLS que att_aulas.';
comment on table public.att_reflexion_asistencia is
  'Entregas de reflexión por alumno — misma RLS que att_aulas.';

-- ------------------------------------------------------------
-- Comprobación
-- ------------------------------------------------------------
-- select 'att_aulas' as tabla, count(*) from public.att_aulas
-- union all select 'att_asistencias', count(*) from public.att_asistencias
-- union all select 'att_reflexiones', count(*) from public.att_reflexiones
-- union all select 'att_reflexion_asistencia', count(*) from public.att_reflexion_asistencia;
