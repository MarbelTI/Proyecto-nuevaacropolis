import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type UserRole =
  "super_admin" | "finanzas" | "director" | "celador" | "celador_estudios" | "unknown";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
};

// Mapa de emails → rol (mismo que el trigger de la BD)
const EMAIL_ROLES: Record<string, UserRole> = {
  "margelys.invermapa@gmail.com": "super_admin",
  "tecnologiasnuevaacropolissc@gmail.com": "super_admin",
  "manuelajesusa2018@gmail.com": "finanzas",
  "rgr486@gmail.com": "director",
  "kairobeor08@gmail.com": "celador",
  "aliciachacongarcia94@gmail.com": "celador",
  "ajjm.1996@gmail.com": "celador",
  "cejc.fundazoo@gmail.com": "celador_estudios",
  "ekarinarodriguez@gmail.com": "celador_estudios",
};

function getRole(email: string): UserRole {
  return EMAIL_ROLES[email.toLowerCase()] ?? "unknown";
}

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

// Crea/actualiza el perfil en Supabase y devuelve datos del usuario
export const authCallback = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      email: z.string().email(),
      full_name: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      // Sin conexión Supabase: devolver rol basado en email nomás
      const role = getRole(data.email);
      return {
        ok: true,
        profile: { id: data.id, email: data.email, full_name: data.full_name, role },
        perms: getPermsForRole(role),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert profile
    const role = getRole(data.email);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: data.id,
        email: data.email.toLowerCase(),
        full_name: data.full_name,
        role,
      },
      { onConflict: "id" },
    );

    if (error) {
      // Si profiles no existe (migración no ejecutada), igual devolvemos datos
      return {
        ok: true,
        profile: { id: data.id, email: data.email, full_name: data.full_name, role },
        perms: getPermsForRole(role),
      };
    }

    return {
      ok: true,
      profile: { id: data.id, email: data.email, full_name: data.full_name, role },
      perms: getPermsForRole(role),
    };
  });
