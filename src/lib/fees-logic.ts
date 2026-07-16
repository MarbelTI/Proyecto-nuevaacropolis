import type { Student } from "./lists-store";

// ---------- Reglas de cuota mensual (USD) ----------
// Miembros:
//   - Hasta 2025-12: 18 USD (salvo excepciones bajas por hardship).
//   - 2026-01 → 2026-04: 20 USD para todos.
//   - Desde 2026-05: 20 USD, salvo lista de 25 USD.
// Probacionistas: 0 (no cuota fija; pagan aparte según curso).
// ClasePorClase: no cuota mensual, pagan por asistencia.
// cuotaOverride del alumno gana siempre (0 = becado sin cuota).

const BAJAS_HASTA_2025 = new Map<string, number>([
  ["Carlos Angel Jimenez Bermeo", 15],
  ["Elmer Rincon", 15],
  ["Manuela Zambrano", 15],
  ["Lourdes Josefina Moreno Márquez", 13.5],
]);

const SUBEN_25_DESDE_MAYO_2026 = new Set<string>([
  "Rosana Escalante",
  "Victor Jaimes",
  "Jacqueline Salazar",
  "Laura Sanchez",
  "Mariana Isabella Barajas",
]);

function normalize(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const BAJAS_NORM = new Map(
  Array.from(BAJAS_HASTA_2025.entries()).map(([k, v]) => [normalize(k), v]),
);
const SUBEN_NORM = new Set(Array.from(SUBEN_25_DESDE_MAYO_2026).map(normalize));

/** Precio por clase para "ClasePorClase" según el mes (referencial, no genera deuda). */
export function precioClase(yearMonth: string): number {
  const [y, m] = yearMonth.split("-").map(Number);
  const ym = y * 100 + m;
  if (ym >= 202606) return 10;
  return 5;
}

/** Fecha de arranque de un aula (para calcular meses debidos correctamente). */
export function aulaStartYm(aulas: string[]): string {
  if (aulas.includes("Arjuna II 2026")) return "2026-06";
  if (aulas.includes("Arjuna I")) return "2026-02";
  // Krishnas y Arjuna II ya existían, se rastrean desde ene-2025.
  return "2025-01";
}

export function cuotaMensualUSD(student: Student, yearMonth: string): number {
  if (typeof student.cuotaOverride === "number") return student.cuotaOverride;
  if (student.condicion === "ClasePorClase") return 0;
  if (student.condicion === "Probacionista") return 0;

  const name = normalize(student.nombre);
  const [y, m] = yearMonth.split("-").map(Number);
  const ym = y * 100 + m;

  if (ym <= 202512) {
    return BAJAS_NORM.get(name) ?? 18;
  }
  if (ym <= 202604) return 20;
  if (SUBEN_NORM.has(name)) return 25;
  return 20;
}

/** Calcula cuotas debidas mes a mes desde el arranque (o último pago) hasta hoy. */
export function calcularCuotasDebidas(
  student: Student,
  lastPaidYm: string | null,
  currentYm: string,
  lastPayAmount?: number,
): { meses: number; totalUSD: number; detalle: { ym: string; cuota: number }[] } {
  if (student.condicion === "ClasePorClase") {
    return { meses: 0, totalUSD: 0, detalle: [] };
  }
  const detalle: { ym: string; cuota: number }[] = [];
  const ingresoYm = student.fechaIngreso ? student.fechaIngreso.slice(0,7) : "2000-01";
  const start = lastPaidYm ? nextYm(lastPaidYm) : ingresoYm > aulaStartYm(student.aulas) ? ingresoYm : aulaStartYm(student.aulas);
  let cur = start;
  let guard = 0;
  while (cur <= currentYm && guard++ < 120) {
    let c = cuotaMensualUSD(student, cur);
    // Probacionistas y otros sin cuota fija: usar el monto del último pago como referencia
    if (c <= 0 && lastPayAmount && lastPayAmount > 0) c = lastPayAmount;
    if (c > 0) detalle.push({ ym: cur, cuota: c });
    cur = nextYm(cur);
  }
  const totalUSD = detalle.reduce((s, d) => s + d.cuota, 0);
  return { meses: detalle.length, totalUSD, detalle };
}

function nextYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Recalcula USD desde monto + tasa + moneda. */
export function calcularMontoUsd(
  moneda: string,
  monto: number,
  tasa: number | null,
): number {
  if (!monto || !isFinite(monto)) return 0;
  if (moneda === "USD" || moneda === "" || moneda === "Dólares") return monto;
  if (!tasa || !isFinite(tasa) || tasa <= 0) return 0;
  return monto / tasa;
}

/** Tasa por defecto para pesos colombianos. */
export const TASA_PESOS_DEFAULT = 4000;
