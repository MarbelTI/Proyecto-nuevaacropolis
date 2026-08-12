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

export type BcvRow = { isoDate: string; rate: number };

// URLs candidatas del XLS trimestral del BCV. El patrón real es:
//   https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/2_1_2{LETRA}{YY}_smc.xls
// donde a=Q1, b=Q2, c=Q3, d=Q4 (la letra es el trimestre).
function bcvUrlCandidates(year: number, quarter: number): string[] {
  const yy = String(year % 100).padStart(2, "0");
  const letters = ["a", "b", "c", "d", "e"];
  const prefixCandidates = ["2_1_2", "1_1_2"];
  const out: string[] = [];
  for (const prefix of prefixCandidates) {
    // La letra principal corresponde al trimestre (a=Q1, b=Q2, c=Q3, d=Q4)
    const L = letters[quarter - 1];
    if (L)
      out.push(
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
  return [...new Set(out)]; // eliminar duplicados
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
    // La tasa Venta USD está en G15 según el formato del BCV.
    const cell = ws["G15"];
    const rate = typeof cell?.v === "number" ? cell.v : Number(cell?.v);
    if (rate && rate > 1) rows.push({ isoDate: iso, rate });
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
  // Las candidatas restantes se prueban TODAS A LA VEZ y gana la primera que
  // traiga filas.
  //
  // Antes se probaban en fila india, con quince segundos de espera cada una:
  // doce URL × quince segundos son tres minutos en el peor caso, y el peor caso
  // es justo el día que el BCV está caído, que es cuando más prisa hay. En
  // paralelo, lo que tarda es la más lenta, no la suma de todas.
  const pendientes = bcvUrlCandidates(year, quarter).filter((u) => u !== cachedUrl);
  if (!pendientes.length) return null;

  const intentos = pendientes.map(async (url) => {
    const buf = await fetchXlsBuffer(url);
    if (!buf) throw new Error("sin descarga");
    const rows = await readXlsRates(buf);
    if (!rows.length) throw new Error("sin filas");
    return { rows, source: url };
  });

  // Tope de la operación entera, por si alguna se queda colgada: es preferible
  // caer al respaldo de dolarapi que dejar la pantalla esperando.
  let cortar: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((res) => {
    cortar = setTimeout(() => res(null), DEADLINE_GLOBAL);
  });

  try {
    const ganadora = await Promise.race([
      Promise.any(intentos).catch(() => null),
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
          return { rows: [{ isoDate: iso, rate: j.promedio }], source: "dolarapi.com" };
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
      if (last) return { isoDate: last.isoDate, rate: last.rate };
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
