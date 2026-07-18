import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/lists-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

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

function softAlert(v: number, ok: () => string, warn: () => string, bad: () => string): string {
  if (v >= 0) return ok();
  if (v > -0.15) return warn();
  return bad();
}

export function ReporteEjecutivo({
  tx,
  ingresos,
  gastos,
  bcvRates,
  year,
}: {
  tx: Transaction[];
  ingresos: string[];
  gastos: string[];
  bcvRates: Record<string, number>;
  year: number;
}) {
  const report = useMemo(() => {
    const ingByMonth = Array(12).fill(0);
    const gasByMonth = Array(12).fill(0);
    const ingCat: Record<string, number> = {};
    const gasCat: Record<string, number> = {};
    const monedas: Record<string, { ing: number; gas: number }> = {};
    let totalTx = 0;

    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== year) continue;
      const mi = Number(iso.slice(5, 7)) - 1;
      const usd = Number(t.montoUsd) || 0;
      totalTx++;
      if (t.tipo === "Ingreso") {
        ingByMonth[mi] += usd;
        const cat = t.categoria || "Otros";
        ingCat[cat] = (ingCat[cat] || 0) + usd;
        const mon = t.moneda || "USD";
        if (!monedas[mon]) monedas[mon] = { ing: 0, gas: 0 };
        monedas[mon].ing += usd;
      } else if (t.tipo === "Gasto") {
        gasByMonth[mi] += usd;
        const cat = t.categoria || "Otros";
        gasCat[cat] = (gasCat[cat] || 0) + usd;
        const mon = t.moneda || "USD";
        if (!monedas[mon]) monedas[mon] = { ing: 0, gas: 0 };
        monedas[mon].gas += usd;
      }
    }

    const ingTotal = ingByMonth.reduce((s, v) => s + v, 0);
    const gasTotal = gasByMonth.reduce((s, v) => s + v, 0);
    const neto = ingTotal - gasTotal;
    const mesesActivos = ingByMonth.filter((v, i) => v > 0 || gasByMonth[i] > 0).length;

    const topIng = Object.entries(ingCat)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    const topGas = Object.entries(gasCat)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const mejorMes = ingByMonth.reduce((best, v, i) => (v > best.val ? { val: v, idx: i } : best), {
      val: -Infinity,
      idx: -1,
    });
    const peorMes = gasByMonth.reduce(
      (worst, v, i) => (v > worst.val ? { val: v, idx: i } : worst),
      { val: -Infinity, idx: -1 },
    );

    const tendenciaIng = ingByMonth.filter((v) => v > 0);
    const tendenciaAlza =
      tendenciaIng.length >= 2 &&
      tendenciaIng[tendenciaIng.length - 1] > tendenciaIng[tendenciaIng.length - 2];

    const ratioGastos = gasTotal > 0 ? ingTotal / gasTotal : 0;
    const salud =
      ratioGastos >= 1.5
        ? "excelente"
        : ratioGastos >= 1
          ? "buena"
          : ratioGastos >= 0.8
            ? "regular"
            : "crítica";

    const bcvTasaActual = (() => {
      const d = new Date();
      for (let day = d.getDate(); day >= 1; day--) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (bcvRates[iso]) return bcvRates[iso];
      }
      return null;
    })();

    return {
      ingTotal,
      gasTotal,
      neto,
      mesesActivos,
      totalTx,
      topIng,
      topGas,
      mejorMes,
      peorMes,
      tendenciaAlza,
      ratioGastos,
      salud,
      bcvTasaActual,
      ingByMonth,
      gasByMonth,
    };
  }, [tx, year, ingresos, gastos, bcvRates]);

  if (report.mesesActivos === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          No hay datos financieros para {year}. Agrega transacciones para generar el reporte.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Reporte Ejecutivo {year}
            </CardTitle>
            <Badge
              variant={
                report.salud === "excelente" || report.salud === "buena" ? "default" : "destructive"
              }
            >
              Salud: {report.salud}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            Durante el <strong>{year}</strong> se registraron{" "}
            <strong>{report.totalTx} transacciones</strong> en{" "}
            <strong>{report.mesesActivos} meses activos</strong>.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">Ingresos totales</p>
              <p className="text-xl font-bold">${$(report.ingTotal)}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs text-muted-foreground">Egresos totales</p>
              <p className="text-xl font-bold">${$(report.gasTotal)}</p>
            </div>
            <div className="rounded-lg bg-accent/20 p-3">
              <p className="text-xs text-muted-foreground">Resultado neto</p>
              <p className={"text-xl font-bold " + (report.neto < 0 ? "text-destructive" : "")}>
                {report.neto < 0 ? "-" : "+"}${$(Math.abs(report.neto))}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <TrendingUp className="mr-1 inline h-4 w-4 text-primary" />
              <strong>Mejor mes:</strong> {MESES_ES[report.mejorMes.idx]} (${$(report.mejorMes.val)}{" "}
              en ingresos)
            </p>
            <p>
              <TrendingDown className="mr-1 inline h-4 w-4 text-destructive" />
              <strong>Mayor egreso mensual:</strong> {MESES_ES[report.peorMes.idx]} ($
              {$(report.peorMes.val)} en gastos)
            </p>
            <p>
              <DollarSign className="mr-1 inline h-4 w-4 text-primary" />
              <strong>Ratio ingresos/gastos:</strong> {report.ratioGastos.toFixed(2)} —{" "}
              {report.ratioGastos >= 1.5
                ? "Excelente, los ingresos cubren ampliamente los gastos."
                : report.ratioGastos >= 1
                  ? "Saludable, los ingresos cubren los gastos."
                  : report.ratioGastos >= 0.8
                    ? "Alerta, los gastos están cerca de igualar los ingresos."
                    : "Crítico, los gastos superan los ingresos."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Top ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.topIng.length > 0 ? (
              <div className="space-y-2">
                {report.topIng.map(([cat, val], i) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span>
                      {i + 1}. {cat}
                    </span>
                    <span className="font-semibold">${$(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <TrendingDown className="h-4 w-4" /> Top egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.topGas.length > 0 ? (
              <div className="space-y-2">
                {report.topGas.map(([cat, val], i) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span>
                      {i + 1}. {cat}
                    </span>
                    <span className="font-semibold">${$(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Insights y recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {report.neto < 0 && (
            <p className="rounded bg-red-50 dark:bg-red-950/30 p-2">
              ⚠️ <strong>Déficit:</strong> Los gastos superaron los ingresos en $
              {$(Math.abs(report.neto))}. Revisa las categorías de gasto y ajusta el presupuesto.
            </p>
          )}
          {report.ratioGastos > 0 && report.ratioGastos < 1 && (
            <p className="rounded bg-amber-50 dark:bg-amber-950/30 p-2">
              ⚠️ <strong>Alerta de liquidez:</strong> Estás gastando más de lo que ingresas.
              Prioriza reducir los egresos no esenciales.
            </p>
          )}
          {report.tendenciaAlza && (
            <p className="rounded bg-green-50 dark:bg-green-950/30 p-2">
              ✅ <strong>Tendencia positiva:</strong> Los ingresos del último mes con datos son
              mayores al anterior. La recaudación va en aumento.
            </p>
          )}
          {report.topGas.some(
            ([c]) => c === "ALQUILER" || c === "HONORARIOS PROFESIONALES" || c === "SERVICIOS",
          ) && (
            <p className="rounded bg-blue-50 dark:bg-blue-950/30 p-2">
              ℹ️ Los gastos fijos (alquiler, honorarios, servicios) representan una parte
              significativa. Monitorea que no superen el 60% de los ingresos.
            </p>
          )}
          {report.bcvTasaActual && (
            <p className="rounded bg-muted p-2">
              💱 <strong>Tasa BCV actual:</strong> {$(report.bcvTasaActual)} Bs/USD. Considera este
              valor para la conversión de tus transacciones en Bolívares.
            </p>
          )}
          {report.mesesActivos < 6 && (
            <p className="rounded bg-muted p-2">
              📊 Con solo {report.mesesActivos} meses de datos, los insights mejorarán a medida que
              agregues más transacciones.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
