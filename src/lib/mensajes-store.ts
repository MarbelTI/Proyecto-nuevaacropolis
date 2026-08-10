import { useEffect, useState } from "react";
import { guardarLocal } from "./utils";

/**
 * Plantillas de los mensajes de WhatsApp.
 *
 * POR QUÉ ESTÁ PARTIDO EN TRES
 *
 * Un mensaje se arma siempre así:
 *
 *     saludo   +   concepto   +   cierre
 *
 * El CONCEPTO lo genera el sistema y no se puede editar: es el dato duro
 * —cuánto pagó, cuántos meses debe, de qué mes—. Si se dejara escribir a
 * mano, cualquiera podría mandar una cifra equivocada, o borrarla sin darse
 * cuenta y dejar el mensaje sin decir nada.
 *
 * El SALUDO y el CIERRE sí son editables. Ahí está el tono, que es lo que se
 * pidió cambiar: los textos anteriores sonaban duros.
 *
 * Así se puede suavizar todo lo que haga falta sin riesgo de romper la parte
 * que tiene que ser exacta.
 */
export type Plantilla = {
  /** Va antes del concepto. Admite {nombre}. */
  saludo: string;
  /** Va después del concepto. Admite {nombre}. */
  cierre: string;
};

export type Plantillas = {
  /** Se recibió un pago. */
  pago: Plantilla;
  /** Tiene meses pendientes. */
  deuda: Plantilla;
  /** Está al día. */
  alDia: Plantilla;
  /** Recordatorio de pago por clase. */
  clase: Plantilla;
};

/**
 * Textos por defecto. Deliberadamente suaves: se pidió expresamente que los
 * anteriores eran demasiado duros. El de deuda ya no habla de "mantener
 * activo tu acceso" ni de "no interrumpir tu aprendizaje" — eso se leía como
 * una amenaza aunque no fuera la intención.
 */
export const PLANTILLAS_POR_DEFECTO: Plantillas = {
  pago: {
    saludo: "¡Hola, {nombre}! Gracias, ya recibimos tu aporte.",
    cierre: "Un abrazo de parte de todos en Nueva Acrópolis.",
  },
  deuda: {
    saludo: "¡Hola, {nombre}! Esperamos que estés muy bien.",
    cierre:
      "Cuando puedas, nos ayudas poniéndote al día. Si en este momento no te " +
      "resulta fácil, escríbenos con confianza y lo conversamos.",
  },
  alDia: {
    saludo: "¡Hola, {nombre}!",
    cierre: "Gracias por acompañarnos. ¡Nos vemos en clase!",
  },
  clase: {
    saludo: "¡Hola, {nombre}!",
    cierre: "Te esperamos, va a estar muy linda.",
  },
};

const K_MENSAJES = "lector_ocr_plantillas_mensajes_v1";

function completar(guardado: Partial<Plantillas> | null): Plantillas {
  // Se rellena con los valores por defecto para que una plantilla añadida más
  // adelante no deje el mensaje vacío en quien ya tenía la configuración vieja.
  const base = PLANTILLAS_POR_DEFECTO;
  if (!guardado) return base;
  const unir = (k: keyof Plantillas): Plantilla => ({
    saludo: guardado[k]?.saludo ?? base[k].saludo,
    cierre: guardado[k]?.cierre ?? base[k].cierre,
  });
  return { pago: unir("pago"), deuda: unir("deuda"), alDia: unir("alDia"), clase: unir("clase") };
}

export function usePlantillas(): [Plantillas, (next: Plantillas) => void] {
  const [plantillas, setPlantillas] = useState<Plantillas>(PLANTILLAS_POR_DEFECTO);

  // Se lee tras el primer render: en el servidor no hay localStorage, y leerlo
  // durante el render haría que lo pintado en el servidor y en el navegador no
  // coincidan.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(K_MENSAJES);
      setPlantillas(completar(raw ? JSON.parse(raw) : null));
    } catch {
      setPlantillas(PLANTILLAS_POR_DEFECTO);
    }
  }, []);

  const guardar = (next: Plantillas) => {
    setPlantillas(next);
    guardarLocal(K_MENSAJES, next);
  };

  return [plantillas, guardar];
}

/** Lectura suelta, para donde no conviene un hook. */
export function leerPlantillas(): Plantillas {
  if (typeof window === "undefined") return PLANTILLAS_POR_DEFECTO;
  try {
    const raw = localStorage.getItem(K_MENSAJES);
    return completar(raw ? JSON.parse(raw) : null);
  } catch {
    return PLANTILLAS_POR_DEFECTO;
  }
}

/**
 * Arma el mensaje final. `concepto` lo genera quien llama y es la parte que no
 * se puede editar desde la pantalla de Settings.
 */
export function armarMensaje(p: Plantilla, nombre: string, concepto: string): string {
  const primerNombre = (nombre || "").trim().split(/\s+/)[0] || nombre;
  const saludo = p.saludo.replace(/\{nombre\}/g, primerNombre).trim();
  const cierre = p.cierre.replace(/\{nombre\}/g, primerNombre).trim();
  return [saludo, concepto.trim(), cierre].filter(Boolean).join(" ");
}
