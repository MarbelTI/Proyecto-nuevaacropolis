/**
 * A qué grupo pertenece cada categoría de movimiento.
 *
 * Existe porque la misma pregunta —"¿esto es cuota, es un préstamo, o es otra
 * cosa?"— se hacía por separado en Solvencias, en Préstamos y en la ficha del
 * participante, cada una con su propia lista escrita a mano. Tres listas que
 * había que acordarse de actualizar a la vez.
 */

/**
 * Cuota social: lo que se paga por pertenecer a la escuela.
 *
 * Es lo único que determina si alguien está solvente. Un campamento pagado no
 * pone a nadie al día con su mensualidad.
 */
export const CAT_CUOTA = ["MIEMBROS", "PROBAS", "CLASE"];

/** Préstamos: el capital que sale y el que la persona va devolviendo. */
export const CAT_PRESTAMO = ["PRESTAMO", "PRÉSTAMOS, PROFESOR"];

/** Intereses de préstamo. Van aparte porque no bajan la deuda: son ingreso. */
export const CAT_INTERES_PRESTAMO = ["INTERESES PTAMO"];

/**
 * Servicios que la escuela ofrece y que alguien ADMINISTRA.
 *
 * Aquí está la distinción que importa en la ficha de una persona: en estas
 * categorías el nombre que aparece en la descripción suele ser el de quien
 * cobra, no el de quien paga. La asistente que recauda las consultas de
 * terapia aparecería con decenas de movimientos que no son suyos, y su ficha
 * diría cualquier cosa menos cómo está ella con la escuela.
 *
 * Por eso no entran en la ficha del participante. Sí siguen contando, como
 * siempre, en las transacciones y en los informes: lo que cambia es a quién se
 * le atribuyen, no si existen.
 */
export const CAT_SERVICIOS = [
  "MITOLOGIA",
  "MTC",
  "TERAPIA MTC",
  "TERAPIAS MTC",
  "HERBOLARIA",
  "TAICHI",
];

/** Movimientos de ajuste entre monedas: no son un pago de nadie. */
export const CAT_TECNICAS = ["CONVERSIÓN"];

export type GrupoCategoria = "cuota" | "prestamo" | "servicio" | "actividad" | "tecnica";

/**
 * Clasifica una categoría. Lo que no encaja en ningún grupo conocido cae en
 * "actividad": campamentos, cenas, rifas, venta de libros. Es deliberado que
 * ese sea el cajón por defecto — una categoría nueva aparece en la ficha en vez
 * de desaparecer sin que nadie se entere.
 */
export function grupoDeCategoria(categoria: string): GrupoCategoria {
  if (CAT_CUOTA.includes(categoria)) return "cuota";
  if (CAT_PRESTAMO.includes(categoria) || CAT_INTERES_PRESTAMO.includes(categoria))
    return "prestamo";
  if (CAT_SERVICIOS.includes(categoria)) return "servicio";
  if (CAT_TECNICAS.includes(categoria)) return "tecnica";
  return "actividad";
}
