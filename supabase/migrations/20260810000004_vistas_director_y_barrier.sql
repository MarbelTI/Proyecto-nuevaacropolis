-- ------------------------------------------------------------------
-- 3.1 + 3.5 + parte del 3.7: las vistas de alumnos.
--
-- 3.1 — El rol `director` recibía CERO alumnos, en silencio.
--   El código lo manda a `students_finanzas` (students.functions.ts), pero el
--   WHERE de la vista solo dejaba pasar a finanzas y super_admin. El director
--   entraba, no había error por ninguna parte, y la pantalla salía vacía. El
--   comentario de la propia vista decía "Para finanzas y direccion", así que la
--   intención estaba clara y la implementación no la cumplía.
--
-- 3.5 — Las dos vistas son SECURITY DEFINER (lo son por omisión) y por tanto
--   NO evalúan el RLS de `students`. Lo único que separa los datos es el WHERE
--   escrito a mano dentro de la vista. Sin `security_barrier`, el planificador
--   puede evaluar antes un WHERE aportado por quien consulta que el filtro de
--   rol de la vista, porque las funciones is_*() son caras. Es exactamente el
--   caso para el que existe security_barrier.
--
--   No se pasa a security_invoker: eso ROMPERÍA a finanzas y a dirección, que
--   leen a través de estas vistas y no tienen (dirección) o no tenían política
--   propia sobre la tabla.
--
-- 3.7 — El filtro por aula del celador usaba `p.aula_nombre = any(s.aulas)`,
--   que no puede aprovechar un índice. Con el operador de solapamiento `&&` sí,
--   y se crea el GIN correspondiente.
-- ------------------------------------------------------------------

-- Se borran y se vuelven a crear en vez de `create or replace`.
--
-- Motivo: `create or replace view` no permite cambiar el nombre ni el orden de
-- las columnas, y la vista que hay en la base no coincide con la del
-- repositorio (falló con «no se puede cambiar el nombre de la columna de vista
-- "cuota_override" a "celador"»), señal de que se editó a mano en algún
-- momento. Una vista no guarda datos: borrarla y rehacerla no pierde nada, y
-- deja la base igual a lo que dice el repositorio.
--
-- Sin CASCADE a propósito: si algo dependiera de estas vistas, preferimos que
-- falle aquí y se vea, antes que borrarlo en silencio.
drop view if exists public.students_finanzas;
drop view if exists public.students_celador;

-- Nota: desde que finanzas puede escribir en `students` (migración
-- 20260810000003), el código la manda directamente a la tabla. Esta vista
-- quedó, en la práctica, para el rol `director`.
create view public.students_finanzas as
  select
    id, nombre, telefono, aulas, actividad, condicion,
    celador, fecha_ingreso,
    cuota_override, cuota_overrides_temporales
  from public.students
  where public.is_finanzas()
     or public.is_super_admin()
     or public.is_director();

alter view public.students_finanzas set (security_barrier = true);
grant select on public.students_finanzas to authenticated;

comment on view public.students_finanzas is
  'Nombre, telefono, aula, condicion, celador, ingreso y cuotas. SIN cedula, correo ni direccion. Para finanzas y direccion.';

-- Celador: mismas columnas, mismo criterio, pero con `&&` para que el índice
-- pueda usarse.
create view public.students_celador as
  select s.id, s.nombre, s.aulas, s.actividad, s.celador
  from public.students s
  where public.is_super_admin()
     or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.aprobado = true
            and p.role = 'celador'
            and p.aula_nombre is not null
            and s.aulas && array[p.aula_nombre]
        );

alter view public.students_celador set (security_barrier = true);
grant select on public.students_celador to authenticated;

comment on view public.students_celador is
  'Solo nombre/aula/celador de SU propia aula. Sin telefono ni cuotas. Usa profiles.aula_nombre, no la tabla aulas, que no existe.';

create index if not exists idx_students_aulas_gin
  on public.students using gin (aulas);
