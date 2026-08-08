import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import * as XLSX from "xlsx";

const K_ASIST = "sisfia_asistencias_v1";
const K_AULAS = "sisfia_aulas_meta_v2";
const K_IMPORT = "sisfia_asist_imported";
const K_REF_META = "sisfia_reflexiones_meta_v1";
const K_REF_ASIST = "sisfia_reflexiones_asist_v1";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

export type AulaMeta = {
  nombre: string;
  celador: string;
  diaSemana: string; // "Lunes", "Martes", etc.
  condicion: "Miembro" | "Probacionista";
  year: number;
  temas: Record<string, string>; // ISO date -> topic name
  /**
   * false = aula archivada. Cuando un grupo se gradúa y pasa a otra aula, la
   * anterior queda vacía y no debe aparecer en el día a día ni en el
   * diagnóstico, pero SU HISTORIAL NO SE BORRA: la asistencia de ese año
   * sigue haciendo falta para los reportes. Ausente = activa (las aulas que
   * ya estaban guardadas antes de existir este campo).
   */
  activa?: boolean;
};

export type AttendanceRecord = {
  aula: string;
  alumno: string;
  fecha: string; // ISO
  asistencia: "" | "A" | "I" | "NC";
  reflexion: "" | "E" | "NE" | "SE";
};

export type ReflexionMeta = {
  id: string;
  aula: string;
  year: number;
  titulo: string;
  fecha: string;
  temaFecha?: string; // ISO date of the linked tema (for grouped reflections)
};

export type ReflexionAsistencia = {
  aula: string;
  alumno: string;
  reflexionId: string;
  estado: "" | "E" | "NE";
};

export function generateFechas(diaSemana: string, year: number): string[] {
  const dayMap: Record<string, number> = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
  };
  const target = dayMap[diaSemana];
  if (target === undefined) return [];
  const dates: string[] = [];
  const d = new Date(year, 0, 1);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  while (d.getFullYear() === year && dates.length < 52) {
    const iso = d.toISOString().slice(0, 10);
    if (iso.endsWith("-01-01")) {
      d.setDate(d.getDate() + 7);
      continue;
    }
    dates.push(iso);
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

export function useAulasMeta(): [AulaMeta[], Dispatch<SetStateAction<AulaMeta[]>>] {
  const [items, setItems] = useState<AulaMeta[]>(() => load<AulaMeta[]>(K_AULAS, []));
  useEffect(() => {
    save(K_AULAS, items);
  }, [items]);
  return [items, setItems];
}

export function useAttendance(): [
  AttendanceRecord[],
  Dispatch<SetStateAction<AttendanceRecord[]>>,
] {
  const [items, setItems] = useState<AttendanceRecord[]>(() =>
    load<AttendanceRecord[]>(K_ASIST, []),
  );
  useEffect(() => {
    save(K_ASIST, items);
  }, [items]);
  return [items, setItems];
}

export function useReflexionesMeta(): [ReflexionMeta[], Dispatch<SetStateAction<ReflexionMeta[]>>] {
  const [items, setItems] = useState<ReflexionMeta[]>(() => load<ReflexionMeta[]>(K_REF_META, []));
  useEffect(() => {
    save(K_REF_META, items);
  }, [items]);
  return [items, setItems];
}

export function useReflexionAsistencia(): [
  ReflexionAsistencia[],
  Dispatch<SetStateAction<ReflexionAsistencia[]>>,
] {
  const [items, setItems] = useState<ReflexionAsistencia[]>(() =>
    load<ReflexionAsistencia[]>(K_REF_ASIST, []),
  );
  useEffect(() => {
    save(K_REF_ASIST, items);
  }, [items]);
  return [items, setItems];
}

export function importFromExcel(file: File): Promise<{
  aulas: AulaMeta[];
  records: AttendanceRecord[];
  reflexionesMeta: ReflexionMeta[];
  reflexionAsistencia: ReflexionAsistencia[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: "array" });
        const aulas: AulaMeta[] = [];
        const records: AttendanceRecord[] = [];
        const reflexionesMeta: ReflexionMeta[] = [];
        const reflexionAsistencia: ReflexionAsistencia[] = [];

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

          // La fila de encabezado es la que empieza con "#". Antes se daba por
          // hecho que estaba en data[6] y que los alumnos arrancaban en
          // data[9]; en realidad arrancan justo debajo del encabezado, así que
          // se perdían los dos primeros integrantes de CADA aula.
          let headerIdx = 6;
          for (let i = 0; i < Math.min(data.length, 20); i++) {
            if (String(data[i]?.[0] ?? "").trim() === "#") {
              headerIdx = i;
              break;
            }
          }
          const headerRow = data[headerIdx] || [];
          const primeraFilaAlumno = headerIdx + 1;
          const condicion = (
            (headerRow[1] || "").trim() === "Probacionista" ? "Probacionista" : "Miembro"
          ) as "Miembro" | "Probacionista";

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

          // Detect reflexion column pairs ("1era","2da") from the header row
          const refCols: number[] = [];
          for (let c = 2; c < headerRow.length; c++) {
            const v = String(headerRow[c] ?? "")
              .trim()
              .toLowerCase();
            if (v === "1era" || v === "1ra" || v === "2da") {
              refCols.push(c);
            }
          }
          const refPairs: [number, number][] = [];
          for (let i = 0; i + 1 < refCols.length; i += 2) {
            refPairs.push([refCols[i], refCols[i + 1]]);
          }

          // Los temas viven en la fila de arriba del encabezado, pero dentro
          // del bloque de reflexiones: una celda por tema, encima de su
          // columna "1era". Antes se buscaban en las columnas de fechas —donde
          // no hay nada— y además se descartaba cualquier valor numérico, así
          // que las aulas con temas numerados ("1", "2", …) se quedaban sin
          // ninguno.
          const temaRow = data[headerIdx - 1] || [];

          // Los nombres de los temas pueden estar en DOS sitios según el aula:
          // arriba, sobre la columna "1era" de cada tema, o en un bloque
          // "Temas" más abajo en la hoja (número en la primera columna, nombre
          // en la segunda). Krishna I los tiene abajo y arriba solo números;
          // Arjuna I justo al revés. Se leen los dos.
          const temaPorNumero: Record<number, string> = {};
          for (let r = 0; r < data.length; r++) {
            if (
              String(data[r]?.[0] ?? "")
                .trim()
                .toLowerCase() !== "temas"
            )
              continue;
            for (let k = r + 1; k < Math.min(data.length, r + 80); k++) {
              const num = String(data[k]?.[0] ?? "").trim();
              if (!num) continue; // fila en blanco dentro del bloque
              if (!/^\d+$/.test(num)) break; // terminó el listado
              const nombreTema = String(data[k]?.[1] ?? "").trim();
              if (nombreTema) temaPorNumero[Number(num)] = nombreTema;
            }
            break;
          }

          // Las celdas que solo traen el número correlativo ("12", "13", …) son
          // el marcador del Excel para temas todavía sin nombre. Tomarlas como
          // título producía cosas como "Reflexión 12: 12".
          const temaPorReflexion = refPairs.map(([c1], i) => {
            const arriba = String(temaRow[c1] ?? "").trim();
            if (arriba && !/^\d+$/.test(arriba)) return arriba;
            return temaPorNumero[i + 1] ?? "";
          });

          /**
           * A qué clase corresponde cada tema.
           *
           * El Excel no dice en qué fecha se dio cada tema, así que se reparten
           * a lo largo del año: 17 temas en 52 clases significa que cada uno
           * dura unas tres semanas. Antes se les daban las N PRIMERAS fechas,
           * con lo que los 17 temas caían entre enero y mayo y el segundo
           * semestre quedaba sin ninguno.
           */
          const fechaDeTema = (i: number): string => {
            if (!fechas.length) return "";
            if (refPairs.length <= 1) return fechas[0];
            const paso = fechas.length / refPairs.length;
            return fechas[Math.min(fechas.length - 1, Math.floor(i * paso))];
          };

          const temas: Record<string, string> = {};
          for (let i = 0; i < refPairs.length; i++) {
            const fecha = fechaDeTema(i);
            if (fecha && temaPorReflexion[i]) temas[fecha] = temaPorReflexion[i];
          }

          aulas.push({ nombre, celador, diaSemana, condicion, year: 2026, temas });

          // Una ReflexionMeta por tema. El id es determinista (aula + número
          // de tema) para que al reimportar el archivo las entregas ya
          // registradas sigan apuntando a la misma reflexión; con ids basados
          // en Date.now() cada importación las dejaba huérfanas.
          const reflexionIdPorIndice: string[] = [];
          for (let i = 0; i < refPairs.length; i++) {
            const fecha = fechaDeTema(i);
            const id = `ref_${sheetName.replace(/\s/g, "_")}_${i + 1}`;
            const tema = temaPorReflexion[i];
            // Sin nombre de tema se queda solo el número: la fecha ya se
            // muestra al lado en la lista, repetirla aquí sobraba.
            const titulo = tema ? `Reflexión ${i + 1}: ${tema}` : `Reflexión ${i + 1}`;
            reflexionIdPorIndice[i] = id;
            reflexionesMeta.push({ id, aula: nombre, year: 2026, titulo, fecha, temaFecha: fecha });
          }

          // Los alumnos empiezan justo debajo del encabezado.
          for (let r = primeraFilaAlumno; r < data.length; r++) {
            const row = data[r];
            const numCol = row[0]?.toString() ?? "";
            const alumno = String(row[1] ?? "").trim();
            if (!alumno || alumno === "#N/A" || !/^\d+$/.test(numCol)) continue;

            // Skip rows with no attendance or reflexion data at all
            const hasAny =
              dateCols.some((c) => {
                const v = String(row[c] ?? "")
                  .trim()
                  .toUpperCase();
                return v === "A" || v === "I" || v === "NC";
              }) ||
              refPairs.some(([c1, c2]) => {
                const v1 = String(row[c1] ?? "")
                  .trim()
                  .toUpperCase();
                const v2 = String(row[c2] ?? "")
                  .trim()
                  .toUpperCase();
                return v1 === "E" || v2 === "E";
              });
            if (!hasAny) continue;

            // Attendance marks
            for (let i = 0; i < dateCols.length; i++) {
              const c = dateCols[i];
              const mark = String(row[c] ?? "")
                .trim()
                .toUpperCase();
              let asistencia: "" | "A" | "I" | "NC" = "";
              if (mark === "A") asistencia = "A";
              else if (mark === "I") asistencia = "I";
              else if (mark === "NC") asistencia = "NC";
              records.push({ aula: nombre, alumno, fecha: fechas[i], asistencia, reflexion: "" });
            }

            // Entregas de reflexiones. Se recorren TODOS los temas: antes el
            // bucle se cortaba con Math.min(dateCols.length, …), que mezclaba
            // el número de clases con el de temas sin motivo.
            for (let i = 0; i < refPairs.length; i++) {
              const [c1, c2] = refPairs[i];
              const v1 = String(row[c1] ?? "")
                .trim()
                .toUpperCase();
              const v2 = String(row[c2] ?? "")
                .trim()
                .toUpperCase();
              const entregada = v1 === "E" || v2 === "E";
              const noEntregada = v1 === "NE" || v2 === "NE";
              if (!entregada && !noEntregada) continue;
              reflexionAsistencia.push({
                aula: nombre,
                alumno,
                reflexionId: reflexionIdPorIndice[i],
                estado: entregada ? "E" : "NE",
              });
            }
          }
        }

        resolve({ aulas, records, reflexionesMeta, reflexionAsistencia });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function isoToShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m.slice(2)}`;
}

function serialToIso(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

// Aquí vivía un sistema de permisos anterior a Supabase: una lista `USERS` con
// los nombres del personal escritos a mano y un `getUserInfo()` que repartía
// accesos comparando el nombre que la persona hubiera tecleado.
//
// Se eliminó por dos razones, y la primera pesa más:
//
// 1. Guardaba CUATRO NOMBRES REALES del personal en texto plano, en un
//    repositorio al que tienen acceso personas que no deben ver esos datos.
//    Es justo lo que la escuela decidió evitar, y por lo que la semilla de
//    alumnos en students-data.ts se dejó vacía.
//
// 2. Ya no lo usaba nadie. Los permisos salen de `profiles.role` en Supabase
//    (ver ROLE_PERMS en src/lib/api/auth.functions.ts), donde los correos van
//    como hash md5 y el rol lo decide el servidor, no un nombre tecleado.
//
// Con él se fueron `useCurrentUser()` y la clave `sisfia_user`, que eran el
// resto del mismo mecanismo.
