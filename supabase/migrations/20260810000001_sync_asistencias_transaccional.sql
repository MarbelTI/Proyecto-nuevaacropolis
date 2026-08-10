-- ------------------------------------------------------------------
-- Subir asistencias en UNA sola transacción.
--
-- Antes la aplicación hacía esto desde el navegador, en peticiones HTTP
-- separadas: borraba las tres tablas de las aulas enviadas y después
-- reinsertaba en lotes de 500. Si se caía la red, se agotaba el tiempo de la
-- función de Vercel o un lote chocaba con una restricción, la nube se quedaba
-- con el historial borrado o a medias, y no había forma de deshacerlo. Un
-- celador con 4.000 asistencias son ocho viajes después del borrado: ocho
-- oportunidades de perderlo todo.
--
-- El cuerpo de una función de Postgres es una transacción: o entra completo o
-- no entra nada. Si algo falla, el borrado se deshace solo.
--
-- SECURITY INVOKER (el valor por omisión, explícito aquí para que se lea):
-- la función corre con los permisos de quien la llama, así que las políticas
-- RLS siguen mandando. Un celador sigue sin poder tocar otra aula, igual que
-- antes. NO ponerla SECURITY DEFINER: eso saltaría el RLS y convertiría esta
-- función en una puerta trasera para escribir en cualquier aula.
-- ------------------------------------------------------------------

create or replace function public.sync_asistencias(
  p_aulas       jsonb,
  p_asistencias jsonb,
  p_reflexiones jsonb,
  p_entregas    jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nombres  text[];
  v_aulas    integer := 0;
  v_asist    integer := 0;
  v_reflex   integer := 0;
  v_entregas integer := 0;
begin
  select coalesce(array_agg(a.nombre), '{}')
    into v_nombres
    from jsonb_to_recordset(p_aulas) as a(nombre text);

  if array_length(v_nombres, 1) is null then
    raise exception 'No se recibió ninguna aula que subir';
  end if;

  -- 1. Las aulas primero: las demás tablas apuntan a ellas.
  insert into public.att_aulas (nombre, celador, dia_semana, condicion, year, temas, activa)
  select a.nombre,
         coalesce(a.celador, ''),
         coalesce(a.dia_semana, ''),
         case when a.condicion = 'Probacionista' then 'Probacionista' else 'Miembro' end,
         a.year,
         coalesce(a.temas, '{}'::jsonb),
         coalesce(a.activa, true)
    from jsonb_to_recordset(p_aulas)
      as a(nombre text, celador text, dia_semana text, condicion text,
           year integer, temas jsonb, activa boolean)
  on conflict (nombre) do update
    set celador    = excluded.celador,
        dia_semana = excluded.dia_semana,
        condicion  = excluded.condicion,
        year       = excluded.year,
        temas      = excluded.temas,
        activa     = excluded.activa,
        updated_at = now();
  get diagnostics v_aulas = row_count;

  -- 2. Fuera lo viejo de esas aulas, de hijas a madres por las claves foráneas.
  delete from public.att_reflexion_asistencia where aula = any(v_nombres);
  delete from public.att_reflexiones          where aula = any(v_nombres);
  delete from public.att_asistencias          where aula = any(v_nombres);

  -- 3. Asistencias.
  --    `distinct on` no es un adorno: un nombre repetido en la hoja de Excel
  --    manda dos filas con la misma clave (aula, alumno, fecha) y Postgres
  --    aborta el insert entero. Antes eso ocurría DESPUÉS del borrado.
  insert into public.att_asistencias (aula, alumno, fecha, asistencia, reflexion)
  select distinct on (r.aula, r.alumno, r.fecha)
         r.aula, r.alumno, r.fecha,
         coalesce(r.asistencia, ''), coalesce(r.reflexion, '')
    from jsonb_to_recordset(p_asistencias)
      as r(aula text, alumno text, fecha date, asistencia text, reflexion text)
   where r.aula = any(v_nombres)
     and r.fecha is not null
     and coalesce(r.alumno, '') <> ''
   order by r.aula, r.alumno, r.fecha;
  get diagnostics v_asist = row_count;

  -- 4. Reflexiones.
  insert into public.att_reflexiones (id, aula, year, titulo, fecha, tema_fecha)
  select distinct on (r.id)
         r.id, r.aula, r.year, coalesce(r.titulo, ''), r.fecha, r.tema_fecha
    from jsonb_to_recordset(p_reflexiones)
      as r(id text, aula text, year integer, titulo text, fecha date, tema_fecha date)
   where r.aula = any(v_nombres)
     and coalesce(r.id, '') <> ''
   order by r.id;
  get diagnostics v_reflex = row_count;

  -- 5. Entregas. Se filtran por aula además de por reflexión: la columna
  --    `aula` de esta tabla la elige quien escribe, y sin este filtro una fila
  --    de otra aula la rechazaría el RLS y tumbaría la subida entera.
  insert into public.att_reflexion_asistencia (reflexion_id, alumno, aula, estado)
  select distinct on (e.reflexion_id, e.alumno)
         e.reflexion_id, e.alumno, e.aula, coalesce(e.estado, '')
    from jsonb_to_recordset(p_entregas)
      as e(reflexion_id text, alumno text, aula text, estado text)
   where e.aula = any(v_nombres)
     and coalesce(e.alumno, '') <> ''
     and exists (
           select 1 from public.att_reflexiones x
            where x.id = e.reflexion_id and x.aula = e.aula
         )
   order by e.reflexion_id, e.alumno;
  get diagnostics v_entregas = row_count;

  return jsonb_build_object(
    'aulas', v_aulas,
    'asistencias', v_asist,
    'reflexiones', v_reflex,
    'entregas', v_entregas
  );
end;
$$;

-- Solo las cuentas con sesión. RLS sigue decidiendo qué aulas puede tocar cada
-- una: esto es el permiso para llamar, no el permiso para escribir.
revoke all on function public.sync_asistencias(jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.sync_asistencias(jsonb, jsonb, jsonb, jsonb) to authenticated;

comment on function public.sync_asistencias(jsonb, jsonb, jsonb, jsonb) is
  'Reemplaza las asistencias, reflexiones y entregas de las aulas recibidas, '
  'en una sola transacción. Corre con los permisos de quien llama: el RLS '
  'sigue limitando al celador a su aula.';
