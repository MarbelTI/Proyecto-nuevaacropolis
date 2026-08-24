/**
 * A qué grupo pertenece cada categoría de movimiento, y qué categoría de cuota
 * le corresponde a cada aula.
 *
 * Existe porque la misma pregunta —"¿esto es cuota, es un préstamo, o es otra
 * cosa?"— se hacía por separado en Solvencias, en Préstamos y en la ficha del
 * participante, cada una con su propia lista escrita a mano. Tres listas que
 * había que acordarse de actualizar a la vez.
 */
import { CATEGORIAS_GASTO, CATEGORIAS_INGRESO } from "./students-data";

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

// ---------------------------------------------------------------------------
// Aula → categoría de cuota
//
// Antes esta regla existía en un solo sitio: como texto suelto dentro del
// prompt del lector (`ocr.functions.ts`). Eso tenía dos problemas:
//
// 1. Cada aula nueva había que acordarse de añadirla al prompt a mano. Ya pasó:
//    faltaban "Krishna IV" y "Arjuna II 2026", y los pagos de esas dos aulas
//    volvían con la categoría equivocada sin que nada avisara.
// 2. Nada comprobaba la respuesta. El modelo es probabilístico: puede leer bien
//    el nombre y aun así devolver la categoría que no toca, y esa fila entra a
//    la contabilidad como si fuera correcta.
//
// Ahora la regla vive aquí, el prompt se construye a partir de ella (así no
// pueden discrepar) y la respuesta se contrasta contra el padrón antes de
// convertirse en un asiento.
// ---------------------------------------------------------------------------

export type CategoriaCuota = "PROBAS" | "MIEMBROS" | "CLASE";

/** Quita tildes para poder comparar "Krishná" con "krishna". */
function sinTildes(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function clave(s: string): string {
  return sinTildes(s).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Se empareja por la FAMILIA del aula (la palabra "arjuna" o "krishna"), no por
 * el nombre completo.
 *
 * Es a propósito y por dos motivos. El primero, que un aula nueva —"Krishna
 * VII", "Arjuna III"— queda cubierta sin tocar este archivo, que es justo lo que
 * falló antes. El segundo, que hace imposible repetir el fallo 1.6: aquel venía
 * de comparar con `includes("Arjuna I")`, y "Arjuna II" contiene esa cadena. Al
 * buscar la palabra suelta con `\b`, "arjuna ii" y "arjuna i" son ambos de la
 * familia arjuna y da igual cuál se evalúe primero — no hay orden que romper.
 */
export function categoriaDeAula(aula: string): CategoriaCuota | "" {
  const k = clave(aula);
  if (!k) return "";
  // Táriba es otra sede, no un aula de San Cristóbal: no tiene cuota propia aquí.
  if (/\btariba\b/.test(k)) return "";
  if (/\barjuna\b/.test(k)) return "PROBAS";
  if (/\bkrishna\b/.test(k)) return "MIEMBROS";
  return "";
}

/**
 * Categoría de una persona a partir de todas sus aulas.
 *
 * Si está en aulas de familias distintas se devuelve "" en vez de elegir una:
 * es un dato contradictorio y adivinar aquí significa cobrarle a alguien la
 * cuota que no le toca. Mejor que salga en blanco y se vea.
 */
export function categoriaDeAulas(aulas: readonly string[]): CategoriaCuota | "" {
  const encontradas = new Set<CategoriaCuota>();
  for (const a of aulas) {
    const c = categoriaDeAula(a);
    if (c) encontradas.add(c);
  }
  return encontradas.size === 1 ? [...encontradas][0]! : "";
}

/**
 * Devuelve la categoría del vocabulario oficial que corresponde al texto dado,
 * o "" si no es ninguna. Compara sin tildes ni mayúsculas porque el modelo
 * devuelve "Miembros", "MIEMBROS" y "miembros" indistintamente.
 */
export function normalizarCategoria(
  categoria: string,
  tipo: "Ingreso" | "Gasto" | "",
): string {
  const k = clave(categoria);
  if (!k) return "";
  const vocabulario =
    tipo === "Gasto"
      ? CATEGORIAS_GASTO
      : tipo === "Ingreso"
        ? CATEGORIAS_INGRESO
        : [...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO];
  return vocabulario.find((c) => clave(c) === k) ?? "";
}

/** Texto de la regla para el prompt del OCR, generado desde el propio código. */
export function reglasDeCategoriaParaPrompt(aulas: readonly string[]): string {
  const probas = aulas.filter((a) => categoriaDeAula(a) === "PROBAS");
  const miembros = aulas.filter((a) => categoriaDeAula(a) === "MIEMBROS");
  const lineas: string[] = [];
  if (probas.length)
    lineas.push(`- Alumnos de aulas ${probas.map((a) => `"${a}"`).join(", ")} → categoría "PROBAS"`);
  if (miembros.length)
    lineas.push(
      `- Alumnos de aulas ${miembros.map((a) => `"${a}"`).join(", ")} → categoría "MIEMBROS"`,
    );
  return lineas.join("\n");
}

type AlumnoConAulas = { nombre: string; aulas: string[] };

/**
 * Corrige la categoría de cuota que devolvió el modelo usando el padrón.
 *
 * Solo interviene en el caso seguro: la categoría devuelta ES una cuota y la
 * persona aparece en el padrón con una familia de aula clara. Ahí el padrón
 * manda, porque es un dato que alguien escribió a mano y el modelo solo está
 * infiriendo.
 *
 * Lo que NO hace, a propósito:
 * - Si la persona no está en el padrón, deja lo que dijo el modelo. Inventar
 *   aquí sería peor que no tocar nada.
 * - Si la categoría no es de cuota (ALQUILER, MTC, PRESTAMO…) no la mira: el
 *   aula no dice nada sobre esas.
 * - No toca `CLASE`. Quien paga por clase no tiene aula que lo delate, así que
 *   el padrón no puede confirmarlo ni desmentirlo.
 *
 * Devuelve la categoría corregida y, si hubo cambio, el motivo, para poder
 * avisarlo en pantalla en vez de corregir a espaldas de quien revisa.
 */
export function corregirCategoriaConPadron(
  categoria: string,
  descripcion: string,
  alumnos: readonly AlumnoConAulas[],
): { categoria: string; corregido?: string } {
  const cat = categoria.trim().toUpperCase();
  if (cat !== "PROBAS" && cat !== "MIEMBROS") return { categoria };

  const desc = clave(descripcion);
  if (!desc) return { categoria };

  // El nombre va al principio de la descripción ("Karina Rodríguez c/s enero").
  // Se busca al alumno cuyo nombre aparezca ahí; gana el más largo, para que
  // "Ana María" no se resuelva como "Ana".
  let mejor: AlumnoConAulas | null = null;
  for (const a of alumnos) {
    const n = clave(a.nombre);
    if (!n || !desc.includes(n)) continue;
    if (!mejor || n.length > clave(mejor.nombre).length) mejor = a;
  }
  if (!mejor) return { categoria };

  const esperada = categoriaDeAulas(mejor.aulas);
  if (!esperada || esperada === cat || esperada === "CLASE") return { categoria };

  return {
    categoria: esperada,
    corregido: `El modelo dijo ${cat}; ${mejor.nombre} está en ${mejor.aulas.join(", ")}, que es ${esperada}.`,
  };
}
