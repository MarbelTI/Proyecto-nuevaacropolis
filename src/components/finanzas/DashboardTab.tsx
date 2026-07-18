import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/lists-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReporteEjecutivo } from "@/components/finanzas/ReporteEjecutivo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const $ = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(200 70% 50%)",
  "hsl(30 80% 55%)",
  "hsl(160 60% 45%)",
  "hsl(280 50% 55%)",
  "hsl(350 65% 55%)",
];

export function DashboardTab({
  tx,
  ingresos,
  gastos,
  bcvRates,
}: {
  tx: Transaction[];
  ingresos: string[];
  gastos: string[];
  bcvRates: Record<string, number>;
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
  const [year, setYear] = useState<number>(years[0]);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);

  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const monthData = useMemo(() => {
    let ing = 0, gas = 0;
    const ingCat: Record<string, number> = {};
    const gasCat: Record<string, number> = {};
    for (const c of ingresos) ingCat[c] = 0;
    for (const c of gastos) gasCat[c] = 0;

    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      const usd = Number(t.montoUsd) || 0;
      if (t.tipo === "Ingreso") {
        ing += usd;
        const cat = t.categoria || "(sin categoría)";
        if (ingCat[cat] !== undefined) ingCat[cat] += usd;
      } else if (t.tipo === "Gasto") {
        gas += usd;
        const cat = t.categoria || "(sin categoría)";
        if (gasCat[cat] !== undefined) gasCat[cat] += usd;
      }
    }

    return { ing, gas, neto: ing - gas, ingCat, gasCat, mesLabel: MESES_ES[month - 1] };
  }, [tx, ym, ingresos, gastos]);

  const monedaData = useMemo(() => {
    let usdIng = 0, usdGas = 0, bsIng = 0, bsGas = 0;
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      const usd = Number(t.montoUsd) || 0;
      const monto = Number(t.monto) || 0;
      if (t.moneda === "USD") {
        if (t.tipo === "Ingreso") usdIng += usd;
        else usdGas += usd;
      } else if (t.moneda === "Bolívares") {
        if (t.tipo === "Ingreso") bsIng += monto;
        else bsGas += monto;
      }
    }
    return { usdIng, usdGas, usdNeto: usdIng - usdGas, bsIng, bsGas, bsNeto: bsIng - bsGas };
  }, [tx, ym]);

  const topStudents = useMemo(() => {
    const byName: Record<string, number> = {};
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      const desc = t.descripcion || "";
      let name = "";
      if (desc.includes(" - ")) name = desc.split(" - ")[0].trim();
      if (!name) name = desc;
      if (!name || name.length > 25) continue;
      const usd = Number(t.montoUsd) || 0;
      byName[name] = (byName[name] || 0) + usd;
    }
    return Object.entries(byName)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }, [tx, ym]);

  const bcvTasa = useMemo(() => {
    for (let d = 31; d >= 1; d--) {
      const iso = `${ym}-${String(d).padStart(2, "0")}`;
      if (bcvRates[iso]) return bcvRates[iso];
    }
    return null;
  }, [bcvRates, ym]);

  const kpiClass = (v: number) => (v < 0 ? "text-destructive" : "text-foreground");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Dashboard Financiero</h2>
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES_ES.map((mn, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {mn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Ingresos {monthData.mesLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${kpiClass(monthData.ing)}`}>
              ${$(monthData.ing)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Egresos {monthData.mesLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${kpiClass(monthData.gas)}`}>
              ${$(monthData.gas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Neto {monthData.mesLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${kpiClass(monthData.neto)}`}>
              ${$(monthData.neto)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ratio G/I</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${monthData.gas > 0 && monthData.ing / monthData.gas > 1 ? "text-destructive" : ""}`}>
              {monthData.gas > 0 ? (monthData.ing / monthData.gas).toFixed(2) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {monthData.gas === 0 ? "Sin gastos"
                : monthData.ing / monthData.gas <= 0.7 ? "Saludable"
                : monthData.ing / monthData.gas <= 0.9 ? "Alerta"
                : "Crítico"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumen por moneda ({monthData.mesLabel})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>USD Ingresos</span>
                  <span className="font-semibold">${$(monedaData.usdIng)}</span>
                </div>
                <div className="flex justify-between">
                  <span>USD Egresos</span>
                  <span className="font-semibold">${$(monedaData.usdGas)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">USD Neto</span>
                  <span className={`font-bold ${kpiClass(monedaData.usdNeto)}`}>
                    ${$(monedaData.usdNeto)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bs Ingresos</span>
                  <span className="font-semibold">{$(monedaData.bsIng)} Bs</span>
                </div>
                <div className="flex justify-between">
                  <span>Bs Egresos</span>
                  <span className="font-semibold">{$(monedaData.bsGas)} Bs</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Bs Neto</span>
                  <span className={`font-bold ${kpiClass(monedaData.bsNeto)}`}>
                    {$(monedaData.bsNeto)} Bs
                  </span>
                </div>
                {bcvTasa && (
                  <div className="mt-2 flex justify-between rounded bg-blue-50 dark:bg-blue-950/30 px-2 py-1">
                    <span className="text-xs">Tasa BCV</span>
                    <span className="text-xs font-semibold">{$(bcvTasa)} Bs/$</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ingresos por categoría ({monthData.mesLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {Object.entries(monthData.ingCat).filter(([_, v]) => v > 0).length > 0 ? (
                Object.entries(monthData.ingCat)
                  .filter(([_, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => (
                    <div key={cat} className="flex justify-between">
                      <span>{cat}</span>
                      <span className="font-medium">${$(val)}</span>
                    </div>
                  ))
              ) : (
                <p className="py-4 text-center text-muted-foreground text-xs">Sin ingresos este mes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Egresos por categoría ({monthData.mesLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {Object.entries(monthData.gasCat).filter(([_, v]) => v > 0).length > 0 ? (
                Object.entries(monthData.gasCat)
                  .filter(([_, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => (
                    <div key={cat} className="flex justify-between">
                      <span>{cat}</span>
                      <span className="font-medium">${$(val)}</span>
                    </div>
                  ))
              ) : (
                <p className="py-4 text-center text-muted-foreground text-xs">Sin egresos este mes</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top estudiantes ({monthData.mesLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topStudents.length > 0 ? (
                topStudents.map(([name, total], i) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      {name}
                    </span>
                    <span className="font-medium">${$(total)}</span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin ingresos este mes
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ReporteEjecutivo
        tx={tx}
        year={year}
        ingresos={ingresos}
        gastos={gastos}
      />
    </div>
  );
}
