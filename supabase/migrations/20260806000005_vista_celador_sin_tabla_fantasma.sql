-- ============================================================
-- Corrección: la vista students_celador nunca llegó a existir
--
-- EL FALLO
-- La migración 20260805000001 define `students_celador` así:
--
--     join public.aulas a on a.id = p.aula_id
--
-- `public.aulas` no existe: ninguna migración la crea, solo se la menciona.
-- Así que esa sentencia falla y la vista nunca se llegó a crear.
--
-- CONSECUENCIA REAL, no teórica
-- src/lib/api/students.functions.ts manda al rol `celador` a leer justamente
-- esa vista. Un celador que pulse "Cargar desde nube" recibe un error y se
-- queda sin la lista de su aula. Nadie lo había notado porque hasta ahora solo
-- ha entrado la administradora.
--
-- LA CORRECCIÓN
-- Ya no hace falta ningún join: desde 20260806000003 el aula del celador vive
-- en `profiles.aula_nombre` como texto, que es como identifica las aulas la
-- aplicación. Se compara directamente contra el array `students.aulas`.
--
-- Se aprovecha para exigir `aprobado`: una cuenta registrada pero todavía no
-- habilitada no debe ver alumnos, ni siquiera los de su aula.
-- ============================================================

create or replace view public.students_celador as
  select s.id, s.nombre, s.aulas, s.actividad
  from public.students s
  where public.is_super_admin()
     or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.aprobado = true
            and p.role = 'celador'
            and p.aula_nombre is not null
            and p.aula_nombre = any(s.aulas)
        );

grant select on public.students_celador to authenticated;

comment on view public.students_celador is
  'Solo nombre/aula de SU propia aula, sin telefono ni cuotas. Para rol celador. Usa profiles.aula_nombre (texto), no la tabla aulas, que no existe.';

-- ------------------------------------------------------------
-- Comprobación (ejecutar aparte)
-- ------------------------------------------------------------
-- Debe devolver una fila. Antes de esta migración daba "relation does not exist".
--
-- select count(*) from public.students_celador;
