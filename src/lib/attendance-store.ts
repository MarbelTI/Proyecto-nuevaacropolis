import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import * as XLSX from "xlsx";

const K_ASIST = "sisfia_asistencias_v1";
const K_AULAS = "sisfia_aulas_meta_v2";
const K_USER = "sisfia_user";
const K_IMPORT = "sisfia_asist_imported";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function save<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch { /* ignore */ }
}

export type AulaMeta = {
  nombre: string;
  celador: string;
  diaSemana: string; // "Lunes", "Martes", etc.
  condicion: "Miembro" | "Probacionista";
  year: number;
  temas: Record<string, string>; // ISO date -> topic name
};

export type AttendanceRecord = {
  aula: string;
  alumno: string;
  fecha: string; // ISO
  asistencia: "" | "A" | "I" | "NC";
  reflexion: "" | "E" | "NE" | "SE";
};

export function generateFechas(diaSemana: string, year: number): string[] {
  const dayMap: Record<string, number> = {
    "Domingo": 0, "Lunes": 1, "Martes": 2, "Miércoles": 3,
    "Jueves": 4, "Viernes": 5, "Sábado": 6,
  };
  const target = dayMap[diaSemana];
  if (target === undefined) return [];
  const dates: string[] = [];
  const d = new Date(year, 0, 1);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  while (d.getFullYear() === year && dates.length < 52) {
    const iso = d.toISOString().slice(0, 10);
    if (iso.endsWith("-01-01")) { d.setDate(d.getDate() + 7); continue; }
    dates.push(iso);
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

export function useAulasMeta(): [AulaMeta[], Dispatch<SetStateAction<AulaMeta[]>>] {
  const [items, setItems] = useState<AulaMeta[]>(() => load<AulaMeta[]>(K_AULAS, []));
  useEffect(() => { save(K_AULAS, items); }, [items]);
  return [items, setItems];
}

export function useAttendance(): [AttendanceRecord[], Dispatch<SetStateAction<AttendanceRecord[]>>] {
  const [items, setItems] = useState<AttendanceRecord[]>(() => load<AttendanceRecord[]>(K_ASIST, []));
  useEffect(() => { save(K_ASIST, items); }, [items]);
  return [items, setItems];
}

export function useCurrentUser(): [string, Dispatch<SetStateAction<string>>] {
  const [user, setUser] = useState<string>(() => load<string>(K_USER, ""));
  useEffect(() => { save(K_USER, user); }, [user]);
  return [user, setUser];
}

export function importFromExcel(
  file: File,
): Promise<{ aulas: AulaMeta[]; records: AttendanceRecord[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: "array" });
        const aulas: AulaMeta[] = [];
        const records: AttendanceRecord[] = [];

        // Parse aula sheets
        const aulaSheets = wb.SheetNames.filter(
          (n) => n.startsWith("Krishna") || n.startsWith("Arjuna"),
        );

        for (const sheetName of aulaSheets) {
          const ws = wb.Sheets[sheetName];
          const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

          const nombre = (data[2]?.[1] || "").trim();
          const diaSemana = (data[3]?.[1] || "").trim();
          const celador = (data[4]?.[1] || "").trim();
          const condicion = ((data[6]?.[1] || "").trim() === "Probacionista" ? "Probacionista" : "Miembro") as "Miembro" | "Probacionista";

          const headerRow = data[6] || [];

          // Collect date columns (serial numbers > 40000)
          const dateCols: number[] = [];
          const fechas: string[] = [];
          for (let c = 2; c < headerRow.length; c++) {
            const val = headerRow[c];
            if (val === undefined || val === null || val === "") continue;
            const num = Number(val);
            if (!isNaN(num) && num > 40000) {
              dateCols.push(c);
              fechas.push(serialToIso(num));
            }
          }

          // Collect temas from row 5 (index 5 = row 6 in Excel)
          const temaRow = data[5] || [];
          const temas: Record<string, string> = {};
          for (let i = 0; i < dateCols.length; i++) {
            const col = dateCols[i];
            const val = String(temaRow[col] ?? "").trim();
            if (val && val !== "Tema:" && isNaN(Number(val))) {
              temas[fechas[i]] = val;
            }
          }

          // Detect reflexion column pairs ("1era","2da") from the header row
          const refCols: number[] = [];
          for (let c = 2; c < headerRow.length; c++) {
            const v = String(headerRow[c] ?? "").trim().toLowerCase();
            if (v === "1era" || v === "1ra" || v === "2da") {
              refCols.push(c);
            }
          }
          const refPairs: [number, number][] = [];
          for (let i = 0; i + 1 < refCols.length; i += 2) {
            refPairs.push([refCols[i], refCols[i + 1]]);
          }

          aulas.push({ nombre, celador, diaSemana, condicion, year: 2026, temas });

          // Parse student attendance data starting from row 9 (0-indexed)
          for (let r = 9; r < data.length; r++) {
            const row = data[r];
            const numCol = row[0]?.toString() ?? "";
            const alumno = String(row[1] ?? "").trim();
            if (!alumno || alumno === "#N/A" || !/^\d+$/.test(numCol)) continue;

            // Skip rows with no attendance or reflexion data at all
            const hasAny = dateCols.some((c) => {
              const v = String(row[c] ?? "").trim().toUpperCase();
              return v === "A" || v === "I" || v === "NC";
            }) || refPairs.some(([c1, c2]) => {
              const v1 = String(row[c1] ?? "").trim().toUpperCase();
              const v2 = String(row[c2] ?? "").trim().toUpperCase();
              return v1 === "E" || v2 === "E";
            });
            if (!hasAny) continue;

            // Attendance marks
            for (let i = 0; i < dateCols.length; i++) {
              const c = dateCols[i];
              const mark = String(row[c] ?? "").trim().toUpperCase();
              let asistencia: "" | "A" | "I" | "NC" = "";
              if (mark === "A") asistencia = "A";
              else if (mark === "I") asistencia = "I";
              else if (mark === "NC") asistencia = "NC";
              records.push({ aula: nombre, alumno, fecha: fechas[i], asistencia, reflexion: "" });
            }

            // Reflexion marks — map each (1era,2da) pair to the corresponding date
            for (let i = 0; i < Math.min(dateCols.length, refPairs.length); i++) {
              const [c1, c2] = refPairs[i];
              const v1 = String(row[c1] ?? "").trim().toUpperCase();
              const v2 = String(row[c2] ?? "").trim().toUpperCase();
              const e = v1 === "E" || v2 === "E" ? "E" : "";
              if (e) {
                records.push({ aula: nombre, alumno, fecha: fechas[i], asistencia: "", reflexion: "E" });
              }
            }
          }
        }

        resolve({ aulas, records });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function serialToIso(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

export const USERS: { name: string; canAccessExisting: boolean; canAccessAsistencias: boolean; canAccessDiagnostico: boolean; canEditAnyAula: boolean }[] = [
  { name: "Manuela Zambrano", canAccessExisting: true, canAccessAsistencias: false, canAccessDiagnostico: false, canEditAnyAula: false },
  { name: "Margelys Santos", canAccessExisting: true, canAccessAsistencias: true, canAccessDiagnostico: true, canEditAnyAula: true },
  { name: "Ricardo Garcia", canAccessExisting: true, canAccessAsistencias: true, canAccessDiagnostico: true, canEditAnyAula: true },
  { name: "Karina Rodrigues", canAccessExisting: true, canAccessAsistencias: true, canAccessDiagnostico: true, canEditAnyAula: true },
];

export function getUserInfo(name: string, aulasMeta: AulaMeta[]) {
  const known = USERS.find((u) => u.name.toLowerCase() === name.toLowerCase());
  if (known) return { ...known, celadorAula: undefined as string | undefined };
  const celadorAula = aulasMeta.find((a) => a.celador.toLowerCase() === name.toLowerCase());
  if (celadorAula) {
    return {
      name, canAccessExisting: false, canAccessAsistencias: true, canAccessDiagnostico: false,
      canEditAnyAula: false, celadorAula: celadorAula.nombre,
    };
  }
  return {
    name, canAccessExisting: false, canAccessAsistencias: false, canAccessDiagnostico: false,
    canEditAnyAula: false, celadorAula: undefined as string | undefined,
  };
}
