import { getRequestHeader } from "@tanstack/react-start/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Escape hatch SOLO para desarrollo local (este flag nunca se define en producción).
// En Vercel, las variables de entorno se configuran en el dashboard, no en .env,
// por lo que el bypass queda desactivado en el deploy.
const DEV_BYPASS = process.env.SISFIA_DEV_BYPASS_AUTH === "1";

export type AuthSession = {
  userId: string;
  email: string;
  role: string;
};

/**
 * Verifica la sesión real de Supabase a partir del access_token del cliente.
 * La token JWT es firmada por Supabase y se valida contra auth.users; un token
 * falso o caducado devuelve null. El rol sale de la tabla `profiles` (la única
 * fuente de verdad), NO de datos enviados por el navegador.
 */
export async function getSessionUser(accessToken?: string): Promise<AuthSession | null> {
  if (DEV_BYPASS) {
    return { userId: "dev-bypass", email: "dev@local", role: "super_admin" };
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
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return { userId, email, role: profile?.role ?? "unknown" };
}

/** Roles que pueden escribir/leer datos financieros. */
export function canManageFinanzas(role: string): boolean {
  return role === "super_admin" || role === "finanzas";
}

/** Roles que pueden leer datos financieros (sin escribir). */
export function canReadFinanzas(role: string): boolean {
  return role === "super_admin" || role === "finanzas" || role === "director";
}
