import { useState } from "react";
import type { Transaction } from "@/lib/lists-store";
import { Card } from "@/components/ui/card";

function fechaToIso(fecha: string): string | null {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return fecha;
  return null;
}
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const $ = (n: number) => n.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});

export function AnalisisTab({
  tx, ingresos, gastos, bcvRates,
}: {
  tx: Transaction[];
  ingresos: string[];
  gastos: string[];
  bcvRates: Record<string, number>;
}) {
  const yearsSet = new Set<number>();
  for (const t of tx) {
    const iso = fechaToIso(t.fecha);
    if (iso) yearsSet.add(Number(iso.slice(0,4)));
  }
  yearsSet.add(new Date().getFullYear());
  const years = Array.from(yearsSet).sort((a,b)=>b-a);
  const [year, setYear] = useState<number>(years[0]);
  const [capitalInicial, setCapitalInicial] = useState<string>("0");

  const build = (cats: string[], tipo: "Ingreso"|"Gasto") => {
    const m: Record<string, number[]> = {};
    for (const c of cats) m[c] = Array(12).fill(0);
    for (const t of tx) {
      if (t.tipo !== tipo) continue;
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0,4)) !== year) continue;
      const mi = Number(iso.slice(5,7)) - 1;
      const cat = t.categoria || "(sin categoría)";
      if (!m[cat]) m[cat] = Array(12).fill(0);
      m[cat][mi] += Number(t.montoUsd) || 0;
    }
    return m;
  };
  const matIng = build(ingresos, "Ingreso");
  const matGas = build(gastos, "Gasto");

  const totalesIng = Array(12).fill(0); const totalesGas = Array(12).fill(0);
  Object.values(matIng).forEach((row) => row.forEach((v,i)=> totalesIng[i]+=v));
  Object.values(matGas).forEach((row) => row.forEach((v,i)=> totalesGas[i]+=v));
  const neto = totalesIng.map((v,i)=> v - totalesGas[i]);

  const arrastre = tx.reduce((acc,t) => {
    const iso = fechaToIso(t.fecha);
    if (!iso) return acc;
    if (Number(iso.slice(0,4)) >= year) return acc;
    const usd = Number(t.montoUsd) || 0;
    return acc + (t.tipo === "Ingreso" ? usd : t.tipo === "Gasto" ? -usd : 0);
  }, 0);

  const capIniNum = Number(capitalInicial) || 0;
  const acumulado: number[] = [];
  neto.reduce((cum,v,i) => { const nv = cum + v; acumulado[i] = nv; return nv; }, arrastre + capIniNum);

  const lastMonthIdx = (() => {
    for (let i=11;i>=0;i--) if (totalesIng[i]>0 || totalesGas[i]>0) return i;
    return -1;
  })();

  const renderBlock = (title: string, mat: Record<string, number[]>, colorClass: string) => {
    const cats = Object.keys(mat).sort();
    const totales = Array(12).fill(0);
    cats.forEach((c) => mat[c].forEach((v,i)=> totales[i]+=v));
    return (
      <>
        <tr className={`${colorClass} font-semibold`}>
          <td className="p-2" colSpan={16}>{title}</td>
        </tr>
        {cats.map((c) => {
          const row = mat[c];
          const total = row.reduce((s,v)=> s+v, 0);
          const meses = row.filter((v)=> v>0).length || 1;
          const promedio = total / meses;
          const varPct = lastMonthIdx > 0 && row[lastMonthIdx-1] > 0
            ? ((row[lastMonthIdx]-row[lastMonthIdx-1])/row[lastMonthIdx-1])*100 : null;
          return (
            <tr key={c} className="border-b">
              <td className="p-2 text-xs">{c}</td>
              {row.map((v,i)=> <td key={i} className="p-1 text-right text-xs tabular-nums">{v>0?v.toFixed(0):""}</td>)}
              <td className="p-1 text-right text-xs font-medium">{total.toFixed(0)}</td>
              <td className="p-1 text-right text-xs">{promedio.toFixed(0)}</td>
              <td className="p-1 text-right text-xs">{varPct==null?"—":`${varPct>0?"+":""}${varPct.toFixed(0)}%`}</td>
            </tr>
          );
        })}
        <tr className="border-b bg-muted/50 font-semibold">
          <td className="p-2 text-xs">Total {title}</td>
          {totales.map((v,i)=> <td key={i} className="p-1 text-right text-xs tabular-nums">{v>0?v.toFixed(0):""}</td>)}
          <td className="p-1 text-right text-xs">{totales.reduce((s,v)=>s+v,0).toFixed(0)}</td>
          <td /><td />
        </tr>
      </>
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Análisis financiero anual (USD)</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Arrastre años anteriores: <span className="font-semibold">${$(arrastre)}</span></span>
            <span className="flex items-center gap-1">
              Capital inicial:
              <Input type="number" value={capitalInicial} onChange={(e)=>setCapitalInicial(e.target.value)} className="h-7 w-20 text-xs" />
            </span>
          </div>
        </div>
        <Select value={String(year)} onValueChange={(v)=>setYear(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y)=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Categoría</th>
              {MESES_ES.map((m)=> <th key={m} className="p-1 text-right font-medium text-xs">{m.slice(0,3)}</th>)}
              <th className="p-1 text-right font-medium text-xs">Total</th>
              <th className="p-1 text-right font-medium text-xs">Prom.</th>
              <th className="p-1 text-right font-medium text-xs">Var%</th>
            </tr>
          </thead>
          <tbody>
            {renderBlock("Ingresos", matIng, "bg-primary/10")}
            <tr><td colSpan={16} className="h-4"></td></tr>
            {renderBlock("Egresos", matGas, "bg-destructive/10")}
            <tr><td colSpan={16} className="h-4"></td></tr>
            <tr className="border-t bg-accent/20 font-bold">
              <td className="p-2 text-xs">Neto mensual</td>
              {neto.map((v,i)=> (
                <td key={i} className={"p-1 text-right text-xs tabular-nums " + (v<0?"text-destructive":"")}>
                  {v!==0 ? v.toFixed(0) : ""}
                </td>
              ))}
              <td className="p-1 text-right text-xs">{neto.reduce((s,v)=>s+v,0).toFixed(0)}</td>
              <td /><td />
            </tr>
            <tr className="border-b bg-accent/40 font-bold">
              <td className="p-2 text-xs">Efectivo acumulado</td>
              {acumulado.map((v,i)=> (
                <td key={i} className={"p-1 text-right text-xs tabular-nums " + (v<0?"text-destructive":"")}>
                  {v.toFixed(0)}
                </td>
              ))}
              <td /><td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
