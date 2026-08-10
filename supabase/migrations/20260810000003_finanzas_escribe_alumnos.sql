-- ------------------------------------------------------------------
-- Finanzas pasa a poder leer y escribir la ficha de alumnos.
--
-- Por qué: finanzas es quien lleva las cuotas especiales (quién está becado,
-- quién paga 15 en vez de 20, quién pasó a 25 desde junio). Hasta ahora podía
-- editarlas en su navegador pero no guardarlas en la nube: `canManageStudents`
-- no la incluía y, sobre todo, `students` no tenía ninguna política para ese
-- rol. Los cambios se le quedaban en el equipo y desaparecían al cambiar de
-- máquina.
--
-- Qué concede exactamente, para que quede escrito: la ficha es UNA fila, así
-- que quien puede escribirla puede tocar también cédula, correo, dirección y
-- teléfono. Se acepta a conciencia. Si algún día hay que recortarlo, la vía es
-- llevar las columnas de cuota a su propia tabla, no intentar afinar esta
-- política por columnas.
--
-- Antes de esto, finanzas leía los alumnos a través de la vista
-- `students_finanzas`, que salta el RLS. Con la política puesta puede ir a la
-- tabla directamente, que es lo que hace el código cuando el rol tiene permiso
-- de escritura (ver students.functions.ts).
-- ------------------------------------------------------------------

drop policy if exists "finanzas_rw_students" on public.students;

create policy "finanzas_rw_students" on public.students
  for all to authenticated
  using ((select public.is_finanzas()))
  with check ((select public.is_finanzas()));

-- Nota: is_finanzas() ya exige que la cuenta esté aprobada y devuelve true
-- también para super_admin, así que no hace falta una política aparte.
