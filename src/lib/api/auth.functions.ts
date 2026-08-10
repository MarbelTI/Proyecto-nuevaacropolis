import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionUser } from "./auth-guard";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

export type UserRole =
  | "super_admin"
  | "finanzas"
  | "director"
  | "celador"
  | "celador_estudios"
  | "pendiente"
  | "unknown";

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
  // Cuenta registrada pero todavía no habilitada: sin acceso a nada.
  pendiente: {
    canAccessExisting: false,
    canAccessAsistencias: false,
    canAccessDiagnostico: false,
    canEditAnyAula: false,
    readOnly: true,
  },
  unknown: {
    canAccessExisting: false,
    canAccessAsistencias: false,
    canAccessDiagnostico: false,
    canEditAnyAula: false,
    readOnly: false,
  },
};

/** Minutos de inactividad tras los que se cierra la sesión, según el rol.
 *  Un celador pasando lista puede estar horas sin tocar la pantalla; una
 *  sesión de finanzas desatendida en una PC compartida es un riesgo real. */
export const MINUTOS_INACTIVIDAD: Record<UserRole, number> = {
  super_admin: 15,
  finanzas: 30,
  director: 30,
  celador_estudios: 60,
  celador: 480,
  pendiente: 10,
  unknown: 10,
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
      .select("full_name, role, aprobado")
      .eq("id", session.userId)
      .maybeSingle();

    // getSessionUser ya degradó el rol a "pendiente" si la cuenta no está
    // aprobada; se respeta esa decisión en vez de volver a leer role de la BD.
    const roleFromDb = session.aprobado ? (profile?.role as UserRole) || role : "pendiente";

    return {
      ok: true,
      profile: {
        id: session.userId,
        email: session.email,
        full_name: profile?.full_name || full_name,
        role: roleFromDb,
      },
      aprobado: session.aprobado,
      perms: getPermsForRole(roleFromDb),
    };
  });

// ---------------- Aprobación de cuentas (solo super_admin) ----------------

const PerfilPendiente = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  role: z.string(),
  created_at: z.string().optional(),
});
export type PerfilPendiente = z.infer<typeof PerfilPendiente>;

/** Lista las cuentas que se registraron y esperan habilitación. */
export const listarCuentasPendientes = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || session.role !== "super_admin") {
      return { ok: false, error: "No autorizado", data: [] as PerfilPendiente[] };
    }
    const { createClient } = await import("@supabase/supabase-js");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { ok: false, error: "Supabase not configured", data: [] as PerfilPendiente[] };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("aprobado", false)
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message, data: [] as PerfilPendiente[] };
    return { ok: true, data: (rows ?? []) as PerfilPendiente[] };
  });

/** Habilita (o rechaza) una cuenta, asignándole el rol que corresponda. */
export const resolverCuentaPendiente = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      aprobar: z.boolean(),
      role: z.enum(["super_admin", "finanzas", "director", "celador", "celador_estudios"]),
      accessToken: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || session.role !== "super_admin") {
      return { ok: false, error: "No autorizado" };
    }
    // Un super_admin no puede quitarse a sí mismo el acceso por accidente.
    //
    // Antes esto solo cubría el rechazo, así que aprobarse a uno mismo con otro
    // rol —"super_admin" cambiándose a "celador"— pasaba sin más y dejaba la
    // cuenta sin panel: para recuperarla había que entrar al SQL Editor de
    // Supabase. Perder el acceso de administración no puede depender de haberle
    // dado a la casilla equivocada.
    if (data.userId === session.userId) {
      if (!data.aprobar) {
        return { ok: false, error: "No puedes desactivar tu propia cuenta" };
      }
      if (data.role !== "super_admin") {
        return {
          ok: false,
          error: "No puedes cambiarte el rol a ti mismo. Pídeselo al otro administrador.",
        };
      }
    }
    const { createClient } = await import("@supabase/supabase-js");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { ok: false, error: "Supabase not configured" };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });
    const { error } = await supabase
      .from("profiles")
      .update({ aprobado: data.aprobar, role: data.role })
      .eq("id", data.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
