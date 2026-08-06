import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { CATEGORIAS_GASTO, CATEGORIAS_INGRESO } from "./students-data";
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

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
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

/**
 * Elige el proveedor de IA según la clave disponible.
 *
 * - GOOGLE_API_KEY   → Gemini directo (aistudio.google.com, tiene capa gratuita).
 * - OPENROUTER_API_KEY → OpenRouter (de pago, sirve de alternativa).
 *
 * Antes se hacía `OPENROUTER_API_KEY || ANTHROPIC_API_KEY` pero ambos se
 * mandaban al endpoint de OpenRouter, así que una clave de Anthropic siempre
 * fallaba con un 401 confuso. Ahora cada clave va a su propio endpoint.
 */
function elegirProveedor() {
  const googleKey = process.env.GOOGLE_API_KEY?.trim();
  if (googleKey) {
    return {
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
    };
  }

  const orKey = process.env.OPENROUTER_API_KEY?.trim();
  if (orKey) {
    return {
      proveedor: "OpenRouter",
      modelId: "google/gemini-2.0-flash-001",
      provider: createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          Authorization: `Bearer ${orKey}`,
          "HTTP-Referer": "https://nueva-acropolis-sc.vercel.app",
          "X-Title": "SISFIA",
        },
      }),
    };
  }

  throw new Error(
    "No hay clave de IA configurada. Consigue una gratis en aistudio.google.com/app/apikey " +
      "y guárdala como GOOGLE_API_KEY (en el archivo .env para desarrollo local, " +
      "o en Vercel → Settings → Environment Variables para producción).",
  );
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
    return `Se alcanzó el límite de peticiones de ${proveedor}. Espera un minuto y reintenta; si procesas varias fotos, súbelas de a pocas.`;
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

    const { provider, modelId, proveedor } = elegirProveedor();

    const ingresos = data.ingresos?.length ? data.ingresos : [...CATEGORIAS_INGRESO];
    const gastos = data.gastos?.length ? data.gastos : [...CATEGORIAS_GASTO];
    const studentsList = data.students?.length
      ? data.students.map((s) => `- ${s.nombre} → ${s.aulas.join(", ")}`).join("\n")
      : "";

    const systemPrompt = `Eres un experto contable leyendo libros diarios manuscritos en español del centro "Filosofía Café".

LISTA OFICIAL DE ALUMNOS (úsala para corregir nombres mal escritos):
${studentsList}

REGLAS DE CATEGORÍA:
- Alumnos de aulas "Arjuna I" o "Arjuna II" → categoría "PROBAS"
- Alumnos de aulas "Krishna I/II/III/V/VI" → categoría "MIEMBROS"
- Otras categorías de INGRESO posibles: ${ingresos.join(", ")}
- Categorías de GASTO típicas: ${gastos.join(", ")}

PRÉSTAMOS — REGLA DEL NOMBRE:
Si la categoría es "PRESTAMO", "PRÉSTAMOS, PROFESOR" o "INTERESES PTAMO", la
descripción DEBE empezar por el nombre de la persona seguido de dos puntos:
    "Ricardo García: abono"
    "Ricardo García: se le presta"
El nombre va corregido contra la lista de alumnos de arriba si aparece ahí.
Si en la hoja no se distingue de quién es el préstamo, deja la descripción tal
cual SIN los dos puntos: es preferible que quede sin asignar a atribuírselo a
la persona equivocada.

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
- descripcion: nombre del alumno (corregido contra la lista) o concepto del movimiento. SIN la parte de "C/S xxx-yyyy". En préstamos, "Nombre Apellido: concepto" (ver regla del nombre).
- mensualidad: el periodo que se paga, ej "abr-2026", "mar-2026". Vacío si no aplica.
- moneda: "USD", "Bolívares" o "Pesos"
- monto: el monto en su moneda original, como número (usa punto decimal). Ej "12800.00", "20.00"
- tasa: tasa de cambio si aparece (vacío para USD)
- monto_usd: equivalente en USD si aparece, sino vacío

Devuelve SOLO JSON válido.`;

    let text: string;
    try {
      ({ text } = await generateText({
        model: provider(modelId),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  systemPrompt +
                  `\n\nAnaliza esta hoja del libro diario manuscrito y devuelve SOLO JSON con esta forma EXACTA:
{"entries":[{"fecha":"","mes":"","tipo":"","categoria":"","descripcion":"","mensualidad":"","moneda":"","monto":"","tasa":"","monto_usd":""}]}

Recuerda: una fila con dos monedas → DOS entradas. Corrige nombres usando la lista oficial. SOLO JSON.`,
              },
              {
                type: "image",
                image: `data:${data.mimeType};base64,${data.imageBase64}`,
              },
            ],
          },
        ],
      }));
    } catch (err) {
      // El error crudo del proveedor ("User not found", "401", etc.) no le dice
      // nada a quien usa la app: se traduce a algo accionable.
      throw new Error(mensajeDeError(err, proveedor));
    }

    const parsed = extractJson(text);
    if (!parsed) {
      console.error("OCR raw output:", text.slice(0, 500));
      throw new Error("La IA no devolvió JSON válido. Intenta de nuevo.");
    }
    return { entries: coerceEntries(parsed), raw: text };
  });
