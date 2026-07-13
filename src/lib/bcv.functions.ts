import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import https from "https";

const bcvAgent = new https.Agent({ rejectUnauthorized: false });

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
    if (L) out.push(`https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${L}${yy}_smc.xls`);
    // También probar todas las letras como fallback
    for (const L of letters) {
      out.push(`https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${L}${yy}_smc.xls`);
    }
    // Formato sin letra:
    out.push(`https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/${prefix}${yy}_smc.xls`);
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

function fetchXlsBuffer(url: string): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const req = https.get(url, { agent: bcvAgent, headers: { "User-Agent": "Mozilla/5.0 SISFIA" } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    });
    req.on("error", () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
  });
}

async function readXlsRates(buf: Uint8Array): Promise<BcvRow[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const rows: BcvRow[] = [];
  for (const sheetName of wb.SheetNames) {
    const iso = sheetNameToIso(sheetName);
    if (!iso) continue;
    const ws = wb.Sheets[sheetName];
    // La tasa Venta USD está en G15 según el formato del BCV.
    const cell = ws["G15"];
    const rate = typeof cell?.v === "number" ? cell.v : Number(cell?.v);
    if (rate && rate > 1) rows.push({ isoDate: iso, rate });
  }
  return rows.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

async function fetchQuarterRows(year: number, quarter: number): Promise<{ rows: BcvRow[]; source: string } | null> {
  for (const url of bcvUrlCandidates(year, quarter)) {
    const buf = await fetchXlsBuffer(url);
    if (!buf) continue;
    const rows = await readXlsRates(buf);
    if (rows.length) return { rows, source: url };
  }
  return null;
}

// ---------- Server functions ----------

const QuarterInput = z.object({
  year: z.number().int().min(2020).max(2100),
  quarter: z.number().int().min(1).max(4),
});

export const fetchBcvQuarter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QuarterInput.parse(d))
  .handler(async ({ data }): Promise<{ rows: BcvRow[]; source: string } | null> => {
    const res = await fetchQuarterRows(data.year, data.quarter);
    return res;
  });

const DateInput = z.object({ isoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// Trae la tasa del BCV para una fecha específica (busca en el trimestre correcto).
export const fetchBcvForDate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DateInput.parse(d))
  .handler(async ({ data }): Promise<{ rows: BcvRow[]; source: string } | null> => {
    const [ys, ms] = data.isoDate.split("-");
    const y = Number(ys), m = Number(ms);
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
    } catch { /* ignore */ }
    return null;
  });

// Compat: tasa de HOY (usa el trimestre actual del BCV primero, dolarapi como respaldo).
export const fetchTodayBcv = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ isoDate: string; rate: number } | null> => {
    const d = new Date();
    const y = d.getFullYear();
    const q = quarterOf(d.getMonth() + 1);
    const res = await fetchQuarterRows(y, q);
    if (res && res.rows.length) {
      const last = res.rows[res.rows.length - 1];
      return { isoDate: last.isoDate, rate: last.rate };
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
