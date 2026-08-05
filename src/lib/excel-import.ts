import * as XLSX from "xlsx";
import { bcvRateNearest, type BcvRates, type Student, type Transaction } from "./lists-store";
import { calcularMontoUsd, redondearTasa, TASA_PESOS_DEFAULT } from "./fees-logic";
import type { Actividad, Condicion } from "./students-data";

function txFechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
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
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const mapped: Transaction[] = rows.map((r) => ({
          id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
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
          monto: Number(r.Monto || r.monto || 0) || 0,
          tasa: (() => {
            const v = r["Tasa cambio"] || r["Tasa"] || r.tasa;
            return v ? Number(v) : null;
          })(),
          montoUsd: Number(r["Monto USD"] || r["USD"] || r.montoUsd || 0) || 0,
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
}

const CONDICIONES: Condicion[] = ["Miembro", "Probacionista", "ClasePorClase"];

function normalizeCondicion(v: unknown): Condicion | undefined {
  const s = (v ?? "").toString().trim();
  return CONDICIONES.find((c) => c.toLowerCase() === s.toLowerCase());
}

function normalizeActividad(v: unknown): Actividad {
  const s = normText(v);
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
              actividad: iActividad !== -1 ? normalizeActividad(row[iActividad]) : "Activo",
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
              telefono:
                (iTel !== -1 ? (row[iTel] ?? "").toString().trim() : "") || existing?.telefono,
              cedula: iDoc !== -1 ? (row[iDoc] ?? "").toString().trim() : existing?.cedula,
              correo: iCorreo !== -1 ? (row[iCorreo] ?? "").toString().trim() : existing?.correo,
              direccion: iDir !== -1 ? (row[iDir] ?? "").toString().trim() : existing?.direccion,
              redesSociales:
                iRedes !== -1 ? (row[iRedes] ?? "").toString().trim() : existing?.redesSociales,
              ocupacion: iOcup !== -1 ? (row[iOcup] ?? "").toString().trim() : existing?.ocupacion,
              habilidades:
                iHab !== -1 ? (row[iHab] ?? "").toString().trim() : existing?.habilidades,
              gradoParticipacion:
                iGrado !== -1
                  ? (row[iGrado] ?? "").toString().trim()
                  : existing?.gradoParticipacion,
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
              sede: iSede !== -1 ? (row[iSede] ?? "").toString().trim() : existing?.sede,
              instructor:
                iInstructor !== -1
                  ? (row[iInstructor] ?? "").toString().trim()
                  : existing?.instructor,
              celadorNombre:
                iCelador !== -1 ? (row[iCelador] ?? "").toString().trim() : existing?.celadorNombre,
              horario:
                iHorario !== -1 ? (row[iHorario] ?? "").toString().trim() : existing?.horario,
              materias:
                iMaterias !== -1 ? (row[iMaterias] ?? "").toString().trim() : existing?.materias,
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
