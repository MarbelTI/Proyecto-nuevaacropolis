import { getRequestHeader } from "@tanstack/react-start/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Escape hatch SOLO para desarrollo local. Además del flag, exigimos que NO
// estemos corriendo en Vercel (la var VERCEL=1 la pone Vercel automáticamente
// en todos sus entornos: production, preview y development), como red de
// seguridad extra por si alguien define SISFIA_DEV_BYPASS_AUTH=1 por error
// en el dashboard de Vercel.
const DEV_BYPASS = process.env.SISFIA_DEV_BYPASS_AUTH === "1" && !process.env.VERCEL;

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

/** Roles que pueden escribir el perfil completo de alumnos (control de estudio). */
export function canManageStudents(role: string): boolean {
  return role === "super_admin" || role === "celador_estudios";
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
