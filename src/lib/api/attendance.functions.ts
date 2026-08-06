import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canManageAsistencias, canReadAsistencias, getSessionUser } from "./auth-guard";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

const AulaSchema = z.object({
  nombre: z.string(),
  celador: z.string(),
  diaSemana: z.string(),
  condicion: z.string(),
  year: z.number(),
  temas: z.record(z.string(), z.string()),
  activa: z.boolean().optional(),
});

const RecordSchema = z.object({
  aula: z.string(),
  alumno: z.string(),
  fecha: z.string(),
  asistencia: z.string(),
  reflexion: z.string(),
});

const ReflexionMetaSchema = z.object({
  id: z.string(),
  aula: z.string(),
  year: z.number(),
  titulo: z.string(),
  fecha: z.string(),
  temaFecha: z.string().optional(),
});

const ReflexionAsistenciaSchema = z.object({
  aula: z.string(),
  alumno: z.string(),
  reflexionId: z.string(),
  estado: z.string(),
});

const accessTokenField = z.string().optional();

/** Una fecha vacía en la app es "sin fecha"; en Postgres eso es null, no "". */
function fechaONull(v: string | undefined): string | null {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/**
 * Supabase acepta lotes grandes, pero una sola petición con miles de filas es
 * frágil (tiempo de espera, límite de tamaño). Un aula de 80 alumnos por 52
 * clases ya son 4.160 filas, así que se manda por partes.
 */
async function enLotes<T>(
  filas: T[],
  tamano: number,
  fn: (lote: T[]) => Promise<{ error: { message: string } | null }>,
): Promise<string | null> {
  for (let i = 0; i < filas.length; i += tamano) {
    const { error } = await fn(filas.slice(i, i + tamano));
    if (error) return error.message;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function clienteConSesion(accessToken?: string): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  // Cliente con la sesión del usuario → mandan las políticas RLS.
  // Nunca se usa la service_role key aquí.
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Sube las asistencias del dispositivo a la nube.
 *
 * REEMPLAZA, no acumula, pero SOLO las aulas que vienen en el envío. Esto es
 * a propósito: si borrara todo, un celador que sincroniza su aula dejaría sin
 * datos a las demás. Al limitar el borrado a las aulas enviadas, cada quien
 * pisa lo suyo y respeta lo ajeno.
 */
export const syncAttendanceToSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      aulas: z.array(AulaSchema),
      records: z.array(RecordSchema),
      reflexionesMeta: z.array(ReflexionMetaSchema),
      reflexionAsistencia: z.array(ReflexionAsistenciaSchema),
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canManageAsistencias(session.role)) {
      return { ok: false, error: "No autorizado" };
    }
    const supabase = await clienteConSesion(data.accessToken);
    if (!supabase) return { ok: false, error: "Supabase no está configurado" };

    const nombresAulas = data.aulas.map((a) => a.nombre);
    if (!nombresAulas.length) {
      return { ok: false, error: "No hay aulas que subir. Importa el Excel primero." };
    }

    // 1. Las aulas primero: el resto de tablas apuntan a ellas.
    const aulasRows = data.aulas.map((a) => ({
      nombre: a.nombre,
      celador: a.celador,
      dia_semana: a.diaSemana,
      condicion: a.condicion === "Probacionista" ? "Probacionista" : "Miembro",
      year: a.year,
      temas: a.temas ?? {},
      activa: a.activa !== false,
    }));
    const errAulas = await enLotes(aulasRows, 200, (lote) =>
      supabase.from("att_aulas").upsert(lote, { onConflict: "nombre" }),
    );
    if (errAulas) return { ok: false, error: `Aulas: ${errAulas}` };

    // 2. Limpiar lo viejo de esas aulas, de hijas a madres para no chocar
    //    con las claves foráneas.
    for (const tabla of ["att_reflexion_asistencia", "att_reflexiones", "att_asistencias"]) {
      const { error } = await supabase.from(tabla).delete().in("aula", nombresAulas);
      if (error) return { ok: false, error: `Limpiando ${tabla}: ${error.message}` };
    }

    // 3. Asistencias. Se descartan las filas sin fecha válida o de un aula que
    //    no viene en el envío: violarían la clave foránea y abortarían todo.
    const validas = new Set(nombresAulas);
    const asistRows = data.records
      .filter((r) => validas.has(r.aula) && fechaONull(r.fecha) && r.alumno)
      .map((r) => ({
        aula: r.aula,
        alumno: r.alumno,
        fecha: r.fecha,
        asistencia: r.asistencia || "",
        reflexion: r.reflexion || "",
      }));
    const errAsist = await enLotes(asistRows, 500, (lote) =>
      supabase.from("att_asistencias").upsert(lote, { onConflict: "aula,alumno,fecha" }),
    );
    if (errAsist) return { ok: false, error: `Asistencias: ${errAsist}` };

    // 4. Reflexiones.
    const reflexRows = data.reflexionesMeta
      .filter((r) => validas.has(r.aula) && r.id)
      .map((r) => ({
        id: r.id,
        aula: r.aula,
        year: r.year,
        titulo: r.titulo || "",
        fecha: fechaONull(r.fecha),
        tema_fecha: fechaONull(r.temaFecha),
      }));
    const errReflex = await enLotes(reflexRows, 500, (lote) =>
      supabase.from("att_reflexiones").upsert(lote, { onConflict: "id" }),
    );
    if (errReflex) return { ok: false, error: `Reflexiones: ${errReflex}` };

    // 5. Entregas de reflexión. Solo las que apuntan a una reflexión que
    //    acabamos de subir.
    const idsReflex = new Set(reflexRows.map((r) => r.id));
    const entregaRows = data.reflexionAsistencia
      .filter((e) => idsReflex.has(e.reflexionId) && e.alumno)
      .map((e) => ({
        reflexion_id: e.reflexionId,
        alumno: e.alumno,
        aula: e.aula,
        estado: e.estado || "",
      }));
    const errEntregas = await enLotes(entregaRows, 500, (lote) =>
      supabase.from("att_reflexion_asistencia").upsert(lote, { onConflict: "reflexion_id,alumno" }),
    );
    if (errEntregas) return { ok: false, error: `Entregas: ${errEntregas}` };

    return {
      ok: true,
      aulas: aulasRows.length,
      asistencias: asistRows.length,
      reflexiones: reflexRows.length,
      entregas: entregaRows.length,
    };
  });

/** Descarga las asistencias de la nube. */
export const loadAttendanceFromSupabase = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: accessTokenField }))
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canReadAsistencias(session.role)) {
      return { ok: false, error: "No autorizado" };
    }
    const supabase = await clienteConSesion(data.accessToken);
    if (!supabase) return { ok: false, error: "Supabase no está configurado" };

    const [aulasRes, asistRes, reflexRes, entregasRes] = await Promise.all([
      supabase.from("att_aulas").select("*"),
      // Se pide de golpe; por defecto Supabase corta en 1.000 filas, así que
      // se pide un rango amplio explícitamente.
      supabase.from("att_asistencias").select("*").range(0, 99999),
      supabase.from("att_reflexiones").select("*").range(0, 9999),
      supabase.from("att_reflexion_asistencia").select("*").range(0, 99999),
    ]);

    const fallo = [aulasRes, asistRes, reflexRes, entregasRes].find((r) => r.error);
    if (fallo?.error) return { ok: false, error: fallo.error.message };

    return {
      ok: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aulas: (aulasRes.data ?? []).map((a: any) => ({
        nombre: a.nombre,
        celador: a.celador ?? "",
        diaSemana: a.dia_semana ?? "",
        condicion: a.condicion ?? "Miembro",
        year: Number(a.year),
        temas: a.temas ?? {},
        activa: a.activa !== false,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      records: (asistRes.data ?? []).map((r: any) => ({
        aula: r.aula,
        alumno: r.alumno,
        fecha: r.fecha,
        asistencia: r.asistencia ?? "",
        reflexion: r.reflexion ?? "",
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reflexionesMeta: (reflexRes.data ?? []).map((r: any) => ({
        id: r.id,
        aula: r.aula,
        year: Number(r.year),
        titulo: r.titulo ?? "",
        fecha: r.fecha ?? "",
        temaFecha: r.tema_fecha ?? undefined,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reflexionAsistencia: (entregasRes.data ?? []).map((e: any) => ({
        aula: e.aula,
        alumno: e.alumno,
        reflexionId: e.reflexion_id,
        estado: e.estado ?? "",
      })),
    };
  });
