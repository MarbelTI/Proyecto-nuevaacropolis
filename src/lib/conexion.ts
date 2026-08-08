import { useEffect, useState } from "react";

/**
 * ¿Hay conexión a internet?
 *
 * ── Por qué esto importa aquí más que en otras aplicaciones ──
 *
 * Los datos viven en el navegador (localStorage) y suben a Supabase solo
 * cuando alguien pulsa «Subir a nube». No hay guardado automático.
 *
 * Eso significa que, sin internet, una persona puede pasar media hora
 * marcando asistencia o cargando transacciones y ese trabajo no llega a
 * ninguna parte: se queda en SU navegador, y quien sincroniza desde otro
 * equipo lo sobrescribe sin enterarse de que existía.
 *
 * Por eso, sin conexión la aplicación pasa a solo lectura. Es preferible
 * impedir el trabajo a dejar que se haga y se pierda: consultar sigue
 * funcionando —finanzas, solvencias, asistencias, todo se puede mirar—, pero
 * no se crea ni se modifica nada.
 *
 * ── Lo que esto NO resuelve ──
 *
 * Tener internet no significa estar guardado. Los datos siguen en el
 * navegador hasta que alguien pulsa «Subir a nube». Este hook solo evita el
 * caso peor; el de "tengo internet pero nunca subí" sigue abierto.
 */
export function useEstaEnLinea(): boolean {
  // Se arranca asumiendo que sí hay conexión: en el servidor no existe
  // `navigator`, y empezar en "sin internet" haría parpadear el aviso en cada
  // carga aunque la conexión esté perfecta.
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setEnLinea(navigator.onLine);

    const conectado = () => setEnLinea(true);
    const desconectado = () => setEnLinea(false);
    window.addEventListener("online", conectado);
    window.addEventListener("offline", desconectado);
    return () => {
      window.removeEventListener("online", conectado);
      window.removeEventListener("offline", desconectado);
    };
  }, []);

  return enLinea;
}
