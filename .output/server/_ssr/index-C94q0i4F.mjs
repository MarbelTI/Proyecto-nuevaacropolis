import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useRouter } from "../_libs/tanstack__react-router.mjs";
import { m as isRedirect } from "../_libs/tanstack__router-core.mjs";
import { read as readSync, utils, writeFile as writeFileSync } from "../_libs/xlsx.mjs";
import { a as createServerFn, T as TSS_SERVER_FUNCTION, g as getServerFnById } from "./server-Cp8pASRS.mjs";
import { C as CATEGORIAS_INGRESO, a as CATEGORIAS_GASTO, A as AULAS_DEFAULT, S as STUDENTS } from "./students-data-CpFY5TPz.mjs";
import { S as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { c as cva } from "../_libs/class-variance-authority.mjs";
import { c as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { D as Dialog$1, a as DialogPortal$1, b as DialogContent$1, c as DialogClose, d as DialogTitle$1, e as DialogOverlay$1, f as DialogDescription$1 } from "../_libs/radix-ui__react-dialog.mjs";
import { R as Root2, L as List, T as Trigger, C as Content } from "../_libs/radix-ui__react-tabs.mjs";
import { S as Select$1, a as SelectValue$1, b as SelectTrigger$1, c as SelectIcon, d as SelectPortal, e as SelectContent$1, f as SelectViewport, g as SelectItem$1, h as SelectItemIndicator, i as SelectItemText, j as SelectScrollUpButton$1, k as SelectScrollDownButton$1, l as SelectLabel$1, m as SelectSeparator$1 } from "../_libs/radix-ui__react-select.mjs";
import { t as toast } from "../_libs/sonner.mjs";

import "../_libs/seroval.mjs";
import { S as ScanText, L as LoaderCircle, M as MessageCircle, U as Upload, X, P as Plus, a as Save, T as Trash2, D as Download, b as Settings, c as Pencil, C as ClipboardCopy, R as RefreshCw, d as ChevronDown, e as Check, f as ChevronUp } from "../_libs/lucide-react.mjs";
import { g as objectType, j as stringType, h as numberType, k as arrayType } from "../_libs/zod.mjs";

import "../_libs/react-dom.mjs";

import "../_libs/isbot.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";


import "../_libs/h3-v2.mjs";
import "../_libs/unenv.mjs";

import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";




import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/react-remove-scroll.mjs";
import "../_libs/tslib.mjs";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/radix-ui__react-roving-focus.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/@radix-ui/react-use-is-hydrated+[...].mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
function useServerFn(serverFn) {
  const router = useRouter();
  return reactExports.useCallback(async (...args) => {
    try {
      const res = await serverFn(...args);
      if (isRedirect(res)) throw res;
      return res;
    } catch (err) {
      if (isRedirect(err)) {
        err.options._fromLocation = router.stores.location.get();
        return router.navigate(router.resolveRedirect(err).options);
      }
      throw err;
    }
  }, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const Input$1 = objectType({
  imageBase64: stringType().min(1),
  mimeType: stringType().default("image/jpeg"),
  ingresos: arrayType(stringType()).optional(),
  gastos: arrayType(stringType()).optional(),
  students: arrayType(objectType({
    nombre: stringType(),
    aulas: arrayType(stringType())
  })).optional()
});
const analyzeJournalImage = createServerFn({
  method: "POST"
}).inputValidator((d) => Input$1.parse(d)).handler(createSsrRpc("e96338824bfb704932733f5e53742a990d80f57d37b38264f7d9fcbe46f3a095"));
const QuarterInput = objectType({
  year: numberType().int().min(2020).max(2100),
  quarter: numberType().int().min(1).max(4)
});
const fetchBcvQuarter = createServerFn({
  method: "POST"
}).inputValidator((d) => QuarterInput.parse(d)).handler(createSsrRpc("dcce5d829b3a45e9d81e3406ace1bfa4fe99b1a35a4ed5f9ccef09a2485183ec"));
const DateInput = objectType({
  isoDate: stringType().regex(/^\d{4}-\d{2}-\d{2}$/)
});
const fetchBcvForDate = createServerFn({
  method: "POST"
}).inputValidator((d) => DateInput.parse(d)).handler(createSsrRpc("97ba995ab05f4535cc62dffb0f302cacb232ef85718217b5d414399d79112e9a"));
createServerFn({
  method: "GET"
}).handler(createSsrRpc("89c5997d61a574f97b6f398f7bf6f1e8f6e83007e7f854d9375024f4816dc8d6"));
const K_ING = "lector_ocr_ingresos";
const K_GAS = "lector_ocr_gastos";
const K_BNC = "lector_ocr_bancos";
const K_STU = "lector_ocr_alumnos_v3";
const K_STU_V2 = "lector_ocr_alumnos_v2";
const K_STU_V1 = "lector_ocr_alumnos";
const K_AULAS$1 = "lector_ocr_aulas";
const K_TX = "lector_ocr_transacciones_v1";
const K_BCV = "lector_ocr_bcv_v1";
const K_SEED = "lector_ocr_seed_v4";
function parseMoney(s) {
  if (typeof s === "number" && isFinite(s)) return s;
  if (typeof s !== "string") return 0;
  let clean = s.trim().replace(/[^0-9,\-\.]/g, "");
  if (clean.includes(",") && clean.includes(".")) {
    const lastDot = clean.lastIndexOf(".");
    const lastComma = clean.lastIndexOf(",");
    if (lastDot > lastComma) clean = clean.replace(/,/g, "");
    else clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",") && !clean.includes(".")) {
    clean = clean.replace(",", ".");
  }
  const n = parseFloat(clean);
  if (isNaN(n)) {
    console.warn("parseMoney: NaN from", JSON.stringify(s));
    return 0;
  }
  return n;
}
function parseMoneyOrNull(s) {
  if (s === "" || s == null) return null;
  return parseMoney(s);
}
function load$1(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save$1(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
  }
}
const BANCOS_DEFAULT = ["Efectivo USD", "Efectivo Bs", "Binance", "Bancolombia", "Bco Venezuela", "Bco Mercantil", "Bco Provincial", "Pago Móvil"];
function useEditableList(kind) {
  const key = kind === "ingresos" ? K_ING : kind === "gastos" ? K_GAS : K_BNC;
  const def = kind === "ingresos" ? [...CATEGORIAS_INGRESO] : kind === "gastos" ? [...CATEGORIAS_GASTO] : [...BANCOS_DEFAULT];
  const [items, setItems] = reactExports.useState(def);
  reactExports.useEffect(() => {
    setItems(load$1(key, def));
  }, []);
  const setter = (next) => {
    setItems(next);
    save$1(key, next);
  };
  return [items, setter];
}
function useEditableAulas() {
  const [items, setItems] = reactExports.useState(AULAS_DEFAULT);
  reactExports.useEffect(() => {
    const stored = load$1(K_AULAS$1, AULAS_DEFAULT);
    const merged = Array.from(/* @__PURE__ */ new Set([...stored, ...AULAS_DEFAULT]));
    setItems(merged);
    if (merged.length !== stored.length) save$1(K_AULAS$1, merged);
  }, []);
  const setter = (next) => {
    setItems(next);
    save$1(K_AULAS$1, next);
  };
  return [items, setter];
}
function defaultFechaIngreso(aulas) {
  if (aulas.some((a) => a.includes("Arjuna I"))) return "2026-02-05";
  if (aulas.some((a) => a.includes("Arjuna II 2026") || a.includes("Arjuna II"))) return "2026-06-05";
  return "2026-01-01";
}
function seedFromDefault() {
  return STUDENTS.map((s) => ({
    nombre: s.nombre,
    aulas: [...s.aulas],
    condicion: s.condicion,
    actividad: s.actividad ?? "Activo",
    celador: s.celador ?? false,
    cuotaOverride: s.cuotaOverride,
    cuotaOverridesTemporales: s.cuotaOverridesTemporales ? [...s.cuotaOverridesTemporales] : void 0,
    fechaIngreso: s.fechaIngreso ?? defaultFechaIngreso(s.aulas)
  }));
}
function useEditableStudents() {
  const [items, setItems] = reactExports.useState(seedFromDefault());
  reactExports.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(K_STU);
      let base = raw ? JSON.parse(raw) : null;
      if (!base) {
        const v2 = localStorage.getItem(K_STU_V2);
        if (v2) {
          base = JSON.parse(v2).map((s) => ({
            nombre: s.nombre,
            aulas: s.aulas,
            actividad: "Activo"
          }));
        }
        if (!base) {
          const v1 = localStorage.getItem(K_STU_V1);
          if (v1) {
            base = JSON.parse(v1).map((s) => ({
              nombre: s.nombre,
              aulas: [s.aula],
              actividad: "Activo"
            }));
          }
        }
      }
      base ||= seedFromDefault();
      const seed = seedFromDefault();
      const seedByName = new Map(seed.map((s) => [s.nombre.toLowerCase(), s]));
      base = base.map((s) => {
        const from = seedByName.get(s.nombre.toLowerCase());
        return {
          ...s,
          actividad: s.actividad ?? from?.actividad ?? "Activo",
          condicion: s.condicion ?? from?.condicion,
          celador: s.celador ?? from?.celador ?? false,
          fechaIngreso: s.fechaIngreso ?? from?.fechaIngreso ?? defaultFechaIngreso(s.aulas)
        };
      });
      const seedFlag = localStorage.getItem(K_SEED);
      if (seedFlag !== "1") {
        const existing = new Set(base.map((s) => s.nombre.toLowerCase()));
        for (const s of seed) {
          if (!existing.has(s.nombre.toLowerCase())) base.push(s);
        }
        localStorage.setItem(K_SEED, "1");
      }
      const krishnaVIFromArjuna = /* @__PURE__ */ new Map([
        ["Carmen Gonzalez", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["Gabina Useche", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["Jose Figueroa", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["Karla Marquez", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["Marta Ruda", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["Neicy Fortoul", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["Pedro Diaz", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["William Zambrano", { aulas: ["Krishna VI"], condicion: "Miembro" }],
        ["Yennifer Angarita", { aulas: ["Krishna VI"], condicion: "Miembro" }]
      ]);
      base = base.map((s) => {
        const mig = krishnaVIFromArjuna.get(s.nombre);
        if (mig && !s.aulas.includes("Krishna VI")) {
          return { ...s, aulas: mig.aulas, condicion: mig.condicion };
        }
        return s;
      });
      const fixes = /* @__PURE__ */ new Map([
        ["Claudia Quintero", { condicion: "Probacionista" }],
        ["Juan Rodriguez", { condicion: "Probacionista", actividad: "Retirado" }],
        ["Nelson Garcia", { condicion: "Probacionista", actividad: "Retirado" }]
      ]);
      base = base.map((s) => {
        const fix = fixes.get(s.nombre);
        return fix ? { ...s, ...fix } : s;
      });
      const TEMP_OVERRIDE_DONE = "lector_ocr_temp_override_v1_done";
      if (!localStorage.getItem(TEMP_OVERRIDE_DONE)) {
        const seedOverrides = /* @__PURE__ */ new Map();
        for (const s of seed) {
          if (s.cuotaOverridesTemporales?.length) seedOverrides.set(s.nombre.toLowerCase(), s.cuotaOverridesTemporales);
        }
        if (seedOverrides.size) {
          base = base.map((s) => {
            const key = s.nombre.toLowerCase();
            if (!s.cuotaOverridesTemporales?.length && seedOverrides.has(key)) {
              return { ...s, cuotaOverridesTemporales: seedOverrides.get(key) };
            }
            return s;
          });
        }
        localStorage.setItem(TEMP_OVERRIDE_DONE, "1");
      }
      setItems(base);
      save$1(K_STU, base);
    } catch {
      setItems(seedFromDefault());
    }
  }, []);
  const setter = (next) => {
    setItems(next);
    save$1(K_STU, next);
  };
  return [items, setter];
}
function useTransactions() {
  const [list, setList] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let data = load$1(K_TX, []);
    const MIG_DONE = "lector_ocr_migracion_numerica_v1_done";
    if (!localStorage.getItem(MIG_DONE) && data.length > 0 && typeof data[0].monto === "string") {
      localStorage.setItem("lector_ocr_transacciones_v1_backup_pre_numeric", JSON.stringify(data));
      data = data.map((t) => ({
        ...t,
        monto: parseMoney(t.monto),
        tasa: parseMoneyOrNull(t.tasa),
        montoUsd: parseMoney(t.montoUsd)
      }));
      save$1(K_TX, data);
      localStorage.setItem(MIG_DONE, "1");
    }
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
    if (changed) save$1(K_TX, data);
    setList(data);
  }, []);
  const fechaSortKey = (t) => {
    const [d, m, y] = t.fecha.split("/");
    return `${y}-${m}-${d}`;
  };
  const persist = (next) => {
    next.sort((a, b) => fechaSortKey(a).localeCompare(fechaSortKey(b)));
    setList(next);
    save$1(K_TX, next);
  };
  return {
    list,
    append: (rows) => {
      const withIds = rows.map((r) => ({
        ...r,
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
      }));
      persist([...list, ...withIds]);
    },
    update: (id, field, value) => {
      persist(list.map((r) => r.id === id ? { ...r, [field]: value } : r));
    },
    replace: (id, transaction) => {
      persist(list.map((r) => r.id === id ? transaction : r));
    },
    remove: (id) => persist(list.filter((r) => r.id !== id)),
    removeMany: (ids) => persist(list.filter((r) => !ids.has(r.id))),
    duplicateAfter: (id) => {
      const idx = list.findIndex((r) => r.id === id);
      if (idx === -1) return;
      const orig = list[idx];
      const copy = {
        ...orig,
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
      };
      const next = [...list];
      next.splice(idx + 1, 0, copy);
      persist(next);
    },
    clear: () => persist([])
  };
}
function useBcvRates() {
  const [rates, setRates] = reactExports.useState(
    () => typeof window !== "undefined" ? load$1(K_BCV, {}) : {}
  );
  return {
    rates,
    merge: (next) => {
      setRates((prev) => {
        const merged = { ...prev, ...next };
        save$1(K_BCV, merged);
        return merged;
      });
    },
    set: (iso, r) => {
      setRates((prev) => {
        const merged = { ...prev, [iso]: r };
        save$1(K_BCV, merged);
        return merged;
      });
    },
    clean: (predicate) => {
      setRates((prev) => {
        const next = {};
        for (const k of Object.keys(prev)) {
          if (!predicate(k)) next[k] = prev[k];
        }
        save$1(K_BCV, next);
        return next;
      });
    }
  };
}
function bcvRateFor(rates, isoDate) {
  if (rates[isoDate] != null) return rates[isoDate];
  const keys = Object.keys(rates).sort();
  let best = null;
  for (const k of keys) {
    if (k <= isoDate) best = rates[k];
    else break;
  }
  return best;
}
const K_ASIST = "sisfia_asistencias_v1";
const K_AULAS = "sisfia_aulas_meta_v2";
const K_USER = "sisfia_user";
function load(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
  }
}
function generateFechas(diaSemana, year) {
  const dayMap = {
    "Domingo": 0,
    "Lunes": 1,
    "Martes": 2,
    "Miércoles": 3,
    "Jueves": 4,
    "Viernes": 5,
    "Sábado": 6
  };
  const target = dayMap[diaSemana];
  if (target === void 0) return [];
  const dates = [];
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
function useAulasMeta() {
  const [items, setItems] = reactExports.useState(() => load(K_AULAS, []));
  reactExports.useEffect(() => {
    save(K_AULAS, items);
  }, [items]);
  return [items, setItems];
}
function useAttendance() {
  const [items, setItems] = reactExports.useState(() => load(K_ASIST, []));
  reactExports.useEffect(() => {
    save(K_ASIST, items);
  }, [items]);
  return [items, setItems];
}
function useCurrentUser() {
  const [user, setUser] = reactExports.useState(() => load(K_USER, ""));
  reactExports.useEffect(() => {
    save(K_USER, user);
  }, [user]);
  return [user, setUser];
}
function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result;
        const wb = readSync(buf, { type: "array" });
        const aulas = [];
        const records = [];
        const aulaSheets = wb.SheetNames.filter(
          (n) => n.startsWith("Krishna") || n.startsWith("Arjuna")
        );
        for (const sheetName of aulaSheets) {
          const ws = wb.Sheets[sheetName];
          const data = utils.sheet_to_json(ws, { header: 1, defval: "" });
          const nombre = (data[2]?.[1] || "").trim();
          const diaSemana = (data[3]?.[1] || "").trim();
          const celador = (data[4]?.[1] || "").trim();
          const condicion = (data[6]?.[1] || "").trim() === "Probacionista" ? "Probacionista" : "Miembro";
          const headerRow = data[6] || [];
          const dateCols = [];
          const fechas = [];
          for (let c = 2; c < headerRow.length; c++) {
            const val = headerRow[c];
            if (val === void 0 || val === null || val === "") continue;
            const num = Number(val);
            if (!isNaN(num) && num > 4e4) {
              dateCols.push(c);
              fechas.push(serialToIso(num));
            }
          }
          const temaRow = data[5] || [];
          const temas = {};
          for (let i = 0; i < dateCols.length; i++) {
            const col = dateCols[i];
            const val = String(temaRow[col] ?? "").trim();
            if (val && val !== "Tema:" && isNaN(Number(val))) {
              temas[fechas[i]] = val;
            }
          }
          const refCols = [];
          for (let c = 2; c < headerRow.length; c++) {
            const v = String(headerRow[c] ?? "").trim().toLowerCase();
            if (v === "1era" || v === "1ra" || v === "2da") {
              refCols.push(c);
            }
          }
          const refPairs = [];
          for (let i = 0; i + 1 < refCols.length; i += 2) {
            refPairs.push([refCols[i], refCols[i + 1]]);
          }
          aulas.push({ nombre, celador, diaSemana, condicion, year: 2026, temas });
          for (let r = 9; r < data.length; r++) {
            const row = data[r];
            const numCol = row[0]?.toString() ?? "";
            const alumno = String(row[1] ?? "").trim();
            if (!alumno || alumno === "#N/A" || !/^\d+$/.test(numCol)) continue;
            const hasAny = dateCols.some((c) => {
              const v = String(row[c] ?? "").trim().toUpperCase();
              return v === "A" || v === "I" || v === "NC";
            }) || refPairs.some(([c1, c2]) => {
              const v1 = String(row[c1] ?? "").trim().toUpperCase();
              const v2 = String(row[c2] ?? "").trim().toUpperCase();
              return v1 === "E" || v2 === "E";
            });
            if (!hasAny) continue;
            for (let i = 0; i < dateCols.length; i++) {
              const c = dateCols[i];
              const mark = String(row[c] ?? "").trim().toUpperCase();
              let asistencia = "";
              if (mark === "A") asistencia = "A";
              else if (mark === "I") asistencia = "I";
              else if (mark === "NC") asistencia = "NC";
              records.push({ aula: nombre, alumno, fecha: fechas[i], asistencia, reflexion: "" });
            }
            for (let i = 0; i < Math.min(dateCols.length, refPairs.length); i++) {
              const [c1, c2] = refPairs[i];
              const v1 = String(row[c1] ?? "").trim().toUpperCase();
              const v2 = String(row[c2] ?? "").trim().toUpperCase();
              const e2 = v1 === "E" || v2 === "E" ? "E" : "";
              if (e2) {
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
function serialToIso(serial) {
  const d = new Date((serial - 25569) * 86400 * 1e3);
  return d.toISOString().slice(0, 10);
}
const USERS = [
  { name: "Manuela Zambrano", canAccessExisting: true, canAccessAsistencias: false, canAccessDiagnostico: false, canEditAnyAula: false },
  { name: "Margelys Santos", canAccessExisting: true, canAccessAsistencias: true, canAccessDiagnostico: true, canEditAnyAula: true },
  { name: "Ricardo Garcia", canAccessExisting: true, canAccessAsistencias: true, canAccessDiagnostico: true, canEditAnyAula: true },
  { name: "Karina Rodrigues", canAccessExisting: true, canAccessAsistencias: true, canAccessDiagnostico: true, canEditAnyAula: true }
];
function getUserInfo(name, aulasMeta) {
  const known = USERS.find((u) => u.name.toLowerCase() === name.toLowerCase());
  if (known) return { ...known, celadorAula: void 0 };
  const celadorAula = aulasMeta.find((a) => a.celador.toLowerCase() === name.toLowerCase());
  if (celadorAula) {
    return {
      name,
      canAccessExisting: false,
      canAccessAsistencias: true,
      canAccessDiagnostico: false,
      canEditAnyAula: false,
      celadorAula: celadorAula.nombre
    };
  }
  return {
    name,
    canAccessExisting: false,
    canAccessAsistencias: false,
    canAccessDiagnostico: false,
    canEditAnyAula: false,
    celadorAula: void 0
  };
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = reactExports.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const Input = reactExports.forwardRef(
  ({ className, type, ...props }, ref) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        className: cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Input.displayName = "Input";
const Card = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref,
      className: cn("rounded-xl border bg-card text-card-foreground shadow", className),
      ...props
    }
  )
);
Card.displayName = "Card";
const CardHeader = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, className: cn("flex flex-col space-y-1.5 p-6", className), ...props })
);
CardHeader.displayName = "CardHeader";
const CardTitle = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref,
      className: cn("font-semibold leading-none tracking-tight", className),
      ...props
    }
  )
);
CardTitle.displayName = "CardTitle";
const CardDescription = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, className: cn("text-sm text-muted-foreground", className), ...props })
);
CardDescription.displayName = "CardDescription";
const CardContent = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, className: cn("p-6 pt-0", className), ...props })
);
CardContent.displayName = "CardContent";
const CardFooter = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, className: cn("flex items-center p-6 pt-0", className), ...props })
);
CardFooter.displayName = "CardFooter";
const Dialog = Dialog$1;
const DialogPortal = DialogPortal$1;
const DialogOverlay = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  DialogOverlay$1,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = DialogOverlay$1.displayName;
const DialogContent = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent$1,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogClose, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = DialogContent$1.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
DialogFooter.displayName = "DialogFooter";
const DialogTitle = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  DialogTitle$1,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = DialogTitle$1.displayName;
const DialogDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  DialogDescription$1,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = DialogDescription$1.displayName;
const Tabs = Root2;
const TabsList = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  List,
  {
    ref,
    className: cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    ),
    ...props
  }
));
TabsList.displayName = List.displayName;
const TabsTrigger = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Trigger,
  {
    ref,
    className: cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    ),
    ...props
  }
));
TabsTrigger.displayName = Trigger.displayName;
const TabsContent = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Content,
  {
    ref,
    className: cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    ),
    ...props
  }
));
TabsContent.displayName = Content.displayName;
const Select = Select$1;
const SelectValue = SelectValue$1;
const SelectTrigger = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  SelectTrigger$1,
  {
    ref,
    className: cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectIcon, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-4 w-4 opacity-50" }) })
    ]
  }
));
SelectTrigger.displayName = SelectTrigger$1.displayName;
const SelectScrollUpButton = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  SelectScrollUpButton$1,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "h-4 w-4" })
  }
));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
const SelectScrollDownButton = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  SelectScrollDownButton$1,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-4 w-4" })
  }
));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
const SelectContent = reactExports.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectPortal, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
  SelectContent$1,
  {
    ref,
    className: cn(
      "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)",
      position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      className
    ),
    position,
    ...props,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectScrollUpButton, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SelectViewport,
        {
          className: cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          ),
          children
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectScrollDownButton, {})
    ]
  }
) }));
SelectContent.displayName = SelectContent$1.displayName;
const SelectLabel = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  SelectLabel$1,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold", className),
    ...props
  }
));
SelectLabel.displayName = SelectLabel$1.displayName;
const SelectItem = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  SelectItem$1,
  {
    ref,
    className: cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItemIndicator, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4" }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItemText, { children })
    ]
  }
));
SelectItem.displayName = SelectItem$1.displayName;
const SelectSeparator = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  SelectSeparator$1,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
SelectSeparator.displayName = SelectSeparator$1.displayName;
const isoToDisplay = (iso) => {
  const [y, m, d] = iso.split("-");
  return d;
};
const isoToShort = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m.slice(2)}`;
};
const monthName = (iso) => {
  const d = /* @__PURE__ */ new Date(iso + "T12:00:00");
  return d.toLocaleString("es", { month: "long" });
};
function nextMark(current) {
  if (current === "") return "A";
  if (current === "A") return "I";
  if (current === "I") return "NC";
  return "";
}
function nextRef(current) {
  if (current === "") return "E";
  if (current === "E") return "NE";
  if (current === "NE") return "SE";
  return "";
}
function AsistenciasTab({
  aulasMeta,
  setAulasMeta,
  records,
  setRecords,
  user
}) {
  const [importing, setImporting] = reactExports.useState(false);
  const [settingsOpen, setSettingsOpen] = reactExports.useState(false);
  const [editingAula, setEditingAula] = reactExports.useState("");
  const [semestre, setSemestre] = reactExports.useState(1);
  const allowedAulas = reactExports.useMemo(() => {
    if (user.canEditAnyAula) return aulasMeta.map((a) => a.nombre);
    if (user.celadorAula) return [user.celadorAula];
    return [];
  }, [user, aulasMeta]);
  const [selectedAula, setSelectedAula] = reactExports.useState(
    allowedAulas.length > 0 ? allowedAulas[0] : ""
  );
  const handleImport = reactExports.useCallback(async (file) => {
    setImporting(true);
    try {
      const result = await importFromExcel(file);
      setAulasMeta(result.aulas);
      setRecords(result.records);
      localStorage.setItem("sisfia_asist_imported", "1");
      toast.success(`Importadas ${result.aulas.length} aulas, ${result.records.length} registros`);
      if (result.aulas.length > 0) setSelectedAula(result.aulas[0].nombre);
    } catch (err) {
      toast.error("Error al importar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImporting(false);
    }
  }, [setAulasMeta, setRecords]);
  const currentAula = reactExports.useMemo(
    () => aulasMeta.find((a) => a.nombre === selectedAula),
    [aulasMeta, selectedAula]
  );
  const fechas = reactExports.useMemo(
    () => currentAula ? generateFechas(currentAula.diaSemana, currentAula.year) : [],
    [currentAula]
  );
  const meses = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Set();
    for (const f of fechas) m.add(f.slice(0, 7));
    return Array.from(m).sort();
  }, [fechas]);
  reactExports.useMemo(() => {
    const map = {};
    for (const f of fechas) {
      const key = f.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return map;
  }, [fechas]);
  const semestreFechas = reactExports.useMemo(
    () => fechas.filter((f) => {
      const m = parseInt(f.slice(5, 7));
      return semestre === 1 ? m <= 6 : m >= 7;
    }),
    [fechas, semestre]
  );
  const semestreMeses = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Set();
    for (const f of semestreFechas) m.add(f.slice(0, 7));
    return Array.from(m).sort();
  }, [semestreFechas]);
  const semestreFechasPorMes = reactExports.useMemo(() => {
    const map = {};
    for (const f of semestreFechas) {
      const key = f.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return map;
  }, [semestreFechas]);
  const fechasHoy = reactExports.useMemo(
    () => {
      const h = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      return fechas.filter((f) => f <= h);
    },
    [fechas]
  );
  reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Set();
    for (const f of fechasHoy) m.add(f.slice(0, 7));
    return Array.from(m).sort();
  }, [fechasHoy]);
  const fechasPorMesHoy = reactExports.useMemo(() => {
    const map = {};
    for (const f of fechasHoy) {
      const key = f.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return map;
  }, [fechasHoy]);
  const semestreFechasHoy = reactExports.useMemo(
    () => fechasHoy.filter((f) => {
      const m = parseInt(f.slice(5, 7));
      return semestre === 1 ? m <= 6 : m >= 7;
    }),
    [fechasHoy, semestre]
  );
  const alumnos = reactExports.useMemo(() => {
    if (!currentAula) return [];
    const names = /* @__PURE__ */ new Set();
    for (const r of records) if (r.aula === currentAula.nombre) names.add(r.alumno);
    return Array.from(names).sort();
  }, [currentAula, records]);
  const toggleAsistencia = reactExports.useCallback((alumno, fecha) => {
    setRecords((prev) => {
      const idx = prev.findIndex(
        (r) => r.aula === selectedAula && r.alumno === alumno && r.fecha === fecha && r.reflexion === ""
      );
      if (idx === -1) {
        return [...prev, { aula: selectedAula, alumno, fecha, asistencia: "A", reflexion: "" }];
      }
      const cur = prev[idx].asistencia;
      const newVal = nextMark(cur);
      if (newVal === "") {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev.map((r, i) => i === idx ? { ...r, asistencia: newVal } : r);
    });
  }, [selectedAula]);
  const toggleReflexion = reactExports.useCallback((alumno, fecha) => {
    setRecords((prev) => {
      const idx = prev.findIndex(
        (r) => r.aula === selectedAula && r.alumno === alumno && r.fecha === fecha && r.reflexion !== ""
      );
      if (idx === -1) {
        return [...prev, { aula: selectedAula, alumno, fecha, asistencia: "", reflexion: "E" }];
      }
      const cur = prev[idx].reflexion;
      const newVal = nextRef(cur);
      if (newVal === "") {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev.map((r, i) => i === idx ? { ...r, reflexion: newVal } : r);
    });
  }, [selectedAula]);
  const getAsistencia = reactExports.useCallback((alumno, fecha) => {
    const r = records.find(
      (rec) => rec.aula === selectedAula && rec.alumno === alumno && rec.fecha === fecha && rec.reflexion === ""
    );
    return r?.asistencia || "";
  }, [records, selectedAula]);
  const getReflexion = reactExports.useCallback((alumno, fecha) => {
    const r = records.find(
      (rec) => rec.aula === selectedAula && rec.alumno === alumno && rec.fecha === fecha && rec.reflexion !== ""
    );
    return r?.reflexion || "";
  }, [records, selectedAula]);
  const openSettings = (aula) => {
    setEditingAula(aula);
    setSettingsOpen(true);
  };
  const updateTema = (aulaNombre, fecha, tema) => {
    setAulasMeta((prev) => prev.map((a) => {
      if (a.nombre !== aulaNombre) return a;
      const temas = { ...a.temas };
      if (tema.trim()) temas[fecha] = tema.trim();
      else delete temas[fecha];
      return { ...a, temas };
    }));
  };
  const updateYear = (aulaNombre, year) => {
    setAulasMeta((prev) => prev.map((a) => a.nombre === aulaNombre ? { ...a, year } : a));
  };
  const updateDiaSemana = (aulaNombre, dia) => {
    setAulasMeta((prev) => prev.map((a) => a.nombre === aulaNombre ? { ...a, diaSemana: dia } : a));
  };
  const editingAulaMeta = reactExports.useMemo(
    () => aulasMeta.find((a) => a.nombre === editingAula),
    [aulasMeta, editingAula]
  );
  const editingFechas = reactExports.useMemo(
    () => editingAulaMeta ? generateFechas(editingAulaMeta.diaSemana, editingAulaMeta.year) : [],
    [editingAulaMeta]
  );
  const resolvedTemas = reactExports.useMemo(() => {
    const map = {};
    let last = "";
    for (const f of editingFechas) {
      const t = editingAulaMeta?.temas[f] || "";
      if (t) last = t;
      map[f] = last;
    }
    return map;
  }, [editingFechas, editingAulaMeta?.temas]);
  const topicNumByFecha = reactExports.useMemo(() => {
    const map = {};
    let count = 0;
    for (const f of fechas) {
      if (currentAula?.temas[f]) count++;
      map[f] = count || 1;
    }
    return map;
  }, [fechas, currentAula?.temas]);
  const exportAnalisis = reactExports.useCallback(() => {
    if (!currentAula) return;
    const wsData = [["Participante"]];
    for (const m of meses) {
      wsData[0].push(
        monthName(m + "-01"),
        `%${monthName(m + "-01")}`,
        `R-${monthName(m + "-01")}`,
        `%R-${monthName(m + "-01")}`
      );
    }
    const semLabel = semestre === 1 ? "Sem 1" : "Sem 2";
    wsData[0].push(`A ${semLabel}`, `% ${semLabel}`, `R ${semLabel}`, `%R ${semLabel}`);
    wsData[0].push("A General", "% General", "R General", "%R General");
    for (const al of alumnos) {
      const row = [al];
      let totalAsist = 0, totalRef = 0;
      let semAsist = 0, semRef = 0;
      for (const m of meses) {
        const fms = fechasPorMesHoy[m] || [];
        let asis = 0;
        for (const f of fms) if (getAsistencia(al, f) === "A") asis++;
        const refs = fms.filter((f) => getReflexion(al, f) === "E").length;
        totalAsist += asis;
        totalRef += refs;
        const mNum = parseInt(m.slice(5, 7));
        if (semestre === 1 && mNum <= 6 || semestre === 2 && mNum >= 7) {
          semAsist += asis;
          semRef += refs;
        }
        row.push(asis, fms.length ? +(asis / fms.length).toFixed(2) : 0, refs, fms.length ? +(refs / fms.length).toFixed(2) : 0);
      }
      const semClases = semestreFechasHoy.length;
      const totalClases = fechasHoy.length;
      row.push(semAsist, semClases ? +(semAsist / semClases).toFixed(2) : 0, semRef, semClases ? +(semRef / semClases).toFixed(2) : 0);
      row.push(totalAsist, totalClases ? +(totalAsist / totalClases).toFixed(2) : 0, totalRef, totalClases ? +(totalRef / totalClases).toFixed(2) : 0);
      wsData.push(row);
    }
    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.aoa_to_sheet(wsData), "Análisis");
    writeFileSync(wb, `ANALISIS_${currentAula.nombre.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Exportado");
  }, [currentAula, fechas, meses, fechasPorMesHoy, alumnos, getAsistencia, getReflexion, semestre, semestreFechasHoy, fechasHoy]);
  if (!aulasMeta.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold mb-4", children: "Importar Asistencias" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mb-4", children: 'Importa el archivo "2026 Asistencia Nueva Acropolis.xlsx" para comenzar.' }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-secondary p-8 text-center transition hover:bg-accent/20", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "file",
            accept: ".xlsx,.xls",
            className: "absolute inset-0 cursor-pointer opacity-0",
            disabled: importing,
            onChange: (e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "mb-3 h-10 w-10 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Seleccionar archivo Excel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "2026 Asistencia Nueva Acropolis.xlsx" })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: selectedAula, onValueChange: setSelectedAula, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-48", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Seleccionar aula" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: allowedAulas.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: a, children: a }, a)) })
      ] }),
      currentAula && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
        currentAula.diaSemana,
        " · ",
        currentAula.celador,
        " · ",
        currentAula.condicion,
        " · ",
        fechas.length,
        " clases"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: () => selectedAula && openSettings(selectedAula), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "file",
              accept: ".xlsx,.xls",
              className: "hidden",
              onChange: (e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "mr-1 h-4 w-4" }),
          "Reimportar"
        ] })
      ] })
    ] }),
    currentAula && /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "control", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "control", children: "Control de Asistencia" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "analisis", children: "Análisis por aula" }),
        user.canAccessDiagnostico && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "global", children: "Diagnóstico Global" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "control", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4 overflow-x-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-sm", children: currentAula.nombre }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: semestre === 1 ? "default" : "outline", size: "sm", onClick: () => setSemestre(1), children: "Semestre 1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: semestre === 2 ? "default" : "outline", size: "sm", onClick: () => setSemestre(2), children: "Semestre 2" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 text-xs text-muted-foreground flex-wrap mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-4 h-4 rounded bg-green-200 text-green-800 text-center text-[10px] leading-4 font-bold mr-1", children: "A" }),
            " Asistió"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-4 h-4 rounded bg-red-200 text-red-800 text-center text-[10px] leading-4 font-bold mr-1", children: "I" }),
            " Injustificado"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-4 h-4 rounded bg-gray-200 text-gray-600 text-center text-[10px] leading-4 font-bold mr-1", children: "NC" }),
            " No clase"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-4 h-4 rounded bg-blue-200 text-blue-800 text-center text-[10px] leading-4 font-bold mr-1", children: "E" }),
            " Enviada"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-4 h-4 rounded bg-amber-200 text-amber-800 text-center text-[10px] leading-4 font-bold mr-1", children: "NE" }),
            " No enviada"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-4 h-4 rounded bg-gray-200 text-gray-600 text-center text-[10px] leading-4 font-bold mr-1", children: "SE" }),
            " Sin reflexión"
          ] })
        ] }),
        semestreFechas.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground py-8 text-center", children: "No hay clases en este semestre." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs border-collapse border-dashed border-[#bbb] table-fixed", style: { minWidth: semestreFechas.length * 56 + 280 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 bg-background z-10 p-1 text-left font-medium w-[280px] border-b border-r border-dashed border-[#bbb]", children: "Participante" }),
              semestreMeses.map((m) => {
                const count = (semestreFechasPorMes[m] || []).length;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "th",
                  {
                    colSpan: count * 2,
                    className: "p-1 text-center text-[11px] font-bold bg-muted/30 border-l border-t border-b border-dashed border-[#bbb]",
                    children: monthName(m + "-01").charAt(0).toUpperCase() + monthName(m + "-01").slice(1)
                  },
                  m
                );
              })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 bg-background z-10 border-b border-r border-dashed border-[#bbb]" }),
              semestreFechas.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { className: "p-0 text-center align-top border-l border-b border-dashed border-[#bbb] w-[28px]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-bold text-foreground leading-tight", children: isoToDisplay(f) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px]", children: " " }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[7px] font-bold text-foreground", children: "A" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { className: "p-0 text-center align-top border-b border-dashed border-[#bbb] w-[28px]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] font-bold text-foreground leading-tight", children: [
                    "#",
                    topicNumByFecha[f]
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px]", children: " " }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[7px] font-bold text-foreground", children: "R" })
                ] })
              ] }, f))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: alumnos.map((al) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "hover:bg-muted/20", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "sticky left-0 bg-background z-10 p-1 text-xs font-medium truncate max-w-[280px] border-b border-r border-dashed border-[#bbb]", title: al, children: al }),
            semestreFechas.map((f) => {
              const asis = getAsistencia(al, f);
              const ref = getReflexion(al, f);
              const asisClass = asis === "A" ? "bg-green-100 text-green-800" : asis === "I" ? "bg-red-100 text-red-800" : asis === "NC" ? "bg-gray-200 text-gray-600" : "text-muted-foreground/20";
              const refClass = ref === "E" ? "bg-blue-100 text-blue-800" : ref === "NE" ? "bg-amber-100 text-amber-800" : ref === "SE" ? "bg-gray-200 text-gray-600" : "text-muted-foreground/20";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-0 border-l border-b border-dashed border-[#bbb] w-[28px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: `w-full h-6 text-[9px] font-bold cursor-pointer transition ${asisClass} hover:ring-1 hover:ring-primary/40`,
                    onClick: () => toggleAsistencia(al, f),
                    children: asis
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-0 border-b border-dashed border-[#bbb] w-[28px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: `w-full h-6 text-[9px] font-bold cursor-pointer transition ${refClass} hover:ring-1 hover:ring-primary/40`,
                    onClick: () => toggleReflexion(al, f),
                    children: ref
                  }
                ) })
              ] }, f);
            })
          ] }, al)) })
        ] }),
        (() => {
          let counter = 0;
          const all = [];
          for (const f of fechas) {
            const t = currentAula?.temas[f];
            if (t) {
              counter++;
              all.push({ fecha: f, tema: t, idx: counter });
            }
          }
          if (!all.length) return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-[11px] space-y-0.5", children: all.map((r) => {
            const enviadas = alumnos.filter((al) => getReflexion(al, r.fecha) === "E").length;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-muted-foreground shrink-0", children: [
                "Tema #",
                r.idx
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground truncate", children: r.tema }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-[10px] text-muted-foreground", children: [
                "(",
                enviadas,
                "/",
                alumnos.length,
                ")"
              ] })
            ] }, r.fecha);
          }) });
        })()
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "analisis", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4 overflow-x-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-sm", children: [
            "Análisis — ",
            currentAula?.nombre
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: exportAnalisis, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-2 h-4 w-4" }),
            "Exportar"
          ] })
        ] }),
        fechas.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground py-8 text-center", children: "No hay clases configuradas para este año." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs border-collapse", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 bg-background z-10 p-1 text-left font-medium min-w-[160px]", children: "Participante" }),
                meses.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 4, className: "p-1 text-center font-medium text-[10px] border-l", children: monthName(m + "-01").charAt(0).toUpperCase() + monthName(m + "-01").slice(1) }, m)),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { colSpan: 4, className: "p-1 text-center font-medium text-[10px] border-l", children: [
                  "Total ",
                  semestre === 1 ? "Sem 1" : "Sem 2"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 4, className: "p-1 text-center font-medium text-[10px] border-l", children: "Total General" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-muted-foreground text-[10px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", {}),
                meses.flatMap(() => ["A", "%", "R", "%"]).map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-center font-normal border-l", children: h }, i)),
                ["A", "%", "R", "%"].map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-center font-normal border-l", children: h }, `t-${i}`)),
                ["A", "%", "R", "%"].map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-center font-normal border-l", children: h }, `g-${i}`))
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: alumnos.map((al) => {
              let totalAsist = 0, totalRef = 0;
              let semAsist = 0, semRef = 0;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-muted/30 hover:bg-muted/20", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "sticky left-0 bg-background z-10 p-1 text-xs truncate max-w-[160px]", title: al, children: al }),
                meses.flatMap((m) => {
                  const fms = fechasPorMesHoy[m] || [];
                  let asis = 0;
                  for (const f of fms) if (getAsistencia(al, f) === "A") asis++;
                  const refs = fms.filter((f) => getReflexion(al, f) === "E").length;
                  totalAsist += asis;
                  totalRef += refs;
                  const mNum = parseInt(m.slice(5, 7));
                  if (semestre === 1 && mNum <= 6 || semestre === 2 && mNum >= 7) {
                    semAsist += asis;
                    semRef += refs;
                  }
                  const apct = fms.length ? +(asis / fms.length * 100).toFixed(0) : 0;
                  const rpct = fms.length ? +(refs / fms.length * 100).toFixed(0) : 0;
                  return [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `p-1 text-center border-l ${asis === 0 ? "text-muted-foreground/20" : ""}`, children: asis }, `${m}-a`),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `p-1 text-center ${apct === 0 ? "text-muted-foreground/20" : ""}`, children: [
                      apct,
                      "%"
                    ] }, `${m}-ap`),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `p-1 text-center border-l ${refs === 0 ? "text-muted-foreground/20" : ""}`, children: refs }, `${m}-r`),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `p-1 text-center ${rpct === 0 ? "text-muted-foreground/20" : ""}`, children: [
                      rpct,
                      "%"
                    ] }, `${m}-rp`)
                  ];
                }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `p-1 text-center font-bold border-l ${semAsist === 0 ? "text-muted-foreground/20" : ""}`, children: semAsist }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `p-1 text-center font-bold ${semAsist === 0 || semestreFechasHoy.length === 0 ? "text-muted-foreground/20" : semAsist / semestreFechasHoy.length < 0.5 ? "text-destructive" : semAsist / semestreFechasHoy.length < 0.75 ? "" : "text-green-600"}`, children: [
                  semestreFechasHoy.length ? +(semAsist / semestreFechasHoy.length * 100).toFixed(0) : 0,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `p-1 text-center font-bold border-l ${semRef === 0 ? "text-muted-foreground/20" : ""}`, children: semRef }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `p-1 text-center font-bold ${semRef === 0 || semestreFechasHoy.length === 0 ? "text-muted-foreground/20" : semRef / semestreFechasHoy.length < 0.5 ? "text-destructive" : semRef / semestreFechasHoy.length < 0.75 ? "" : "text-green-600"}`, children: [
                  semestreFechasHoy.length ? +(semRef / semestreFechasHoy.length * 100).toFixed(0) : 0,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `p-1 text-center font-bold border-l ${totalAsist === 0 ? "text-muted-foreground/20" : ""}`, children: totalAsist }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `p-1 text-center font-bold ${totalAsist === 0 || fechasHoy.length === 0 ? "text-muted-foreground/20" : totalAsist / fechasHoy.length < 0.5 ? "text-destructive" : totalAsist / fechasHoy.length < 0.75 ? "" : "text-green-600"}`, children: [
                  fechasHoy.length ? +(totalAsist / fechasHoy.length * 100).toFixed(0) : 0,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `p-1 text-center font-bold border-l ${totalRef === 0 ? "text-muted-foreground/20" : ""}`, children: totalRef }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `p-1 text-center font-bold ${totalRef === 0 || fechasHoy.length === 0 ? "text-muted-foreground/20" : totalRef / fechasHoy.length < 0.5 ? "text-destructive" : totalRef / fechasHoy.length < 0.75 ? "" : "text-green-600"}`, children: [
                  fechasHoy.length ? +(totalRef / fechasHoy.length * 100).toFixed(0) : 0,
                  "%"
                ] })
              ] }, al);
            }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[10px] text-muted-foreground", children: [
            "Totales: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive font-bold", children: "rojo" }),
            " < 50%, ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-600 font-bold", children: "verde" }),
            " ≥ 75%"
          ] })
        ] })
      ] }) }),
      user.canAccessDiagnostico && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "global", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-sm mb-3", children: "Diagnóstico Global" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DiagnosticoGlobal,
          {
            aulasMeta,
            records
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: settingsOpen, onOpenChange: setSettingsOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Configuración — ",
        editingAulaMeta?.nombre
      ] }) }),
      editingAulaMeta && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Celador" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: editingAulaMeta.celador })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Condición" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: editingAulaMeta.condicion })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Día de la semana" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: editingAulaMeta.diaSemana,
                onValueChange: (v) => updateDiaSemana(editingAulaMeta.nombre, v),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: d, children: d }, d)) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Año" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "number",
                value: editingAulaMeta.year,
                onChange: (e) => updateYear(editingAulaMeta.nombre, parseInt(e.target.value) || 2026)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs text-muted-foreground", children: [
              "Temas de las clases (",
              editingFechas.length,
              " sesiones)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: " " })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 max-h-[300px] overflow-y-auto", children: editingFechas.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground w-16 shrink-0", children: isoToShort(f) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: resolvedTemas[f],
                onChange: (e) => updateTema(editingAulaMeta.nombre, f, e.target.value),
                className: "h-8 text-xs"
              }
            )
          ] }, f)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Nota:" }),
          " Al cambiar el día o el año se regeneran las fechas. Las marcas previas se conservan si las fechas siguen existiendo."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogFooter, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setSettingsOpen(false), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-2 h-4 w-4" }),
        "Cerrar"
      ] }) })
    ] }) })
  ] });
}
function DiagnosticoGlobal({
  aulasMeta,
  records
}) {
  const today = typeof window !== "undefined" ? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) : "2026-12-31";
  const cards = reactExports.useMemo(() => {
    return aulasMeta.map((aula) => {
      const todas = generateFechas(aula.diaSemana, aula.year);
      const fechas = todas.filter((f) => f <= today);
      const nombres = /* @__PURE__ */ new Set();
      for (const r of records) if (r.aula === aula.nombre) nombres.add(r.alumno);
      const alumnos = Array.from(nombres).sort();
      const totalClases = fechas.length;
      let totalAsist = 0, totalRef = 0;
      for (const al of alumnos) {
        for (const f of fechas) {
          for (const r of records) {
            if (r.aula !== aula.nombre || r.alumno !== al || r.fecha !== f) continue;
            if (r.asistencia === "A") totalAsist++;
            if (r.reflexion === "E") totalRef++;
          }
        }
      }
      const totalPosible = alumnos.length * totalClases;
      const pctAsist = totalPosible ? +(totalAsist / totalPosible * 100).toFixed(1) : 0;
      const pctRef = totalPosible ? +(totalRef / totalPosible * 100).toFixed(1) : 0;
      let bestA = { nombre: "", val: 0 };
      let bestR = { nombre: "", val: 0 };
      for (const al of alumnos) {
        let ca = 0, cr = 0;
        for (const f of fechas) {
          for (const r of records) {
            if (r.aula !== aula.nombre || r.alumno !== al || r.fecha !== f) continue;
            if (r.asistencia === "A") ca++;
            if (r.reflexion === "E") cr++;
          }
        }
        if (ca > bestA.val) bestA = { nombre: al, val: ca };
        if (cr > bestR.val) bestR = { nombre: al, val: cr };
      }
      const planificadas = todas.length;
      return { nombre: aula.nombre, alumnos: alumnos.length, totalClases, planificadas, totalAsist, totalRef, pctAsist, pctRef, bestA, bestR };
    });
  }, [aulasMeta, records, today]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: cards.map((c) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-5 gap-1.5 text-[10px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 p-1.5 text-center flex flex-col justify-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] text-slate-600 font-medium leading-tight", children: "Aula" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] font-bold text-slate-800 leading-tight break-words", children: c.nombre })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-1.5 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] text-blue-600 font-medium", children: "Participantes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-bold text-blue-700", children: c.alumnos }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[8px] text-blue-500/70", children: [
          c.totalClases,
          "/",
          c.planificadas,
          " clases"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-1.5 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] text-green-600 font-medium", children: "Asistencia" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-bold text-green-700", children: [
          c.pctAsist,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[8px] text-green-500/70", children: [
          c.totalAsist,
          "/",
          c.alumnos * c.totalClases
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 p-1.5 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] text-indigo-600 font-medium", children: "Reflexiones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-bold text-indigo-700", children: [
          c.pctRef,
          "%"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[8px] text-indigo-500/70", children: [
          c.totalRef,
          "/",
          c.alumnos * c.totalClases
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-1.5 text-center flex flex-col justify-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] text-purple-600 font-medium", children: "Destacados" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[9px] font-bold text-purple-700 leading-tight truncate", title: `Asistencia: ${c.bestA.nombre} (${c.bestA.val}/${c.totalClases})`, children: [
          "A: ",
          c.bestA.nombre
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[9px] font-bold text-purple-700 leading-tight truncate", title: `Reflexiones: ${c.bestR.nombre} (${c.bestR.val}/${c.totalClases})`, children: [
          "R: ",
          c.bestR.nombre
        ] })
      ] })
    ] }, c.nombre);
  }) });
}
function precioClase(yearMonth) {
  const [y, m] = yearMonth.split("-").map(Number);
  const ym = y * 100 + m;
  if (ym >= 202606) return 10;
  return 5;
}
function aulaStartYm(aulas) {
  if (aulas.includes("Arjuna II 2026")) return "2026-06";
  if (aulas.includes("Arjuna I")) return "2026-02";
  return "2025-01";
}
function cuotaMensualUSD(student, yearMonth) {
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
  if (ym <= 202604) return 20;
  return 20;
}
function calcularCuotasDebidas(student, lastPaidYm, currentYm2, lastPayAmount) {
  if (student.condicion === "ClasePorClase") {
    return { meses: 0, totalUSD: 0, detalle: [] };
  }
  const detalle = [];
  const ingresoYm = student.fechaIngreso ? student.fechaIngreso.slice(0, 7) : "2000-01";
  const start = lastPaidYm ? nextYm(lastPaidYm) : ingresoYm > aulaStartYm(student.aulas) ? ingresoYm : aulaStartYm(student.aulas);
  let cur = start;
  let guard = 0;
  while (cur <= currentYm2 && guard++ < 120) {
    let c = cuotaMensualUSD(student, cur);
    if (c <= 0 && lastPayAmount && lastPayAmount > 0) c = lastPayAmount;
    if (c > 0) detalle.push({ ym: cur, cuota: c });
    cur = nextYm(cur);
  }
  const totalUSD = detalle.reduce((s, d) => s + d.cuota, 0);
  return { meses: detalle.length, totalUSD, detalle };
}
function nextYm(ym) {
  const [y, m] = ym.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}
function currentYm() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function calcularMontoUsd(moneda, monto, tasa) {
  if (!monto || !isFinite(monto)) return 0;
  if (moneda === "USD" || moneda === "" || moneda === "Dólares") return monto;
  if (!tasa || !isFinite(tasa) || tasa <= 0) return 0;
  return monto / tasa;
}
const TASA_PESOS_DEFAULT = 4e3;
const MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
function todayIso() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fechaToIso(fecha) {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String((/* @__PURE__ */ new Date()).getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}
function isoToFecha(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
const $ = (n) => n.toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
function emptyEntry() {
  return {
    fecha: "",
    mes: "",
    tipo: "Ingreso",
    categoria: "",
    descripcion: "",
    mensualidad: "",
    moneda: "USD",
    monto: "",
    tasa: "",
    montoUsd: ""
  };
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function normalizeMoneyRow(row, bcvRates) {
  const next = {
    ...row
  };
  if (next.moneda === "Pesos" && (!next.tasa || Number(next.tasa) === 0)) {
    next.tasa = String(TASA_PESOS_DEFAULT);
  }
  if (next.moneda === "Bolívares" && (!next.tasa || Number(next.tasa) === 0)) {
    const iso = fechaToIso(next.fecha);
    if (iso) {
      const r = bcvRateFor(bcvRates, iso);
      if (r != null) next.tasa = String(r);
    }
  }
  const montoNum = Number(next.monto) || 0;
  const tasaNum = next.tasa ? Number(next.tasa) : null;
  next.montoUsd = String(calcularMontoUsd(next.moneda, montoNum, tasaNum));
  return next;
}
function normalizeTransactionMoney(tx, bcvRates) {
  const next = {
    ...tx
  };
  if (next.moneda === "Pesos" && (next.tasa == null || next.tasa === 0)) {
    next.tasa = TASA_PESOS_DEFAULT;
  }
  if (next.moneda === "Bolívares" && (next.tasa == null || next.tasa === 0)) {
    const iso = fechaToIso(next.fecha);
    if (iso) {
      const r = bcvRateFor(bcvRates, iso);
      if (r != null) next.tasa = r;
    }
  }
  next.montoUsd = calcularMontoUsd(next.moneda, next.monto, next.tasa);
  return next;
}
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("58") || digits.startsWith("57")) return digits;
  if (digits.startsWith("0")) return "58" + digits.slice(1);
  if (digits.length === 10) return "58" + digits;
  return digits;
}
function whatsappUrl(phone, text) {
  const p = normalizePhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
function logWhatsApp(alumno, msg) {
  const log = JSON.parse(localStorage.getItem("wa_log") || "[]");
  log.push({
    fecha: (/* @__PURE__ */ new Date()).toISOString(),
    alumno,
    mensaje: msg
  });
  localStorage.setItem("wa_log", JSON.stringify(log));
}
function copyAndLog(msg, alumno) {
  navigator.clipboard.writeText(msg).then(() => {
    logWhatsApp(alumno, msg);
    toast.success(`Mensaje copiado para ${alumno}`);
  }).catch(() => toast.error("No se pudo copiar"));
}
function Index() {
  const analyze = useServerFn(analyzeJournalImage);
  const [previews, setPreviews] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [progress, setProgress] = reactExports.useState({
    done: 0,
    total: 0
  });
  const [entries, setEntries] = reactExports.useState([]);
  const [ingresos, setIngresos] = useEditableList("ingresos");
  const [gastos, setGastos] = useEditableList("gastos");
  const [bancos, setBancos] = useEditableList("bancos");
  const [aulas, setAulas] = useEditableAulas();
  const [waLogOpen, setWaLogOpen] = reactExports.useState(false);
  const [waLogKey, setWaLogKey] = reactExports.useState(0);
  const [students, setStudents] = useEditableStudents();
  const transactions = useTransactions();
  const bcv = useBcvRates();
  const [headerDate, setHeaderDate] = reactExports.useState(todayIso());
  const [headerLoading, setHeaderLoading] = reactExports.useState(false);
  const fetchForDate = useServerFn(fetchBcvForDate);
  const [currentUser, setCurrentUser] = useCurrentUser();
  const [aulasMeta, setAulasMeta] = useAulasMeta();
  const [attRecords, setAttRecords] = useAttendance();
  const userInfo = getUserInfo(currentUser, aulasMeta);
  const [userDialogOpen, setUserDialogOpen] = reactExports.useState(!currentUser);
  reactExports.useEffect(() => {
    if (bcvRateFor(bcv.rates, headerDate) != null) return;
    let cancelled = false;
    setHeaderLoading(true);
    fetchForDate({
      data: {
        isoDate: headerDate
      }
    }).then((res) => {
      if (cancelled || !res) return;
      const map = {};
      for (const r of res.rows) map[r.isoDate] = r.rate;
      bcv.merge(map);
    }).catch(() => {
    }).finally(() => {
      if (!cancelled) setHeaderLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [headerDate]);
  const processFiles = async (files) => {
    const newItems = await Promise.all(files.map(async (f) => ({
      name: f.name,
      url: await fileToDataUrl(f),
      status: "pending",
      count: 0
    })));
    const startIndex = previews.length;
    setPreviews((p) => [...p, ...newItems]);
    setLoading(true);
    setProgress({
      done: 0,
      total: files.length
    });
    let okCount = 0, errCount = 0, zeroCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const idx = startIndex + i;
        setPreviews((p) => p.map((x, j) => j === idx ? {
          ...x,
          status: "processing"
        } : x));
        try {
          const base64 = newItems[i].url.split(",")[1];
          if (!base64) throw new Error("No se pudo leer la imagen");
          const result = await analyze({
            data: {
              imageBase64: base64,
              mimeType: f.type || "image/jpeg",
              ingresos,
              gastos,
              students: students.filter((s) => s.actividad !== "Retirado").map((s) => ({
                nombre: s.nombre,
                aulas: s.aulas
              }))
            }
          });
          const normalized = (result.entries ?? []).map((e) => normalizeMoneyRow(e, bcv.rates));
          setEntries((prev) => [...prev, ...normalized]);
          setPreviews((p) => p.map((x, j) => j === idx ? {
            ...x,
            status: "ok",
            count: normalized.length
          } : x));
          if (normalized.length === 0) {
            zeroCount++;
            toast.warning(`Foto ${idx + 1} (${f.name}): no se detectaron filas. Revisa o reintenta.`);
          } else {
            okCount++;
          }
        } catch (err) {
          console.error("OCR error on", f.name, err);
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Foto ${idx + 1} (${f.name}): ${msg}`, {
            duration: 8e3
          });
          setPreviews((p) => p.map((x, j) => j === idx ? {
            ...x,
            status: "error"
          } : x));
          errCount++;
        }
        setProgress({
          done: i + 1,
          total: files.length
        });
      }
    } finally {
      setLoading(false);
    }
    if (okCount > 0) toast.success(`${okCount} foto(s) OK${zeroCount ? `, ${zeroCount} sin filas` : ""}${errCount ? `, ${errCount} con error` : ""}`);
    else if (errCount) toast.error(`Ninguna foto se procesó (${errCount} con error). Reintenta.`);
  };
  const cancelarCarga = () => {
    setLoading(false);
    setPreviews((p) => p.map((x) => x.status === "processing" || x.status === "pending" ? {
      ...x,
      status: "error"
    } : x));
    toast.info("Carga reiniciada. Puedes volver a subir fotos.");
  };
  const handleFiles = async (files) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) {
      toast.error("Selecciona al menos una imagen");
      return;
    }
    await processFiles(arr);
  };
  const removePreview = (idx) => setPreviews((p) => p.filter((_, i) => i !== idx));
  const updateEntry = (i, field, value) => {
    setEntries((e) => e.map((row, idx) => {
      if (idx !== i) return row;
      const next = {
        ...row,
        [field]: value
      };
      if (field === "tipo") {
        const valid = value === "Ingreso" ? ingresos : gastos;
        if (next.categoria && !valid.includes(next.categoria)) next.categoria = "";
      }
      if (field === "moneda" || field === "monto" || field === "tasa" || field === "fecha") {
        return normalizeMoneyRow(next, bcv.rates);
      }
      return next;
    }));
  };
  const addRow = () => setEntries((e) => [...e, emptyEntry()]);
  const duplicateRow = (i) => setEntries((e) => {
    const c = [...e];
    c.splice(i + 1, 0, {
      ...e[i]
    });
    return c;
  });
  const removeRow = (i) => setEntries((e) => e.filter((_, idx) => idx !== i));
  const clearOcr = () => {
    if (confirm("¿Vaciar el lector (fotos y entradas)?")) {
      setEntries([]);
      setPreviews([]);
    }
  };
  const guardarEnTransacciones = () => {
    if (!entries.length) return;
    transactions.append(entries.map((e) => ({
      fecha: e.fecha,
      mes: e.mes,
      tipo: e.tipo,
      categoria: e.categoria,
      descripcion: e.descripcion,
      mensualidad: e.mensualidad,
      moneda: e.moneda,
      monto: Number(e.monto) || 0,
      tasa: e.tasa ? Number(e.tasa) : null,
      montoUsd: Number(e.montoUsd) || 0,
      banco: ""
    })));
    setEntries([]);
    setPreviews([]);
    toast.success(`${entries.length} transacciones guardadas`);
  };
  const headerRate = bcvRateFor(bcv.rates, headerDate);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-[1920px] px-4 py-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "mb-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "/logo.jpg", alt: "Nueva Acrópolis Venezuela", className: "h-14 w-14 rounded-full ring-2 ring-accent" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-[220px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-bold leading-tight", children: "SISFIA" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs opacity-90", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ScanText, { className: "mr-1 inline h-3 w-3" }),
            "Sistema Financiero Acropolitano · Nueva Acrópolis Venezuela"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs opacity-90", children: "Tasa BCV" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: headerDate, onChange: (e) => setHeaderDate(e.target.value), className: "rounded bg-primary-foreground/20 px-2 py-1 text-xs" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground min-w-[80px] text-center", children: headerLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "inline h-3 w-3 animate-spin" }) : headerRate != null ? `${$(headerRate)} Bs/$` : "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setWaLogOpen(true), className: "rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-xs hover:bg-primary-foreground/20", title: "Historial de mensajes WhatsApp", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "mr-1 inline h-3.5 w-3.5" }),
          "Log"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setUserDialogOpen(true), className: "rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-xs hover:bg-primary-foreground/20 font-medium", children: currentUser || "Seleccionar usuario" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: userDialogOpen, onOpenChange: setUserDialogOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Seleccionar usuario" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2", children: [
          aulasMeta.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-1", children: "Usuarios del sistema:" }),
          [{
            name: "Manuela Zambrano",
            desc: "TI — Finanzas"
          }, {
            name: "Margelys Santos",
            desc: "Finanzas"
          }, {
            name: "Ricardo Garcia",
            desc: "Director — Acceso completo"
          }, {
            name: "Karina Rodrigues",
            desc: "Coordinación — Todas las aulas"
          }, ...aulasMeta.filter((a, i, arr) => arr.findIndex((x) => x.celador === a.celador) === i).map((a) => ({
            name: a.celador,
            desc: `Celador — ${a.nombre}`
          }))].map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            setCurrentUser(u.name);
            setUserDialogOpen(false);
          }, className: "flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent transition", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: u.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: u.desc })
          ] }, u.name))
        ] })
      ] }) }),
      !currentUser ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-12 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold mb-2", children: "Bienvenido a SISFIA" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground mb-4", children: "Selecciona tu usuario para continuar." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setUserDialogOpen(true), children: "Seleccionar usuario" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: userInfo.canAccessExisting ? "ocr" : userInfo.canAccessAsistencias ? "asistencias" : "ocr", className: "w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "mb-4 flex flex-wrap", children: [
          userInfo.canAccessExisting && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "ocr", children: "Registro OCR" }),
          userInfo.canAccessExisting && /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "tx", children: [
            "Transacciones (",
            transactions.list.length,
            ")"
          ] }),
          userInfo.canAccessExisting && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "finanzas", children: "Finanzas" }),
          userInfo.canAccessExisting && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "solvencias", children: "Solvencias" }),
          userInfo.canAccessAsistencias && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "asistencias", children: "Asistencias" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "ocr", className: "space-y-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-secondary p-8 text-center transition hover:bg-accent/20", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", accept: "image/*", multiple: true, className: "absolute inset-0 cursor-pointer opacity-0", onChange: (e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }, disabled: loading }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "mb-3 h-10 w-10 text-primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: previews.length === 0 ? "Arrastra o haz clic para subir imágenes" : "Agregar más fotos" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Se procesan una por una en orden y las filas se agregan debajo de las anteriores." })
            ] }),
            previews.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: previews.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative rounded-lg border p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: p.url, alt: p.name, className: "h-32 w-full rounded object-cover" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center justify-between text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate", title: p.name, children: [
                  i + 1,
                  ". ",
                  p.name
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  p.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "…" }),
                  p.status === "processing" && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin text-primary" }),
                  p.status === "ok" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-primary", children: [
                    "✓ ",
                    p.count
                  ] }),
                  p.status === "error" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "✗" })
                ] })
              ] }),
              !loading && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => removePreview(i), className: "absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-destructive-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" }) })
            ] }, i)) }),
            loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center justify-center gap-3 text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-5 w-5 animate-spin" }),
              "Analizando foto ",
              progress.done + 1,
              " de ",
              progress.total,
              "…",
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: cancelarCarga, children: "Cancelar" })
            ] })
          ] }),
          entries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-lg font-semibold", children: [
                "Entradas extraídas (",
                entries.length,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: clearOcr, children: "Vaciar" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: addRow, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 h-4 w-4" }),
                  " Fila"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: guardarEnTransacciones, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-2 h-4 w-4" }),
                  " Guardar en Transacciones"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(EntriesTable, { entries, ingresos, gastos, updateEntry, duplicateRow, removeRow })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "tx", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionsTab, { tx: transactions, ingresos, gastos, bancos, setIngresos, setGastos, setBancos, bcvRates: bcv.rates, students, aulas, setStudents }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "finanzas", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "resumen", className: "w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "resumen", children: "Resumen mensual" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "analisis", children: "Análisis anual" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "bcv", children: "Tasas BCV" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "resumen", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResumenTab, { tx: transactions, ingresos, gastos, bancos, bcvRates: bcv.rates }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "analisis", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnalisisTab, { tx: transactions.list, ingresos, gastos, bcvRates: bcv.rates }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "bcv", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TasasBcvTab, { bcv }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "solvencias", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SolvenciasTab, { students, setStudents, aulas, setAulas, tx: transactions.list }) }),
        userInfo.canAccessAsistencias && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "asistencias", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AsistenciasTab, { aulasMeta, setAulasMeta, records: attRecords, setRecords: setAttRecords, user: userInfo }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: waLogOpen, onOpenChange: setWaLogOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Historial de mensajes WhatsApp" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end -mt-2 mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        localStorage.removeItem("wa_log");
        toast.success("Log eliminado");
      }, className: "text-xs text-destructive hover:underline", children: "Eliminar todos los mensajes" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 max-h-[60vh] overflow-y-auto text-sm", children: (() => {
        const raw = JSON.parse(localStorage.getItem("wa_log") || "[]");
        if (!raw.length) return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: "Sin mensajes registrados" });
        const log = [...raw].reverse();
        return log.map((e, i) => {
          const origIdx = raw.length - 1 - i;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded border p-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: e.alumno }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: new Date(e.fecha).toLocaleString("es-VE") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
                  const updated = JSON.parse(localStorage.getItem("wa_log") || "[]");
                  updated.splice(origIdx, 1);
                  localStorage.setItem("wa_log", JSON.stringify(updated));
                  setWaLogKey((k) => k + 1);
                  toast.success("Mensaje eliminado");
                }, className: "text-destructive hover:underline", title: "Eliminar este mensaje", children: "✕" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 whitespace-pre-wrap break-words", children: e.mensaje })
          ] }, i);
        });
      })() }, waLogKey)
    ] }) })
  ] });
}
function EntriesTable({
  entries,
  ingresos,
  gastos,
  updateEntry,
  duplicateRow,
  removeRow
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b text-left text-muted-foreground", children: ["Fecha", "Mes", "Tipo", "Categoría", "Descripción", "Mens.", "Moneda", "Monto", "Tasa", "USD", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: h }, h)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: entries.map((e, i) => {
      const cats = e.tipo === "Gasto" ? gastos : ingresos;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0 align-top", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: e.fecha, onChange: (x) => updateEntry(i, "fecha", x.target.value), className: "h-9 w-28" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: e.mes, onChange: (x) => updateEntry(i, "mes", x.target.value), className: "h-9 w-24" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: e.tipo || "Ingreso", onValueChange: (v) => updateEntry(i, "tipo", v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-28", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Ingreso", children: "Ingreso" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Gasto", children: "Gasto" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: e.categoria || void 0, onValueChange: (v) => updateEntry(i, "categoria", v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: cats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c, children: c }, c)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: e.descripcion, onChange: (x) => updateEntry(i, "descripcion", x.target.value), className: "h-9 min-w-[200px]" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: e.mensualidad, onChange: (x) => updateEntry(i, "mensualidad", x.target.value), className: "h-9 w-24", placeholder: "abr-2026" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: e.moneda || void 0, onValueChange: (v) => updateEntry(i, "moneda", v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-28", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "USD", children: "USD" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Bolívares", children: "Bolívares" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Pesos", children: "Pesos" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: e.monto, onChange: (x) => updateEntry(i, "monto", x.target.value), className: "h-9 w-24" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: e.tasa, onChange: (x) => updateEntry(i, "tasa", x.target.value), className: "h-9 w-24" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: e.montoUsd, readOnly: true, className: "h-9 w-24 bg-muted/40", title: "Calculado automáticamente" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => duplicateRow(i), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => removeRow(i), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4 text-destructive" }) })
        ] }) })
      ] }, i);
    }) })
  ] }) });
}
function findStudentInDesc(desc, students) {
  const n = normalizeName(desc);
  for (const s of students) {
    const sn = normalizeName(s.nombre);
    if (n.includes(sn)) return s;
  }
  return null;
}
function TransactionsTab({
  tx,
  ingresos,
  gastos,
  bancos,
  bcvRates,
  students,
  aulas,
  setStudents,
  setIngresos,
  setGastos,
  setBancos
}) {
  const [from, setFrom] = reactExports.useState("");
  const [to, setTo] = reactExports.useState("");
  const [searchQ, setSearchQ] = reactExports.useState("");
  const [editing, setEditing] = reactExports.useState(null);
  const [catOpen, setCatOpen] = reactExports.useState(false);
  const [studentTx, setStudentTx] = reactExports.useState(null);
  const [editTxStudent, setEditTxStudent] = reactExports.useState(null);
  const [filterTipo, setFilterTipo] = reactExports.useState("");
  const [filterMoneda, setFilterMoneda] = reactExports.useState("");
  const [filterCategoria, setFilterCategoria] = reactExports.useState("");
  const [filterBanco, setFilterBanco] = reactExports.useState("");
  const filtered = reactExports.useMemo(() => {
    const sq = searchQ.trim().toLowerCase();
    return tx.list.filter((r) => {
      const iso = fechaToIso(r.fecha);
      if (!iso) return true;
      if (from && iso < from) return false;
      if (to && iso > to) return false;
      if (sq) {
        const descOk = r.descripcion?.toLowerCase().includes(sq);
        const catOk = r.categoria?.toLowerCase().includes(sq);
        const nameOk = findStudentInDesc(r.descripcion, students)?.nombre.toLowerCase().includes(sq);
        if (!descOk && !catOk && !nameOk) return false;
      }
      if (filterTipo && r.tipo !== filterTipo) return false;
      if (filterMoneda && r.moneda !== filterMoneda) return false;
      if (filterCategoria && r.categoria !== filterCategoria) return false;
      if (filterBanco === "__sin_banco__" && (r.banco || "") !== "") return false;
      if (filterBanco && filterBanco !== "__sin_banco__" && filterBanco !== "__todos__" && r.banco !== filterBanco) return false;
      return true;
    });
  }, [tx.list, from, to, searchQ, students, filterTipo, filterMoneda, filterBanco, filterCategoria]);
  const anyFilterActive = !!(from || to || searchQ.trim() || filterTipo || filterMoneda || filterCategoria || filterBanco);
  const exportExcel = () => {
    if (!filtered.length) {
      toast.error("No hay transacciones en el rango");
      return;
    }
    const ws = utils.json_to_sheet(filtered.map((r) => ({
      Fecha: r.fecha,
      Mes: r.mes,
      Tipo: r.tipo,
      Categoría: r.categoria,
      Descripción: r.descripcion,
      Mensualidad: r.mensualidad,
      Moneda: r.moneda,
      Banco: r.banco,
      Monto: r.monto,
      "Tasa cambio": r.tasa,
      "Monto USD": r.montoUsd
    })));
    ws["!cols"] = [{
      wch: 11
    }, {
      wch: 10
    }, {
      wch: 9
    }, {
      wch: 18
    }, {
      wch: 35
    }, {
      wch: 11
    }, {
      wch: 11
    }, {
      wch: 12
    }, {
      wch: 12
    }, {
      wch: 12
    }, {
      wch: 14
    }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Transacciones");
    writeFileSync(wb, `TRANSACCIONES_${todayIso()}.xlsx`);
    toast.success("Excel descargado");
  };
  const eliminarRango = () => {
    if (!filtered.length) {
      toast.error("Nada que eliminar en el rango");
      return;
    }
    const label = from || to ? `entre ${from || "inicio"} y ${to || "hoy"}` : "TODAS las transacciones";
    if (!confirm(`¿Eliminar ${filtered.length} transacciones ${label}?`)) return;
    const idsRemove = new Set(filtered.map((r) => r.id));
    tx.removeMany(idsRemove);
    toast.success(`${idsRemove.size} eliminadas`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Transacciones acumuladas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
          const empty = {
            fecha: "",
            mes: "",
            id: "__new__",
            tipo: "Ingreso",
            categoria: "",
            descripcion: "",
            mensualidad: "",
            moneda: "USD",
            monto: 0,
            tasa: null,
            montoUsd: 0,
            banco: ""
          };
          setEditing(empty);
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 h-4 w-4" }),
          " Fila"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", id: "importExcel", accept: ".xlsx,.xls", style: {
          display: "none"
        }, onChange: async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const buf = await file.arrayBuffer();
            const wb = readSync(buf, {
              type: "array"
            });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = utils.sheet_to_json(ws, {
              defval: ""
            });
            const mapped = rows.map((r) => ({
              fecha: String(r.Fecha || r.fecha || ""),
              mes: String(r.Mes || r.mes || ""),
              tipo: String(r.Tipo || r.tipo || "Ingreso") === "Gasto" ? "Gasto" : "Ingreso",
              categoria: String(r.Categoria || r.Categoría || r.categoria || ""),
              descripcion: String(r.Descripcion || r.Descripción || r.descripcion || ""),
              mensualidad: String(r.Mensualidad || r.mensualidad || ""),
              moneda: String(r.Moneda || r.moneda || "USD") === "Bolívares" ? "Bolívares" : String(r.Moneda || r.moneda || "USD") === "Pesos" ? "Pesos" : "USD",
              monto: Number(r.Monto || r.monto || 0) || 0,
              tasa: (() => {
                const v = r["Tasa cambio"] || r["Tasa"] || r.tasa;
                return v ? Number(v) : null;
              })(),
              montoUsd: Number(r["Monto USD"] || r["USD"] || r.montoUsd || 0) || 0,
              banco: String(r.Banco || r.banco || "")
            }));
            if (!mapped.length) {
              toast.error("Excel vacío o formato no reconocido");
              return;
            }
            tx.append(mapped);
            toast.success(`${mapped.length} transacciones importadas`);
          } catch (err) {
            toast.error(`Error al leer Excel: ${err.message}`);
          }
          e.target.value = "";
        } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => document.getElementById("importExcel")?.click(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "mr-1 h-4 w-4" }),
          " Importar Excel"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: searchQ, onChange: (e) => setSearchQ(e.target.value), placeholder: "Buscar en descripción…", className: "w-48" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Desde" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: from, onChange: (e) => setFrom(e.target.value), className: "rounded border bg-background px-2 py-1 text-sm" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Hasta" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: to, onChange: (e) => setTo(e.target.value), className: "rounded border bg-background px-2 py-1 text-sm" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => {
          setFrom("");
          setTo("");
          setSearchQ("");
        }, children: "Limpiar filtro" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: exportExcel, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-2 h-4 w-4" }),
          " Excel"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", onClick: eliminarRango, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-2 h-4 w-4" }),
          " Eliminar rango"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCatOpen(true), className: "rounded-full p-2 hover:bg-accent", title: "Categorías", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-4 w-4" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-3 text-xs text-muted-foreground", children: [
      "Mostrando ",
      filtered.length,
      " de ",
      tx.list.length
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-left text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Fecha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filterTipo, onChange: (e) => setFilterTipo(e.target.value), className: "w-full bg-transparent text-xs font-medium outline-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Ingreso", children: "Ingreso" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Gasto", children: "Gasto" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: filterCategoria, onChange: (e) => setFilterCategoria(e.target.value), placeholder: "Categoría…", className: "w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Descripción" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Mens." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: filterMoneda, onChange: (e) => setFilterMoneda(e.target.value), className: "w-full bg-transparent text-xs font-medium outline-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Moneda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "USD", children: "USD" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Bolívares", children: "Bolívares" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Pesos", children: "Pesos" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: filterBanco || void 0, onValueChange: (v) => setFilterBanco(v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-auto border-0 p-0 shadow-none text-xs font-medium text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Banco…" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__todos__", children: "Todos" }),
            bancos.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: b, children: b }, b)),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__sin_banco__", children: "(sin banco)" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Monto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Tasa" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "USD" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        filtered.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.fecha }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.tipo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.categoria }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.descripcion }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.mensualidad }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.moneda }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs text-muted-foreground", children: r.banco || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums", children: isNaN(Number(r.monto)) ? r.monto : $(Number(r.monto)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums text-xs", children: r.tasa }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums font-medium", children: $(Number(r.montoUsd) || 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => tx.duplicateAfter(r.id), title: "Duplicar fila debajo", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setEditing(r), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => tx.remove(r.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4 text-destructive" }) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: (() => {
            const s = findStudentInDesc(r.descripcion, students);
            if (!s) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground", title: "No se encontró alumno en la descripción", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 opacity-30" }) });
            if (!s.telefono) return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditTxStudent(s), className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent", title: "Agregar teléfono", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 opacity-50" }) });
            const moneda = r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "COP" : "USD";
            const concepto = r.mensualidad ? `mensualidad de ${r.mensualidad}` : r.descripcion || `pago`;
            const msg = `¡Hola, ${s.nombre.split(" ")[0]}! Te confirmamos la recepción de tu pago por un monto de $${$(Number(r.montoUsd) || 0)} (${r.monto} ${moneda}) correspondiente a: ${concepto}. Tu cuenta se encuentra al día. ¡Gracias por formar parte de nuestra escuela!`;
            const url = whatsappUrl(s.telefono, msg);
            return url ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: url, target: "_blank", rel: "noopener noreferrer", onClick: () => logWhatsApp(s.nombre, msg), className: "inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent", title: `Enviar WhatsApp a ${s.nombre}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 text-primary" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => copyAndLog(msg, s.nombre), className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent", title: "Copiar mensaje", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCopy, { className: "h-3.5 w-3.5" }) })
            ] }) : null;
          })() })
        ] }, r.id)),
        !filtered.length && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 12, className: "py-8 text-center text-muted-foreground", children: "Sin transacciones" }) }),
        anyFilterActive && filtered.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t-2 font-semibold bg-accent/20", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 text-xs", colSpan: 7, children: [
            "Total (",
            filtered.length,
            " filas)"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums", children: $(filtered.reduce((s, r) => s + (Number(r.monto) || 0), 0)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 text-right tabular-nums", children: [
            "$",
            $(filtered.reduce((s, r) => s + (Number(r.montoUsd) || 0), 0))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 2 })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionEditDialog, { editing, onClose: () => setEditing(null), ingresos, gastos, bancos, bcvRates, onSave: (next) => {
      if (next.id === "__new__") {
        const {
          id,
          ...rest
        } = next;
        tx.append([rest]);
        setEditing(null);
        toast.success("Transacción creada");
      } else {
        tx.replace(next.id, next);
        setEditing(null);
        toast.success("Transacción actualizada");
      }
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: catOpen, onOpenChange: setCatOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-3xl max-h-[85vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Categorías" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "ing", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "ing", children: "Ingresos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "gas", children: "Gastos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "bn", children: "Bancos" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "ing", className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimpleListEditor, { items: ingresos, setItems: setIngresos, placeholder: "Nueva categoría de ingreso…" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "gas", className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimpleListEditor, { items: gastos, setItems: setGastos, placeholder: "Nueva categoría de gasto…" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "bn", className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimpleListEditor, { items: bancos, setItems: setBancos, placeholder: "Nuevo banco/cuenta…" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudentEditDialog, { open: editTxStudent !== null, student: editTxStudent, aulas, lastPay: null, onClose: () => setEditTxStudent(null), onSave: (next) => {
      setStudents(students.map((s) => s.nombre === next.nombre ? next : s));
      setEditTxStudent(null);
      toast.success("Guardado");
    } })
  ] });
}
function TransactionEditDialog({
  editing,
  onClose,
  onSave,
  ingresos,
  gastos,
  bancos,
  bcvRates
}) {
  const [draft, setDraft] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setDraft(editing ? {
      ...editing
    } : null);
  }, [editing]);
  if (!draft) return null;
  const cats = draft.tipo === "Gasto" ? gastos : ingresos;
  const update = (k, v) => {
    setDraft((d) => {
      if (!d) return d;
      const next = {
        ...d,
        [k]: v
      };
      if (k === "moneda" || k === "monto" || k === "tasa" || k === "fecha") {
        return normalizeTransactionMoney(next, bcvRates);
      }
      return next;
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!editing, onOpenChange: (v) => !v && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Modificar transacción" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Fecha (dd/mm/aaaa)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.fecha, onChange: (e) => update("fecha", e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Mes", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.mes, onChange: (e) => update("mes", e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tipo", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: draft.tipo || "Ingreso", onValueChange: (v) => update("tipo", v), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Ingreso", children: "Ingreso" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Gasto", children: "Gasto" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Categoría", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: draft.categoria || void 0, onValueChange: (v) => update("categoria", v), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: cats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c, children: c }, c)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Descripción", full: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.descripcion, onChange: (e) => update("descripcion", e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Mensualidad", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.mensualidad, onChange: (e) => update("mensualidad", e.target.value), placeholder: "abr-2026" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Moneda", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: draft.moneda || void 0, onValueChange: (v) => update("moneda", v), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "USD", children: "USD" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Bolívares", children: "Bolívares" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Pesos", children: "Pesos" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Banco/Cuenta", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: bancos.includes(draft.banco) ? draft.banco : void 0, onValueChange: (v) => update("banco", v), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
          bancos.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: b, children: b }, b)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__editar__", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground italic text-xs", children: "✎ Editar desde Categorías…" }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Monto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: String(draft.monto || ""), onChange: (e) => update("monto", Number(e.target.value) || 0) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tasa", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.tasa != null ? String(draft.tasa) : "", onChange: (e) => update("tasa", e.target.value ? Number(e.target.value) : null) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "USD", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: String(draft.montoUsd || ""), onChange: (e) => {
        const v = Number(e.target.value) || 0;
        update("montoUsd", v);
        if (draft.monto > 0 && v > 0 && (draft.tasa == null || draft.tasa === 0)) {
          update("tasa", draft.monto / v);
        }
      } }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: onClose, children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => onSave(draft), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-2 h-4 w-4" }),
        " Guardar"
      ] })
    ] })
  ] }) });
}
function Field({
  label,
  children,
  full
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: full ? "col-span-2" : "", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: label }),
    children
  ] });
}
function AnalisisTab({
  tx,
  ingresos,
  gastos,
  bcvRates
}) {
  const yearsSet = /* @__PURE__ */ new Set();
  for (const t of tx) {
    const iso = fechaToIso(t.fecha);
    if (iso) yearsSet.add(Number(iso.slice(0, 4)));
  }
  yearsSet.add((/* @__PURE__ */ new Date()).getFullYear());
  const years = Array.from(yearsSet).sort((a, b) => b - a);
  const [year, setYear] = reactExports.useState(years[0]);
  const [capitalInicial, setCapitalInicial] = reactExports.useState("0");
  const build = (cats, tipo) => {
    const m = {};
    for (const c of cats) m[c] = Array(12).fill(0);
    for (const t of tx) {
      if (t.tipo !== tipo) continue;
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== year) continue;
      const mi = Number(iso.slice(5, 7)) - 1;
      const cat = t.categoria || "(sin categoría)";
      if (!m[cat]) m[cat] = Array(12).fill(0);
      m[cat][mi] += Number(t.montoUsd) || 0;
    }
    return m;
  };
  const matIng = build(ingresos, "Ingreso");
  const matGas = build(gastos, "Gasto");
  const totalesIng = Array(12).fill(0);
  const totalesGas = Array(12).fill(0);
  Object.values(matIng).forEach((row) => row.forEach((v, i) => totalesIng[i] += v));
  Object.values(matGas).forEach((row) => row.forEach((v, i) => totalesGas[i] += v));
  const neto = totalesIng.map((v, i) => v - totalesGas[i]);
  const arrastre = tx.reduce((acc, t) => {
    const iso = fechaToIso(t.fecha);
    if (!iso) return acc;
    if (Number(iso.slice(0, 4)) >= year) return acc;
    const usd = Number(t.montoUsd) || 0;
    return acc + (t.tipo === "Ingreso" ? usd : t.tipo === "Gasto" ? -usd : 0);
  }, 0);
  const capIniNum = Number(capitalInicial) || 0;
  const acumulado = [];
  neto.reduce((cum, v, i) => {
    const nv = cum + v;
    acumulado[i] = nv;
    return nv;
  }, arrastre + capIniNum);
  const lastMonthIdx = (() => {
    for (let i = 11; i >= 0; i--) if (totalesIng[i] > 0 || totalesGas[i] > 0) return i;
    return -1;
  })();
  const renderBlock = (title, mat, colorClass) => {
    const cats = Object.keys(mat).sort();
    const totales = Array(12).fill(0);
    cats.forEach((c) => mat[c].forEach((v, i) => totales[i] += v));
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: `${colorClass} font-semibold`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", colSpan: 16, children: title }) }),
      cats.map((c) => {
        const row = mat[c];
        const total = row.reduce((s, v) => s + v, 0);
        const meses = row.filter((v) => v > 0).length || 1;
        const promedio = total / meses;
        const varPct = lastMonthIdx > 0 && row[lastMonthIdx - 1] > 0 ? (row[lastMonthIdx] - row[lastMonthIdx - 1]) / row[lastMonthIdx - 1] * 100 : null;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: c }),
          row.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs tabular-nums", children: v > 0 ? v.toFixed(0) : "" }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs font-medium", children: total.toFixed(0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs", children: promedio.toFixed(0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs", children: varPct == null ? "—" : `${varPct > 0 ? "+" : ""}${varPct.toFixed(0)}%` })
        ] }, c);
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b bg-muted/50 font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 text-xs", children: [
          "Total ",
          title
        ] }),
        totales.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs tabular-nums", children: v > 0 ? v.toFixed(0) : "" }, i)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs", children: totales.reduce((s, v) => s + v, 0).toFixed(0) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
      ] })
    ] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Análisis financiero anual (USD)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Arrastre años anteriores: ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
              "$",
              $(arrastre)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
            "Capital inicial:",
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: capitalInicial, onChange: (e) => setCapitalInicial(e.target.value), className: "h-7 w-20 text-xs" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: String(year), onValueChange: (v) => setYear(Number(v)), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-32", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: years.map((y) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: String(y), children: y }, y)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-left text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Categoría" }),
        MESES_ES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-right font-medium text-xs", children: m.slice(0, 3) }, m)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-right font-medium text-xs", children: "Total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-right font-medium text-xs", children: "Prom." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-right font-medium text-xs", children: "Var%" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        renderBlock("Ingresos", matIng, "bg-primary/10"),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 16, className: "h-4" }) }),
        renderBlock("Egresos", matGas, "bg-destructive/10"),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 16, className: "h-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t bg-accent/20 font-bold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: "Neto mensual" }),
          neto.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs tabular-nums " + (v < 0 ? "text-destructive" : ""), children: v !== 0 ? v.toFixed(0) : "" }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs", children: neto.reduce((s, v) => s + v, 0).toFixed(0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b bg-accent/40 font-bold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: "Efectivo acumulado" }),
          acumulado.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs tabular-nums " + (v < 0 ? "text-destructive" : ""), children: v.toFixed(0) }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
        ] })
      ] })
    ] }) })
  ] });
}
function ResumenTab({
  tx: txObj,
  ingresos,
  gastos,
  bancos,
  bcvRates
}) {
  const tx = txObj.list;
  const [ym, setYm] = reactExports.useState(currentYm());
  const [selectedIngCats, setSelectedIngCats] = reactExports.useState(/* @__PURE__ */ new Set());
  const [selectedGasCats, setSelectedGasCats] = reactExports.useState(/* @__PURE__ */ new Set());
  const [expandedCat, setExpandedCat] = reactExports.useState(null);
  const [showAllCats, setShowAllCats] = reactExports.useState(false);
  const data = reactExports.useMemo(() => {
    const ingByCat = {};
    const gasByCat = {};
    const ingDet = {};
    const gasDet = {};
    for (const c of ingresos) {
      ingByCat[c] = 0;
    }
    for (const c of gastos) {
      gasByCat[c] = 0;
    }
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      const usd = Number(t.montoUsd) || 0;
      const c = t.categoria || "(sin categoría)";
      if (c === "CONVERSIÓN") continue;
      if (t.tipo === "Ingreso") {
        ingByCat[c] = (ingByCat[c] || 0) + usd;
        if (!ingDet[c]) ingDet[c] = [];
        ingDet[c].push({
          desc: t.descripcion,
          monto: usd,
          fecha: t.fecha,
          mes: t.mensualidad
        });
      } else if (t.tipo === "Gasto") {
        gasByCat[c] = (gasByCat[c] || 0) + usd;
        if (!gasDet[c]) gasDet[c] = [];
        gasDet[c].push({
          desc: t.descripcion,
          monto: usd,
          fecha: t.fecha,
          mes: t.mensualidad
        });
      }
    }
    const totalIng = Object.values(ingByCat).reduce((s, v) => s + v, 0);
    const totalGas = Object.values(gasByCat).reduce((s, v) => s + v, 0);
    return {
      ingByCat,
      gasByCat,
      ingDet,
      gasDet,
      totalIng,
      totalGas
    };
  }, [tx, ym, ingresos, gastos]);
  const [y, m] = ym.split("-").map(Number);
  const arbitrajeData = reactExports.useMemo(() => {
    let bsRecibidos = 0, bsGastados = 0, usdIng = 0, usdGas = 0;
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      if (t.moneda !== "Bolívares") continue;
      const monto = Number(t.monto) || 0;
      const usd = Number(t.montoUsd) || 0;
      if (t.tipo === "Ingreso") {
        bsRecibidos += monto;
        usdIng += usd;
      } else if (t.tipo === "Gasto") {
        bsGastados += monto;
        usdGas += usd;
      }
    }
    const saldoBs = bsRecibidos - bsGastados;
    const usdTotal = usdIng - usdGas;
    let tasaInicio = 0;
    for (let d = 1; d <= 31; d++) {
      const li = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      tasaInicio = bcvRates[li] ?? 0;
      if (tasaInicio > 0) break;
    }
    const lastDay = new Date(y, m, 0);
    let tasaCierre = 0;
    for (let d = lastDay.getDate(); d >= 1; d--) {
      const li = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      tasaCierre = bcvRates[li] ?? 0;
      if (tasaCierre > 0) break;
    }
    const saldoConvertido = tasaCierre > 0 ? saldoBs / tasaCierre : 0;
    const ganancia = tasaCierre > 0 ? saldoConvertido - usdTotal : 0;
    return {
      bsRecibidos,
      bsGastados,
      saldoBs,
      usdIng,
      usdGas,
      usdTotal,
      tasaInicio,
      tasaCierre,
      saldoConvertido,
      ganancia
    };
  }, [tx, ym, y, m, bcvRates]);
  const bancosData = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      const banco = t.banco || "(sin banco)";
      const usd = Number(t.montoUsd) || 0;
      map.set(banco, (map.get(banco) || 0) + (t.tipo === "Ingreso" ? usd : -usd));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tx, ym]);
  reactExports.useEffect(() => {
    const catsConDatos = (cats, byCat) => new Set(cats.filter((c) => byCat[c] > 0));
    if (showAllCats) {
      setSelectedIngCats(new Set(ingresos));
      setSelectedGasCats(new Set(gastos));
    } else {
      setSelectedIngCats(catsConDatos(ingresos, data.ingByCat));
      setSelectedGasCats(catsConDatos(gastos, data.gasByCat));
    }
  }, [ym, showAllCats]);
  const toggleIngCat = (cat) => {
    setSelectedIngCats((p) => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
      return n;
    });
  };
  const toggleGasCat = (cat) => {
    setSelectedGasCats((p) => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
      return n;
    });
  };
  reactExports.useMemo(() => {
    const maxLen = Math.max(ingresos.length, gastos.length);
    return Math.max(Math.ceil(maxLen / 2) * 32, 96);
  }, [ingresos, gastos]);
  const exportExcelResumen = () => {
    const wb = utils.book_new();
    const allTx = tx;
    const year = String(y);
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const txHeader = ["Fecha", "Mes Contable", "Tipo", "Categoría", "Nombre / Descripción", "Mes Mensualidad", "Moneda", "Monto Original", "Tasa Bs/$", "Monto USD"];
    const txRows = [];
    txRows.push([`📋  TRANSACCIONES  |  Nueva Acrópolis SC  |  ${year}-${y + 1}`]);
    txRows.push(txHeader);
    for (const t of allTx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 4) !== year) continue;
      txRows.push([iso ? serialDate(iso) : "", t.mes || "", t.tipo || "", t.categoria || "", t.descripcion || "", t.mensualidad || "", t.moneda || "USD", Number(t.monto) || 0, Number(t.tasa) || "", Number(t.montoUsd) || 0]);
    }
    const wsTx = utils.aoa_to_sheet(txRows);
    wsTx["!cols"] = [{
      wch: 12
    }, {
      wch: 14
    }, {
      wch: 10
    }, {
      wch: 16
    }, {
      wch: 42
    }, {
      wch: 16
    }, {
      wch: 10
    }, {
      wch: 14
    }, {
      wch: 12
    }, {
      wch: 12
    }];
    utils.book_append_sheet(wb, wsTx, "TRANSACCIONES");
    [.../* @__PURE__ */ new Set([...ingresos, ...gastos])];
    const ingCats = ingresos.sort();
    const gasCats = gastos.sort();
    const af = [];
    af.push([`📊  ANÁLISIS FINANCIERO POR CATEGORÍA  |  Nueva Acrópolis SC  |  ${year}`]);
    af.push(["Tipo", "Categoría", ...meses, "TOTAL", "PROMEDIO/MES", "VARIACIÓN E→Últ."]);
    af.push([null, null, ...meses]);
    const sumaCatMes = (cat, mesIdx) => {
      let total = 0;
      for (const t of allTx) {
        const iso = fechaToIso(t.fecha);
        if (!iso || iso.slice(0, 4) !== year) continue;
        const tm = parseInt(iso.slice(5, 7), 10);
        if (tm !== mesIdx + 1) continue;
        if (t.categoria !== cat) continue;
        total += Number(t.montoUsd) || 0;
      }
      return total;
    };
    for (const c of ingCats) {
      const vals = meses.map((_, i) => sumaCatMes(c, i));
      const total = vals.reduce((a, b) => a + b, 0);
      const prom = total / 12;
      const firstNonZero = vals.find((v) => v > 0) ?? 0;
      const lastNonZero = [...vals].reverse().find((v) => v > 0) ?? 0;
      const varE = firstNonZero && lastNonZero ? ((lastNonZero - firstNonZero) / firstNonZero * 100).toFixed(1) : "";
      af.push(["Ingreso", c, ...vals, total, prom, varE]);
    }
    const totalIngVals = meses.map((_, i) => ingCats.reduce((s, c) => s + sumaCatMes(c, i), 0));
    const totalIngSum = totalIngVals.reduce((a, b) => a + b, 0);
    af.push(["", "TOTAL INGRESOS", ...totalIngVals, totalIngSum, totalIngSum / 12, ""]);
    af.push([]);
    for (const c of gasCats) {
      const vals = meses.map((_, i) => sumaCatMes(c, i));
      const total = vals.reduce((a, b) => a + b, 0);
      const prom = total / 12;
      const firstNonZero = vals.find((v) => v > 0) ?? 0;
      const lastNonZero = [...vals].reverse().find((v) => v > 0) ?? 0;
      const varE = firstNonZero && lastNonZero ? ((lastNonZero - firstNonZero) / firstNonZero * 100).toFixed(1) : "";
      af.push(["Egreso", c, ...vals, total, prom, varE]);
    }
    const totalGasVals = meses.map((_, i) => gasCats.reduce((s, c) => s + sumaCatMes(c, i), 0));
    const totalGasSum = totalGasVals.reduce((a, b) => a + b, 0);
    af.push(["", "TOTAL EGRESOS", ...totalGasVals, totalGasSum, totalGasSum / 12, ""]);
    const wsAf = utils.aoa_to_sheet(af);
    wsAf["!cols"] = [{
      wch: 10
    }, {
      wch: 22
    }, ...meses.map(() => ({
      wch: 12
    })), {
      wch: 10
    }, {
      wch: 12
    }, {
      wch: 16
    }];
    utils.book_append_sheet(wb, wsAf, "ANÁLISIS FINANCIERO");
    allTx.filter((t) => {
      const iso = fechaToIso(t.fecha);
      return iso && iso.slice(0, 7) === ym;
    });
    const mesLabel = meses[m - 1];
    const rm = [];
    rm.push([`📅  RESUMEN MENSUAL  |  ${mesLabel} ${year}`]);
    rm.push([]);
    rm.push(["MES SELECCIONADO →", mesLabel]);
    rm.push([]);
    rm.push(["INDICADORES DEL MES"]);
    rm.push(["Total Ingresos", "Total Egresos", "Margen Neto", "Alquiler", "Cuotas M+P"]);
    const rmIngTotal = ingCats.reduce((s, c) => s + sumaCatMes(c, m - 1), 0);
    const rmGasTotal = gasCats.reduce((s, c) => s + sumaCatMes(c, m - 1), 0);
    const alquiler = sumaCatMes("ALQUILER", m - 1);
    const cuotasMP = sumaCatMes("MIEMBROS", m - 1) + sumaCatMes("PROBAS", m - 1);
    rm.push([rmIngTotal, rmGasTotal, rmIngTotal - rmGasTotal, alquiler, cuotasMP]);
    rm.push([]);
    const nPagos = (cat, mesIdx) => allTx.filter((t) => {
      const iso = fechaToIso(t.fecha);
      if (!iso || parseInt(iso.slice(5, 7), 10) !== mesIdx + 1) return false;
      if (t.categoria !== cat) return false;
      return true;
    }).length;
    rm.push(["↑  INGRESOS DEL MES"]);
    rm.push(["Categoría", "Monto USD", "N° Pagos", "% del Total Ing.", "% Acum. hasta este mes"]);
    let acumPct = 0;
    for (const c of ingCats) {
      const val = sumaCatMes(c, m - 1);
      if (val === 0) continue;
      const np = nPagos(c, m - 1);
      const pct = rmIngTotal ? (val / rmIngTotal * 100).toFixed(1) : "0";
      acumPct += Number(pct);
      rm.push([c, val, np, pct, acumPct.toFixed(1)]);
    }
    rm.push([]);
    rm.push(["↓  EGRESOS DEL MES"]);
    rm.push(["Categoría", "Monto USD", "N° Pagos", "% del Total Eg.", "% Acum. hasta este mes"]);
    let acumPctE = 0;
    for (const c of gasCats) {
      const val = sumaCatMes(c, m - 1);
      if (val === 0) continue;
      const np = nPagos(c, m - 1);
      const pct = rmGasTotal ? (val / rmGasTotal * 100).toFixed(1) : "0";
      acumPctE += Number(pct);
      rm.push([c, val, np, pct, acumPctE.toFixed(1)]);
    }
    const wsRm = utils.aoa_to_sheet(rm);
    wsRm["!cols"] = [{
      wch: 24
    }, {
      wch: 12
    }, {
      wch: 10
    }, {
      wch: 18
    }, {
      wch: 22
    }];
    utils.book_append_sheet(wb, wsRm, "RESUMEN MENSUAL");
    writeFileSync(wb, `RESUMEN_${ym}_${todayIso()}.xlsx`);
    toast.success("Excel descargado");
  };
  const serialDate = (iso) => {
    const d = new Date(iso);
    const excelEpoch = new Date(1899, 11, 30);
    return (d.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1e3);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-4 lg:col-span-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Resumen mensual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: exportExcelResumen, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-2 h-4 w-4" }),
          " Excel"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: String(m), onValueChange: (v) => setYm(`${y}-${v.padStart(2, "0")}`), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-32", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: MESES_ES.map((mn, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: String(i + 1), children: mn }, i)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: y, onChange: (e) => setYm(`${e.target.value}-${String(m).padStart(2, "0")}`), className: "w-24" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Neto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xl font-bold " + (data.totalIng - data.totalGas < 0 ? "text-destructive" : ""), children: [
          "$",
          $(data.totalIng - data.totalGas)
        ] })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-bold text-primary", children: "Ingresos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-base font-bold text-primary", children: [
          "$",
          $(data.totalIng)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 flex flex-wrap items-center gap-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowAllCats(!showAllCats), className: "rounded-full px-3 py-0 text-[12px] font-medium leading-tight " + (showAllCats ? "bg-primary text-primary-foreground" : "bg-muted"), children: showAllCats ? "Todas" : "Solo datos" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 flex flex-wrap gap-x-1.5 gap-y-0.5", children: ingresos.sort().map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleIngCat(c), className: `rounded-full px-3 py-0 text-[12px] font-medium leading-tight border transition ${selectedIngCats.has(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/30 text-muted-foreground"}`, children: c }, c)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        ingresos.filter((c) => selectedIngCats.has(c)).map((c) => {
          const v = data.ingByCat[c] || 0;
          const det = data.ingDet[c];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0 cursor-pointer hover:bg-accent/30", onClick: () => setExpandedCat(expandedCat === c ? null : c), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 font-medium", children: [
                c,
                det ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1.5 text-xs text-muted-foreground", children: [
                  "(",
                  det.length,
                  ")"
                ] }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right tabular-nums", children: [
                "$",
                $(v)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right text-xs text-muted-foreground", children: [
                data.totalIng > 0 ? (v / data.totalIng * 100).toFixed(0) : 0,
                "%"
              ] })
            ] }, c),
            expandedCat === c && det && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted/20 px-3 py-2 text-xs space-y-1", children: det.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground truncate min-w-0", children: [
                d.fecha,
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: d.mes || "" }),
                " ",
                d.desc?.slice(0, 40) || "—",
                d.desc && d.desc.length > 40 ? "…" : ""
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums font-medium shrink-0", children: [
                "$",
                $(d.monto)
              ] })
            ] }, i)) }) }) }, `${c}-det`)
          ] });
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: "Total Ingresos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 text-right", children: [
            "$",
            $(data.totalIng)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-bold text-destructive", children: "Egresos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-base font-bold text-destructive", children: [
          "$",
          $(data.totalGas)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 flex flex-wrap items-center gap-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowAllCats(!showAllCats), className: "rounded-full px-3 py-0 text-[12px] font-medium leading-tight " + (showAllCats ? "bg-primary text-primary-foreground" : "bg-muted"), children: showAllCats ? "Todas" : "Solo datos" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 flex flex-wrap gap-x-1.5 gap-y-0.5", children: gastos.sort().map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleGasCat(c), className: `rounded-full px-3 py-0 text-[12px] font-medium leading-tight border transition ${selectedGasCats.has(c) ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background border-muted-foreground/30 text-muted-foreground"}`, children: c }, c)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        gastos.filter((c) => selectedGasCats.has(c)).map((c) => {
          const v = data.gasByCat[c] || 0;
          const det = data.gasDet[c];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0 cursor-pointer hover:bg-accent/30", onClick: () => setExpandedCat(expandedCat === `g-${c}` ? null : `g-${c}`), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 font-medium", children: [
                c,
                det ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1.5 text-xs text-muted-foreground", children: [
                  "(",
                  det.length,
                  ")"
                ] }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right tabular-nums", children: [
                "$",
                $(v)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right text-xs text-muted-foreground", children: [
                data.totalGas > 0 ? (v / data.totalGas * 100).toFixed(0) : 0,
                "%"
              ] })
            ] }, c),
            expandedCat === `g-${c}` && det && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted/20 px-3 py-2 text-xs space-y-1", children: det.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground truncate min-w-0", children: [
                d.fecha,
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: d.mes || "" }),
                " ",
                d.desc?.slice(0, 40) || "—",
                d.desc && d.desc.length > 40 ? "…" : ""
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums font-medium shrink-0", children: [
                "$",
                $(d.monto)
              ] })
            ] }, i)) }) }) }, `${c}-det`)
          ] });
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: "Total Egresos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 text-right", children: [
            "$",
            $(data.totalGas)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
        ] })
      ] }) })
    ] }),
    arbitrajeData.bsRecibidos > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-2 font-semibold text-sm", children: "💱 Análisis de Bolívares del mes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 grid grid-cols-2 gap-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded bg-blue-50 dark:bg-blue-950/30 p-2 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Tasa al iniciar el mes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-lg", children: $(arbitrajeData.tasaInicio) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "🇻🇪 BCV" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded bg-amber-50 dark:bg-amber-950/30 p-2 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Tasa al cerrar el mes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-lg", children: $(arbitrajeData.tasaCierre) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "🇻🇪 BCV" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-muted-foreground mb-1", children: "1️⃣ Tus movimientos del mes en Bolívares" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Recibiste en Bs" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-right", children: $(arbitrajeData.bsRecibidos) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Bs" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Gastaste en Bs" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-right", children: $(arbitrajeData.bsGastados) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Bs" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium border-t pt-0.5", children: "💼 Te quedan en caja" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-right font-medium border-t pt-0.5 " + (arbitrajeData.saldoBs < 0 ? "text-destructive" : ""), children: $(arbitrajeData.saldoBs) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground border-t pt-0.5", children: "Bs" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-muted-foreground mb-1", children: "2️⃣ Lo que registraste en dólares (a la tasa de cada día)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "USD de tus recibos" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums text-right", children: [
              "$",
              $(arbitrajeData.usdIng)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "USD de tus gastos" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums text-right", children: [
              "$",
              $(arbitrajeData.usdGas)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium border-t pt-0.5", children: "📝 Total registrado en $" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums text-right font-medium border-t pt-0.5 " + (arbitrajeData.usdTotal < 0 ? "text-destructive" : ""), children: [
              "$",
              $(Math.abs(arbitrajeData.usdTotal))
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground border-t pt-0.5", children: arbitrajeData.usdTotal < 0 ? "gastaste más de lo que recibiste" : "recibiste más de lo que gastaste" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-muted-foreground mb-1", children: "3️⃣ ¿Cuánto valdrían hoy tus Bs en caja?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
              " Tus Bs ÷ tasa cierre (",
              $(arbitrajeData.tasaCierre),
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-right", children: arbitrajeData.saldoConvertido ? "$" + $(Math.abs(arbitrajeData.saldoConvertido)) : "$0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "valor actual en $" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded p-3 " + (arbitrajeData.ganancia >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg", children: arbitrajeData.ganancia >= 0 ? "✅" : "❌" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold text-sm", children: arbitrajeData.ganancia >= 0 ? "¡Ganaste dinero!" : "Perdiste dinero 💸" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: arbitrajeData.ganancia >= 0 ? `Tus Bs valían $${$(Math.abs(arbitrajeData.usdTotal))} cuando los recibiste/gastaste, pero hoy valen $${$(Math.abs(arbitrajeData.saldoConvertido))}. Ganaste porque el Bolívar se devaluó menos de lo esperado.` : `Registraste $${$(Math.abs(arbitrajeData.usdTotal))} en tus transacciones, pero tus Bs sobrantes hoy solo valen $${$(Math.abs(arbitrajeData.saldoConvertido))}. Perdiste porque el Bolívar perdió valor frente al dólar durante el mes.` })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Resultado cambiario" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xl font-bold " + (arbitrajeData.ganancia >= 0 ? "text-green-600" : "text-red-600"), children: [
              arbitrajeData.ganancia >= 0 ? "+" : "-",
              "$",
              $(Math.abs(arbitrajeData.ganancia))
            ] })
          ] })
        ] }) })
      ] })
    ] }),
    bancosData.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4 lg:col-span-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-2 font-semibold text-sm", children: "🏦 Saldos por banco/cuenta al cierre del mes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-3", children: bancosData.map(([banco, saldo]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border px-3 py-2 min-w-[140px] flex-1 " + (saldo < 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200" : "bg-green-50 dark:bg-green-950/30 border-green-200"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: banco }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-lg font-bold tabular-nums " + (saldo < 0 ? "text-red-600" : "text-green-600"), children: [
          saldo < 0 ? "-" : "",
          "$",
          $(Math.abs(saldo))
        ] })
      ] }, banco)) })
    ] })
  ] });
}
function normalizeName(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function SolvenciasTab({
  students,
  setStudents,
  aulas,
  setAulas,
  tx
}) {
  const [filterActividad, setFilterActividad] = reactExports.useState("Activo");
  const [q, setQ] = reactExports.useState("");
  const [nuevaAula, setNuevaAula] = reactExports.useState("");
  const [editIdx, setEditIdx] = reactExports.useState(null);
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const [aulasOpen, setAulasOpen] = reactExports.useState(false);
  const [collapsed, setCollapsed] = reactExports.useState({});
  const [viewTxStudent, setViewTxStudent] = reactExports.useState(null);
  const lastPayByStudent = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      if (!["MIEMBROS", "PROBAS", "CLASE"].includes(t.categoria)) continue;
      const iso = fechaToIso(t.fecha);
      if (!iso) continue;
      const desc = normalizeName(t.descripcion);
      for (const s of students) {
        const nn = normalizeName(s.nombre);
        const first = nn.split(" ")[0];
        const last = nn.split(" ").slice(-1)[0];
        if (first && last && desc.includes(first) && desc.includes(last)) {
          const prev = map.get(s.nombre);
          if (!prev || iso > (fechaToIso(prev.fecha) || "")) {
            map.set(s.nombre, {
              fecha: t.fecha,
              monto: Number(t.montoUsd) || 0,
              mes: t.mensualidad
            });
          }
        }
      }
    }
    return map;
  }, [tx, students]);
  const filteredStudents = reactExports.useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.map((st, idx) => ({
      st,
      idx
    })).filter(({
      st
    }) => {
      if (filterActividad !== "Todos" && (st.actividad ?? "Activo") !== filterActividad) return false;
      if (!s) return true;
      return st.nombre.toLowerCase().includes(s) || st.aulas.some((a) => a.toLowerCase().includes(s));
    });
  }, [students, q, filterActividad]);
  const visibleStudents = reactExports.useMemo(() => {
    if (filterActividad === "Todos" || filterActividad === "Retirado") return filteredStudents;
    return filteredStudents.filter(({
      st
    }) => {
      if (st.condicion === "ClasePorClase") return true;
      return lastPayByStudent.has(st.nombre);
    });
  }, [filteredStudents, lastPayByStudent, filterActividad]);
  const grouped = reactExports.useMemo(() => {
    const g = /* @__PURE__ */ new Map();
    for (const item of visibleStudents) {
      const aula = item.st.aulas[0] || "Sin aula";
      if (!g.has(aula)) g.set(aula, []);
      g.get(aula).push(item);
    }
    for (const arr of g.values()) {
      arr.sort((a, b) => {
        if (!!a.st.celador !== !!b.st.celador) return a.st.celador ? -1 : 1;
        return a.st.nombre.localeCompare(b.st.nombre);
      });
    }
    return Array.from(g.entries()).sort(([, a], [, b]) => a.length - b.length);
  }, [visibleStudents]);
  const addAula = () => {
    const n = nuevaAula.trim();
    if (!n) return;
    if (aulas.some((a) => a.toLowerCase() === n.toLowerCase())) {
      toast.error("Ya existe");
      return;
    }
    setAulas([...aulas, n]);
    setNuevaAula("");
    toast.success("Aula creada");
  };
  const removeAula = (a) => {
    if (!confirm(`Eliminar aula "${a}"?`)) return;
    setAulas(aulas.filter((x) => x !== a));
    setStudents(students.map((s) => ({
      ...s,
      aulas: s.aulas.filter((x) => x !== a)
    })));
  };
  const ymNow = currentYm();
  const [calcOpen, setCalcOpen] = reactExports.useState(false);
  const [calcDisp, setCalcDisp] = reactExports.useState("0");
  const [calcOp, setCalcOp] = reactExports.useState(null);
  const [calcPrev, setCalcPrev] = reactExports.useState(null);
  const colWidths = reactExports.useMemo(() => {
    let maxNombre = 0, maxFecha = 0, maxAbono = 0, maxMes = 0;
    for (const s of students) {
      const extras = s.celador ? 100 : 0;
      maxNombre = Math.max(maxNombre, s.nombre.length * 8 + extras);
    }
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      maxFecha = Math.max(maxFecha, t.fecha.length * 7.5);
      maxAbono = Math.max(maxAbono, String(t.montoUsd || "").length * 8);
      maxMes = Math.max(maxMes, t.mensualidad.length * 7.5);
    }
    return {
      nombre: 290,
      fecha: Math.max(maxFecha, 100),
      abono: Math.max(maxAbono, 70),
      mes: 70
    };
  }, [students, tx]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-lg font-semibold", children: [
        "Miembros y solvencia ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-sm font-normal text-muted-foreground", children: [
          students.length,
          " participantes"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: filterActividad, onValueChange: (v) => setFilterActividad(v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-32", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Activo", children: "Activos" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Retirado", children: "Retirados" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Todos", children: "Todos" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Buscar…", className: "w-56" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => setAulasOpen(true), children: [
          "Aulas (",
          aulas.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setAddOpen(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 h-4 w-4" }),
          " Agregar"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: grouped.map(([aula, list]) => {
      const isCollapsed = collapsed[aula] ?? false;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setCollapsed({
          ...collapsed,
          [aula]: !isCollapsed
        }), className: "mb-3 flex w-full items-center justify-between text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-base font-semibold text-primary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-2 inline-block w-3", children: isCollapsed ? "▶" : "▼" }),
            aula
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
            list.length,
            " participantes"
          ] })
        ] }),
        !isCollapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", style: {
          tableLayout: "fixed"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("colgroup", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: {
              width: colWidths.nombre
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: {
              width: colWidths.fecha
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: {
              width: colWidths.mes
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: {
              width: colWidths.abono
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: {
              width: 50
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: {
              width: 50
            } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-center text-muted-foreground text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium text-left", children: "Integrante" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Último pago" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Pagó" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Abono" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Estado" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: list.map(({
            st,
            idx
          }) => {
            const pay = lastPayByStudent.get(st.nombre);
            const lastYm = pay ? (fechaToIso(pay.fecha) || "").slice(0, 7) : null;
            const deuda = calcularCuotasDebidas(st, lastYm, ymNow, pay?.monto);
            const esPorClase = st.condicion === "ClasePorClase";
            const sinHistorial = !pay && !esPorClase;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 " + (st.celador ? "font-bold" : "font-medium"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setViewTxStudent(st), className: "text-left underline-offset-2 hover:underline", title: "Ver pagos del integrante", children: st.nombre }),
                st.celador && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 rounded bg-accent px-1.5 py-px text-[10px] uppercase text-accent-foreground", children: "celador" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs text-center", children: pay?.fecha ?? "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs text-center", children: pay?.mes ? pay.mes.replace("2026", "26") : "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-center text-xs tabular-nums", children: pay ? `$${$(pay.monto)}` : "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: esPorClase ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-muted px-2 py-px", children: "Por clase" }) : sinHistorial ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) : deuda.meses === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-primary/20 px-2 py-px text-primary", children: "Al día" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded bg-destructive/20 px-2 py-px text-destructive text-xs font-bold", children: [
                deuda.meses,
                "M"
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
                (() => {
                  cuotaMensualUSD(st, ymNow);
                  const monto = esPorClase ? precioClase(ymNow) : deuda.totalUSD;
                  const msg = esPorClase ? `Hola ${st.nombre.split(" ")[0]}, te recordamos que la clase de hoy en Nueva Acrópolis tiene un valor de $${$(precioClase(ymNow))}. ¡Te esperamos!` : deuda.meses === 0 ? `¡Hola, ${st.nombre.split(" ")[0]}! Te confirmamos que tu cuenta se encuentra al día. Gracias por tu puntualidad y compromiso con Nueva Acrópolis. ¡Un abrazo!` : `Hola ${st.nombre.split(" ")[0]}, junto con saludarte, te informamos que registramos un saldo pendiente en tu cuenta de ${deuda.meses} ${deuda.meses === 1 ? "mensualidad" : "mensualidades"} equivalentes a $${$(monto)}. Para mantener activo tu acceso a la escuela y no interrumpir tu aprendizaje, te agradecemos coordinar el pago a la brevedad. Quedamos atentos a cualquier duda o al envío de tu comprobante.`;
                  const url = whatsappUrl(st.telefono, msg);
                  return url ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: url, target: "_blank", rel: "noopener noreferrer", onClick: () => logWhatsApp(st.nombre, msg), className: "inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent", title: `Enviar WhatsApp a ${st.telefono}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 text-primary" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => copyAndLog(msg, st.nombre), className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent", title: "Copiar mensaje", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardCopy, { className: "h-3.5 w-3.5" }) })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground opacity-30 cursor-not-allowed", title: "Agrega teléfono desde editar", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4" }) });
                })(),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setEditIdx(idx), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-4 w-4" }) })
              ] }) })
            ] }, idx);
          }) })
        ] }) })
      ] }, aula);
    }) }),
    !grouped.length && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-8 text-center text-muted-foreground", children: "Sin resultados" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudentEditDialog, { open: editIdx !== null, student: editIdx != null ? students[editIdx] : null, aulas, lastPay: editIdx != null ? lastPayByStudent.get(students[editIdx].nombre) ?? null : null, onClose: () => setEditIdx(null), onSave: (next) => {
      if (editIdx == null) return;
      setStudents(students.map((s, i) => i === editIdx ? next : s));
      setEditIdx(null);
      toast.success("Guardado");
    }, onDelete: () => {
      if (editIdx == null) return;
      if (!confirm(`Eliminar a ${students[editIdx].nombre}?`)) return;
      setStudents(students.filter((_, i) => i !== editIdx));
      setEditIdx(null);
      toast.success("Eliminado");
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudentEditDialog, { open: addOpen, student: null, aulas, lastPay: null, onClose: () => setAddOpen(false), onSave: (next) => {
      if (students.some((s) => s.nombre.toLowerCase() === next.nombre.toLowerCase())) {
        toast.error("Ya existe");
        return;
      }
      setStudents([...students, next]);
      setAddOpen(false);
      toast.success("Agregado");
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: aulasOpen, onOpenChange: setAulasOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Aulas / Cursos" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: nuevaAula, onChange: (e) => setNuevaAula(e.target.value), onKeyDown: (e) => e.key === "Enter" && addAula(), placeholder: "Nueva aula…" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: addAula, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 h-4 w-4" }),
          " Aula"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: aulas.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-sm", children: [
        a,
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => removeAula(a), className: "rounded-full p-0.5 hover:bg-destructive/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3 text-destructive" }) })
      ] }, a)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudentTxDialog, { student: viewTxStudent, tx, onClose: () => setViewTxStudent(null) })
  ] });
}
function StudentTxDialog({
  student,
  tx,
  onClose
}) {
  const [tab, setTab] = reactExports.useState("todo");
  const filtered = reactExports.useMemo(() => {
    if (!student) return [];
    return tx.filter((r) => {
      const found = findStudentInDesc(r.descripcion, [student]);
      return found !== null;
    });
  }, [tx, student]);
  const rows = tab === "todo" ? filtered : filtered.filter((r) => r.tipo === (tab === "ingresos" ? "Ingreso" : "Gasto"));
  const totalUsd = rows.reduce((s, r) => s + (Number(r.montoUsd) || 0), 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!student, onOpenChange: (v) => !v && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: student?.nombre ?? "" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        filtered.length,
        " transacciones"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 flex gap-2", children: ["todo", "ingresos", "egresos"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: "rounded-full px-3 py-1 text-xs " + (tab === t ? "bg-primary text-primary-foreground" : "bg-muted"), children: t === "todo" ? "Todas" : t === "ingresos" ? "Solo ingresos" : "Solo egresos" }, t)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-80 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-left text-muted-foreground text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1", children: "Fecha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1", children: "Categoría" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1", children: "Descripción" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-right", children: "Monto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-1 text-right", children: "USD" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-xs", children: r.fecha }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-xs", children: r.categoria }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-xs max-w-48 truncate", title: r.descripcion, children: r.descripcion }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right text-xs tabular-nums", children: [
          isNaN(Number(r.monto)) ? r.monto : $(Number(r.monto)),
          " ",
          r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "$COP" : "$"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right text-xs tabular-nums", children: [
          "$",
          $(Number(r.montoUsd) || 0)
        ] })
      ] }, r.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t pt-2 text-right text-sm font-semibold", children: [
      "Total USD: $",
      $(totalUsd)
    ] })
  ] }) });
}
function StudentEditDialog({
  open,
  student,
  aulas,
  lastPay,
  onClose,
  onSave,
  onDelete
}) {
  const [draft, setDraft] = reactExports.useState({
    nombre: "",
    aulas: [],
    actividad: "Activo",
    fechaIngreso: "2026-01-01"
  });
  const [initialized, setInitialized] = reactExports.useState(false);
  if (open && !initialized) {
    setDraft(student ?? {
      nombre: "",
      aulas: [],
      actividad: "Activo",
      condicion: "Miembro",
      fechaIngreso: "2026-01-01"
    });
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);
  const toggle = (a) => setDraft((d) => d.aulas.includes(a) ? {
    ...d,
    aulas: d.aulas.filter((x) => x !== a)
  } : {
    ...d,
    aulas: [...d.aulas, a]
  });
  const ymNow = currentYm();
  const cuotaAplicada = cuotaMensualUSD(draft, ymNow);
  const lastYm = lastPay ? (fechaToIso(lastPay.fecha) || "").slice(0, 7) : null;
  const deuda = calcularCuotasDebidas(draft, lastYm, ymNow, lastPay?.monto);
  const esPorClase = draft.condicion === "ClasePorClase";
  const precioClaseActual = precioClase(ymNow);
  const placeholderExamples = ["$20.00", "$15.00", "$13.50", "$0.00", "$25.00"];
  const placeholder = placeholderExamples[draft.nombre.length % placeholderExamples.length];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (v) => !v && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: student ? "Modificar integrante" : "Nuevo integrante" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Nombre" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.nombre, onChange: (e) => setDraft({
          ...draft,
          nombre: e.target.value
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Aulas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap gap-1.5", children: aulas.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => toggle(a), className: "rounded-full border px-2.5 py-1 text-xs " + (draft.aulas.includes(a) ? "border-primary bg-primary text-primary-foreground" : "bg-background"), children: a }, a)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Condición" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: draft.condicion ?? "Miembro", onValueChange: (v) => setDraft({
            ...draft,
            condicion: v
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Miembro", children: "Miembro" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Probacionista", children: "Probacionista" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "ClasePorClase", children: "Clase por clase" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Actividad" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: draft.actividad ?? "Activo", onValueChange: (v) => setDraft({
            ...draft,
            actividad: v
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Activo", children: "Activo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "Retirado", children: "Retirado" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "celador", type: "checkbox", checked: !!draft.celador, onChange: (e) => setDraft({
          ...draft,
          celador: e.target.checked
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "celador", className: "text-sm", children: "Es celador(a)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Cuota mensual (USD)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", value: draft.cuotaOverride ?? "", placeholder: `ejemplo: ${placeholder}`, onChange: (e) => setDraft({
            ...draft,
            cuotaOverride: e.target.value === "" ? void 0 : Number(e.target.value)
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Teléfono (WhatsApp)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.telefono ?? "", placeholder: "04141234567", onChange: (e) => setDraft({
            ...draft,
            telefono: e.target.value || void 0
          }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Fecha de ingreso" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: draft.fechaIngreso ?? "2026-01-01", onChange: (e) => setDraft({
          ...draft,
          fechaIngreso: e.target.value || void 0
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border bg-muted/30 p-3 text-xs space-y-1", children: [
        esPorClase ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "Modalidad: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "Pago por clase" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "Precio referencial por clase (",
            MESES_ES[Number(ymNow.slice(5, 7)) - 1],
            " ",
            ymNow.slice(0, 4),
            "): ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
              "$",
              $(precioClaseActual)
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "Cuota aplicada este mes: ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
              "$",
              $(cuotaAplicada)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "Meses debidos: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: deuda.meses })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "Deuda total: ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
              "$",
              $(deuda.totalUSD)
            ] })
          ] })
        ] }),
        lastPay && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "Último pago: ",
          lastPay.fecha,
          " ($",
          $(lastPay.monto),
          ")"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      onDelete && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", onClick: onDelete, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-2 h-4 w-4 text-destructive" }),
        " Eliminar"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: onClose, children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => onSave(draft), disabled: !draft.nombre.trim(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-2 h-4 w-4" }),
        " Guardar"
      ] })
    ] })
  ] }) });
}
function TasasBcvTab({
  bcv
}) {
  const fetchQuarter = useServerFn(fetchBcvQuarter);
  const [loadingAuto, setLoadingAuto] = reactExports.useState(false);
  const [loadingImport, setLoadingImport] = reactExports.useState(false);
  const [nuevaFecha, setNuevaFecha] = reactExports.useState(todayIso());
  const [nuevaTasa, setNuevaTasa] = reactExports.useState("");
  const cargarTrimestres = async () => {
    setLoadingAuto(true);
    let total = 0;
    const y = (/* @__PURE__ */ new Date()).getFullYear();
    for (const q of [1, 2, 3, 4]) {
      try {
        const res = await fetchQuarter({
          data: {
            year: y,
            quarter: q
          }
        });
        if (!res || !res.rows.length) continue;
        const nuevas = {};
        for (const r of res.rows) {
          if (!bcv.rates[r.isoDate]) nuevas[r.isoDate] = r.rate;
        }
        const c = Object.keys(nuevas).length;
        if (c) {
          bcv.merge(nuevas);
          total += c;
        }
      } catch {
      }
    }
    toast.success(total ? `${total} tasas cargadas desde el BCV` : "No se encontraron nuevas tasas");
    setLoadingAuto(false);
  };
  const importarXls = async (file) => {
    setLoadingImport(true);
    try {
      const buf = await file.arrayBuffer();
      const XLSX2 = await import("../_libs/xlsx.mjs");
      const wb = XLSX2.read(buf, {
        type: "array"
      });
      const encontradas = {};
      for (const sheetName of wb.SheetNames) {
        const m = sheetName.match(/^(\d{2})(\d{2})(\d{4})$/);
        if (!m) continue;
        const iso = `${m[3]}-${m[2]}-${m[1]}`;
        const ws = wb.Sheets[sheetName];
        const cell = ws["G15"];
        const rate = typeof cell?.v === "number" ? cell.v : Number(cell?.v);
        if (rate && rate > 1) encontradas[iso] = rate;
      }
      const cant = Object.keys(encontradas).length;
      if (cant) {
        bcv.merge(encontradas);
        toast.success(`${cant} tasas importadas desde ${file.name}`);
      } else {
        toast.error("No se encontraron tasas en G15. ¿Es el XLS del BCV?");
      }
    } catch (err) {
      toast.error(`Error al leer XLS: ${err.message}`);
    } finally {
      setLoadingImport(false);
    }
  };
  const agregarManual = () => {
    const r = Number(nuevaTasa);
    if (!r || r <= 0) {
      toast.error("Tasa inválida");
      return;
    }
    bcv.set(nuevaFecha, r);
    setNuevaTasa("");
    toast.success("Tasa guardada");
  };
  const rows = Object.entries(bcv.rates).sort((a, b) => b[0].localeCompare(a[0]));
  reactExports.useEffect(() => {
    const cur = Object.keys(bcv.rates).filter((k) => !k.startsWith("2025"));
    bcv.clean((iso) => iso.startsWith("2025"));
    if (!cur.length) cargarTrimestres();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Tasas BCV (bolívares por dólar)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          rows.length,
          " días cargados."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: cargarTrimestres, disabled: loadingAuto, size: "sm", children: [
          loadingAuto ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "mr-2 h-4 w-4" }),
          "Actualizar tasas"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", id: "importBcvXls", accept: ".xls,.xlsx", style: {
          display: "none"
        }, onChange: async (e) => {
          const f = e.target.files?.[0];
          if (f) await importarXls(f);
          e.target.value = "";
        } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", disabled: loadingImport, onClick: () => document.getElementById("importBcvXls")?.click(), children: [
          loadingImport ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "mr-2 h-4 w-4" }),
          "Importar XLS"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Fecha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: nuevaFecha, onChange: (e) => setNuevaFecha(e.target.value), className: "block rounded border bg-background px-2 py-1 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Tasa Bs/$" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: nuevaTasa, onChange: (e) => setNuevaTasa(e.target.value), className: "w-32", placeholder: "212.34" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: agregarManual, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 h-4 w-4" }),
        " Guardar tasa"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[60vh] overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-left text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Fecha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium text-right", children: "Tasa Bs/$" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        rows.map(([iso, r]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: isoToFecha(iso) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums", children: r.toFixed(4) })
        ] }, iso)),
        !rows.length && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 2, className: "py-8 text-center text-muted-foreground", children: "Sin tasas" }) })
      ] })
    ] }) })
  ] });
}
function SimpleListEditor({
  items,
  setItems,
  placeholder
}) {
  const [draft, setDraft] = reactExports.useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      toast.error("Ya existe");
      return;
    }
    setItems([...items, v]);
    setDraft("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: (e) => e.key === "Enter" && add(), placeholder }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: add, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 h-4 w-4" }),
        " Agregar"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-2 sm:grid-cols-2", children: items.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1 rounded-md border bg-card px-2 py-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: c, onChange: (e) => setItems(items.map((x, j) => j === i ? e.target.value : x)), className: "h-8 border-0 shadow-none focus-visible:ring-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setItems(items.filter((_, j) => j !== i)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4 text-destructive" }) })
    ] }, i)) })
  ] });
}
export {
  Index as component
};
