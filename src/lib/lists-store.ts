import { useEffect, useState } from "react";
import {
  AULAS_DEFAULT,
  CATEGORIAS_GASTO,
  CATEGORIAS_INGRESO,
  STUDENTS,
  type Actividad,
  type Condicion,
} from "./students-data";

const K_ING = "lector_ocr_ingresos";
const K_GAS = "lector_ocr_gastos";
const K_BNC = "lector_ocr_bancos";
const K_STU = "lector_ocr_alumnos_v3";
const K_STU_V2 = "lector_ocr_alumnos_v2";
const K_STU_V1 = "lector_ocr_alumnos";
const K_AULAS = "lector_ocr_aulas";
const K_TX = "lector_ocr_transacciones_v1";
const K_BCV = "lector_ocr_bcv_v1";
const K_SEED = "lector_ocr_seed_v4";

export type Student = {
  nombre: string;
  aulas: string[];
  condicion?: Condicion;
  actividad?: Actividad; // default "Activo"
  celador?: boolean;
  cuotaOverride?: number;
  telefono?: string; // para enviar WhatsApp
  fechaIngreso?: string; // YYYY-MM-DD, default "2026-01-01"
};

export type Transaction = {
  id: string;
  fecha: string; // dd/mm/yyyy
  mes: string;
  tipo: "Ingreso" | "Gasto" | "";
  categoria: string;
  descripcion: string;
  mensualidad: string;
  moneda: "USD" | "Bolívares" | "Pesos" | "";
  monto: string;
  tasa: string;
  montoUsd: string;
  banco: string; // banco/cuenta: Efectivo USD, Binance, Bancolombia, Bco Venezuela, Bco Mercantil, etc.
};

/** Mapa fecha ISO (YYYY-MM-DD) -> tasa bolívares/USD */
export type BcvRates = Record<string, number>;

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

const BANCOS_DEFAULT = ["Efectivo USD", "Efectivo Bs", "Binance", "Bancolombia", "Bco Venezuela", "Bco Mercantil", "Bco Provincial", "Pago Móvil"];

export function useEditableList(
  kind: "ingresos" | "gastos" | "bancos",
): [string[], (next: string[]) => void] {
  const key = kind === "ingresos" ? K_ING : kind === "gastos" ? K_GAS : K_BNC;
  const def = kind === "ingresos"
    ? [...CATEGORIAS_INGRESO]
    : kind === "gastos"
    ? [...CATEGORIAS_GASTO]
    : [...BANCOS_DEFAULT];
  const [items, setItems] = useState<string[]>(def);
  useEffect(() => {
    setItems(load<string[]>(key, def));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setter = (next: string[]) => {
    setItems(next);
    save(key, next);
  };
  return [items, setter];
}

export function useEditableAulas(): [string[], (next: string[]) => void] {
  const [items, setItems] = useState<string[]>(AULAS_DEFAULT);
  useEffect(() => {
    const stored = load<string[]>(K_AULAS, AULAS_DEFAULT);
    // Asegurar que las aulas nuevas por defecto siempre estén incluidas.
    const merged = Array.from(new Set([...stored, ...AULAS_DEFAULT]));
    setItems(merged);
    if (merged.length !== stored.length) save(K_AULAS, merged);
  }, []);
  const setter = (next: string[]) => {
    setItems(next);
    save(K_AULAS, next);
  };
  return [items, setter];
}

function defaultFechaIngreso(aulas: string[]): string {
  if (aulas.some((a) => a.includes("Arjuna I"))) return "2026-02-05";
  if (aulas.some((a) => a.includes("Arjuna II 2026") || a.includes("Arjuna II"))) return "2026-06-05";
  return "2026-01-01";
}

function seedFromDefault(): Student[] {
  return STUDENTS.map((s) => ({
    nombre: s.nombre,
    aulas: [...s.aulas],
    condicion: s.condicion,
    actividad: s.actividad ?? "Activo",
    celador: s.celador ?? false,
    cuotaOverride: s.cuotaOverride,
    fechaIngreso: s.fechaIngreso ?? defaultFechaIngreso(s.aulas),
  }));
}

export function useEditableStudents(): [Student[], (next: Student[]) => void] {
  const [items, setItems] = useState<Student[]>(seedFromDefault());
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(K_STU);
      let base: Student[] | null = raw ? (JSON.parse(raw) as Student[]) : null;
      if (!base) {
        // Migrar v2 (nombre + aulas)
        const v2 = localStorage.getItem(K_STU_V2);
        if (v2) {
          base = (JSON.parse(v2) as { nombre: string; aulas: string[] }[]).map((s) => ({
            nombre: s.nombre,
            aulas: s.aulas,
            actividad: "Activo",
          }));
        }
        // Migrar v1
        if (!base) {
          const v1 = localStorage.getItem(K_STU_V1);
          if (v1) {
            base = (JSON.parse(v1) as { nombre: string; aula: string }[]).map((s) => ({
              nombre: s.nombre,
              aulas: [s.aula],
              actividad: "Activo",
            }));
          }
        }
      }
      base ||= seedFromDefault();

      // Enriquecer con condición/celador/actividad desde la semilla si faltan.
      const seed = seedFromDefault();
      const seedByName = new Map(seed.map((s) => [s.nombre.toLowerCase(), s]));
      base = base.map((s) => {
        const from = seedByName.get(s.nombre.toLowerCase());
        return {
          ...s,
          actividad: s.actividad ?? from?.actividad ?? "Activo",
          condicion: s.condicion ?? from?.condicion,
          celador: s.celador ?? from?.celador ?? false,
          fechaIngreso: s.fechaIngreso ?? from?.fechaIngreso ?? defaultFechaIngreso(s.aulas),
        };
      });

      // Seed v3: agregar alumnos y correcciones nuevas que no existan en base.
      const seedFlag = localStorage.getItem(K_SEED);
      if (seedFlag !== "1") {
        const existing = new Set(base.map((s) => s.nombre.toLowerCase()));
        for (const s of seed) {
          if (!existing.has(s.nombre.toLowerCase())) base.push(s);
        }
        localStorage.setItem(K_SEED, "1");
      }

      // Migración v3→v4: mover alumnos de Arjuna II a Krishna VI
      const krishnaVIFromArjuna = new Map<string, { aulas:string[]; condicion?:string }>([
        ["Carmen Gonzalez", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["Gabina Useche", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["Jose Figueroa", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["Karla Marquez", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["Marta Ruda", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["Neicy Fortoul", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["Pedro Diaz", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["William Zambrano", { aulas:["Krishna VI"], condicion:"Miembro" }],
        ["Yennifer Angarita", { aulas:["Krishna VI"], condicion:"Miembro" }],
      ]);
      base = base.map((s) => {
        const mig = krishnaVIFromArjuna.get(s.nombre);
        if (mig && (!s.aulas.includes("Krishna VI"))) {
          return { ...s, aulas: mig.aulas, condicion: mig.condicion };
        }
        return s;
      });
      // Corregir condición/actividad de alumnos que ya estaban en Krishna VI
      const fixes = new Map<string, Partial<Student>>([
        ["Claudia Quintero", { condicion:"Probacionista" as const }],
        ["Juan Rodriguez", { condicion:"Probacionista" as const, actividad:"Retirado" as const }],
        ["Nelson Garcia", { condicion:"Probacionista" as const, actividad:"Retirado" as const }],
      ]);
      base = base.map((s) => {
        const fix = fixes.get(s.nombre);
        return fix ? { ...s, ...fix } : s;
      });

      setItems(base);
      save(K_STU, base);
    } catch {
      setItems(seedFromDefault());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setter = (next: Student[]) => {
    setItems(next);
    save(K_STU, next);
  };
  return [items, setter];
}

// ==================== Transacciones (persistidas) ====================

export function useTransactions(): {
  list: Transaction[];
  append: (rows: Omit<Transaction, "id">[]) => void;
  update: <K extends keyof Transaction>(id: string, field: K, value: Transaction[K]) => void;
  replace: (id: string, transaction: Transaction) => void;
  remove: (id: string) => void;
  removeMany: (ids: Set<string>) => void;
  duplicateAfter: (id: string) => void;
  clear: () => void;
} {
  const [list, setList] = useState<Transaction[]>([]);
  useEffect(() => {
    let data = load<Transaction[]>(K_TX, []);
    // Migrar fechas 2024 → 2026 (OCR asignó año incorrecto)
    let changed = false;
    data = data.map((t) => {
      if (t.fecha && t.fecha.includes("/2024")) {
        changed = true;
        const next = { ...t, fecha: t.fecha.replace("/2024", "/2026") };
        if (t.mes) next.mes = t.mes.replace("2024", "2026");
        return next;
      }
      return t;
    });
    if (changed) save(K_TX, data);
    setList(data);
  }, []);
  const fechaSortKey = (t: Transaction) => {
    const [d, m, y] = t.fecha.split("/");
    return `${y}-${m}-${d}`;
  };
  const persist = (next: Transaction[]) => {
    next.sort((a, b) => fechaSortKey(a).localeCompare(fechaSortKey(b)));
    setList(next);
    save(K_TX, next);
  };
  return {
    list,
    append: (rows) => {
      const withIds = rows.map((r) => ({
        ...r,
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
      }));
      persist([...list, ...withIds]);
    },
    update: (id, field, value) => {
      persist(list.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    },
    replace: (id, transaction) => {
      persist(list.map((r) => (r.id === id ? transaction : r)));
    },
    remove: (id) => persist(list.filter((r) => r.id !== id)),
    removeMany: (ids) => persist(list.filter((r) => !ids.has(r.id))),
    duplicateAfter: (id) => {
      const idx = list.findIndex((r) => r.id === id);
      if (idx === -1) return;
      const orig = list[idx];
      const copy = {
        ...orig,
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      };
      const next = [...list];
      next.splice(idx + 1, 0, copy);
      persist(next);
    },
    clear: () => persist([]),
  };
}

// ==================== Tasas BCV (persistidas) ====================

export function useBcvRates(): {
  rates: BcvRates;
  merge: (next: BcvRates) => void;
  set: (isoDate: string, rate: number) => void;
  clean: (predicate: (isoDate: string) => boolean) => void;
} {
  const [rates, setRates] = useState<BcvRates>(() =>
    typeof window !== "undefined" ? load<BcvRates>(K_BCV, {}) : {},
  );
  return {
    rates,
    merge: (next) => {
      setRates((prev) => {
        const merged = { ...prev, ...next };
        save(K_BCV, merged);
        return merged;
      });
    },
    set: (iso, r) => {
      setRates((prev) => {
        const merged = { ...prev, [iso]: r };
        save(K_BCV, merged);
        return merged;
      });
    },
    clean: (predicate) => {
      setRates((prev) => {
        const next: BcvRates = {};
        for (const k of Object.keys(prev)) {
          if (!predicate(k)) next[k] = prev[k];
        }
        save(K_BCV, next);
        return next;
      });
    },
  };
}

/** Devuelve la tasa BCV del día, o la más cercana anterior si no existe. */
export function bcvRateFor(rates: BcvRates, isoDate: string): number | null {
  if (rates[isoDate] != null) return rates[isoDate];
  const keys = Object.keys(rates).sort();
  let best: number | null = null;
  for (const k of keys) {
    if (k <= isoDate) best = rates[k];
    else break;
  }
  return best;
}
