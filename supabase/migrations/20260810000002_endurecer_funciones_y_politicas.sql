-- ------------------------------------------------------------------
-- Bloque 3 de la auditoría, primera tanda: lo que no toca vistas ni datos.
--
-- Son cambios de metadatos (search_path, volatilidad, índices) y una política
-- demasiado abierta. Ninguno modifica una sola fila, así que se puede ejecutar
-- entero sin miedo y volver atrás si hiciera falta.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 3.4 — search_path fijo en las funciones SECURITY DEFINER
--
-- Estas nueve funciones SON la capa de autorización y corren con los permisos
-- del dueño de la base, que salta el RLS. Al no fijar el search_path, heredan
-- el de quien las llama: si alguien consigue anteponer un esquema con su
-- propia tabla `profiles`, toda la autorización pasa a responder lo que él
-- quiera. Con search_path = '' solo se resuelve lo que esté cualificado, y las
-- nueve ya cualifican public.profiles, así que el cambio no rompe nada.
-- ------------------------------------------------------------------
alter function public.is_super_admin()             set search_path = '';
alter function public.is_finanzas()                set search_path = '';
alter function public.is_director()                set search_path = '';
alter function public.is_celador_estudios()        set search_path = '';
alter function public.ve_todas_las_aulas()         set search_path = '';
alter function public.puede_escribir_asistencias() set search_path = '';
alter function public.aula_del_celador()           set search_path = '';
alter function public.handle_new_user()            set search_path = '';

-- No son SECURITY DEFINER, pero fijarlo es gratis.
alter function public.update_updated_at()    set search_path = '';
alter function public.att_touch_updated_at() set search_path = '';

-- Función muerta: no la llama nadie y, a diferencia del resto, NO exige que la
-- cuenta esté aprobada. Es una comprobación de permisos olvidada esperando a
-- que alguien la use por error.
drop function if exists public.can_edit();

-- ------------------------------------------------------------------
-- 3.7a — Volatilidad: las funciones de rol deben ser STABLE
--
-- Sin declararla, Postgres las trata como VOLATILE y las ejecuta UNA VEZ POR
-- FILA al evaluar una política. En `students` con 300 alumnos son 300
-- consultas extra a `profiles` por cada SELECT. Las tres funciones de aula ya
-- están marcadas stable; esto pone al día a las otras cuatro.
-- ------------------------------------------------------------------
alter function public.is_super_admin()      stable;
alter function public.is_finanzas()         stable;
alter function public.is_director()         stable;
alter function public.is_celador_estudios() stable;

-- ------------------------------------------------------------------
-- 3.6 — bcv_rates dejaba leer a cualquiera, con o sin sesión
--
-- `using (true)` sin cláusula `to` se aplica a PUBLIC, que incluye al rol
-- `anon`. Como la clave publishable va dentro del JavaScript que descarga
-- cualquiera, la tabla entera se podía leer sin iniciar sesión. Las tasas del
-- BCV son públicas, pero el historial de fechas en que la escuela operó no
-- tiene por qué estarlo, y la política tapaba a las otras dos.
-- ------------------------------------------------------------------
drop policy if exists "everyone_read_bcv" on public.bcv_rates;

create policy "usuarios_aprobados_leen_bcv" on public.bcv_rates
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.aprobado
    )
  );

-- ------------------------------------------------------------------
-- 3.7b — Índices que faltan
--
-- Contrastados con las consultas reales de src/lib/api/.
-- ------------------------------------------------------------------

-- students.functions.ts ordena siempre por nombre, por las tres rutas.
create index if not exists idx_students_nombre
  on public.students (nombre);

-- El panel de cuentas pendientes: .eq("aprobado",false).order("created_at").
-- Parcial, porque las aprobadas no se consultan nunca por aquí.
create index if not exists idx_profiles_pendientes
  on public.profiles (created_at) where aprobado = false;

-- Reportes por año dentro de un aula.
create index if not exists idx_att_reflexiones_aula_year
  on public.att_reflexiones (aula, year);

-- ------------------------------------------------------------------
-- 3.7c — Índices que sobran
--
-- Duplican una clave primaria o cubren columnas por las que el servidor no
-- filtra nunca (el filtrado de transacciones ocurre entero en el navegador).
-- Cada índice de más es escritura más lenta a cambio de nada.
-- ------------------------------------------------------------------
drop index if exists public.idx_bcv_rates_iso_date;  -- = PK bcv_rates(iso_date)
drop index if exists public.idx_att_asist_aula;      -- prefijo de la PK
drop index if exists public.idx_transactions_tipo;
drop index if exists public.idx_transactions_categoria;

-- ------------------------------------------------------------------
-- 3.8 — Restricciones de integridad que faltaban
--
-- Van como NOT VALID a propósito: así protegen de aquí en adelante sin
-- rechazar filas históricas que quizá no las cumplan. Cuando se haya
-- comprobado que los datos viejos están limpios, se rematan con
-- `alter table ... validate constraint ...`.
-- ------------------------------------------------------------------
alter table public.bcv_rates
  add constraint bcv_rates_rate_positiva check (rate > 0) not valid;

alter table public.transactions
  add constraint transactions_monto_no_negativo     check (monto >= 0)        not valid,
  add constraint transactions_monto_usd_no_negativo check (monto_usd >= 0)    not valid,
  add constraint transactions_tasa_positiva         check (tasa is null or tasa > 0) not valid;
