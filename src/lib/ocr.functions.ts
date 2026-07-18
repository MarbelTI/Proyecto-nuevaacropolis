import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import {
  CATEGORIAS_GASTO,
  CATEGORIAS_INGRESO,
  studentListForPrompt,
} from "./students-data";

const Input = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
  ingresos: z.array(z.string()).optional(),
  gastos: z.array(z.string()).optional(),
  students: z.array(z.object({ nombre: z.string(), aulas: z.array(z.string()) })).optional(),
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
    ? ((raw as { entries: unknown[] }).entries)
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
    const m = candidate.match(/[\[{][\s\S]*[\]}]/);
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

export const analyzeJournalImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing API key — configura OPENROUTER_API_KEY en .env");

    const provider = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "http://localhost:8080",
        "X-Title": "SISFIA",
      },
    });

    const ingresos = data.ingresos?.length ? data.ingresos : [...CATEGORIAS_INGRESO];
    const gastos = data.gastos?.length ? data.gastos : [...CATEGORIAS_GASTO];
    const studentsList = data.students?.length
      ? data.students.map((s) => `- ${s.nombre} → ${s.aulas.join(", ")}`).join("\n")
      : studentListForPrompt();

    const systemPrompt = `Eres un experto contable leyendo libros diarios manuscritos en español del centro "Filosofía Café".

LISTA OFICIAL DE ALUMNOS (úsala para corregir nombres mal escritos):
${studentsList}

REGLAS DE CATEGORÍA:
- Alumnos de aulas "Arjuna I" o "Arjuna II" → categoría "PROBAS"
- Alumnos de aulas "Krishna I/II/III/V/VI" → categoría "MIEMBROS"
- Otras categorías de INGRESO posibles: ${ingresos.join(", ")}
- Categorías de GASTO típicas: ${gastos.join(", ")}

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
- mensualidad: el periodo que se paga, ej "abr-2026", "mar-2026". Vacío si no aplica.
- moneda: "USD", "Bolívares" o "Pesos"
- monto: el monto en su moneda original, como número (usa punto decimal). Ej "12800.00", "20.00"
- tasa: tasa de cambio si aparece (vacío para USD)
- monto_usd: equivalente en USD si aparece, sino vacío

Devuelve SOLO JSON válido.`;

    const { text } = await generateText({
      model: provider("google/gemini-2.0-flash-001"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: systemPrompt + `\n\nAnaliza esta hoja del libro diario manuscrito y devuelve SOLO JSON con esta forma EXACTA:
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
    });

    const parsed = extractJson(text);
    if (!parsed) {
      console.error("OCR raw output:", text.slice(0, 500));
      throw new Error("La IA no devolvió JSON válido. Intenta de nuevo.");
    }
    return { entries: coerceEntries(parsed), raw: text };
  });
