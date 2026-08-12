import * as XLSX from "xlsx";
import { bcvRateNearest, type BcvRates, type Student, type Transaction } from "./lists-store";
import { calcularMontoUsd, redondearTasa, TASA_PESOS_DEFAULT } from "./fees-logic";
import type { Actividad, Condicion } from "./students-data";
import { aNumeroAvisando, anioVenezuela } from "./formato";
import { nuevoId } from "./utils";

function txFechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const [, d = "", mo = "", a] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  let yy = a ?? anioVenezuela();
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

export type RellenoTasas = {
  rows: Transaction[];
  /** Movimientos en Bs a los que se les puso la tasa exacta de esa fecha. */
  bsExactas: number;
  /** Movimientos en Bs a los que se les puso una tasa aproximada (otra fecha). */
  bsAproximadas: number;
  /** Movimientos en Bs que quedaron sin tasa (no hay ninguna registrada). */
  bsSinTasa: number;
  /** Movimientos en pesos a los que se les puso la tasa por defecto. */
  pesos: number;
};

/**
 * Completa la tasa de cambio de los movimientos que vienen sin ella y recalcula
 * su equivalente en dólares:
 *   - Bolívares → tasa BCV de esa fecha (o la más cercana si falta ese día).
 *   - Pesos     → tasa por defecto.
 * No toca los movimientos que ya traen tasa: lo cargado a mano manda.
 */
export function rellenarTasasFaltantes(rows: Transaction[], bcvRates: BcvRates): RellenoTasas {
  let bsExactas = 0,
    bsAproximadas = 0,
    bsSinTasa = 0,
    pesos = 0;

  const out = rows.map((t) => {
    const yaTieneTasa = t.tasa != null && Number(t.tasa) > 0;
    if (yaTieneTasa) return t;

    if (t.moneda === "Bolívares") {
      const iso = txFechaToIso(t.fecha);
      const hit = iso ? bcvRateNearest(bcvRates, iso) : null;
      if (!hit) {
        bsSinTasa++;
        return t;
      }
      if (hit.exacta) bsExactas++;
      else bsAproximadas++;
      const tasa = redondearTasa(hit.rate);
      return {
        ...t,
        tasa,
        montoUsd: calcularMontoUsd(t.moneda, Number(t.monto) || 0, tasa),
      };
    }

    if (t.moneda === "Pesos") {
      pesos++;
      return {
        ...t,
        tasa: TASA_PESOS_DEFAULT,
        montoUsd: calcularMontoUsd(t.moneda, Number(t.monto) || 0, TASA_PESOS_DEFAULT),
      };
    }

    return t;
  });

  return { rows: out, bsExactas, bsAproximadas, bsSinTasa, pesos };
}

export function parseExcelToTransactions(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: "array" });
        // Un .xlsx sin hojas es raro pero posible, y antes se pasaba undefined
        // al lector, que fallaba con un error incomprensible.
        const primera = wb.SheetNames[0];
        const ws = primera ? wb.Sheets[primera] : undefined;
        if (!ws) throw new Error("El archivo no tiene ninguna hoja");
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const mapped: Transaction[] = rows.map((r) => ({
          id: nuevoId(),
          fecha: String(r.Fecha || r.fecha || ""),
          mes: String(r.Mes || r.mes || ""),
          tipo: (String(r.Tipo || r.tipo || "Ingreso") === "Gasto" ? "Gasto" : "Ingreso") as
            "Ingreso" | "Gasto",
          categoria: String(r.Categoria || r.Categoría || r.categoria || ""),
          descripcion: String(r.Descripcion || r.Descripción || r.descripcion || ""),
          mensualidad: String(r.Mensualidad || r.mensualidad || ""),
          moneda: (String(r.Moneda || r.moneda || "USD") === "Bolívares"
            ? "Bolívares"
            : String(r.Moneda || r.moneda || "USD") === "Pesos"
              ? "Pesos"
              : "USD") as "USD" | "Bolívares" | "Pesos",
          // Las cifras se leen con aNumero, no con Number().
          //
          // Number("1.234,56") es NaN, y el `|| 0` que había aquí lo convertía
          // en un CERO SILENCIOSO: un importe escrito con coma decimal —lo
          // normal en un Excel en español— entraba como 0.00 sin que nada lo
          // avisara. aNumero entiende "1.234,56", "1,234.56", "$ 900" y "20,00",
          // y la variante avisando deja rastro en la consola cuando de verdad
          // no puede leer algo.
          monto: aNumeroAvisando(String(r.Monto || r.monto || ""), "Excel: Monto"),
          tasa: (() => {
            const v = r["Tasa cambio"] || r["Tasa"] || r.tasa;
            const n = aNumeroAvisando(String(v ?? ""), "Excel: Tasa");
            return n > 0 ? n : null;
          })(),
          montoUsd: aNumeroAvisando(
            String(r["Monto USD"] || r["USD"] || r.montoUsd || ""),
            "Excel: Monto USD",
          ),
          banco: String(r.Banco || r.banco || ""),
        }));
        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsArrayBuffer(file);
  });
}

// ------------------------- Import de alumnos -------------------------
// Lee las hojas "Ficha" (respuestas del formulario de Google — datos
// personales) y "BD_Temporal" (roster con aula/celador/actividad) del
// Excel exportado, y las combina por nombre en una sola lista de Student.

function normText(s: unknown): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findCol(headers: unknown[], ...keywords: string[]): number {
  const normed = headers.map(normText);
  for (const kw of keywords) {
    const idx = normed.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

function excelSerialToIso(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string")
    return /^\d+(\.\d+)?$/.test(v.trim()) ? excelSerialToIso(Number(v)) : v.trim();
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return "";
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  // El número de serie de Excel se convierte contando desde el epoch en UTC, así
  // que hay que leerlo también en UTC. Antes se calculaba en UTC y se leía con
  // getFullYear/getMonth/getDate, que son la hora LOCAL: en Venezuela (UTC-4)
  // toda fecha retrocedía un día. Y `fechaIngreso` es la que decide desde qué
  // mes se le cobra a cada persona, así que ese día de menos movía el cobro un
  // mes entero cuando caía en día 1.
  return d.toISOString().slice(0, 10);
}

function findSheet(wb: XLSX.WorkBook, ...nameKeywords: string[]): string | null {
  const names = wb.SheetNames.map((n) => ({ raw: n, norm: normText(n) }));
  for (const kw of nameKeywords) {
    const found = names.find((n) => n.norm.includes(normText(kw)));
    if (found) return found.raw;
  }
  return null;
}

function sheetRows(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
}

const CONDICIONES: Condicion[] = ["Miembro", "Probacionista", "ClasePorClase"];

function normalizeCondicion(v: unknown): Condicion | undefined {
  const s = (v ?? "").toString().trim();
  return CONDICIONES.find((c) => c.toLowerCase() === s.toLowerCase());
}

/**
 * Lee una celda de texto SIN borrar lo que ya había.
 *
 * Si la columna no existe, o existe pero la celda viene vacía, se conserva el
 * valor anterior. Antes se escribía "" encima: reimportar un Excel al que le
 * faltaba rellenar una columna borraba en silencio cédulas, correos,
 * direcciones y teléfonos de todo el mundo.
 */
function celda(row: unknown[], idx: number, previo?: string): string | undefined {
  if (idx === -1) return previo;
  const v = (row[idx] ?? "").toString().trim();
  return v || previo;
}

/**
 * Celda vacía = "no dice nada", no "Activo".
 *
 * Antes esta función devolvía "Activo" para cualquier cosa que no contuviera
 * "retir", incluida la celda en blanco. Resultado: cada importación resucitaba
 * a los retirados y volvían a aparecer en la lista de morosos.
 */
function normalizeActividad(v: unknown): Actividad | undefined {
  const s = normText(v);
  if (!s) return undefined;
  return s.includes("retir") ? "Retirado" : "Activo";
}

export function parseExcelToStudents(file: File): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: "array" });

        const byName = new Map<string, Student>();
        const keyFor = (nombre: string) => normText(nombre);

        // 1) BD_Temporal: roster base (nombre, aula, actividad, telefono)
        const bdSheet = findSheet(wb, "BD_Temporal", "BD Temporal");
        if (bdSheet) {
          const rows = sheetRows(wb, bdSheet);
          const headers = rows[0] ?? [];
          const iNombre = findCol(headers, "nombre del alumno", "nombre");
          const iAula = findCol(headers, "aula");
          const iCondicion = findCol(headers, "condicion");
          const iActividad = findCol(headers, "actividad");
          const iTelefono = findCol(headers, "telefono");
          for (const row of rows.slice(1)) {
            const nombre = (row[iNombre] ?? "").toString().trim();
            if (!nombre) continue;
            const aula = iAula !== -1 ? (row[iAula] ?? "").toString().trim() : "";
            byName.set(keyFor(nombre), {
              nombre,
              aulas: aula ? [aula] : [],
              condicion: iCondicion !== -1 ? normalizeCondicion(row[iCondicion]) : undefined,
              actividad:
                (iActividad !== -1 ? normalizeActividad(row[iActividad]) : undefined) ?? "Activo",
              telefono: iTelefono !== -1 ? (row[iTelefono] ?? "").toString().trim() : undefined,
            });
          }
        }

        // 2) Ficha: enriquece con datos personales (control de estudio)
        const fichaSheet = findSheet(wb, "Ficha");
        if (fichaSheet) {
          const rows = sheetRows(wb, fichaSheet);
          const headers = rows[0] ?? [];
          const iNombre = findCol(headers, "nombre y apellido", "nombre");
          const iDoc = findCol(headers, "documento de identificacion", "cedula");
          const iTel = findCol(headers, "telefono");
          const iOcup = findCol(headers, "ocupacion");
          const iHab = findCol(headers, "habilidades");
          const iCorreo = findCol(headers, "correo electronico", "correo");
          const iDir = findCol(headers, "direccion");
          const iRedes = findCol(headers, "redes sociales");
          const iFIngreso = findCol(headers, "ingreso al probacionismo");
          const iFMiembro = findCol(headers, "hizo miembro");
          const iGrado = findCol(headers, "grado de participacion");
          const iFfvv = findCol(headers, "recibio de ffvv", "ffvv");
          const iSede = findCol(headers, "sede en la que participa", "sede");
          const iCurso = findCol(headers, "nombre del curso", "curso");
          const iInstructor = findCol(headers, "instructor");
          const iCelador = findCol(headers, "celador");
          const iHorario = findCol(headers, "horario");
          const iMaterias = findCol(headers, "materias en curso", "materias");
          const iCondicion = findCol(headers, "condicion dentro de la escuela", "condicion");
          const iEstatus = findCol(headers, "estatus");

          for (const row of rows.slice(1)) {
            const nombre = iNombre !== -1 ? (row[iNombre] ?? "").toString().trim() : "";
            if (!nombre) continue;
            const key = keyFor(nombre);
            const curso = iCurso !== -1 ? (row[iCurso] ?? "").toString().trim() : "";
            const existing = byName.get(key);
            const aulas = existing
              ? Array.from(new Set([...existing.aulas, ...(curso ? [curso] : [])]))
              : curso
                ? [curso]
                : [];

            byName.set(key, {
              ...existing,
              nombre,
              aulas,
              condicion:
                (iCondicion !== -1 ? normalizeCondicion(row[iCondicion]) : undefined) ??
                existing?.condicion,
              actividad:
                (iEstatus !== -1 ? normalizeActividad(row[iEstatus]) : undefined) ??
                existing?.actividad ??
                "Activo",
              telefono: celda(row, iTel, existing?.telefono),
              cedula: celda(row, iDoc, existing?.cedula),
              correo: celda(row, iCorreo, existing?.correo),
              direccion: celda(row, iDir, existing?.direccion),
              redesSociales: celda(row, iRedes, existing?.redesSociales),
              ocupacion: celda(row, iOcup, existing?.ocupacion),
              habilidades: celda(row, iHab, existing?.habilidades),
              gradoParticipacion: celda(row, iGrado, existing?.gradoParticipacion),
              fechaIngreso:
                iFIngreso !== -1
                  ? excelSerialToIso(row[iFIngreso]) || existing?.fechaIngreso
                  : existing?.fechaIngreso,
              fechaMiembro:
                iFMiembro !== -1
                  ? excelSerialToIso(row[iFMiembro]) || existing?.fechaMiembro
                  : existing?.fechaMiembro,
              fechaFfvv:
                iFfvv !== -1
                  ? excelSerialToIso(row[iFfvv]) || existing?.fechaFfvv
                  : existing?.fechaFfvv,
              sede: celda(row, iSede, existing?.sede),
              instructor: celda(row, iInstructor, existing?.instructor),
              celadorNombre: celda(row, iCelador, existing?.celadorNombre),
              horario: celda(row, iHorario, existing?.horario),
              materias: celda(row, iMaterias, existing?.materias),
            });
          }
        }

        if (!bdSheet && !fichaSheet) {
          reject(new Error('No se encontraron las hojas "Ficha" ni "BD_Temporal" en el Excel'));
          return;
        }

        resolve(Array.from(byName.values()));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsArrayBuffer(file);
  });
}
