// Lista de aulas, categorías y semilla de alumnos. Usado por la IA para mejorar el reconocimiento
// de nombres, y como semilla inicial (los cambios luego persisten en localStorage).

export type Condicion = "Miembro" | "Probacionista" | "ClasePorClase";
export type Actividad = "Activo" | "Retirado";

export type CuotaOverrideTemporal = {
  cuotaUsd: number;
  desde: string; // "YYYY-MM", inclusive
  hasta?: string; // "YYYY-MM", inclusive; si falta, no tiene fecha de fin
  nota?: string;
};

export type StudentSeed = {
  nombre: string;
  aulas: string[];
  condicion?: Condicion;
  actividad?: Actividad;
  celador?: boolean;
  /** Cuota mensual override en USD (si es distinta de la regla general). */
  cuotaOverride?: number;
  cuotaOverridesTemporales?: CuotaOverrideTemporal[];
  fechaIngreso?: string; // YYYY-MM-DD, si falta se asigna según aula
};

export const AULAS_DEFAULT = [
  "Arjuna I",
  "Arjuna II",
  "Arjuna II 2026",
  "Krishna I",
  "Krishna II",
  "Krishna III",
  "Krishna IV",
  "Krishna V",
  "Krishna VI",
];

// NOTA: la lista oficial de alumnos NO se guarda en el repositorio porque es
// dato personal. La semilla queda vacía; los integrantes reales se cargan desde
// localStorage y, en el futuro, desde Supabase (tabla `students`).
// El OCR recibe la lista de alumnos desde el componente (que sale de
// localStorage), así que el reconocimiento de nombres sigue funcionando.
export const STUDENTS: StudentSeed[] = [];

// Categorías oficiales — INGRESOS
export const CATEGORIAS_INGRESO = [
  "MIEMBROS",
  "PROBAS",
  "CLASE",
  // Lo que se cobra por un campamento. No es cuota social: pagarlo no pone a
  // nadie al día con su mensualidad, por eso no está en CAT_CUOTA. Se usa
  // también para los pagos de la sede de Táriba, que llevan "Tariba:" delante
  // de la descripción igual que los préstamos llevan el nombre.
  "CAMPAMENTO",
  "DIFUSION",
  "EVENTOS F.C.",
  "Filosofia Café",
  "HERBOLARIA",
  "INSC FILOS",
  "INTERESES PTAMO",
  "MANTENIMI",
  "MITOLOGIA",
  "MTC",
  "Otros Ingresos",
  "PRESTAMO",
  "TAICHI",
  "CONVERSIÓN",
  "TERAPIA MTC",
  "TERAPIAS MTC",
  "VENTA DE LIBRO",
] as const;

// Categorías oficiales — GASTOS
export const CATEGORIAS_GASTO = [
  "ALQUILER",
  "COMISIONES BANCARIAS",
  "CONTADORA",
  "HONORARIOS PROFESIONALES",
  "INTEGRACON",
  "INTERNET",
  "MANTENIMI",
  "PRESTAMO",
  "PRÉSTAMOS, PROFESOR",
  "PRUEBA CTA VZLA",
  "PUBLICIDAD",
  "SECRETARIAS",
  "SERVICIOS",
  "CONVERSIÓN",
  "SERVICIOS PUBLICOS",
] as const;

// Categorías consideradas "principales" en el resumen mensual (subtotales aparte).
export const INGRESO_PRINCIPALES = ["MIEMBROS", "PROBAS", "CLASE"] as const;

// Mapa de nombres de columnas del Excel matriz → categoría canónica + tipo
export const MATRIZ_CATEGORY_MAP: Record<
  string,
  { categoria: string; tipo: "Ingreso" | "Gasto"; banco: string }
> = {
  MIEMBROS: { categoria: "MIEMBROS", tipo: "Ingreso", banco: "Efectivo USD" },
  PROBAS: { categoria: "PROBAS", tipo: "Ingreso", banco: "Efectivo USD" },
  "INSCRIPICION FILOSOFIA": { categoria: "INSC FILOS", tipo: "Ingreso", banco: "Efectivo USD" },
  "MTC KARINA": { categoria: "MTC", tipo: "Ingreso", banco: "Efectivo USD" },
  CLASE: { categoria: "CLASE", tipo: "Ingreso", banco: "Efectivo USD" },
  taichi: { categoria: "TAICHI", tipo: "Ingreso", banco: "Efectivo USD" },
  DIFUSION: { categoria: "DIFUSION", tipo: "Ingreso", banco: "Efectivo USD" },
  "F.CAFEarte terapia": { categoria: "TERAPIA MTC", tipo: "Ingreso", banco: "Efectivo USD" },
  "MTC consulta (11,25) terapias (5,62)": {
    categoria: "MTC",
    tipo: "Ingreso",
    banco: "Efectivo USD",
  },
  "MTC  herbolaria": { categoria: "HERBOLARIA", tipo: "Ingreso", banco: "Efectivo USD" },
  "MITOLOGIA 15$-10$acrop": { categoria: "MITOLOGIA", tipo: "Ingreso", banco: "Efectivo USD" },
  "F.CAFE EVENTOS": { categoria: "EVENTOS F.C.", tipo: "Ingreso", banco: "Efectivo USD" },
  PROFESOR: { categoria: "HONORARIOS PROFESIONALES", tipo: "Gasto", banco: "Efectivo USD" },
  ALQUI: { categoria: "ALQUILER", tipo: "Gasto", banco: "Efectivo Bs" },
  integracon: { categoria: "INTEGRACON", tipo: "Gasto", banco: "Efectivo Bs" },
  "servicios publicos": { categoria: "SERVICIOS PUBLICOS", tipo: "Gasto", banco: "Efectivo Bs" },
  HONORARIOS: { categoria: "HONORARIOS PROFESIONALES", tipo: "Gasto", banco: "Efectivo Bs" },
  MANTENIMI: { categoria: "MANTENIMI", tipo: "Gasto", banco: "Efectivo Bs" },
  INTERNET: { categoria: "INTERNET", tipo: "Gasto", banco: "Efectivo Bs" },
  "comision bco": { categoria: "COMISIONES BANCARIAS", tipo: "Gasto", banco: "Efectivo Bs" },
  PRESTAMOS: { categoria: "PRESTAMO", tipo: "Gasto", banco: "Efectivo USD" },
  "PRÉSTAMOS PROFESOR": { categoria: "PRÉSTAMOS, PROFESOR", tipo: "Gasto", banco: "Efectivo USD" },
  impuestos: { categoria: "SERVICIOS", tipo: "Gasto", banco: "Efectivo Bs" },
};

export function studentListForPrompt(): string {
  return STUDENTS.filter((s) => s.actividad !== "Retirado")
    .map((s) => `- ${s.nombre} → ${s.aulas.join(", ")}`)
    .join("\n");
}
