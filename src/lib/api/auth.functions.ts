import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionUser } from "./auth-guard";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

export type UserRole =
  "super_admin" | "finanzas" | "director" | "celador" | "celador_estudios" | "unknown";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
};

// Permisos por rol
const ROLE_PERMS: Record<
  UserRole,
  {
    canAccessExisting: boolean;
    canAccessAsistencias: boolean;
    canAccessDiagnostico: boolean;
    canEditAnyAula: boolean;
    readOnly: boolean;
  }
> = {
  super_admin: {
    canAccessExisting: true,
    canAccessAsistencias: true,
    canAccessDiagnostico: true,
    canEditAnyAula: true,
    readOnly: false,
  },
  finanzas: {
    canAccessExisting: true,
    canAccessAsistencias: false,
    canAccessDiagnostico: false,
    canEditAnyAula: false,
    readOnly: false,
  },
  director: {
    canAccessExisting: true,
    canAccessAsistencias: true,
    canAccessDiagnostico: true,
    canEditAnyAula: true,
    readOnly: true,
  },
  celador: {
    canAccessExisting: false,
    canAccessAsistencias: true,
    canAccessDiagnostico: false,
    canEditAnyAula: false,
    readOnly: false,
  },
  celador_estudios: {
    canAccessExisting: false,
    canAccessAsistencias: true,
    canAccessDiagnostico: true,
    canEditAnyAula: true,
    readOnly: false,
  },
  unknown: {
    canAccessExisting: false,
    canAccessAsistencias: false,
    canAccessDiagnostico: false,
    canEditAnyAula: false,
    readOnly: false,
  },
};

export function getPermsForRole(role: UserRole) {
  return ROLE_PERMS[role] ?? ROLE_PERMS.unknown;
}

// Verifica la sesión del usuario y devuelve su perfil con rol.
// El rol proviene de la tabla `profiles` (poblada por el trigger de signup en la
// base de datos), NUNCA de datos enviados por el navegador. Así no se puede
// suplantar un rol enviando un email arbitrario.
export const authCallback = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session) {
      return { ok: false, error: "No autorizado" };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = SUPABASE_URL;
    const supabaseAnonKey = SUPABASE_ANON_KEY;

    const role = (session.role as UserRole) || "unknown";
    const full_name = session.email;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        ok: true,
        profile: { id: session.userId, email: session.email, full_name, role },
        perms: getPermsForRole(role),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    // Buscar el perfil (creado por el trigger) y el full_name real.
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", session.userId)
      .maybeSingle();

    const roleFromDb = (profile?.role as UserRole) || role;

    return {
      ok: true,
      profile: {
        id: session.userId,
        email: session.email,
        full_name: profile?.full_name || full_name,
        role: roleFromDb,
      },
      perms: getPermsForRole(roleFromDb),
    };
  });
