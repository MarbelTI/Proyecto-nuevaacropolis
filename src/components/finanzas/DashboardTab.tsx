import { useMemo, useState } from "react";
import type { Transaction, Student } from "@/lib/lists-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReporteEjecutivo } from "@/components/finanzas/ReporteEjecutivo";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp, TrendingDown, Search, X, DollarSign, Banknote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MESES_ABR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const $ = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const $0 = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

function normalizeName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchStudent(desc: string, students: Student[]): Student | null {
  const n = normalizeName(desc);
  for (const s of students) {
    if (n.includes(normalizeName(s.nombre))) return s;
  }
  return null;
}

const CHART_COLORS = ["#D4AC5C", "#74A67E", "#C25E45", "#6C97A0", "#8B8271"];

export function DashboardTab({
  tx, ingresos, gastos, bcvRates, students,
}: {
  tx: Transaction[];
  ingresos: string[];
  gastos: string[];
  bcvRates: Record<string, number>;
  students: Student[];
}) {
  const yearsSet = useMemo(() => {
    const s = new Set<number>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (iso) s.add(Number(iso.slice(0, 4)));
    }
    s.add(new Date().getFullYear());
    return s;
  }, [tx]);
  const years = Array.from(yearsSet).sort((a, b) => b - a);
  const allMonths = useMemo(() => {
    const s = new Set<number>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (iso) s.add(Number(iso.slice(5, 7)));
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [tx]);

  const [year, setYear] = useState<number>(years[0]);
  const [month, setMonth] = useState<number | null>(null);
  const [personaQ, setPersonaQ] = useState("");
  const [personaSelected, setPersonaSelected] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterMoneda, setFilterMoneda] = useState<string>("");
  const [filterCategoria, setFilterCategoria] = useState<string>("");
  const [catPanelOpen, setCatPanelOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const personaSuggestions = useMemo(() => {
    if (!personaQ.trim() || personaSelected) return [];
    const q = normalizeName(personaQ);
    return students.filter((s) => normalizeName(s.nombre).includes(q)).slice(0, 6);
  }, [personaQ, personaSelected, students]);

  const personaLabel = useMemo(() => {
    if (!personaSelected) return null;
    return students.find((s) => s.nombre === personaSelected)?.nombre ?? personaSelected;
  }, [personaSelected, students]);

  const filteredTx = useMemo(() => {
    let filtered = tx;
    filtered = filtered.filter((t) => {
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== year) return false;
      if (month && Number(iso.slice(5, 7)) !== month) return false;
      if (filterTipo !== "todos" && t.tipo !== filterTipo) return false;
      if (filterMoneda && t.moneda !== filterMoneda) return false;
      if (filterCategoria && t.categoria !== filterCategoria) return false;
      if (personaSelected) {
        const s = matchStudent(t.descripcion, students);
        if (s?.nombre !== personaSelected) return false;
      }
      return true;
    });
    return filtered;
  }, [tx, year, month, filterTipo, filterMoneda, filterCategoria, personaSelected, students]);

  const monthData = useMemo(() => {
    let ing = 0, gas = 0;
    const ingCat: Record<string, number> = {};
    const gasCat: Record<string, number> = {};
    for (const c of ingresos) ingCat[c] = 0;
    for (const c of gastos) gasCat[c] = 0;
    for (const t of filteredTx) {
      const usd = Number(t.montoUsd) || 0;
      if (t.tipo === "Ingreso") {
        ing += usd;
        const cat = t.categoria || "(sin categoría)";
        ingCat[cat] = (ingCat[cat] || 0) + usd;
      } else if (t.tipo === "Gasto") {
        gas += usd;
        const cat = t.categoria || "(sin categoría)";
        gasCat[cat] = (gasCat[cat] || 0) + usd;
      }
    }
    return { ing, gas, neto: ing - gas, ingCat, gasCat };
  }, [filteredTx, ingresos, gastos]);

  const monedaData = useMemo(() => {
    let usdIng = 0, usdGas = 0, bsIng = 0, bsGas = 0, copIng = 0, copGas = 0;
    for (const t of filteredTx) {
      const usd = Number(t.montoUsd) || 0;
      const monto = Number(t.monto) || 0;
      if (t.tipo === "Ingreso") {
        usdIng += usd;
        if (t.moneda === "Bolívares") bsIng += monto;
        if (t.moneda === "Pesos") copIng += monto;
      } else if (t.tipo === "Gasto") {
        usdGas += usd;
        if (t.moneda === "Bolívares") bsGas += monto;
        if (t.moneda === "Pesos") copGas += monto;
      }
    }
    return {
      usdIng, usdGas, usdNeto: usdIng - usdGas,
      bsIng, bsGas, bsNeto: bsIng - bsGas,
      copIng, copGas, copNeto: copIng - copGas,
    };
  }, [filteredTx]);

  const topCategorias = useMemo(() => {
    const ing = Object.entries(monthData.ingCat)
      .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 8);
    const gas = Object.entries(monthData.gasCat)
      .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 8);
    return { ingreso: ing, gasto: gas };
  }, [monthData]);

  const allCategorias = useMemo(() => {
    const cats = new Set<string>();
    for (const t of tx) if (t.categoria) cats.add(t.categoria);
    return Array.from(cats).sort();
  }, [tx]);

  const catGroups = useMemo(() => {
    const ing = new Map<string, number>();
    const gas = new Map<string, number>();
    for (const t of tx) {
      if (!t.categoria) continue;
      if (t.tipo === "Ingreso") ing.set(t.categoria, (ing.get(t.categoria) || 0) + 1);
      else gas.set(t.categoria, (gas.get(t.categoria) || 0) + 1);
    }
    return {
      ingreso: [...ing.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")),
      gasto: [...gas.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")),
    };
  }, [tx]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<number, { mes: number; ingreso: number; gasto: number }>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== year) continue;
      const m = Number(iso.slice(5, 7));
      const usd = Number(t.montoUsd) || 0;
      if (!map.has(m)) map.set(m, { mes: m, ingreso: 0, gasto: 0 });
      const d = map.get(m)!;
      if (t.tipo === "Ingreso") d.ingreso += usd;
      else d.gasto += usd;
    }
    return Array.from(map.values()).sort((a, b) => a.mes - b.mes);
  }, [tx, year]);

  const monedaDist = useMemo(() => {
    const counts: Record<string, number> = { USD: 0, "Bolívares": 0, Pesos: 0 };
    for (const t of filteredTx) {
      const m = t.moneda || "USD";
      counts[m] = (counts[m] || 0) + 1;
    }
    return Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }));
  }, [filteredTx]);

  const bcvTasa = useMemo(() => {
    if (!month) return null;
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    for (let d = 31; d >= 1; d--) {
      const iso = `${ym}-${String(d).padStart(2, "0")}`;
      if (bcvRates[iso]) return bcvRates[iso];
    }
    return null;
  }, [bcvRates, year, month]);

  const nIng = filteredTx.filter((r) => r.tipo === "Ingreso").length;
  const nGas = filteredTx.filter((r) => r.tipo === "Gasto").length;
  const coveragePct = (cov: number, total: number) => total > 0 ? `${Math.round((cov / total) * 100)}%` : "—";

  const kpiColor = (v: number) =>
    v > 0 ? "text-[#74A67E]" : v < 0 ? "text-[#C25E45]" : "text-muted-foreground";

  const mesLabel = month ? MESES_ES[month - 1] : "todo el año";

  const clearFilters = () => {
    setMonth(null);
    setFilterTipo("todos");
    setFilterMoneda("");
    setFilterCategoria("");
    setPersonaSelected(null);
    setPersonaQ("");
  };

  const anyFilter = !!(month || filterTipo !== "todos" || filterMoneda || filterCategoria || personaSelected);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[#D4AC5C] ring-2 ring-[#D4AC5C]/30" />
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#D4AC5C]">
            {year} · {month ? mesLabel : "anual"}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Panorama de Ingresos y Gastos</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-mono text-xs gap-1">
              🗓 {MESES_ABR[(allMonths[0] || 1) - 1]} – {MESES_ABR[(allMonths[allMonths.length - 1] || new Date().getMonth() + 1) - 1]} {year}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs gap-1">
              🧾 {tx.length} movimientos
            </Badge>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-40 -mx-2 px-2 py-3 bg-background/90 backdrop-blur-md border rounded-xl">
        <div className="flex flex-wrap items-start gap-3">
          {/* Year */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">Año</span>
            <div className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <button key={y}
                  onClick={() => { if (year !== y) setYear(y); else setYear(y); }}
                  className={"px-3 py-1.5 text-xs rounded-full border font-medium transition " +
                    (year === y ? "bg-[#D4AC5C]/15 border-[#D4AC5C] text-[#D4AC5C]" : "bg-card border-border text-muted-foreground hover:border-[#D4AC5C]")}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          {/* Month */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">Mes</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMonth(null)}
                className={"px-2.5 py-1.5 text-xs rounded-full border font-medium transition " +
                  (!month ? "bg-primary/15 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:border-[#D4AC5C]")}>
              Todo
              </button>
              {allMonths.map((m) => (
                <button key={m}
                  onClick={() => setMonth(m)}
                  className={"px-2.5 py-1.5 text-xs rounded-full border font-medium transition " +
                    (month === m ? "bg-[#D4AC5C]/15 border-[#D4AC5C] text-[#D4AC5C]" : "bg-card border-border text-muted-foreground hover:border-[#D4AC5C]")}>
                  {MESES_ABR[m - 1]}
                </button>
              ))}
            </div>
          </div>
          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">Tipo</span>
            <div className="flex gap-1.5">
              {[{ v: "todos", l: "Todos" }, { v: "Ingreso", l: "↑ Ingresos" }, { v: "Gasto", l: "↓ Gastos" }].map(({ v, l }) => (
                <button key={v}
                  onClick={() => setFilterTipo(v)}
                  className={"px-3 py-1.5 text-xs rounded-full border font-medium transition " +
                    (filterTipo === v ? "bg-primary/15 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:border-[#D4AC5C]")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* Moneda */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">Moneda</span>
            <div className="flex gap-1.5 flex-wrap">
              {["", "USD", "Bolívares", "Pesos"].map((m) => (
                <button key={m || "todas"}
                  onClick={() => setFilterMoneda(m)}
                  className={"px-2.5 py-1.5 text-xs rounded-full border font-medium transition " +
                    (filterMoneda === m ? "bg-primary/15 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:border-[#D4AC5C]")}>
                  {m || "Todas"}
                </button>
              ))}
            </div>
          </div>
          {/* Persona */}
          <div className="relative flex-1 min-w-[140px] max-w-[200px]">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-1 block">Persona</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={personaSelected ?? personaQ}
                onChange={(e) => { setPersonaQ(e.target.value); setPersonaSelected(null); }}
                onFocus={() => { if (personaSelected) { setPersonaQ(""); setPersonaSelected(null); } }}
                placeholder="Buscar..." className="h-8 pl-8 pr-8 text-xs" />
              {personaSelected && (
                <button onClick={() => { setPersonaSelected(null); setPersonaQ(""); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-accent">
                  <X className="h-3 w-3" />
                </button>
              )}
              {personaSuggestions.length > 0 && !personaSelected && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
                  {personaSuggestions.map((s) => (
                    <button key={s.nombre}
                      onClick={() => { setPersonaSelected(s.nombre); setPersonaQ(""); }}
                      className="block w-full px-3 py-1.5 text-left text-xs hover:bg-accent first:rounded-t-lg last:rounded-b-lg">
                      {s.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={clearFilters}
            className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:text-[#C25E45] hover:border-[#C25E45] transition self-end">
            Limpiar
          </button>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Mostrando <b className="text-foreground">{filteredTx.length}</b> de {tx.length} movimientos
          {anyFilter && (
            <button onClick={clearFilters} className="ml-2 text-[#C25E45] hover:underline">(quitar filtros)</button>
          )}
        </div>
      </div>

      {/* Insight */}
      {filteredTx.length > 0 && (() => {
        const balTxt = monthData.neto >= 0
          ? `los <b>ingresos superan a los gastos</b> en aprox. <b>US$ ${$(monthData.neto)}</b>`
          : `los <b>gastos superan a los ingresos</b> en aprox. <b>US$ ${$(Math.abs(monthData.neto))}</b>`;
        const topGas = topCategorias.gasto[0];
        const catTxt = topGas ? ` · Mayor gasto: <b>${topGas[0]}</b> (${$(topGas[1])})` : "";
        return (
          <div className="border-l-3 border-[#D4AC5C] bg-card border rounded-lg px-4 py-3 text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: `Con los filtros actuales (${filteredTx.length} movimientos), ${balTxt}.${catTxt}` }} />
        );
      })()}

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative pt-0 overflow-hidden" style={{}}>
          <div className="h-[3px] bg-[#74A67E] rounded-t-lg" />
          <div className="p-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold tracking-wider uppercase">
              Ingresos (USD aprox.)
              <Badge variant="outline" className="font-mono text-[9px] bg-[#74A67E]/10 text-[#74A67E] border-[#74A67E]/30">
                {coveragePct(filteredTx.filter(r => r.tipo === "Ingreso" && r.montoUsd != null).length, nIng)}
              </Badge>
            </div>
            <p className="text-[#74A67E] text-2xl font-bold mt-1.5 tracking-tight">US$ {$(monthData.ing)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{nIng} movimientos</p>
          </div>
        </Card>
        <Card className="relative pt-0 overflow-hidden">
          <div className="h-[3px] bg-[#C25E45] rounded-t-lg" />
          <div className="p-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold tracking-wider uppercase">
              Gastos (USD aprox.)
              <Badge variant="outline" className="font-mono text-[9px] bg-[#C25E45]/10 text-[#C25E45] border-[#C25E45]/30">
                {coveragePct(filteredTx.filter(r => r.tipo === "Gasto" && r.montoUsd != null).length, nGas)}
              </Badge>
            </div>
            <p className="text-[#C25E45] text-2xl font-bold mt-1.5 tracking-tight">US$ {$(monthData.gas)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{nGas} movimientos</p>
          </div>
        </Card>
        <Card className="relative pt-0 overflow-hidden">
          <div className="h-[3px] bg-[#D4AC5C] rounded-t-lg" />
          <div className="p-4">
            <div className="text-[11px] text-muted-foreground font-semibold tracking-wider uppercase">
              Balance
            </div>
            <p className={`text-2xl font-bold mt-1.5 tracking-tight ${kpiColor(monthData.neto)}`}>
              {monthData.neto >= 0 ? "+" : ""}US$ {$(monthData.neto)}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {monthData.ing > 0 ? `Margen: ${((monthData.neto / monthData.ing) * 100).toFixed(1)}%` : "Sin ingresos"}
            </p>
          </div>
        </Card>
        <Card className="relative pt-0 overflow-hidden">
          <div className="h-[3px] bg-[#6C97A0] rounded-t-lg" />
          <div className="p-4">
            <div className="text-[11px] text-muted-foreground font-semibold tracking-wider uppercase">
              Movimientos
            </div>
            <p className="text-foreground text-2xl font-bold mt-1.5 tracking-tight">{filteredTx.length}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{nIng} ingresos · {nGas} gastos</p>
          </div>
        </Card>
      </div>

      {/* Currency panels */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { moneda: "USD", label: "Dólares", tag: "USD", ing: monedaData.usdIng, gas: monedaData.usdGas, neto: monedaData.usdNeto, fmt: (v: number) => `US$ ${$(v)}`, color: "text-[#74A67E]" },
          { moneda: "Bolívares", label: "Bolívares", tag: "Bs", ing: monedaData.bsIng, gas: monedaData.bsGas, neto: monedaData.bsNeto, fmt: (v: number) => `Bs. ${$(v)}`, color: "text-[#D4AC5C]" },
          { moneda: "Pesos", label: "Pesos", tag: "COP", ing: monedaData.copIng, gas: monedaData.copGas, neto: monedaData.copNeto, fmt: (v: number) => `$ ${$(v)}`, color: "text-[#6C97A0]" },
        ].map(({ moneda, label, tag, ing, gas, neto, fmt, color }) => (
          <Card key={moneda} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold">{label}</span>
              <Badge variant="outline" className="font-mono text-[10px]">{tag}</Badge>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">↑ Ingresos</span><span className="font-semibold text-[#74A67E]">{fmt(ing)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">↓ Gastos</span><span className="font-semibold text-[#C25E45]">{fmt(gas)}</span></div>
              <div className="flex justify-between border-t pt-1.5 mt-1.5"><span className="font-medium">Balance</span><span className={"font-bold " + (neto >= 0 ? "text-[#74A67E]" : "text-[#C25E45]")}>{fmt(neto)}</span></div>
            </div>
            {moneda === "Bolívares" && bcvTasa && (
              <div className="mt-2 text-[10px] text-right text-muted-foreground">Tasa BCV: {$(bcvTasa)} Bs/$</div>
            )}
          </Card>
        ))}
      </div>

      {/* Charts */}
      {monthlyTrend.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Tendencia mensual ({year})</h3>
            <span className="text-[11px] text-muted-foreground">USD aprox.</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend.map(d => ({ ...d, mes: MESES_ABR[d.mes - 1] }))}>
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v)}`} />
                <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} formatter={(v: number) => `US$ ${$0(v)}`} />
                <Bar dataKey="ingreso" name="Ingresos" fill="#74A67E" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="gasto" name="Gastos" fill="#C25E45" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Category charts + donut */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-bold text-sm mb-3 text-[#C25E45]">↓ Gastos por categoría</h3>
          {topCategorias.gasto.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategorias.gasto.map(([cat, val]) => ({ cat: cat.length > 20 ? cat.slice(0, 20) + "…" : cat, val }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v)}`} />
                  <YAxis type="category" dataKey="cat" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                  <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} formatter={(v: number) => `US$ ${$0(v)}`} />
                  <Bar dataKey="val" fill="#C25E45" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Sin datos</p>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-sm mb-3 text-[#74A67E]">↑ Ingresos por categoría</h3>
          {topCategorias.ingreso.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategorias.ingreso.map(([cat, val]) => ({ cat: cat.length > 20 ? cat.slice(0, 20) + "…" : cat, val }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v)}`} />
                  <YAxis type="category" dataKey="cat" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                  <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} formatter={(v: number) => `US$ ${$0(v)}`} />
                  <Bar dataKey="val" fill="#74A67E" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Sin datos</p>
          )}
        </Card>
      </div>

      {monedaDist.length > 1 && (
        <Card className="p-4">
          <h3 className="font-bold text-sm mb-3">Uso por moneda</h3>
          <div className="h-56 max-w-xs mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={monedaDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {monedaDist.map((entry, i) => (
                    <Cell key={entry.name} fill={[ "#D4AC5C", "#6C97A0", "#74A67E" ][i % 3]} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} formatter={(v: number, n: string) => [`${v} movimientos`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Transaction table */}
      {filteredTx.length > 0 && (
        <Card className="p-4">
          <h3 className="font-bold text-sm mb-3">Movimientos</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Categoría</th>
                  <th className="p-2 text-left">Descripción</th>
                  <th className="p-2 text-left">Moneda</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-right">USD</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/20">
                    <td className="p-2 text-muted-foreground font-mono">{r.fecha}</td>
                    <td className="p-2">
                      <span className={"inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full " +
                        (r.tipo === "Ingreso" ? "bg-[#74A67E]/15 text-[#74A67E]" : "bg-[#C25E45]/15 text-[#C25E45]")}>
                        {r.tipo === "Ingreso" ? "↑" : "↓"} {r.tipo}
                      </span>
                    </td>
                    <td className="p-2 text-muted-foreground">{r.categoria}</td>
                    <td className="p-2 max-w-[200px] truncate text-foreground" title={r.descripcion}>{r.descripcion || "—"}</td>
                    <td className="p-2 text-muted-foreground">{r.moneda || "USD"}</td>
                    <td className="p-2 text-right font-mono">{$(Number(r.monto) || 0)}</td>
                    <td className="p-2 text-right font-mono">{r.montoUsd != null ? `US$ ${$(Number(r.montoUsd))}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTx.length > 20 && (
              <div className="p-2 text-center text-[11px] text-muted-foreground border-t">
                Mostrando 20 de {filteredTx.length} movimientos
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {filteredTx.length === 0 && (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
          No hay movimientos que coincidan con estos filtros. Prueba a quitar alguno.
        </div>
      )}

      <ReporteEjecutivo tx={tx} year={year} ingresos={ingresos} gastos={gastos} bcvRates={bcvRates} />
    </div>
  );
}
