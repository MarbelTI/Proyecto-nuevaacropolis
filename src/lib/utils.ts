import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Un UUID v4, funcione o no `crypto.randomUUID`.
 *
 * `randomUUID` solo existe en contexto seguro: HTTPS o localhost. Sirviendo la
 * aplicación por IP en la red local del centro —que es lo que hace
 * INICIAR-SISFIA.bat cuando alguien entra desde otro equipo— no está, y el
 * respaldo que había antes generaba cosas como "lz8k3f9x". Las columnas `id`
 * de Supabase son de tipo uuid, así que al subir fallaba **el lote entero**,
 * no la fila mala, con un error que no decía nada de esto.
 *
 * `getRandomValues` sí existe siempre, así que se arma el uuid a mano.
 */
export function nuevoId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // versión 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Guarda en localStorage y AVISA si no cabe.
 *
 * El navegador da unos 5 MB por sitio, y aquí se alcanzan: las asistencias
 * reescriben el array entero en cada marca. Antes el fallo se tragaba con un
 * `catch {}`, así que la pantalla seguía mostrando el dato como si estuviera
 * guardado; se cerraba la pestaña y el trabajo no estaba. Un error de escritura
 * no puede ser silencioso.
 */
export function guardarLocal<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    import("sonner").then(({ toast }) =>
      toast.error("No se pudo guardar en este equipo: ya no cabe más. Sube a la nube y recarga.", {
        duration: 10000,
      }),
    );
  }
}
