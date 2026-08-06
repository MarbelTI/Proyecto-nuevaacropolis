import type { Student } from "./lists-store";

// ---------- Reglas de cuota mensual (USD) ----------
//
// REGLA GENERAL, la que se aplica si de esa persona no se dice nada:
//   - Hasta 2025-12: 18 USD
//   - Desde 2026-01: 20 USD
// Probacionistas: 0 (no cuota fija; pagan aparte según curso).
// ClasePorClase: no cuota mensual, pagan por asistencia.
//
// LAS EXCEPCIONES NO SE ESCRIBEN AQUÍ.
// Quién paga 15, quién paga 25 y desde cuándo es información de personas
// concretas, y este archivo está en el repositorio: quien tiene acceso al
// código no tiene por qué saber quién paga menos. Cada excepción vive en la
// ficha de esa persona y se carga desde la pantalla de Solvencias:
//   - cuotaOverride ............ importe fijo, todos los meses
//   - cuotaOverridesTemporales . importe a partir de un mes (o entre dos)
// Se comprueban en ese orden, y el override permanente gana si están los dos.

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

  const ym = Number(yearMonth.replace("-", ""));

  const overrideTemporal = (student.cuotaOverridesTemporales ?? []).find((o) => {
    const desde = Number(o.desde.replace("-", ""));
    const hasta = o.hasta ? Number(o.hasta.replace("-", "")) : Infinity;
    return ym >= desde && ym <= hasta;
  });
  if (overrideTemporal) return overrideTemporal.cuotaUsd;

  if (ym <= 202512) return 18;
  return 20;
}

/**
 * true si la cuota de esa persona está puesta a mano en su ficha, sea cual sea
 * el importe — incluido 0.
 *
 * Hace falta para distinguir dos ceros que significan cosas distintas:
 *   - "no paga cuota social porque así se decidió" (membresía, becado)
 *   - "no tiene cuota fija asignada" (probacionistas, que pagan por curso)
 * El primero es una respuesta definitiva; el segundo, la ausencia de dato.
 */
export function cuotaEsExplicita(student: Student, yearMonth: string): boolean {
  if (typeof student.cuotaOverride === "number") return true;
  const ym = Number(yearMonth.replace("-", ""));
  return (student.cuotaOverridesTemporales ?? []).some((o) => {
    const desde = Number(o.desde.replace("-", ""));
    const hasta = o.hasta ? Number(o.hasta.replace("-", "")) : Infinity;
    return ym >= desde && ym <= hasta;
  });
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
  const ingresoYm = student.fechaIngreso ? student.fechaIngreso.slice(0, 7) : "2000-01";
  const start = lastPaidYm
    ? nextYm(lastPaidYm)
    : ingresoYm > aulaStartYm(student.aulas)
      ? ingresoYm
      : aulaStartYm(student.aulas);
  let cur = start;
  let guard = 0;
  while (cur <= currentYm && guard++ < 120) {
    let c = cuotaMensualUSD(student, cur);
    // Quien no tiene cuota fija (probacionistas) igual debe algo: se usa como
    // referencia lo que pagó la última vez.
    //
    // Pero si la cuota está puesta a mano en 0, ese 0 es la respuesta y no se
    // toca. Si no, a quien está exento de cuota social le reaparecería una
    // deuda cada mes solo por haber hecho algún pago suelto alguna vez.
    if (c <= 0 && !cuotaEsExplicita(student, cur) && lastPayAmount && lastPayAmount > 0) {
      c = lastPayAmount;
    }
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
export function calcularMontoUsd(moneda: string, monto: number, tasa: number | null): number {
  if (!monto || !isFinite(monto)) return 0;
  if (moneda === "USD" || moneda === "" || moneda === "Dólares") return monto;
  if (!tasa || !isFinite(tasa) || tasa <= 0) return 0;
  return monto / tasa;
}

/** Tasa por defecto para pesos colombianos. */
export const TASA_PESOS_DEFAULT = 4000;

/**
 * Toda tasa de cambio se guarda y se muestra con 2 decimales, sin importar
 * cuántos traiga el origen (BCV publica más, y a mano se pueden escribir 4).
 * Se redondea al ESCRIBIR, no solo al mostrar, para que la tasa guardada y el
 * monto en dólares calculado con ella siempre coincidan.
 */
export function redondearTasa(tasa: number | null): number | null {
  if (tasa == null || !isFinite(tasa)) return null;
  return Math.round(tasa * 100) / 100;
}

/** Formatea una tasa para mostrar (siempre 2 decimales, "—" si no hay). */
export function formatTasa(tasa: number | null | undefined): string {
  if (tasa == null || !isFinite(Number(tasa)) || Number(tasa) === 0) return "—";
  return Number(tasa).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
