import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
