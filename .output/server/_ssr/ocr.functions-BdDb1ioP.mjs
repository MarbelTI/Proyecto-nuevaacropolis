import process from "node:process";
import { c as createServerRpc } from "./createServerRpc-BozI-sf8.mjs";
import { a as createServerFn } from "./server-CzQV3pgX.mjs";
import { g as generateText } from "../_libs/ai.mjs";
import { c as createOpenAICompatible } from "../_libs/ai-sdk__openai-compatible.mjs";
import { C as CATEGORIAS_INGRESO, a as CATEGORIAS_GASTO, s as studentListForPrompt } from "./students-data-BBPPruln.mjs";

import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import { g as objectType, k as arrayType, j as stringType } from "../_libs/zod.mjs";
import "../_libs/h3-v2.mjs";
import "../_libs/unenv.mjs";


import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";





import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";

import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "../_libs/isbot.mjs";
import "../_libs/ai-sdk__gateway.mjs";
import "../_libs/ai-sdk__provider-utils.mjs";
import "../_libs/ai-sdk__provider.mjs";
import "../_libs/eventsource-parser.mjs";
import "../_libs/@vercel/oidc.mjs";



import "../_libs/opentelemetry__api.mjs";
function createLovableAiGatewayProvider(apiKey) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey }
  });
}
const Input = objectType({
  imageBase64: stringType().min(1),
  mimeType: stringType().default("image/jpeg"),
  ingresos: arrayType(stringType()).optional(),
  gastos: arrayType(stringType()).optional(),
  students: arrayType(objectType({
    nombre: stringType(),
    aulas: arrayType(stringType())
  })).optional()
});
function coerceEntries(raw) {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.entries) ? raw.entries : [];
  return arr.map((r) => {
    const o = r ?? {};
    const s = (v) => v == null ? "" : String(v);
    const tipoRaw = s(o.tipo ?? o.type).toLowerCase();
    const tipo = tipoRaw.startsWith("ing") ? "Ingreso" : tipoRaw.startsWith("gas") ? "Gasto" : "";
    const monedaRaw = s(o.moneda ?? o.currency).toLowerCase();
    let moneda = "";
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
      montoUsd: s(o.monto_usd ?? o.montoUsd ?? o.usd ?? o.equivalente_usd)
    };
  });
}
function extractJson(text) {
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
      }
    }
  }
  return null;
}
const analyzeJournalImage_createServerFn_handler = createServerRpc({
  id: "e96338824bfb704932733f5e53742a990d80f57d37b38264f7d9fcbe46f3a095",
  name: "analyzeJournalImage",
  filename: "src/lib/ocr.functions.ts"
}, (opts) => analyzeJournalImage.__executeServer(opts));
const analyzeJournalImage = createServerFn({
  method: "POST"
}).inputValidator((d) => Input.parse(d)).handler(analyzeJournalImage_createServerFn_handler, async ({
  data
}) => {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  const ingresos = data.ingresos?.length ? data.ingresos : [...CATEGORIAS_INGRESO];
  const gastos = data.gastos?.length ? data.gastos : [...CATEGORIAS_GASTO];
  const studentsList = data.students?.length ? data.students.map((s) => `- ${s.nombre} → ${s.aulas.join(", ")}`).join("\n") : studentListForPrompt();
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

REGLA CRÍTICA — UNA MONEDA POR FILA:
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

Devuelve SOLO JSON válido, sin markdown.`;
  const {
    text
  } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    messages: [{
      role: "system",
      content: systemPrompt
    }, {
      role: "user",
      content: [{
        type: "text",
        text: `Analiza esta hoja del libro diario manuscrito.
Devuelve JSON con esta forma EXACTA:
{"entries":[{"fecha":"","mes":"","tipo":"","categoria":"","descripcion":"","mensualidad":"","moneda":"","monto":"","tasa":"","monto_usd":""}]}

Recuerda: una fila con dos monedas → DOS entradas. Corrige nombres usando la lista oficial. SOLO JSON.`
      }, {
        type: "image",
        image: `data:${data.mimeType};base64,${data.imageBase64}`
      }]
    }]
  });
  const parsed = extractJson(text);
  if (!parsed) {
    console.error("OCR raw output:", text.slice(0, 500));
    throw new Error("La IA no devolvió JSON válido. Intenta de nuevo.");
  }
  return {
    entries: coerceEntries(parsed),
    raw: text
  };
});
export {
  analyzeJournalImage_createServerFn_handler
};
