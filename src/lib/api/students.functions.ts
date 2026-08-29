import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canManageStudents, canReadStudents, getSessionUser } from "./auth-guard";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import { registrarActividad } from "./activity-log";

const StudentSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  aulas: z.array(z.string()),
  condicion: z.string().optional(),
  actividad: z.string().optional(),
  celador: z.boolean().optional(),
  cuotaOverride: z.number().nullable().optional(),
  cuotaOverridesTemporales: z.array(z.any()).optional(),
  telefono: z.string().optional(),
  fechaIngreso: z.string().optional(),
  cedula: z.string().optional(),
  correo: z.string().optional(),
  direccion: z.string().optional(),
  redesSociales: z.string().optional(),
  ocupacion: z.string().optional(),
  habilidades: z.string().optional(),
  gradoParticipacion: z.string().optional(),
  fechaMiembro: z.string().optional(),
  fechaFfvv: z.string().optional(),
  sede: z.string().optional(),
  instructor: z.string().optional(),
  celadorNombre: z.string().optional(),
  horario: z.string().optional(),
  materias: z.string().optional(),
});

const accessTokenField = z.string().optional();

export type ServerStudent = z.infer<typeof StudentSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStudent(r: any): ServerStudent {
  return {
    id: r.id,
    nombre: r.nombre,
    aulas: r.aulas ?? [],
    condicion: r.condicion ?? undefined,
    actividad: r.actividad ?? undefined,
    celador: r.celador ?? undefined,
    cuotaOverride: r.cuota_override ?? undefined,
    cuotaOverridesTemporales: r.cuota_overrides_temporales ?? undefined,
    telefono: r.telefono ?? undefined,
    fechaIngreso: r.fecha_ingreso ?? undefined,
    cedula: r.cedula ?? undefined,
    correo: r.correo ?? undefined,
    direccion: r.direccion ?? undefined,
    redesSociales: r.redes_sociales ?? undefined,
    ocupacion: r.ocupacion ?? undefined,
    habilidades: r.habilidades ?? undefined,
    gradoParticipacion: r.grado_participacion ?? undefined,
    fechaMiembro: r.fecha_miembro ?? undefined,
    fechaFfvv: r.fecha_ffvv ?? undefined,
    sede: r.sede ?? undefined,
    instructor: r.instructor ?? undefined,
    celadorNombre: r.celador_nombre ?? undefined,
    horario: r.horario ?? undefined,
    materias: r.materias ?? undefined,
  };
}

export const syncStudentsToSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      students: z.array(StudentSchema),
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canManageStudents(session.role)) {
      return { ok: false, error: "No autorizado — necesitas rol de control de estudio" };
    }
    const { createClient } = await import("@supabase/supabase-js");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { ok: false, error: "Supabase not configured" };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    // OJO al tocar esto: aquí se escriben TODAS las columnas, así que un campo
    // que llegue vacío borra lo que hubiera en la base.
    //
    // Hoy no es un problema porque subir exige rol de control de estudio, y
    // esos roles leen la tabla `students` entera: lo que suben es lo mismo que
    // leyeron. Pero si algún día se le dan permisos de escritura a finanzas
    // —que lee una vista recortada— pulsar "Subir a nube" borraría de un golpe
    // las cédulas, correos y direcciones de todo el mundo. En ese caso hay que
    // pasar a actualizar solo las columnas que el rol pudo ver.
    const mapped = data.students.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      aulas: s.aulas,
      condicion: s.condicion || null,
      actividad: s.actividad || "Activo",
      celador: s.celador ?? false,
      cuota_override: s.cuotaOverride ?? null,
      cuota_overrides_temporales: s.cuotaOverridesTemporales ?? null,
      telefono: s.telefono || null,
      fecha_ingreso: s.fechaIngreso || null,
      cedula: s.cedula || null,
      correo: s.correo || null,
      direccion: s.direccion || null,
      redes_sociales: s.redesSociales || null,
      ocupacion: s.ocupacion || null,
      habilidades: s.habilidades || null,
      grado_participacion: s.gradoParticipacion || null,
      fecha_miembro: s.fechaMiembro || null,
      fecha_ffvv: s.fechaFfvv || null,
      sede: s.sede || null,
      instructor: s.instructor || null,
      celador_nombre: s.celadorNombre || null,
      horario: s.horario || null,
      materias: s.materias || null,
    }));

    const { error } = await supabase.from("students").upsert(mapped, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

    if (error) return { ok: false, error: error.message };
    await registrarActividad(supabase, session, "alumnos:subir", `${mapped.length} filas`);
    return { ok: true, count: mapped.length };
  });

export const loadStudentsFromSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canReadStudents(session.role)) {
      return { ok: false, error: "No autorizado", data: [] as ServerStudent[] };
    }
    const { createClient } = await import("@supabase/supabase-js");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { ok: false, error: "Supabase not configured", data: [] as ServerStudent[] };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    // Perfil completo solo para super_admin/celador_estudios. Los demás roles
    // leen su vista restringida por columna (ver migración 20260805000001).
    const table = canManageStudents(session.role)
      ? "students"
      : session.role === "celador"
        ? "students_celador"
        : "students_finanzas"; // finanzas y director

    const { data: rows, error } = await supabase
      .from(table)
      .select("*")
      .order("nombre", { ascending: true });

    if (error) return { ok: false, error: error.message, data: [] as ServerStudent[] };
    return { ok: true, data: (rows ?? []).map(rowToStudent) };
  });
