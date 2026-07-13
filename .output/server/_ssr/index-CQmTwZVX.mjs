import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useRouter } from "../_libs/tanstack__react-router.mjs";
import { m as isRedirect } from "../_libs/tanstack__router-core.mjs";
import { read as readSync, utils, writeFile as writeFileSync } from "../_libs/xlsx.mjs";
import { a as createServerFn, T as TSS_SERVER_FUNCTION, g as getServerFnById } from "./server-CzQV3pgX.mjs";
import { C as CATEGORIAS_INGRESO, a as CATEGORIAS_GASTO, A as AULAS_DEFAULT, S as STUDENTS } from "./students-data-BBPPruln.mjs";
import { S as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { c as cva } from "../_libs/class-variance-authority.mjs";
import { c as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { R as Root2, L as List, T as Trigger, C as Content } from "../_libs/radix-ui__react-tabs.mjs";
import { S as Select$1, a as SelectValue$1, b as SelectTrigger$1, c as SelectIcon, d as SelectPortal, e as SelectContent$1, f as SelectViewport, g as SelectItem$1, h as SelectItemIndicator, i as SelectItemText, j as SelectScrollUpButton$1, k as SelectScrollDownButton$1, l as SelectLabel$1, m as SelectSeparator$1 } from "../_libs/radix-ui__react-select.mjs";
import { D as Dialog$1, a as DialogPortal$1, b as DialogContent$1, c as DialogClose, d as DialogTitle$1, e as DialogOverlay$1, f as DialogDescription$1 } from "../_libs/radix-ui__react-dialog.mjs";
import { t as toast } from "../_libs/sonner.mjs";

import "../_libs/seroval.mjs";
import { S as ScanText, L as LoaderCircle, U as Upload, X, P as Plus, a as Save, T as Trash2, D as Download, b as Settings, c as Pencil, M as MessageCircle, R as RefreshCw, C as ChevronDown, d as Check, e as ChevronUp } from "../_libs/lucide-react.mjs";
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
import "../_libs/radix-ui__react-roving-focus.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/@radix-ui/react-use-is-hydrated+[...].mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/react-remove-scroll.mjs";
import "../_libs/tslib.mjs";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
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
const K_STU = "lector_ocr_alumnos_v3";
const K_STU_V2 = "lector_ocr_alumnos_v2";
const K_STU_V1 = "lector_ocr_alumnos";
const K_AULAS = "lector_ocr_aulas";
const K_TX = "lector_ocr_transacciones_v1";
const K_BCV = "lector_ocr_bcv_v1";
const K_SEED = "lector_ocr_seed_v4";
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
function useEditableList(kind) {
  const key = kind === "ingresos" ? K_ING : K_GAS;
  const def = kind === "ingresos" ? [...CATEGORIAS_INGRESO] : [...CATEGORIAS_GASTO];
  const [items, setItems] = reactExports.useState(def);
  reactExports.useEffect(() => {
    setItems(load(key, def));
  }, []);
  const setter = (next) => {
    setItems(next);
    save(key, next);
  };
  return [items, setter];
}
function useEditableAulas() {
  const [items, setItems] = reactExports.useState(AULAS_DEFAULT);
  reactExports.useEffect(() => {
    const stored = load(K_AULAS, AULAS_DEFAULT);
    const merged = Array.from(/* @__PURE__ */ new Set([...stored, ...AULAS_DEFAULT]));
    setItems(merged);
    if (merged.length !== stored.length) save(K_AULAS, merged);
  }, []);
  const setter = (next) => {
    setItems(next);
    save(K_AULAS, next);
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
      setItems(base);
      save(K_STU, base);
    } catch {
      setItems(seedFromDefault());
    }
  }, []);
  const setter = (next) => {
    setItems(next);
    save(K_STU, next);
  };
  return [items, setter];
}
function useTransactions() {
  const [list, setList] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let data = load(K_TX, []);
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
  const persist = (next) => {
    setList(next);
    save(K_TX, next);
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
    () => typeof window !== "undefined" ? load(K_BCV, {}) : {}
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
        const next = {};
        for (const k of Object.keys(prev)) {
          if (!predicate(k)) next[k] = prev[k];
        }
        save(K_BCV, next);
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
const BAJAS_HASTA_2025 = /* @__PURE__ */ new Map([
  ["Carlos Angel Jimenez Bermeo", 15],
  ["Elmer Rincon", 15],
  ["Manuela Zambrano", 15],
  ["Lourdes Josefina Moreno Márquez", 13.5]
]);
const SUBEN_25_DESDE_MAYO_2026 = /* @__PURE__ */ new Set([
  "Rosana Escalante",
  "Victor Jaimes",
  "Jacqueline Salazar",
  "Laura Sanchez",
  "Mariana Isabella Barajas"
]);
function normalize(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
const BAJAS_NORM = new Map(
  Array.from(BAJAS_HASTA_2025.entries()).map(([k, v]) => [normalize(k), v])
);
const SUBEN_NORM = new Set(Array.from(SUBEN_25_DESDE_MAYO_2026).map(normalize));
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
function calcularCuotasDebidas(student, lastPaidYm, currentYm2, lastPayAmount) {
  if (student.condicion === "ClasePorClase") {
    return { meses: 0, totalUSD: 0, detalle: [] };
  }
  const detalle = [];
  const start = lastPaidYm ? nextYm(lastPaidYm) : aulaStartYm(student.aulas);
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
  const m = Number(monto);
  if (!m || !isFinite(m)) return "";
  if (moneda === "USD" || moneda === "" || moneda === "Dólares") return m.toFixed(2);
  const t = Number(tasa);
  if (!t || !isFinite(t) || t <= 0) return "";
  return (m / t).toFixed(2);
}
const TASA_PESOS_DEFAULT = 4e3;
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
  const [aulas, setAulas] = useEditableAulas();
  const [students, setStudents] = useEditableStudents();
  const transactions = useTransactions();
  const bcv = useBcvRates();
  const [headerDate, setHeaderDate] = reactExports.useState(todayIso());
  const [headerLoading, setHeaderLoading] = reactExports.useState(false);
  const fetchForDate = useServerFn(fetchBcvForDate);
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
      monto: e.monto,
      tasa: e.tasa,
      montoUsd: e.montoUsd
    })));
    setEntries([]);
    setPreviews([]);
    toast.success(`${entries.length} transacciones guardadas`);
  };
  const headerRate = bcvRateFor(bcv.rates, headerDate);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-[1400px] px-4 py-6", children: [
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground min-w-[80px] text-center", children: headerLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "inline h-3 w-3 animate-spin" }) : headerRate != null ? `${headerRate.toFixed(2)} Bs/$` : "—" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "ocr", className: "w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "mb-4 grid w-full grid-cols-3 md:grid-cols-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "ocr", children: "Registro OCR" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "tx", children: [
          "Transacciones (",
          transactions.list.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "finanzas", children: "Finanzas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "solvencias", children: "Solvencias" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "bcv", children: "Tasas BCV" })
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "tx", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionsTab, { tx: transactions, ingresos, gastos, setIngresos, setGastos, bcvRates: bcv.rates, students }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "finanzas", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "resumen", className: "w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "resumen", children: "Resumen mensual" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "analisis", children: "Análisis anual" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "resumen", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResumenTab, { tx: transactions.list, ingresos, gastos }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "analisis", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnalisisTab, { tx: transactions.list, ingresos, gastos, bcvRates: bcv.rates }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "solvencias", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SolvenciasTab, { students, setStudents, aulas, setAulas, tx: transactions.list }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "bcv", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TasasBcvTab, { bcv }) })
    ] })
  ] }) });
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
  setIngresos,
  setGastos,
  bcvRates,
  students
}) {
  const [from, setFrom] = reactExports.useState("");
  const [to, setTo] = reactExports.useState("");
  const [searchQ, setSearchQ] = reactExports.useState("");
  const [editing, setEditing] = reactExports.useState(null);
  const [catOpen, setCatOpen] = reactExports.useState(false);
  const [studentTx, setStudentTx] = reactExports.useState(null);
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
      return true;
    });
  }, [tx.list, from, to, searchQ, students]);
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
            tipo: "Ingreso",
            categoria: "",
            descripcion: "",
            mensualidad: "",
            moneda: "USD",
            monto: "",
            tasa: "",
            montoUsd: ""
          };
          tx.append([empty]);
          toast.success("Fila agregada");
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
              monto: String(r.Monto || r.monto || "0"),
              tasa: String(r["Tasa cambio"] || r["Tasa"] || r.tasa || ""),
              montoUsd: String(r["Monto USD"] || r["USD"] || r.montoUsd || "")
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b text-left text-muted-foreground", children: ["Fecha", "Tipo", "Categoría", "Descripción", "Mens.", "Moneda", "Monto", "Tasa", "USD", "", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        filtered.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.fecha }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.tipo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.categoria }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.descripcion }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.mensualidad }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: r.moneda }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums", children: r.monto }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums text-xs", children: r.tasa }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums font-medium", children: r.montoUsd }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => tx.duplicateAfter(r.id), title: "Duplicar fila debajo", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setEditing(r), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => tx.remove(r.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4 text-destructive" }) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: (() => {
            const s = findStudentInDesc(r.descripcion, students);
            if (!s) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground", title: "No se encontró alumno en la descripción", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 opacity-30" }) });
            if (!s.telefono) return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toast.info(`Agrega el teléfono de ${s.nombre} editando al integrante en la pestaña Solvencias`), className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent", title: "Agregar teléfono (editar alumno en Solvencias)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 opacity-50" }) });
            const moneda = r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "COP" : "USD";
            const msg = `Hola ${s.nombre.split(" ")[0]}, recibimos tu pago de ${r.monto} ${moneda}${r.mensualidad ? ` correspondiente a ${r.mensualidad}` : ""}${r.descripcion ? ` (${r.descripcion})` : ""}. Gracias por tu apoyo. Nueva Acrópolis.`;
            const url = whatsappUrl(s.telefono, msg);
            return url ? /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent", title: `Enviar WhatsApp a ${s.nombre}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 text-primary" }) }) : null;
          })() })
        ] }, r.id)),
        !filtered.length && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 11, className: "py-8 text-center text-muted-foreground", children: "Sin transacciones" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionEditDialog, { editing, onClose: () => setEditing(null), ingresos, gastos, bcvRates, onSave: (next) => {
      tx.replace(next.id, next);
      setEditing(null);
      toast.success("Transacción actualizada");
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: catOpen, onOpenChange: setCatOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-3xl max-h-[85vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Categorías" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "ing", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "ing", children: "Ingresos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "gas", children: "Gastos" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "ing", className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimpleListEditor, { items: ingresos, setItems: setIngresos, placeholder: "Nueva categoría de ingreso…" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "gas", className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimpleListEditor, { items: gastos, setItems: setGastos, placeholder: "Nueva categoría de gasto…" }) })
      ] })
    ] }) })
  ] });
}
function TransactionEditDialog({
  editing,
  onClose,
  onSave,
  ingresos,
  gastos,
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
        return normalizeMoneyRow(next, bcvRates);
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Monto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.monto, onChange: (e) => update("monto", e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tasa", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.tasa, onChange: (e) => update("tasa", e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "USD (auto)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.montoUsd, readOnly: true, className: "bg-muted/40" }) })
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
  const arbitraje = reactExports.useMemo(() => {
    const bsTotal = Array(12).fill(0);
    const bsEgreso = Array(12).fill(0);
    const usdTotal = Array(12).fill(0);
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== year) continue;
      if (t.moneda !== "Bolívares") continue;
      const mi = Number(iso.slice(5, 7)) - 1;
      const monto = Number(t.monto) || 0;
      const usd = Number(t.montoUsd) || 0;
      bsTotal[mi] += monto;
      usdTotal[mi] += usd;
      if (t.tipo === "Gasto") bsEgreso[mi] += monto;
    }
    const porMes = Array(12).fill(0);
    for (let mi = 0; mi < 12; mi++) {
      if (bsTotal[mi] === 0 && usdTotal[mi] === 0) continue;
      const saldoBs = bsTotal[mi] - bsEgreso[mi];
      const lastDay = new Date(year, mi + 1, 0);
      let tasaCierre = 0;
      for (let d = lastDay.getDate(); d >= 1; d--) {
        const li = `${year}-${String(mi + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        tasaCierre = bcvRates[li] ?? 0;
        if (tasaCierre > 0) break;
      }
      if (tasaCierre <= 0) continue;
      porMes[mi] = saldoBs / tasaCierre - usdTotal[mi];
    }
    return porMes;
  }, [tx, year, bcvRates]);
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
              arrastre.toFixed(2)
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b bg-muted/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs text-muted-foreground", children: "Arbitraje (Bs → USD)" }),
          arbitraje.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs tabular-nums " + (v > 0 ? "text-primary" : v < 0 ? "text-destructive" : ""), children: v !== 0 ? (v > 0 ? "+" : "") + v.toFixed(0) : "" }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 text-right text-xs", children: arbitraje.reduce((s, v) => s + v, 0) !== 0 ? (arbitraje.reduce((s, v) => s + v, 0) > 0 ? "+" : "") + arbitraje.reduce((s, v) => s + v, 0).toFixed(0) : "" }),
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
  tx,
  ingresos,
  gastos
}) {
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
      if (t.tipo === "Ingreso") {
        ingByCat[c] = (ingByCat[c] || 0) + usd;
        if (!ingDet[c]) ingDet[c] = [];
        ingDet[c].push({
          desc: t.descripcion || t.mensualidad,
          monto: usd
        });
      } else if (t.tipo === "Gasto") {
        gasByCat[c] = (gasByCat[c] || 0) + usd;
        if (!gasDet[c]) gasDet[c] = [];
        gasDet[c].push({
          desc: t.descripcion || t.mensualidad,
          monto: usd
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
  const exportExcelResumen = () => {
    const wb = utils.book_new();
    const ingData = {};
    const gasData = {};
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      const usd = Number(t.montoUsd) || 0;
      const c = t.categoria || "Sin categoria";
      const val = `$${usd.toFixed(2)}`;
      const note = t.descripcion || t.mensualidad || "";
      if (t.tipo === "Ingreso") {
        if (!ingData[c]) ingData[c] = [];
        ingData[c].push(note ? `${val} (${note})` : val);
      } else {
        if (!gasData[c]) gasData[c] = [];
        gasData[c].push(note ? `${val} (${note})` : val);
      }
    }
    const allCats = [.../* @__PURE__ */ new Set([...Object.keys(ingData), ...Object.keys(gasData)])];
    const sheetData = [];
    const headerRow = ["Tipo", ...allCats];
    sheetData.push(headerRow);
    const maxRows = Math.max(...allCats.map((c) => Math.max(ingData[c]?.length || 0, gasData[c]?.length || 0)), 0);
    for (let i = 0; i < maxRows; i++) {
      const row = [i === 0 ? "Ingresos" : ""];
      for (const c of allCats) {
        const items = ingData[c] || [];
        row.push(i < items.length ? items[i] : "");
      }
      sheetData.push(row);
    }
    const sepRow = Array(allCats.length + 1).fill("");
    sheetData.push(sepRow);
    const egresosHeader = ["Egresos", ...allCats.map(() => "")];
    sheetData.push(egresosHeader);
    const maxGasRows = Math.max(...allCats.map((c) => gasData[c]?.length || 0), 0);
    for (let i = 0; i < maxGasRows; i++) {
      const row = [""];
      for (const c of allCats) {
        const items = gasData[c] || [];
        row.push(i < items.length ? items[i] : "");
      }
      sheetData.push(row);
    }
    const ws = utils.aoa_to_sheet(sheetData);
    ws["!cols"] = allCats.map(() => ({
      wch: 25
    }));
    utils.book_append_sheet(wb, ws, "Resumen");
    writeFileSync(wb, `RESUMEN_${ym}_${todayIso()}.xlsx`);
    toast.success("Excel descargado");
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
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-primary", children: "Ingresos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Click categoría para detalle" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowAllCats(!showAllCats), className: "rounded-full px-3 py-1 text-xs " + (showAllCats ? "bg-primary text-primary-foreground" : "bg-muted"), children: showAllCats ? "Todas" : "Solo con datos" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 flex flex-wrap gap-1 max-h-32 overflow-y-auto", children: ingresos.sort().map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleIngCat(c), className: `rounded-full px-2.5 py-1 text-xs border transition ${selectedIngCats.has(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/30 text-muted-foreground"}`, children: c }, c)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        ingresos.filter((c) => selectedIngCats.has(c)).map((c) => {
          const v = data.ingByCat[c] || 0;
          const det = data.ingDet[c];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0 cursor-pointer hover:bg-accent/30", onClick: () => setExpandedCat(expandedCat === c ? null : c), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 font-medium", children: c }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right tabular-nums", children: [
                "$",
                v.toFixed(2)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right text-xs text-muted-foreground", children: [
                data.totalIng > 0 ? (v / data.totalIng * 100).toFixed(0) : 0,
                "%"
              ] })
            ] }, c),
            expandedCat === c && det && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted/20 px-3 py-2 text-xs space-y-1 max-h-40 overflow-y-auto", children: det.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground truncate", children: d.desc || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums font-medium", children: [
                "$",
                d.monto.toFixed(2)
              ] })
            ] }, i)) }) }) }, `${c}-det`)
          ] });
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: "Total Ingresos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 text-right", children: [
            "$",
            data.totalIng.toFixed(2)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-destructive", children: "Egresos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Click categoría para detalle" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 flex flex-wrap gap-1 max-h-32 overflow-y-auto", children: gastos.sort().map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleGasCat(c), className: `rounded-full px-2.5 py-1 text-xs border transition ${selectedGasCats.has(c) ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background border-muted-foreground/30 text-muted-foreground"}`, children: c }, c)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        gastos.filter((c) => selectedGasCats.has(c)).map((c) => {
          const v = data.gasByCat[c] || 0;
          const det = data.gasDet[c];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b last:border-0 cursor-pointer hover:bg-accent/30", onClick: () => setExpandedCat(expandedCat === `g-${c}` ? null : `g-${c}`), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-1 font-medium", children: c }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right tabular-nums", children: [
                "$",
                v.toFixed(2)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right text-xs text-muted-foreground", children: [
                data.totalGas > 0 ? (v / data.totalGas * 100).toFixed(0) : 0,
                "%"
              ] })
            ] }, c),
            expandedCat === `g-${c}` && det && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted/20 px-3 py-2 text-xs space-y-1 max-h-40 overflow-y-auto", children: det.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground truncate", children: d.desc || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums font-medium", children: [
                "$",
                d.monto.toFixed(2)
              ] })
            ] }, i)) }) }) }, `${c}-det`)
          ] });
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: "Total Egresos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-2 text-right", children: [
            "$",
            data.totalGas.toFixed(2)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-3 font-semibold", children: "Neto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-3xl font-bold " + (data.totalIng - data.totalGas < 0 ? "text-destructive" : ""), children: [
        "$",
        (data.totalIng - data.totalGas).toFixed(2)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-sm text-muted-foreground", children: [
        "Ingresos − Egresos (",
        MESES_ES[m - 1],
        " ",
        y,
        ")"
      ] })
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
              monto: Number(t.montoUsd) || 0
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
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b));
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
    grouped.map(([aula, list]) => {
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
        !isCollapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-left text-muted-foreground text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Integrante" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium", children: "Último pago" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 font-medium text-right", children: "Abono" }),
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
                st.celador && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] uppercase text-accent-foreground", children: "celador" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: pay?.fecha ?? "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right text-xs tabular-nums", children: pay ? `$${pay.monto.toFixed(2)}` : "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-xs", children: esPorClase ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-muted px-2 py-0.5", children: "Por clase" }) : sinHistorial ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) : deuda.meses === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-primary/20 px-2 py-0.5 text-primary", children: "Al día" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded bg-destructive/20 px-2 py-0.5 text-destructive", children: [
                "Debe ",
                deuda.meses,
                " ",
                deuda.meses === 1 ? "mensualidad" : "mensualidades"
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
                (() => {
                  const cuota = cuotaMensualUSD(st, ymNow);
                  const monto = esPorClase ? precioClase(ymNow) : deuda.totalUSD;
                  const msg = esPorClase ? `Hola ${st.nombre.split(" ")[0]}, te recordamos que la clase de hoy en Nueva Acrópolis tiene un valor de $${precioClase(ymNow).toFixed(2)}. Gracias.` : deuda.meses === 0 ? `Hola ${st.nombre.split(" ")[0]}, gracias por estar al día con tu mensualidad (${MESES_ES[Number(ymNow.slice(5, 7)) - 1]}). ¡Un abrazo desde Nueva Acrópolis!` : `Hola ${st.nombre.split(" ")[0]}, te recordamos que tienes pendiente ${deuda.meses} ${deuda.meses === 1 ? "mensualidad" : "mensualidades"} por un total de $${monto.toFixed(2)} (cuota mensual $${cuota.toFixed(2)}). Cualquier duda estamos atentos. Nueva Acrópolis.`;
                  const url = whatsappUrl(st.telefono, msg);
                  return url ? /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent", title: `Enviar WhatsApp a ${st.telefono}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4 text-primary" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditIdx(idx), title: "Falta teléfono — agrégalo aquí", className: "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-4 w-4" }) });
                })(),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setEditIdx(idx), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-4 w-4" }) })
              ] }) })
            ] }, idx);
          }) })
        ] }) })
      ] }, aula);
    }),
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
          r.monto,
          " ",
          r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "$COP" : "$"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "p-1 text-right text-xs tabular-nums", children: [
          "$",
          (Number(r.montoUsd) || 0).toFixed(2)
        ] })
      ] }, r.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t pt-2 text-right text-sm font-semibold", children: [
      "Total USD: $",
      totalUsd.toFixed(2)
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
              precioClaseActual.toFixed(2)
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            "Cuota aplicada este mes: ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
              "$",
              cuotaAplicada.toFixed(2)
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
              deuda.totalUSD.toFixed(2)
            ] })
          ] })
        ] }),
        lastPay && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          "Último pago: ",
          lastPay.fecha,
          " ($",
          lastPay.monto.toFixed(2),
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
