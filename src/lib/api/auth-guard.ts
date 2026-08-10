import { getRequestHeader } from "@tanstack/react-start/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Escape hatch SOLO para desarrollo local. Además del flag, exigimos que NO
// estemos corriendo en Vercel (la var VERCEL=1 la pone Vercel automáticamente
// en todos sus entornos: production, preview y development), como red de
// seguridad extra por si alguien define SISFIA_DEV_BYPASS_AUTH=1 por error
// en el dashboard de Vercel.
// `import.meta.env.DEV` solo es cierto con el servidor de desarrollo: en el
// build de producción Vite lo sustituye por false y borra el bloque entero, así
// que el atajo ni siquiera viaja en el paquete que se despliega.
//
// Antes la condición era `!process.env.VERCEL`, que funcionaba pero dependía de
// dos cosas frágiles: que Vercel siguiera exponiendo esa variable (es un ajuste
// del panel que se puede apagar) y que el despliegue fuera precisamente en
// Vercel. En un VPS o en otro proveedor, una variable de entorno mal puesta
// bastaba para que cualquier visitante fuera super_admin.
const DEV_BYPASS = import.meta.env.DEV && process.env.SISFIA_DEV_BYPASS_AUTH === "1";

export type AuthSession = {
  userId: string;
  email: string;
  role: string;
  /** false = cuenta registrada pero aún no habilitada por un super_admin. */
  aprobado: boolean;
  /**
   * Aula del celador, por nombre. Solo la tienen los celadores; el resto de
   * roles no está limitado a un aula. undefined en un celador significa que
   * no tiene aula asignada, y entonces no debe ver ninguna.
   */
  aulaNombre?: string;
};

/**
 * Verifica la sesión real de Supabase a partir del access_token del cliente.
 * La token JWT es firmada por Supabase y se valida contra auth.users; un token
 * falso o caducado devuelve null. El rol sale de la tabla `profiles` (la única
 * fuente de verdad), NO de datos enviados por el navegador.
 */
export async function getSessionUser(accessToken?: string): Promise<AuthSession | null> {
  if (DEV_BYPASS) {
    return { userId: "dev-bypass", email: "dev@local", role: "super_admin", aprobado: true };
  }

  const authHeader = getRequestHeader("authorization") ?? "";
  const token = accessToken || authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const { createClient } = await import("@supabase/supabase-js");
  // El cliente lleva el access_token del usuario en el header, para que RLS
  // reconozca al usuario (auth.uid()) y le permita leer su propio perfil.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const userId = data.user.id;
  const email = data.user.email ?? "";

  // Rol desde profiles (poblada por el trigger de signup). RLS de profiles solo
  // permite leer el propio perfil, así que esta consulta es segura con anon key.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, aprobado, aula_nombre")
    .eq("id", userId)
    .maybeSingle();

  const aprobado = profile?.aprobado === true;
  return {
    userId,
    email,
    // Una cuenta sin aprobar no conserva su rol: se degrada a "pendiente",
    // así ninguna comprobación de permisos puede darle acceso por descuido.
    role: aprobado ? (profile?.role ?? "unknown") : "pendiente",
    aprobado,
    aulaNombre: aprobado ? (profile?.aula_nombre ?? undefined) : undefined,
  };
}

/** Roles que pueden escribir/leer datos financieros. */
export function canManageFinanzas(role: string): boolean {
  return role === "super_admin" || role === "finanzas";
}

/** Roles que pueden leer datos financieros (sin escribir). */
export function canReadFinanzas(role: string): boolean {
  return role === "super_admin" || role === "finanzas" || role === "director";
}

/**
 * Roles que pueden escribir la ficha de alumnos.
 *
 * Finanzas entra desde el 10-ago-2026, por decisión expresa: es quien lleva las
 * cuotas especiales —quién está becado, quién paga menos— y necesita poder
 * guardarlas en la nube, no solo en su navegador.
 *
 * Conviene tener claro lo que eso concede: la ficha es una sola fila, así que
 * con permiso para escribirla se puede tocar también cédula, correo, dirección
 * y teléfono. Se aceptó a cambio de que Manuela pueda trabajar sin depender de
 * nadie. Si algún día se quiere recortar, hay que separar las columnas de cuota
 * en su propia tabla o política.
 */
export function canManageStudents(role: string): boolean {
  return role === "super_admin" || role === "celador_estudios" || role === "finanzas";
}

/**
 * Roles que pueden escribir asistencias.
 *
 * El celador entra porque marcar la asistencia de su aula es justamente su
 * trabajo. Lo que NO puede es tocar otras aulas: eso lo recorta el servidor
 * (ver syncAttendanceToSupabase) y, sobre todo, lo impiden las políticas RLS,
 * que son la autoridad final aunque alguien evite la aplicación.
 */
export function canManageAsistencias(role: string): boolean {
  return role === "super_admin" || role === "celador_estudios" || role === "celador";
}

/**
 * Roles que pueden leer asistencias. Finanzas queda fuera a propósito: no le
 * hace falta para su trabajo, y lo que no hace falta no se concede.
 */
export function canReadAsistencias(role: string): boolean {
  return (
    role === "super_admin" ||
    role === "celador_estudios" ||
    role === "director" ||
    role === "celador"
  );
}

/** Cualquier rol que tenga algún tipo de acceso de lectura a alumnos. */
export function canReadStudents(role: string): boolean {
  return (
    role === "super_admin" ||
    role === "celador_estudios" ||
    role === "finanzas" ||
    role === "director" ||
    role === "celador"
  );
}
