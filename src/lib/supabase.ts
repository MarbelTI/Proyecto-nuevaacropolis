import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * ¿Es una clave SECRETA (la que salta todos los permisos)?
 *
 * Supabase tiene dos claves y se parecen lo bastante como para confundirlas:
 *   - publishable / anon → puede ir al navegador, respeta las políticas RLS
 *   - secret / service_role → salta TODAS las políticas
 *
 * Todo lo que empieza por VITE_ se incrusta en el JavaScript que descarga
 * cualquiera que abra la página. Una clave secreta ahí es acceso total a la
 * base de datos para quien mire el código fuente: leer y borrar transacciones,
 * datos personales de los alumnos, todo.
 *
 * Ya pasó una vez. Esta comprobación existe para que no vuelva a pasar en
 * silencio.
 */
function esClaveSecreta(key: string): boolean {
  // Formato nuevo: sb_secret_… / sb_publishable_…
  if (key.startsWith("sb_secret_")) return true;

  // Formato antiguo: un JWT cuyo payload lleva "role":"service_role".
  const partes = key.split(".");
  if (partes.length === 3) {
    try {
      const payload = JSON.parse(atob(partes[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.role === "service_role") return true;
    } catch {
      /* si no se puede leer, se deja pasar: no es motivo para bloquear */
    }
  }
  return false;
}

function revisarConfiguracion(): string | null {
  if (!supabaseUrl) {
    return "Falta la dirección de Supabase (VITE_SUPABASE_URL).";
  }
  if (!supabaseAnonKey) {
    return "Falta la clave de Supabase (VITE_SUPABASE_ANON_KEY).";
  }
  if (esClaveSecreta(supabaseAnonKey)) {
    return (
      "La clave configurada en VITE_SUPABASE_ANON_KEY es la clave SECRETA de " +
      "Supabase, y esa nunca puede ir al navegador: quedaría a la vista de " +
      "cualquiera que abra la página, con acceso total a la base de datos. " +
      "Hay que revocarla en Supabase y poner en su lugar la clave publishable " +
      "(sb_publishable_…) o la anon public."
    );
  }
  return null;
}

/**
 * Si la configuración está mal, esto trae el motivo en español. La pantalla de
 * acceso lo muestra en vez del formulario: sin esto, el usuario solo veía
 * «Invalid Key» o «Failed to fetch», que no dicen qué arreglar ni dónde.
 */
export const configError: string | null = revisarConfiguracion();

if (configError && typeof console !== "undefined") {
  console.error("[Configuración] " + configError);
}

/**
 * Cuando hay una clave secreta puesta por error, NO se usa: se arranca con una
 * clave inservible a propósito. Es preferible una aplicación que no funciona y
 * dice por qué, a una que funciona repartiendo acceso de administrador.
 *
 * La dirección de reserva solo existe para que createClient no reviente y la
 * página pueda pintar el mensaje de arriba.
 */
export const supabase = createClient(
  supabaseUrl || "https://sin-configurar.supabase.co",
  configError ? "configuracion-invalida" : supabaseAnonKey,
);
