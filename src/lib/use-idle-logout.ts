import { useEffect, useRef, useState } from "react";

/**
 * Cierra la sesión tras un rato sin actividad.
 *
 * Pensado para la PC compartida de la escuela: una sesión de finanzas
 * abierta y desatendida es el riesgo real, no que alguien se quede
 * trabajando mucho rato. Por eso solo cuenta el tiempo INACTIVO — mientras
 * haya movimiento de ratón, teclado o toques, el contador se reinicia.
 *
 * Un minuto antes de cerrar avisa, para no interrumpir a alguien que solo
 * estaba leyendo la pantalla.
 *
 * @param minutos    Minutos de inactividad permitidos (0 = desactivado).
 * @param onTimeout  Qué hacer al agotarse (normalmente cerrar sesión).
 */
export function useIdleLogout(minutos: number, onTimeout: () => void) {
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const ultimaActividad = useRef(Date.now());
  // En una ref para que el intervalo siempre llame a la versión actual sin
  // tener que recrearse en cada render.
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!minutos || minutos <= 0 || typeof window === "undefined") return;

    const limiteMs = minutos * 60_000;
    const avisoMs = Math.min(60_000, limiteMs / 2);

    const registrarActividad = () => {
      ultimaActividad.current = Date.now();
      setSegundosRestantes((prev) => (prev == null ? prev : null));
    };

    const eventos = ["mousedown", "keydown", "touchstart", "wheel", "focus"] as const;
    for (const ev of eventos) {
      window.addEventListener(ev, registrarActividad, { passive: true });
    }

    const intervalo = window.setInterval(() => {
      const inactivo = Date.now() - ultimaActividad.current;
      const restante = limiteMs - inactivo;
      if (restante <= 0) {
        setSegundosRestantes(null);
        onTimeoutRef.current();
      } else if (restante <= avisoMs) {
        setSegundosRestantes(Math.ceil(restante / 1000));
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalo);
      for (const ev of eventos) window.removeEventListener(ev, registrarActividad);
    };
  }, [minutos]);

  /** Reinicia el contador (para el botón "sigo aquí"). */
  const seguirActivo = () => {
    ultimaActividad.current = Date.now();
    setSegundosRestantes(null);
  };

  return { segundosRestantes, seguirActivo };
}
