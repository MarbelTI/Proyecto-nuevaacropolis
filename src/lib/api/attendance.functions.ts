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

    // Un celador tiene el Excel completo en su equipo, así que su envío trae
    // todas las aulas. Se recorta a la suya antes de tocar la base: si se
    // mandara entero, RLS rechazaría las filas ajenas y abortaría la subida
    // completa, incluida la parte que sí le corresponde.
    const aulasPermitidas =
      session.role === "celador"
        ? data.aulas.filter((a) => a.nombre === session.aulaNombre)
        : data.aulas;

    if (session.role === "celador" && !session.aulaNombre) {
      return { ok: false, error: "No tienes un aula asignada. Avisa a Tecnologías." };
    }

    const nombresAulas = aulasPermitidas.map((a) => a.nombre);
    if (!nombresAulas.length) {
      return {
        ok: false,
        error:
          session.role === "celador"
            ? `No se encontró tu aula (${session.aulaNombre}) en lo que hay en este equipo.`
            : "No hay aulas que subir. Importa el Excel primero.",
      };
    }

    // Se prepara TODO y se manda de una vez a la función sync_asistencias, que
    // borra y reinserta dentro de una sola transacción.
    //
    // Antes esto eran cinco pasos por HTTP: subir aulas, borrar las tres tablas
    // y reinsertar en lotes de 500. Un corte de red o un timeout de Vercel
    // entre el borrado y el último lote dejaba la nube vacía o a medias, sin
    // vuelta atrás. Con la transacción, o entra todo o no se toca nada.
    const validas = new Set(nombresAulas);

    const aulasRows = aulasPermitidas.map((a) => ({
      nombre: a.nombre,
      celador: a.celador,
      dia_semana: a.diaSemana,
      condicion: a.condicion === "Probacionista" ? "Probacionista" : "Miembro",
      year: a.year,
      temas: a.temas ?? {},
      activa: a.activa !== false,
    }));

    // Se descartan las filas sin fecha válida o de un aula que no viene en el
    // envío: violarían la clave foránea. La función repite estos filtros, pero
    // mandar menos datos por la red también cuenta.
    const asistRows = data.records
      .filter((r) => validas.has(r.aula) && fechaONull(r.fecha) && r.alumno)
      .map((r) => ({
        aula: r.aula,
        alumno: r.alumno,
        fecha: r.fecha,
        asistencia: r.asistencia || "",
        reflexion: r.reflexion || "",
      }));

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

    const idsReflex = new Set(reflexRows.map((r) => r.id));
    const entregaRows = data.reflexionAsistencia
      .filter((e) => idsReflex.has(e.reflexionId) && e.alumno)
      .map((e) => ({
        reflexion_id: e.reflexionId,
        alumno: e.alumno,
        aula: e.aula,
        estado: e.estado || "",
      }));

    const { data: resumen, error } = await supabase.rpc("sync_asistencias", {
      p_aulas: aulasRows,
      p_asistencias: asistRows,
      p_reflexiones: reflexRows,
      p_entregas: entregaRows,
    });

    if (error) {
      // Si falla, no se ha escrito nada: la transacción se deshizo entera.
      console.error("[asistencias.sync]", error);
      return {
        ok: false,
        error:
          "No se pudo subir. No se ha borrado ni cambiado nada en la nube. " +
          "Vuelve a intentarlo; si sigue fallando, avisa a Tecnologías.",
      };
    }

    const r = (resumen ?? {}) as Record<string, number>;
    return {
      ok: true,
      aulas: r.aulas ?? aulasRows.length,
      asistencias: r.asistencias ?? asistRows.length,
      reflexiones: r.reflexiones ?? reflexRows.length,
      entregas: r.entregas ?? entregaRows.length,
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
