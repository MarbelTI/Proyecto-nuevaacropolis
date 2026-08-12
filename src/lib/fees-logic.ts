import type { Student } from "./lists-store";
import { hoyVenezuela } from "./formato";

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
  // Con una cadena mal formada, `split` no devuelve las dos partes y esto daba
  // NaN en silencio: NaN >= 202606 es false, así que salía el precio viejo sin
  // que nada avisara.
  const [y = 0, m = 0] = yearMonth.split("-").map(Number);
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

/**
 * Pasa una mensualidad escrita a mano a "YYYY-MM".
 *
 * En la columna `mensualidad` la gente escribe "ene-26", "ene-2026", "enero
 * 2026", "2026-01" o "01/2026", y todas quieren decir lo mismo. Devuelve null
 * si no se reconoce: eso significa "este pago no dice qué mes cubre", que es
 * distinto de cubrir el mes cero.
 */
const MESES_ABR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function mensualidadAYm(texto: string | undefined | null): string | null {
  const t = (texto ?? "").trim().toLowerCase();
  if (!t) return null;

  // "2026-01" o "2026/1"
  const iso = t.match(/^(\d{4})[-/](\d{1,2})$/);
  if (iso) {
    const m = Number(iso[2]);
    if (m >= 1 && m <= 12) return `${iso[1]}-${String(m).padStart(2, "0")}`;
    return null;
  }

  // "ene-26", "enero-2026", "01/2026", "1-26"
  const par = t.match(/^([a-záéíóú]{3,10}|\d{1,2})[-/\s]+(\d{2,4})$/);
  if (!par) return null;
  const [, mesTexto = "", anioTexto = ""] = par;
  const anio = anioTexto.length === 2 ? 2000 + Number(anioTexto) : Number(anioTexto);
  if (!isFinite(anio)) return null;

  let mes: number;
  if (/^\d+$/.test(mesTexto)) {
    mes = Number(mesTexto);
  } else {
    // "septiembre" y "sep" caen los dos en el mismo sitio con los 3 primeros.
    // ̀-ͯ son las tildes sueltas que deja NFD: "septiembre" y
    // "setiembre" mal acentuado acaban igual.
    const abr = mesTexto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .slice(0, 3);
    mes = MESES_ABR.indexOf(abr) + 1;
  }
  if (mes < 1 || mes > 12) return null;
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** Los pagos de un alumno, resumidos para el cálculo de deuda. */
export type PagosDelAlumno = {
  /**
   * La mensualidad más adelantada que se ha pagado (YYYY-MM). Es la línea de
   * flotación: se debe de ahí en adelante.
   *
   * Se mira la mensualidad DECLARADA, nunca la fecha del movimiento. Si en
   * marzo alguien paga la cuota de enero, lo que salda es enero.
   */
  ultimaMensualidad: string | null;
  /**
   * Mes (YYYY-MM) del pago más reciente que NO declaró mensualidad.
   *
   * Los movimientos antiguos no traen esa columna. Para esos no queda más
   * remedio que usar la fecha del pago y dar por saldado lo anterior: es lo
   * único que se sabe. Sin esto, a media escuela le aparecería una deuda de
   * meses que sí estaban pagados, solo que sin registrar cuál.
   */
  ultimoMesSinDeclarar: string | null;
  /** Importe del último pago: referencia para quien no tiene cuota fija. */
  ultimoMonto?: number | undefined;
};

/**
 * Resume los pagos de una persona a partir de sus movimientos de cuota.
 *
 * `iso` es la fecha del movimiento en formato YYYY-MM-DD (null si no se pudo
 * leer) y `mensualidad` el mes que ese pago dice cubrir.
 */
export function resumirPagos(
  pagos: { iso: string | null; mensualidad?: string; monto?: number }[],
): PagosDelAlumno {
  let ultimaMensualidad: string | null = null;
  let ultimoMesSinDeclarar: string | null = null;
  let ultimoIso: string | null = null;
  let ultimoMonto: number | undefined;

  for (const p of pagos) {
    const ym = mensualidadAYm(p.mensualidad);
    if (ym) {
      if (!ultimaMensualidad || ym > ultimaMensualidad) ultimaMensualidad = ym;
    } else if (p.iso) {
      const mesPago = p.iso.slice(0, 7);
      if (!ultimoMesSinDeclarar || mesPago > ultimoMesSinDeclarar) ultimoMesSinDeclarar = mesPago;
    }
    if (p.iso && (!ultimoIso || p.iso > ultimoIso)) {
      ultimoIso = p.iso;
      ultimoMonto = p.monto;
    }
  }

  return { ultimaMensualidad, ultimoMesSinDeclarar, ultimoMonto };
}

/**
 * Cuotas debidas, mes a mes, desde el arranque hasta hoy.
 *
 * Se cuenta desde el mes siguiente a la última MENSUALIDAD pagada. Antes se
 * contaba desde la FECHA del último movimiento, que es otra cosa: si en marzo
 * alguien paga la cuota de enero, lo que salda es enero, no marzo. Con el
 * criterio viejo esa persona salía solvente hasta abril, y quien pagaba el año
 * entero por adelantado seguía saliendo moroso todo el año.
 */
export function calcularCuotasDebidas(
  student: Student,
  pagos: PagosDelAlumno | null,
  currentYm: string,
): { meses: number; totalUSD: number; detalle: { ym: string; cuota: number }[] } {
  if (student.condicion === "ClasePorClase") {
    return { meses: 0, totalUSD: 0, detalle: [] };
  }
  const detalle: { ym: string; cuota: number }[] = [];
  const ingresoYm = student.fechaIngreso ? student.fechaIngreso.slice(0, 7) : "2000-01";
  const arranque =
    ingresoYm > aulaStartYm(student.aulas) ? ingresoYm : aulaStartYm(student.aulas);
  // De dónde arranca la cuenta. Manda el más tardío de los tres:
  //   - el arranque del aula, o el ingreso de la persona si es posterior;
  //   - el mes siguiente a la última MENSUALIDAD pagada (la línea de
  //     flotación: si pagó hasta enero, debe de febrero en adelante, sin que
  //     importe en qué fecha lo pagó);
  //   - el mes siguiente al último pago que no declaró mensualidad, donde la
  //     fecha es lo único que hay.
  const suelos = [arranque];
  if (pagos?.ultimaMensualidad) suelos.push(nextYm(pagos.ultimaMensualidad));
  if (pagos?.ultimoMesSinDeclarar) suelos.push(nextYm(pagos.ultimoMesSinDeclarar));
  const start = suelos.reduce((a, b) => (b > a ? b : a));
  const lastPayAmount = pagos?.ultimoMonto;

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
  const [y = 0, m = 0] = ym.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** El mes en curso EN VENEZUELA. Ver hoyVenezuela: el servidor va en UTC. */
export function currentYm(): string {
  return hoyVenezuela().slice(0, 7);
}

/**
 * Recalcula USD desde monto + tasa + moneda.
 *
 * Se redondea a 2 decimales al CALCULAR, no solo al mostrar. Una división
 * entre la tasa da cosas como 12.345678, y ese número se guardaba tal cual:
 * la tabla lo mostraba bonito, pero el formulario, el Excel exportado y los
 * totales sacaban cuatro y cinco decimales.
 *
 * Un importe en dólares tiene dos decimales y punto. Guardar más precisión de
 * la que existe no es más exacto: es arrastrar basura que reaparece en la
 * primera pantalla que no formatee.
 */
export function calcularMontoUsd(moneda: string, monto: number, tasa: number | null): number {
  if (!monto || !isFinite(monto)) return 0;
  if (moneda === "USD" || moneda === "" || moneda === "Dólares") {
    return Math.round(monto * 100) / 100;
  }
  if (!tasa || !isFinite(tasa) || tasa <= 0) return 0;
  return Math.round((monto / tasa) * 100) / 100;
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
