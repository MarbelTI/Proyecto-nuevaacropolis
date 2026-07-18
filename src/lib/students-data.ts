// Lista oficial de alumnos y sus aulas. Usado por la IA para mejorar el reconocimiento
// de nombres, y como semilla inicial (los cambios luego persisten en localStorage).

export type Condicion = "Miembro" | "Probacionista" | "ClasePorClase";
export type Actividad = "Activo" | "Retirado";

export type CuotaOverrideTemporal = {
  cuotaUsd: number;
  desde: string;      // "YYYY-MM", inclusive
  hasta?: string;      // "YYYY-MM", inclusive; si falta, no tiene fecha de fin
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

// NOTA: esta lista es sólo la semilla inicial. Los cambios manuales (agregar,
// eliminar, modificar) se guardan en localStorage y sobreescriben esta base.
export const STUDENTS: StudentSeed[] = [
  // Arjuna I
  { nombre: "Cecilia Arias", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Diliana Gomez", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Edwar Sarmiento", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Javier Bastidas", aulas: ["Arjuna I"], condicion: "Probacionista", celador: true },
  { nombre: "Javier Perez", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Jhovani Valero", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Liliana Rivas", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Luis Rosales", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Manuel Peñaloza", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Margelys Santos", aulas: ["Arjuna I"], condicion: "Probacionista", cuotaOverride: 0 },
  { nombre: "Michel Castro", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Reina Garcia", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Rosa Olaya", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Said Ruiz", aulas: ["Arjuna I"], condicion: "Probacionista", cuotaOverride: 0 },
  { nombre: "Sara Sandoval", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Stanlyn Jaimes", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Veronica Manjarrez", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Wendy Caldera", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Yaksy Delgado", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Deisy Davila", aulas: ["Arjuna I"], condicion: "Probacionista" },
  { nombre: "Claudio Betancourt", aulas: ["Arjuna I"], condicion: "Probacionista" },

  // Arjuna II (solo retirados, para OCR histórico)
  { nombre: "Ghelen Lobo", aulas: ["Arjuna II"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Jorge Luis Davila", aulas: ["Arjuna II"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Fernando Garcia", aulas: ["Arjuna II"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Gabriela Molina", aulas: ["Arjuna II"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Darsy Contreras", aulas: ["Arjuna II"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Abel Guillen", aulas: ["Arjuna II"], condicion: "Probacionista", actividad: "Retirado" },

  // Arjuna II 2026 (nuevos)
  { nombre: "Ma Eugenia Ramirez", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Nelly Morales", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Diego Benítes", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Alberto Benítes", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "José A. Delgado", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Yenny Acevedo", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Edwin Torres", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Romario Pernia", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Yhonny Benítez", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Doris Peña", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Andreina García", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Luz Santana", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Mauro Medina", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  { nombre: "Maricela Peña", aulas: ["Arjuna II 2026"], condicion: "Probacionista" },
  // Los 7 "Clase" — pagan por clase (no cuota mensual fija)
  { nombre: "Leangel Linarez", aulas: ["Arjuna II 2026"], condicion: "ClasePorClase" },
  { nombre: "Juan Figueroa", aulas: ["Arjuna II 2026"], condicion: "ClasePorClase" },
  { nombre: "Estefany Solano", aulas: ["Arjuna II 2026"], condicion: "ClasePorClase" },
  { nombre: "Lisbeth Pérez", aulas: ["Arjuna II 2026"], condicion: "ClasePorClase" },
  { nombre: "Xiomara Suárez", aulas: ["Arjuna II 2026"], condicion: "ClasePorClase" },
  { nombre: "Lendy Báez", aulas: ["Arjuna II 2026"], condicion: "ClasePorClase" },
  { nombre: "Mayra Jaimes", aulas: ["Arjuna II 2026"], condicion: "ClasePorClase" },

  // Krishna I
  { nombre: "Alejandro Jimenez", aulas: ["Krishna I"], condicion: "Miembro", celador: true },
  { nombre: "Carlos Angel Jimenez Bermeo", aulas: ["Krishna I"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 15, desde: "2000-01", hasta: "2025-12", nota: "migrado de BAJAS_HASTA_2025" }] },
  { nombre: "Claudia Zambrano", aulas: ["Krishna I"], condicion: "Miembro" },
  { nombre: "Estefany Hernandez", aulas: ["Krishna I"], condicion: "Miembro" },
  { nombre: "Jesus Rodriguez", aulas: ["Krishna I"], condicion: "Miembro" },
  { nombre: "Jose Gregorio Maldonado", aulas: ["Krishna I"], condicion: "Miembro" },
  { nombre: "Juan Victor Jaimes", aulas: ["Krishna I"], condicion: "Miembro" },
  { nombre: "Manuela Zambrano", aulas: ["Krishna I"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 15, desde: "2000-01", hasta: "2025-12", nota: "migrado de BAJAS_HASTA_2025" }] },
  { nombre: "Maria Yormary Roa", aulas: ["Krishna I"], condicion: "Miembro" },

  // Krishna II
  { nombre: "Jesús Santiago Dominguez Pérez", aulas: ["Krishna II"], condicion: "Miembro" },
  { nombre: "Lourdes Josefina Moreno Márquez", aulas: ["Krishna II"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 13.5, desde: "2000-01", hasta: "2025-12", nota: "migrado de BAJAS_HASTA_2025" }] },
  { nombre: "Lysbeth Consuelo Terranova Vacca", aulas: ["Krishna II"], condicion: "Miembro" },
  { nombre: "Manuel Enrique Medina Buenaño", aulas: ["Krishna II"], condicion: "Miembro" },
  { nombre: "Milagro Elizabeth Contreras Márquez", aulas: ["Krishna II"], condicion: "Miembro" },

  // Krishna III
  { nombre: "Angel Altuve", aulas: ["Krishna III"], condicion: "Miembro" },
  { nombre: "Carlos Jesus Jimenez", aulas: ["Krishna III"], condicion: "Miembro", celador: true },
  { nombre: "Elmer Rincon", aulas: ["Krishna III", "Krishna IV"], condicion: "Miembro", celador: true, cuotaOverridesTemporales: [{ cuotaUsd: 15, desde: "2000-01", hasta: "2025-12", nota: "migrado de BAJAS_HASTA_2025" }] },
  { nombre: "Isrrael Molina", aulas: ["Krishna III"], condicion: "Miembro" },
  { nombre: "Luis Castillo", aulas: ["Krishna III"], condicion: "Miembro" },
  { nombre: "Luis Cortes", aulas: ["Krishna III"], condicion: "Miembro" },
  { nombre: "Milagro Elena Contreras", aulas: ["Krishna III"], condicion: "Miembro" },
  { nombre: "Surley Marquez", aulas: ["Krishna III"], condicion: "Miembro" },
  { nombre: "Monica Muñoz", aulas: ["Krishna III"], condicion: "Miembro" },

  // Krishna IV (nueva aula)
  { nombre: "Carlos Colmenares", aulas: ["Krishna IV"], condicion: "Miembro" },
  { nombre: "Ilia Medina", aulas: ["Krishna IV"], condicion: "Miembro" },
  { nombre: "Oscar Izarra", aulas: ["Krishna IV"], condicion: "Miembro" },

  // Krishna V
  { nombre: "Karina Rodriguez", aulas: ["Krishna V"], condicion: "Miembro", celador: true },
  { nombre: "Carlos Nadal", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Greissy Vargas", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Jean Carlos Zambrano", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Keiber Jaimes", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Leunan Roa", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Marlyn Chacon", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Mauricio Rivera", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Rosana Escalante", aulas: ["Krishna V"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 25, desde: "2026-05", nota: "migrado de SUBEN_25_DESDE_MAYO_2026" }] },
  { nombre: "Victor Jaimes", aulas: ["Krishna V"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 25, desde: "2026-05", nota: "migrado de SUBEN_25_DESDE_MAYO_2026" }] },
  { nombre: "Viktor Peñaloza", aulas: ["Krishna V"], condicion: "Miembro" },
  { nombre: "Ariana Patiño", aulas: ["Krishna V"], condicion: "Miembro", actividad: "Retirado" },

  // Krishna VI
  { nombre: "Alicia B. Chacon", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Brayan Useche", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Carmen Gonzalez", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Claudia Quintero", aulas: ["Krishna VI"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Gabina Useche", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Isdrey Bazo", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Jacqueline Salazar", aulas: ["Krishna VI"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 25, desde: "2026-05", nota: "migrado de SUBEN_25_DESDE_MAYO_2026" }] },
  { nombre: "Jose Figueroa", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Juan Carlos Ramirez", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Juan Rodriguez", aulas: ["Krishna VI"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Kairo Belisario", aulas: ["Krishna VI"], condicion: "Miembro", celador: true },
  { nombre: "Karla Marquez", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Laura Sanchez", aulas: ["Krishna VI"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 25, desde: "2026-05", nota: "migrado de SUBEN_25_DESDE_MAYO_2026" }] },
  { nombre: "Mariana Isabella Barajas", aulas: ["Krishna VI"], condicion: "Miembro", cuotaOverridesTemporales: [{ cuotaUsd: 25, desde: "2026-05", nota: "migrado de SUBEN_25_DESDE_MAYO_2026" }] },
  { nombre: "Marta Ruda", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Neicy Fortoul", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Nelson Garcia", aulas: ["Krishna VI"], condicion: "Probacionista", actividad: "Retirado" },
  { nombre: "Pedro Diaz", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Roger Reyes", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Saray Oliveros", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "William Zambrano", aulas: ["Krishna VI"], condicion: "Miembro" },
  { nombre: "Yennifer Angarita", aulas: ["Krishna VI"], condicion: "Miembro" },
];

// Categorías oficiales — INGRESOS
export const CATEGORIAS_INGRESO = [
  "MIEMBROS",
  "PROBAS",
  "CLASE",
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
export const MATRIZ_CATEGORY_MAP: Record<string, { categoria: string; tipo: "Ingreso" | "Gasto"; banco: string }> = {
  "MIEMBROS": { categoria: "MIEMBROS", tipo: "Ingreso", banco: "Efectivo USD" },
  "PROBAS": { categoria: "PROBAS", tipo: "Ingreso", banco: "Efectivo USD" },
  "INSCRIPICION FILOSOFIA": { categoria: "INSC FILOS", tipo: "Ingreso", banco: "Efectivo USD" },
  "MTC KARINA": { categoria: "MTC", tipo: "Ingreso", banco: "Efectivo USD" },
  "CLASE": { categoria: "CLASE", tipo: "Ingreso", banco: "Efectivo USD" },
  "taichi": { categoria: "TAICHI", tipo: "Ingreso", banco: "Efectivo USD" },
  "DIFUSION": { categoria: "DIFUSION", tipo: "Ingreso", banco: "Efectivo USD" },
  "F.CAFEarte terapia": { categoria: "TERAPIA MTC", tipo: "Ingreso", banco: "Efectivo USD" },
  "MTC consulta (11,25) terapias (5,62)": { categoria: "MTC", tipo: "Ingreso", banco: "Efectivo USD" },
  "MTC  herbolaria": { categoria: "HERBOLARIA", tipo: "Ingreso", banco: "Efectivo USD" },
  "MITOLOGIA 15$-10$acrop": { categoria: "MITOLOGIA", tipo: "Ingreso", banco: "Efectivo USD" },
  "F.CAFE EVENTOS": { categoria: "EVENTOS F.C.", tipo: "Ingreso", banco: "Efectivo USD" },
  "PROFESOR": { categoria: "HONORARIOS PROFESIONALES", tipo: "Gasto", banco: "Efectivo USD" },
  "ALQUI": { categoria: "ALQUILER", tipo: "Gasto", banco: "Efectivo Bs" },
  "integracon": { categoria: "INTEGRACON", tipo: "Gasto", banco: "Efectivo Bs" },
  "servicios publicos": { categoria: "SERVICIOS PUBLICOS", tipo: "Gasto", banco: "Efectivo Bs" },
  "HONORARIOS": { categoria: "HONORARIOS PROFESIONALES", tipo: "Gasto", banco: "Efectivo Bs" },
  "MANTENIMI": { categoria: "MANTENIMI", tipo: "Gasto", banco: "Efectivo Bs" },
  "INTERNET": { categoria: "INTERNET", tipo: "Gasto", banco: "Efectivo Bs" },
  "comision bco": { categoria: "COMISIONES BANCARIAS", tipo: "Gasto", banco: "Efectivo Bs" },
  "PRESTAMOS": { categoria: "PRESTAMO", tipo: "Gasto", banco: "Efectivo USD" },
  "PRÉSTAMOS PROFESOR": { categoria: "PRÉSTAMOS, PROFESOR", tipo: "Gasto", banco: "Efectivo USD" },
  "impuestos": { categoria: "SERVICIOS", tipo: "Gasto", banco: "Efectivo Bs" },
};

export function studentListForPrompt(): string {
  return STUDENTS.filter((s) => s.actividad !== "Retirado")
    .map((s) => `- ${s.nombre} → ${s.aulas.join(", ")}`)
    .join("\n");
}
