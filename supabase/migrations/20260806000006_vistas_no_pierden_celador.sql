-- ============================================================
-- Corrección: las vistas restringidas se comían la marca de celador
--
-- EL FALLO
-- `students_finanzas` y `students_celador` no incluyen la columna `celador`
-- en su SELECT. rowToStudent() la convierte entonces en undefined, y
-- SupabaseSync la escribe así en el navegador de quien cargó.
--
-- Resultado: Manuela (finanzas) pulsa "Cargar desde nube" y las insignias de
-- celador desaparecen de su pantalla, junto con la fecha de ingreso. No es un
-- fallo visual: la lista deja de agrupar bien, porque los celadores se ordenan
-- primero dentro de su aula.
--
-- HASTA DÓNDE LLEGA — y hasta dónde NO
-- El daño se queda en el navegador de esa persona. Subir a la nube exige rol
-- de control de estudio (canManageStudents en students.functions.ts), y esos
-- roles leen la tabla `students` completa, no estas vistas. Así que el borrado
-- NO se propaga a los demás. Conviene saberlo por si algún día se le dan
-- permisos de escritura a finanzas: ese día sí habría que revisar esto.
--
-- LA CORRECCIÓN
-- Añadir a cada vista las columnas que la pantalla necesita y que no son
-- datos personales.
--
-- Qué sigue FUERA a propósito: cédula, correo, dirección, redes, ocupación,
-- habilidades y grado de participación. Eso es de control de estudio, y esta
-- migración no cambia ni un ápice esa decisión.
-- ============================================================

-- Finanzas y dirección: se añaden `celador` y `fecha_ingreso`.
-- La fecha de ingreso hace falta para calcular desde qué mes se debe cuota;
-- sin ella, la deuda de un alumno nuevo se calcula desde el arranque del aula
-- y sale inflada.
create or replace view public.students_finanzas as
  select
    id, nombre, telefono, aulas, actividad, condicion,
    celador, fecha_ingreso,
    cuota_override, cuota_overrides_temporales
  from public.students
  where public.is_finanzas() or public.is_super_admin();

grant select on public.students_finanzas to authenticated;

comment on view public.students_finanzas is
  'Nombre, telefono, aula, condicion, celador, ingreso y cuotas. SIN cedula, correo ni direccion. Para finanzas y direccion.';

-- Celador: se añade `celador` para que vea quién lleva su aula. Sigue sin
-- teléfono y sin nada de cuotas, que es lo que lo distingue de la de finanzas.
create or replace view public.students_celador as
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
            and p.aula_nombre = any(s.aulas)
        );

grant select on public.students_celador to authenticated;

comment on view public.students_celador is
  'Solo nombre/aula/celador de SU propia aula. Sin telefono ni cuotas. Usa profiles.aula_nombre, no la tabla aulas, que no existe.';

-- ------------------------------------------------------------
-- Comprobación (ejecutar aparte)
-- ------------------------------------------------------------
-- Ambas deben incluir ya la columna `celador`:
--
-- select column_name from information_schema.columns
--  where table_name in ('students_finanzas','students_celador')
--    and column_name in ('celador','fecha_ingreso')
--  order by table_name, column_name;
