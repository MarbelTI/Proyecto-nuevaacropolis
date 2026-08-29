import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthSession } from "./auth-guard";

/**
 * Anota una acción en `activity_log`, para que super_admin pueda ver quién
 * hizo qué y cuándo (a nivel de resumen, no de campo por campo).
 *
 * Nunca revienta la operación que la llamó: si el insert falla (RLS mal
 * puesta, la tabla todavía no existe porque la migración no se ha corrido,
 * un corte de red hacia el final de la función), se registra en consola y se
 * sigue — la sincronización real ya tuvo éxito antes de llegar aquí, y un
 * log perdido no vale una respuesta de error a quien solo quería subir sus
 * transacciones.
 */
export async function registrarActividad(
  supabase: SupabaseClient,
  session: AuthSession,
  accion: string,
  resumen: string,
): Promise<void> {
  try {
    const { error } = await supabase.from("activity_log").insert({
      actor_id: session.userId,
      actor_email: session.email,
      actor_role: session.role,
      accion,
      resumen,
    });
    if (error) console.error("[activity_log]", accion, error.message);
  } catch (e) {
    console.error("[activity_log]", accion, e);
  }
}
