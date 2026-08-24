import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { AULAS_DEFAULT, CATEGORIAS_GASTO, CATEGORIAS_INGRESO } from "./students-data";
import { corregirCategoriaConPadron, reglasDeCategoriaParaPrompt } from "./categorias";
import { getSessionUser, canManageFinanzas } from "./api/auth-guard";

// ~8MB en base64 (≈6MB de imagen real) — suficiente para una foto de celular,
// evita payloads absurdos que disparen el costo/latencia de la IA sin motivo.
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const Input = z.object({
  imageBase64: z.string().min(1).max(MAX_BASE64_LENGTH),
  mimeType: z.string().default("image/jpeg"),
  ingresos: z.array(z.string()).optional(),
  gastos: z.array(z.string()).optional(),
  students: z.array(z.object({ nombre: z.string(), aulas: z.array(z.string()) })).optional(),
  accessToken: z.string().optional(),
});

export type Entry = {
  fecha: string;
  mes: string;
  tipo: "Ingreso" | "Gasto" | "";
  categoria: string;
  descripcion: string;
  mensualidad: string;
  moneda: "USD" | "Bolívares" | "Pesos" | "";
  monto: string;
  tasa: string;
  montoUsd: string;
  /**
   * Presente solo cuando la categoría que devolvió el modelo se corrigió contra
   * el padrón. Lo pinta la pestaña del lector para que la corrección sea
   * visible: una categoría cambiada en silencio es indistinguible de una que el
   * modelo acertó.
   */
  avisoCategoria?: string;
};

function coerceEntries(raw: unknown): Entry[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { entries?: unknown })?.entries)
      ? (raw as { entries: unknown[] }).entries
      : [];
  return arr.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const s = (v: unknown) => (v == null ? "" : String(v));
    const tipoRaw = s(o.tipo ?? o.type).toLowerCase();
    const tipo: Entry["tipo"] = tipoRaw.startsWith("ing")
      ? "Ingreso"
      : tipoRaw.startsWith("gas")
        ? "Gasto"
        : "";
    const monedaRaw = s(o.moneda ?? o.currency).toLowerCase();
    let moneda: Entry["moneda"] = "";
    if (monedaRaw.includes("usd") || monedaRaw.includes("dol")) moneda = "USD";
    else if (monedaRaw.includes("bol")) moneda = "Bolívares";
    else if (monedaRaw.includes("peso")) moneda = "Pesos";
    return {
      fecha: s(o.fecha ?? o.date),
      mes: s(o.mes ?? o.month),
      tipo,
      categoria: s(o.categoria ?? o.category),
      descripcion: s(o.descripcion ?? o.description ?? o.concepto),
      mensualidad: s(o.mensualidad ?? o.mes_mensualidad ?? o.periodo),
      moneda,
      monto: s(o.monto ?? o.amount),
      tasa: s(o.tasa ?? o.tasa_cambio ?? o.rate),
      montoUsd: s(o.monto_usd ?? o.montoUsd ?? o.usd ?? o.equivalente_usd),
    };
  });
}

/** Quita tildes para poder comparar "García" con "garcia" sin falsos negativos. */
function sinTildes(s: string): string {
  // \p{Diacritic} en vez del rango de caracteres combinantes escrito a mano:
  // esos caracteres son invisibles en el editor y cualquiera podría romperlos
  // sin darse cuenta.
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Categorías cuyo movimiento pertenece a una persona concreta.
 *
 * Se compara por contenido y no contra la lista exacta porque el modelo devuelve
 * variantes ("PRESTAMOS", "Préstamos, profesor") y con una comparación estricta
 * la fila se escaparía de la normalización justo cuando más falta hace.
 */
function esCategoriaPrestamo(categoria: string): boolean {
  const c = sinTildes(categoria).toLowerCase();
  return c.includes("prestamo") || c.includes("ptamo");
}

/** Palabra suelta con la posición donde termina dentro del texto original. */
type Palabra = { texto: string; fin: number };

function palabrasDe(texto: string): Palabra[] {
  const out: Palabra[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) out.push({ texto: m[0], fin: m.index + m[0].length });
  return out;
}

/** Clave de comparación: sin tildes, sin mayúsculas y sin la puntuación pegada. */
function claveDePalabra(p: string): string {
  return sinTildes(p)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Red de seguridad para la descripción de los préstamos.
 *
 * El prompt ya pide "Nombre Apellido: resto del concepto", pero el modelo se lo
 * salta a menudo y devuelve "Ricardo García abono 10%" sin los dos puntos. La
 * pestaña de Préstamos agrupa por lo que va ANTES de los dos puntos, así que sin
 * ellos el movimiento puede quedarse sin dueño. Por eso no basta con el prompt:
 * el modelo es probabilístico y esta parte tiene que salir bien siempre.
 *
 * Solo se repara el caso seguro: la descripción empieza por un nombre de la lista
 * oficial de integrantes. Se colocan los dos puntos y se conserva intacto todo lo
 * que venía detrás, que es de donde salen la tasa de interés ("abono 10%") y el
 * detalle del movimiento. El nombre se sustituye por el de la lista para que las
 * tildes y el uso de mayúsculas no partan a la misma persona en dos grupos.
 *
 * Lo que NO hace, a propósito: adivinar. Si la descripción no empieza por un
 * nombre conocido se deja tal cual, porque un préstamo sin asignar es preferible
 * a uno asignado a la persona equivocada.
 */
function normalizarDescripcionPrestamo(descripcion: string, nombres: string[]): string {
  const desc = descripcion.trim();
  // Ya trae el patrón acordado: no se toca, para no estropear lo que el modelo
  // sí hizo bien.
  if (!desc || desc.includes(":")) return desc;

  const palabras = palabrasDe(desc);
  if (!palabras.length) return desc;

  // El nombre más largo primero: si la lista tiene "Ricardo" y "Ricardo García"
  // como personas distintas, gana el más específico.
  const candidatos = [...nombres].sort((a, b) => b.length - a.length);

  for (const nombre of candidatos) {
    const partes = palabrasDe(nombre)
      .map((p) => claveDePalabra(p.texto))
      .filter(Boolean);
    // Tiene que sobrar texto después del nombre: si la descripción es solo el
    // nombre no hay concepto que separar y añadir los dos puntos no aporta nada.
    if (!partes.length || partes.length >= palabras.length) continue;

    const coincide = partes.every((parte, i) => {
      const p = palabras[i];
      return !!p && claveDePalabra(p.texto) === parte;
    });
    if (!coincide) continue;

    const ultima = palabras[partes.length - 1];
    if (!ultima) continue;
    const resto = desc
      .slice(ultima.fin)
      // A veces el modelo separa con guion o coma en vez de dos puntos; ese
      // separador sobra porque los dos puntos los ponemos nosotros.
      .replace(/^[\s:,;.\-–—]+/, "")
      .trim();
    if (!resto) return desc;
    return `${nombre}: ${resto}`;
  }

  return desc;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  try {
    return JSON.parse(candidate);
  } catch {
    const m = candidate.match(/[[{][\s\S]*[\]}]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

type ProveedorIA = {
  proveedor: string;
  modelId: string;
  provider: ReturnType<typeof createOpenAICompatible>;
};

/**
 * Los proveedores de IA con clave configurada, EN ORDEN DE PREFERENCIA.
 *
 * - GOOGLE_API_KEY → Gemini directo (aistudio.google.com), con capa gratuita.
 *
 * **Hoy la lista tiene un solo proveedor, y es a propósito.** La escuela lleva
 * este sistema sin presupuesto, así que solo entran servicios con nivel
 * gratuito. Hubo un respaldo por OpenRouter y se retiró el 13-ago-2026 al
 * confirmarse que es de pago: la clave estaba revocada, cada intento devolvía un
 * 401 y lo único que aportaba era un segundo mensaje de error detrás del de
 * Google.
 *
 * Se mantiene como LISTA, y no como un único proveedor, porque el precio de
 * conservarla es un `for` y el de deshacerla sería reescribir el bucle de
 * llamada. Cuando aparezca otro servicio con capa gratuita, se añade aquí y el
 * respaldo funciona solo.
 *
 * Consecuencia que conviene tener presente: sin segundo proveedor, un día que
 * Gemini esté saturado o se agote la cuota diaria, el lector no tiene a dónde ir.
 * Toca esperar. La alternativa costaba dinero.
 *
 * Nota histórica: antes se hacía `OPENROUTER_API_KEY || ANTHROPIC_API_KEY` pero
 * ambas se mandaban al endpoint de OpenRouter, así que una clave de Anthropic
 * siempre fallaba con un 401 confuso. Cada clave iba a su propio endpoint.
 */
function proveedoresDisponibles(): ProveedorIA[] {
  const disponibles: ProveedorIA[] = [];

  const googleKey = process.env.GOOGLE_API_KEY?.trim();
  if (googleKey) {
    disponibles.push({
      proveedor: "Google AI Studio",
      // "gemini-flash-latest" (alias al Flash vigente) en vez de fijar
      // "gemini-2.0-flash": las versiones numeradas tienen la cuota gratuita
      // en 0 para proyectos nuevos, mientras que el alias sí resuelve a un
      // modelo con capa gratuita disponible. Se puede sobreescribir con
      // GEMINI_MODEL si algún día conviene fijar otra versión.
      modelId: process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest",
      provider: createOpenAICompatible({
        name: "google",
        // Endpoint compatible con OpenAI que expone la API de Gemini.
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        headers: { Authorization: `Bearer ${googleKey}` },
      }),
    });
  }

  if (!disponibles.length) {
    throw new Error(
      "No hay clave de IA configurada. Consigue una gratis en aistudio.google.com/app/apikey " +
        "y guárdala como GOOGLE_API_KEY (en el archivo .env para desarrollo local, " +
        "o en Vercel → Settings → Environment Variables para producción).",
    );
  }

  return disponibles;
}

/** Traduce los errores del proveedor a algo accionable para quien usa la app. */
function mensajeDeError(err: unknown, proveedor: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/401|unauthorized|user not found|api key not valid|invalid api key/i.test(raw)) {
    return `La clave de ${proveedor} no es válida o fue revocada. Genera una nueva y actualízala en las variables de entorno.`;
  }
  if (/429|rate limit|too many requests|quota|resource_exhausted/i.test(raw)) {
    // "limit: 0" significa que ese modelo NO tiene capa gratuita en el
    // proyecto, no que se haya consumido: son dos problemas distintos.
    if (/limit:\s*0\b/i.test(raw)) {
      return (
        `El modelo configurado no tiene cuota gratuita en tu proyecto de ${proveedor}. ` +
        `Cambia de modelo (variable GEMINI_MODEL) o habilita facturación en el proyecto.`
      );
    }
    // Google dice en la respuesta CUÁL de sus límites se topó: el `quotaId` trae
    // "PerDay" o "PerMinute". Distinguirlos es lo único que separa "espera medio
    // minuto" de "vuelve mañana", y confundirlos sale caro en tiempo: reintentar
    // contra la cuota diaria son dos minutos de espera para acabar fallando igual.
    if (/perday|per day|daily/i.test(raw)) {
      return (
        `Se agotó la cuota DIARIA de ${proveedor}. No se arregla esperando un rato: ` +
        `se renueva al día siguiente. Deja la carga para mañana.`
      );
    }
    return (
      `Se alcanzó el límite de peticiones POR MINUTO de ${proveedor}. ` +
      `Se reintenta solo en unos segundos.`
    );
  }
  if (/402|payment|credit|insufficient/i.test(raw)) {
    return `La cuenta de ${proveedor} no tiene crédito suficiente.`;
  }
  return `Error del servicio de IA (${proveedor}): ${raw}`;
}

export const analyzeJournalImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    // Solo usuarios con permiso de finanzas pueden consumir la API de IA (evita
    // que cualquier rol, ej. celador, queme la API key con llamadas no autorizadas).
    const session = await getSessionUser(data.accessToken);
    if (!session || !canManageFinanzas(session.role)) {
      throw new Error("No autorizado — necesitas permiso de finanzas para usar el OCR");
    }

    if (!ALLOWED_MIME_TYPES.includes(data.mimeType)) {
      throw new Error("Tipo de imagen no soportado");
    }

    const proveedores = proveedoresDisponibles();

    const ingresos = data.ingresos?.length ? data.ingresos : [...CATEGORIAS_INGRESO];
    const gastos = data.gastos?.length ? data.gastos : [...CATEGORIAS_GASTO];
    // Sin lista de alumnos el modelo no tiene contra qué contrastar la letra
    // manuscrita y transcribe lo que le parece. Antes el prompt se quedaba con
    // el encabezado y un hueco en blanco, así que el modelo actuaba como si la
    // lista existiera y devolvía nombres inventados con total seguridad. Si no
    // hay lista, se le dice, y se le pide que copie literalmente.
    // La regla aula → categoría se redacta desde `categorias.ts`, que es la
    // misma función que después valida la respuesta. Escrita a mano aquí se
    // quedó desactualizada dos veces (faltaban "Krishna IV" y "Arjuna II 2026",
    // y los pagos de esas aulas volvían mal clasificados). Las aulas salen del
    // padrón que se está usando; si no hay padrón, de la lista por defecto.
    const aulasEnUso = [...new Set((data.students ?? []).flatMap((s) => s.aulas))].sort();
    const reglasDeCategoria = reglasDeCategoriaParaPrompt(
      aulasEnUso.length ? aulasEnUso : [...AULAS_DEFAULT],
    );

    const hayLista = !!data.students?.length;
    const bloqueAlumnos = hayLista
      ? `LISTA OFICIAL DE ALUMNOS (úsala para corregir nombres mal escritos):
${data.students!.map((s) => `- ${s.nombre} → ${s.aulas.join(", ")}`).join("\n")}`
      : `NO HAY LISTA DE ALUMNOS DISPONIBLE en esta ejecución.
No inventes ni "corrijas" nombres hacia otros que te suenen: copia lo que veas
escrito, letra por letra. Si un nombre es ilegible, escribe lo que alcances a
leer y no lo completes de tu cuenta.`;

    const systemPrompt = `Eres un experto contable leyendo libros diarios manuscritos en español del centro "Filosofía Café".

${bloqueAlumnos}

REGLAS DE CATEGORÍA:
${reglasDeCategoria}
- Otras categorías de INGRESO posibles: ${ingresos.join(", ")}
- Categorías de GASTO típicas: ${gastos.join(", ")}

PRÉSTAMOS — REGLA DEL NOMBRE (LA MÁS IMPORTANTE DE TODO ESTE PROMPT):
Si la categoría es "PRESTAMO", "PRÉSTAMOS, PROFESOR" o "INTERESES PTAMO", la
descripción SIEMPRE tiene esta forma exacta:

    Nombre Apellido: <el resto del concepto tal como está escrito en la hoja>

Lo ÚNICO que añades son los dos puntos detrás del nombre. Todo lo que la
administradora escribió después del nombre se copia IGUAL: no resumas, no
acortes, no traduzcas y no borres nada (ni "abono", ni "se le presta", ni los
porcentajes, ni los números). De ese texto se sacan después la tasa de interés
y el detalle del movimiento, así que si lo pierdes, se pierde información.

El nombre va corregido contra la LISTA OFICIAL DE ALUMNOS de arriba si aparece
ahí (con la ortografía y las tildes de la lista, aunque en la hoja esté mal
escrito).

EJEMPLOS — lo escrito en la hoja → la descripción que debes devolver:
- "Ricardo García abono 10%"      → "Ricardo García: abono 10%"
- "Ricardo Garcia se le presta"   → "Ricardo García: se le presta"
- "Maria Perez abono cuota 2"     → "María Pérez: abono cuota 2"
- "abono préstamo"                → "abono préstamo"   (no dice de quién es: SIN dos puntos)

EJEMPLOS DE LO QUE ESTÁ MAL (con la hoja diciendo "Ricardo García abono 10%"):
- "Ricardo García"        ← MAL: se perdió "abono 10%"
- "abono 10%"             ← MAL: se perdió el nombre
- "Ricardo García abono"  ← MAL: faltan los dos puntos y se perdió el "10%"
- "Ricardo García: abono" ← MAL: se perdió el "10%"

Si en la hoja no se distingue de quién es el préstamo, deja la descripción tal
cual SIN los dos puntos: es preferible que quede sin asignar a atribuírselo a
la persona equivocada. Nunca inventes un nombre que no esté en la hoja.

ESTRUCTURA DE LA HOJA (de izquierda a derecha):
1. Fecha (dd/mm o dd/mm/aaaa)
2. Descripción / concepto. Si después del nombre aparece "C/S abr-2026" o similar, ese "abr-2026" es la MENSUALIDAD (el mes que está pagando), NO va en descripción.
3. Columna de BOLÍVARES (a la izquierda, pegada a la fecha, suele venir entre < > o como primer monto)
4. Columna de PESOS (penúltima columna)
5. Columna de DÓLARES USD (última columna)

REGLAS CRÍTICAS — UNA MONEDA POR FILA:
Si una misma línea del libro tiene montos en DOS o TRES monedas distintas, DEBES devolver una entrada SEPARADA por cada moneda, repitiendo fecha/descripción/categoría/mensualidad pero cambiando moneda y monto.

CAMPOS A DEVOLVER POR ENTRADA:
- fecha: "dd/mm/aaaa"
- mes: nombre del mes en español ("Abril", "Mayo", etc.)
- tipo: "Ingreso" o "Gasto"
- categoria: una de las categorías listadas
- descripcion: nombre del alumno (corregido contra la lista) o concepto del movimiento. SIN la parte de "C/S xxx-yyyy".
  OBLIGATORIO en "PRESTAMO", "PRÉSTAMOS, PROFESOR" e "INTERESES PTAMO": va SIEMPRE como
  "Nombre Apellido: <resto del concepto completo>", conservando palabra por palabra lo que
  sigue al nombre en la hoja (ej. "Ricardo García: abono 10%"). Ver REGLA DEL NOMBRE arriba.
  Solo se deja sin dos puntos cuando la hoja no dice de quién es el préstamo.
- mensualidad: el periodo que se paga, ej "abr-2026", "mar-2026". Vacío si no aplica.
- moneda: "USD", "Bolívares" o "Pesos"
- monto: el monto en su moneda original, como número (usa punto decimal). Ej "12800.00", "20.00"
- tasa: tasa de cambio si aparece (vacío para USD)
- monto_usd: equivalente en USD si aparece, sino vacío

Devuelve SOLO JSON válido.`;

    const contenido = [
      {
        type: "text" as const,
        text:
          systemPrompt +
          `\n\nAnaliza esta hoja del libro diario manuscrito y devuelve SOLO JSON con esta forma EXACTA:
{"entries":[{"fecha":"","mes":"","tipo":"","categoria":"","descripcion":"","mensualidad":"","moneda":"","monto":"","tasa":"","monto_usd":""}]}

Recuerda: una fila con dos monedas → DOS entradas. Corrige nombres usando la lista oficial.
Recuerda: en "PRESTAMO", "PRÉSTAMOS, PROFESOR" e "INTERESES PTAMO" la descripción va como
"Nombre Apellido: resto del concepto", con TODO lo que sigue al nombre copiado tal como está
en la hoja — "Ricardo García abono 10%" se devuelve como "Ricardo García: abono 10%", nunca
como "Ricardo García" ni como "Ricardo García: abono". Si la hoja no dice de quién es el
préstamo, va sin dos puntos.
SOLO JSON.`,
      },
      {
        type: "image" as const,
        image: `data:${data.mimeType};base64,${data.imageBase64}`,
      },
    ];

    /**
     * Se baja por la lista de proveedores hasta que uno responda.
     *
     * `generateText` ya reintenta 3 veces por su cuenta, pero siempre contra el
     * MISMO servicio: con Google devolviendo 503, los tres intentos chocan
     * contra la misma puerta cerrada y el mensaje que llegaba era "Failed after
     * 3 attempts", con OpenRouter configurado y sin tocar. Los reintentos del
     * SDK cubren un tropiezo puntual; esto cubre que el proveedor esté caído,
     * que es otro problema.
     */
    let text: string | undefined;
    let proveedorUsado = "";
    const fallos: string[] = [];
    for (const { provider, modelId, proveedor } of proveedores) {
      try {
        ({ text } = await generateText({
          model: provider(modelId),
          messages: [{ role: "user", content: contenido }],
        }));
        proveedorUsado = proveedor;
        break;
      } catch (err) {
        // El error crudo del proveedor ("User not found", "401", etc.) no le
        // dice nada a quien usa la app: se traduce a algo accionable.
        fallos.push(mensajeDeError(err, proveedor));
        // Al registro va solo el nombre del proveedor. El error crudo puede
        // arrastrar fragmentos de la petición, y la petición es una foto del
        // libro contable.
        console.error(`OCR: falló ${proveedor}; se intenta el siguiente proveedor si lo hay`);
      }
    }

    if (text === undefined) {
      // Con un solo proveedor configurado, su mensaje tal cual: ya es accionable.
      // Con varios, se dicen todos — si no, quien lo lee cambia la clave de uno
      // sin saber que el otro también está fallando.
      throw new Error(
        fallos.length === 1
          ? fallos[0]!
          : `Fallaron los ${fallos.length} proveedores de IA. ${fallos.join(" — ")}`,
      );
    }

    const parsed = extractJson(text);
    if (!parsed) {
      // Solo la longitud. Antes se volcaban 500 caracteres de la respuesta,
      // que son nombres de alumnos y montos del libro contable, a los registros
      // de Vercel — donde los ve cualquiera con acceso al proyecto, incluido
      // quien no debe ver finanzas.
      console.error(`OCR: respuesta sin JSON válido (${text.length} caracteres)`);
      throw new Error("La IA no devolvió JSON válido. Intenta de nuevo.");
    }
    // Los nombres salen de la misma lista que ya vio el modelo, así que la
    // corrección de aquí y la que hizo él apuntan siempre a la misma persona.
    const nombresAlumnos = (data.students ?? []).map((s) => s.nombre.trim()).filter(Boolean);
    const padron = data.students ?? [];
    const entries = coerceEntries(parsed).map((e) => {
      const conDescripcion = esCategoriaPrestamo(e.categoria)
        ? { ...e, descripcion: normalizarDescripcionPrestamo(e.descripcion, nombresAlumnos) }
        : e;
      // El prompt pide la regla aula → categoría, pero pedirla no es
      // garantizarla: el modelo puede leer bien el nombre y devolver igualmente
      // la cuota que no toca. Aquí se contrasta contra el padrón, que es un dato
      // que escribió una persona. El aviso viaja con la fila para que la
      // corrección se vea en pantalla y no ocurra a espaldas de quien revisa.
      const { categoria, corregido } = corregirCategoriaConPadron(
        conDescripcion.categoria,
        conDescripcion.descripcion,
        padron,
      );
      return corregido
        ? { ...conDescripcion, categoria, avisoCategoria: corregido }
        : conDescripcion;
    });

    // `proveedor` viaja de vuelta para poder avisar en pantalla cuando la
    // lectura NO la hizo el proveedor preferido: los modelos no son idénticos y
    // conviene revisar con más cuidado lo que salga del de respaldo.
    return { entries, raw: text, proveedor: proveedorUsado };
  });
