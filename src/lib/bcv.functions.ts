import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import https from "https";
import { getSessionUser, canReadFinanzas } from "./api/auth-guard";

// El servidor del BCV tiene la cadena de certificados incompleta: no envía el
// certificado intermedio, y Node responde UNABLE_TO_VERIFY_LEAF_SIGNATURE
// (comprobado el 10-ago-2026). No es que su certificado sea falso — es que su
// servidor está mal configurado y no manda la cadena entera.
//
// Se intentó validar como cualquier otro sitio y el resultado fue que fallaban
// las doce URL candidatas, cada una agotando su espera, y la carga de tasas
// pasaba de veinte segundos a más de un minuto sin traer nada.
//
// RIESGO QUE SE ACEPTA: quien pueda interponerse en la conexión entre el
// servidor y bcv.org.ve podría servir un XLS falso y con él fijar la tasa de
// toda la contabilidad. Es un ataque que exige estar en la ruta de red de
// Vercel, no algo que pueda hacer cualquiera.
//
// ARREGLO DE VERDAD, pendiente: incluir el certificado intermedio del BCV en
// el repositorio y pasarlo aquí como `ca`, que valida sin desactivar nada.
// Requiere renovarlo cuando caduque, por eso no se hace a la ligera.
const bcvAgent = new https.Agent({ rejectUnauthorized: false });

/** Cuánto se espera a UNA descarga antes de darla por perdida. */
const TIMEOUT_POR_URL = 6000;
/** Tope de toda la operación, pruebe las URL que pruebe. */
const DEADLINE_GLOBAL = 12000;

export type BcvRow = { isoDate: string; dolar: number; euro?: number };

// URLs candidatas del XLS trimestral del BCV. El patrón real es:
//   https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/2_1_2{LETRA}{YY}_smc.xls
// donde a=Q1, b=Q2, c=Q3, d=Q4 (la letra es el trimestre).
/**
 * Devuelve las URL en DOS grupos, y el orden importa.
 *
 * `exactas` son las de la letra que corresponde al trimestre pedido; `respaldo`
 * son las demás letras, por si el BCV cambió la nomenclatura.
 *
 * Están separadas porque se prueban en paralelo: si se lanzaran todas a la vez,
 * ganaría la que respondiera antes y el trimestre 1 podía acabar quedándose con
 * el archivo del trimestre 2. Con dos tandas, la letra correcta siempre tiene
 * prioridad y el respaldo solo entra si de verdad no existe.
 */
function bcvUrlCandidates(year: number, quarter: number): { exactas: string[]; respaldo: string[] } {
  const yy = String(year % 100).padStart(2, "0");
  const letters = ["a", "b", "c", "d", "e"];
  const prefixCandidates = ["2_1_2", "1_1_2"];
  const exactas: string[] = [];
  const out: string[] = [];
  for (const prefix of prefixCandidates) {
    // La letra principal corresponde al trimestre (a=Q1, b=Q2, c=Q3, d=Q4)
    const L = letters[quarter - 1];
    if (L)
      exactas.push(
        `https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${L}${yy}_smc.xls`,
      );
    // También probar todas las letras como fallback
    for (const L of letters) {
      out.push(
        `https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${L}${yy}_smc.xls`,
      );
    }
    // Formato sin letra:
    out.push(
      `https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${yy}_smc.xls`,
    );
  }
  const unicasExactas = [...new Set(exactas)];
  // El respaldo no repite lo que ya va en la primera tanda.
  return {
    exactas: unicasExactas,
    respaldo: [...new Set(out)].filter((u) => !unicasExactas.includes(u)),
  };
}

function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

// Convierte "DDMMYYYY" a "YYYY-MM-DD"; devuelve null si no encaja.
function sheetNameToIso(name: string): string | null {
  const m = name.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

const MAX_XLS_BYTES = 10 * 1024 * 1024;

function fetchXlsBuffer(url: string): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      { agent: bcvAgent, headers: { "User-Agent": "Mozilla/5.0 SISFIA" } },
      (res) => {
        // Antes no se miraba el código de respuesta: la página de error 404 del
        // BCV se devolvía como si fuera el XLS y acababa dentro del lector de
        // hojas de cálculo, que reventaba con HTML.
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > MAX_XLS_BYTES) {
            req.destroy();
            resolve(null);
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
        res.on("error", () => resolve(null));
      },
    );
    req.on("error", () => resolve(null));
    req.setTimeout(TIMEOUT_POR_URL, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function readXlsRates(buf: Uint8Array): Promise<BcvRow[]> {
  const XLSX = await import("xlsx");
  // Si lo descargado no es una hoja de cálculo de verdad, XLSX.read lanza. Sin
  // este try la excepción tumbaba la búsqueda entera en vez de descartar esa
  // URL y seguir con la siguiente.
  let wb: import("xlsx").WorkBook;
  try {
    wb = XLSX.read(buf, { type: "array" });
  } catch {
    return [];
  }
  const rows: BcvRow[] = [];
  for (const sheetName of wb.SheetNames) {
    const iso = sheetNameToIso(sheetName);
    if (!iso) continue;
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    // La tasa Venta USD está en G15 y la tasa Euro en G11, según el formato del BCV.
    const cellUsd = ws["G15"];
    const dolar = typeof cellUsd?.v === "number" ? cellUsd.v : Number(cellUsd?.v);
    if (!(dolar && dolar > 1)) continue;
    const cellEur = ws["G11"];
    const euroRaw = typeof cellEur?.v === "number" ? cellEur.v : Number(cellEur?.v);
    const euro = euroRaw && euroRaw > 1 ? euroRaw : undefined;
    rows.push(euro !== undefined ? { isoDate: iso, dolar, euro } : { isoDate: iso, dolar });
  }
  return rows.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

// Cache en memoria de la URL que funcionó para cada trimestre.
const workingUrlCache = new Map<string, string>(); // key: "${year}-${quarter}"

async function fetchQuarterRows(
  year: number,
  quarter: number,
): Promise<{ rows: BcvRow[]; source: string } | null> {
  const cacheKey = `${year}-${quarter}`;
  const cachedUrl = workingUrlCache.get(cacheKey);
  if (cachedUrl) {
    const buf = await fetchXlsBuffer(cachedUrl);
    if (buf) {
      const rows = await readXlsRates(buf);
      if (rows.length) return { rows, source: cachedUrl };
    }
    workingUrlCache.delete(cacheKey);
  }
  // DOS TANDAS, y el orden importa.
  //
  // Dentro de cada tanda las URL se prueban a la vez y gana la primera que
  // traiga filas: en fila india eran doce URL por quince segundos, hasta tres
  // minutos justo el día que el BCV está caído.
  //
  // Pero las candidatas NO son intercambiables: la primera tanda es la letra
  // que corresponde al trimestre pedido y la segunda son las demás letras. Al
  // lanzarlas todas juntas ganaba la que respondiera antes, y el trimestre 1
  // acababa cargando el archivo del 2 — con lo que las tasas de enero a marzo
  // no aparecían nunca.
  const { exactas, respaldo } = bcvUrlCandidates(year, quarter);

  const primeraQueSirva = async (urls: string[]) => {
    const pendientes = urls.filter((u) => u !== cachedUrl);
    if (!pendientes.length) return null;
    return Promise.any(
      pendientes.map(async (url) => {
        const buf = await fetchXlsBuffer(url);
        if (!buf) throw new Error("sin descarga");
        const rows = await readXlsRates(buf);
        if (!rows.length) throw new Error("sin filas");
        return { rows, source: url };
      }),
    ).catch(() => null);
  };

  // Tope de la operación entera, por si alguna se queda colgada: es preferible
  // caer al respaldo de dolarapi que dejar la pantalla esperando.
  let cortar: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((res) => {
    cortar = setTimeout(() => res(null), DEADLINE_GLOBAL);
  });

  try {
    const ganadora = await Promise.race([
      (async () => (await primeraQueSirva(exactas)) ?? (await primeraQueSirva(respaldo)))(),
      limite,
    ]);
    if (ganadora) workingUrlCache.set(cacheKey, ganadora.source);
    return ganadora;
  } finally {
    if (cortar) clearTimeout(cortar);
  }
}

// ---------- Server functions ----------

// Estas tres funciones eran las únicas del proyecto sin comprobar la sesión.
// Cualquiera podía llamarlas desde fuera, y cada llamada dispara hasta doce
// descargas al BCV con quince segundos de espera cada una: sale gratis dejar a
// alguien consumiendo la cuota de Vercel. Se piden los mismos permisos que para
// leer finanzas, que es lo único para lo que sirven las tasas.
const QuarterInput = z.object({
  year: z.number().int().min(2020).max(2100),
  quarter: z.number().int().min(1).max(4),
  accessToken: z.string().optional(),
});

export const fetchBcvQuarter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QuarterInput.parse(d))
  .handler(async ({ data }): Promise<{ rows: BcvRow[]; source: string } | null> => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canReadFinanzas(session.role)) return null;
    const res = await fetchQuarterRows(data.year, data.quarter);
    return res;
  });

const DateInput = z.object({
  isoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accessToken: z.string().optional(),
});

// Trae la tasa del BCV para una fecha específica (busca en el trimestre correcto).
export const fetchBcvForDate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DateInput.parse(d))
  .handler(async ({ data }): Promise<{ rows: BcvRow[]; source: string } | null> => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canReadFinanzas(session.role)) return null;
    const [ys, ms] = data.isoDate.split("-");
    const y = Number(ys),
      m = Number(ms);
    const q = quarterOf(m);
    const res = await fetchQuarterRows(y, q);
    if (res) return res;
    // Fallback rápido: dolarapi (sólo hoy).
    try {
      const alt = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (alt.ok) {
        const j = (await alt.json()) as { fechaActualizacion?: string; promedio?: number };
        if (j.promedio) {
          const iso = (j.fechaActualizacion ?? new Date().toISOString()).slice(0, 10);
          // dolarapi.com solo trae la tasa dólar, no hay euro en este respaldo.
          return { rows: [{ isoDate: iso, dolar: j.promedio }], source: "dolarapi.com" };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  });

// Compat: tasa de HOY (usa el trimestre actual del BCV primero, dolarapi como respaldo).
export const fetchTodayBcv = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ isoDate: string; rate: number } | null> => {
    // Al ser GET no lleva cuerpo donde mandar el token, así que la sesión se
    // toma de la cabecera Authorization. Hoy no la llama ningún componente:
    // si algún día se usa, hay que mandar esa cabecera.
    const session = await getSessionUser();
    if (!session || !canReadFinanzas(session.role)) return null;
    const d = new Date();
    const y = d.getFullYear();
    const q = quarterOf(d.getMonth() + 1);
    const res = await fetchQuarterRows(y, q);
    if (res && res.rows.length) {
      const last = res.rows[res.rows.length - 1];
      if (last) return { isoDate: last.isoDate, rate: last.dolar };
    }
    try {
      const alt = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (!alt.ok) return null;
      const j = (await alt.json()) as { fechaActualizacion?: string; promedio?: number };
      if (!j.promedio) return null;
      const iso = (j.fechaActualizacion ?? new Date().toISOString()).slice(0, 10);
      return { isoDate: iso, rate: j.promedio };
    } catch {
      return null;
    }
  },
);
