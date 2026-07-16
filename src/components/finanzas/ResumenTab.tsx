import { useEffect, useMemo, useState } from "react";
import { useTransactions, type Transaction } from "@/lib/lists-store";
import { currentYm } from "@/lib/fees-logic";
import { exportResumenExcel } from "@/lib/excel-export";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const $ = (n: number) => n.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2,"0"); const mm = m[2].padStart(2,"0");
  let yy = m[3] ?? String(new Date().getFullYear()); if (yy.length===2) yy = "20"+yy;
  return `${yy}-${mm}-${dd}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function serialDate(iso: string): number {
  const d = new Date(iso);
  const excelEpoch = new Date(1899, 11, 30);
  return (d.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000);
}

function Chip({ label, v, destructive }: { label: string; v: number; destructive?: boolean }) {
  return (
    <div className={"rounded p-2 " + (destructive ? "bg-destructive/10" : "bg-primary/10")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">${$(v)}</div>
    </div>
  );
}

export function ResumenTab({ tx: txObj, ingresos, gastos, bancos, bcvRates }: {
  tx: ReturnType<typeof useTransactions>;
  ingresos: string[];
  gastos: string[];
  bancos: string[];
  bcvRates: Record<string, number>;
}) {
  const tx = txObj.list;
  const [ym, setYm] = useState<string>(currentYm());
  const [selectedIngCats, setSelectedIngCats] = useState<Set<string>>(new Set());
  const [selectedGasCats, setSelectedGasCats] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);

  const data = useMemo(() => {
    const ingByCat: Record<string, number> = {};
    const gasByCat: Record<string, number> = {};
    type Det = { desc: string; monto: number; fecha: string; mes?: string };
    const ingDet: Record<string, Det[]> = {};
    const gasDet: Record<string, Det[]> = {};
    for (const c of ingresos) { ingByCat[c] = 0; }
    for (const c of gastos) { gasByCat[c] = 0; }
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0,7) !== ym) continue;
      const usd = Number(t.montoUsd) || 0;
      const c = t.categoria || "(sin categoría)";
      if (c === "CONVERSIÓN") continue;
      if (t.tipo === "Ingreso") {
        ingByCat[c] = (ingByCat[c] || 0) + usd;
        if (!ingDet[c]) ingDet[c] = [];
        ingDet[c].push({ desc: t.descripcion, monto: usd, fecha: t.fecha, mes: t.mensualidad });
      } else if (t.tipo === "Gasto") {
        gasByCat[c] = (gasByCat[c] || 0) + usd;
        if (!gasDet[c]) gasDet[c] = [];
        gasDet[c].push({ desc: t.descripcion, monto: usd, fecha: t.fecha, mes: t.mensualidad });
      }
    }
    const totalIng = Object.values(ingByCat).reduce((s,v)=>s+v,0);
    const totalGas = Object.values(gasByCat).reduce((s,v)=>s+v,0);
    return { ingByCat, gasByCat, ingDet, gasDet, totalIng, totalGas };
  }, [tx, ym, ingresos, gastos]);

  const [y, m] = ym.split("-").map(Number);

  const arbitrajeData = useMemo(() => {
    let bsRecibidos = 0, bsGastados = 0, usdIng = 0, usdGas = 0;
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0,7) !== ym) continue;
      if (t.moneda !== "Bolívares") continue;
      const monto = Number(t.monto) || 0;
      const usd = Number(t.montoUsd) || 0;
      if (t.tipo === "Ingreso") { bsRecibidos += monto; usdIng += usd; }
      else if (t.tipo === "Gasto") { bsGastados += monto; usdGas += usd; }
    }
    const saldoBs = bsRecibidos - bsGastados;
    const usdTotal = usdIng - usdGas;
    let tasaInicio = 0;
    for (let d = 1; d <= 31; d++) {
      const li = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      tasaInicio = bcvRates[li] ?? 0;
      if (tasaInicio > 0) break;
    }
    const lastDay = new Date(y, m, 0);
    let tasaCierre = 0;
    for (let d = lastDay.getDate(); d >= 1; d--) {
      const li = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      tasaCierre = bcvRates[li] ?? 0;
      if (tasaCierre > 0) break;
    }
    const saldoConvertido = tasaCierre > 0 ? saldoBs / tasaCierre : 0;
    const ganancia = tasaCierre > 0 ? saldoConvertido - usdTotal : 0;
    return { bsRecibidos, bsGastados, saldoBs, usdIng, usdGas, usdTotal, tasaInicio, tasaCierre, saldoConvertido, ganancia };
  }, [tx, ym, y, m, bcvRates]);

  const bancosData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0,7) !== ym) continue;
      const banco = t.banco || "(sin banco)";
      const usd = Number(t.montoUsd) || 0;
      map.set(banco, (map.get(banco) || 0) + (t.tipo === "Ingreso" ? usd : -usd));
    }
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [tx, ym]);

  useEffect(() => {
    const catsConDatos = (cats: string[], byCat: Record<string,number>) =>
      new Set(cats.filter((c) => byCat[c] > 0));
    if (showAllCats) {
      setSelectedIngCats(new Set(ingresos));
      setSelectedGasCats(new Set(gastos));
    } else {
      setSelectedIngCats(catsConDatos(ingresos, data.ingByCat));
      setSelectedGasCats(catsConDatos(gastos, data.gasByCat));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, showAllCats]);

  const toggleIngCat = (cat: string) => {
    setSelectedIngCats(p => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  };
  const toggleGasCat = (cat: string) => {
    setSelectedGasCats(p => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  };

  const pillsHeight = useMemo(() => {
    const maxLen = Math.max(ingresos.length, gastos.length);
    return Math.max(Math.ceil(maxLen / 2) * 32, 96);
  }, [ingresos, gastos]);

  const exportExcelResumen = () => {
    exportResumenExcel(tx, y, m, ingresos, gastos);
    toast.success("Excel descargado");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Resumen mensual</h2>
            <Button variant="outline" size="sm" onClick={exportExcelResumen}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(m)} onValueChange={(v)=>setYm(`${y}-${v.padStart(2,"0")}`)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{MESES_ES.map((mn,i)=><SelectItem key={i} value={String(i+1)}>{mn}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" value={y} onChange={(e)=>setYm(`${e.target.value}-${String(m).padStart(2,"0")}`)} className="w-24" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Neto</div>
              <div className={"text-xl font-bold " + (data.totalIng - data.totalGas < 0 ? "text-destructive" : "")}>
                ${$(data.totalIng - data.totalGas)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Ingresos</h3>
          <span className="text-base font-bold text-primary">${$(data.totalIng)}</span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <button onClick={()=>setShowAllCats(!showAllCats)}
            className={"rounded-full px-3 py-0 text-[12px] font-medium leading-tight "+(showAllCats?"bg-primary text-primary-foreground":"bg-muted")}>
            {showAllCats ? "Todas" : "Solo datos"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-1.5 gap-y-0.5">
          {ingresos.sort().map(c => (
            <button key={c} onClick={() => toggleIngCat(c)}
              className={`rounded-full px-3 py-0 text-[12px] font-medium leading-tight border transition ${selectedIngCats.has(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/30 text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {ingresos.filter((c) => selectedIngCats.has(c)).map(c => {
              const v = data.ingByCat[c] || 0;
              const det = data.ingDet[c];
              return (<>
                <tr key={c} className="border-b last:border-0 cursor-pointer hover:bg-accent/30" onClick={() => setExpandedCat(expandedCat === c ? null : c)}>
                  <td className="p-1 font-medium">{c}{det ? <span className="ml-1.5 text-xs text-muted-foreground">({det.length})</span> : null}</td>
                  <td className="p-1 text-right tabular-nums">${$(v)}</td>
                  <td className="p-1 text-right text-xs text-muted-foreground">
                    {data.totalIng>0 ? ((v/data.totalIng)*100).toFixed(0) : 0}%
                  </td>
                </tr>
                {expandedCat === c && det && (
                  <tr key={`${c}-det`}>
                    <td colSpan={3} className="p-0">
                      <div className="bg-muted/20 px-3 py-2 text-xs space-y-1">
                        {det.map((d, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-muted-foreground truncate min-w-0">{d.fecha} <span className="font-medium">{d.mes || ""}</span> {d.desc?.slice(0,40) || "—"}{d.desc && d.desc.length > 40 ? "…" : ""}</span>
                            <span className="tabular-nums font-medium shrink-0">${$(d.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>);
            })}
            <tr className="border-t font-semibold">
              <td className="p-2">Total Ingresos</td>
              <td className="p-2 text-right">${$(data.totalIng)}</td><td />
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-destructive">Egresos</h3>
          <span className="text-base font-bold text-destructive">${$(data.totalGas)}</span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <button onClick={()=>setShowAllCats(!showAllCats)}
            className={"rounded-full px-3 py-0 text-[12px] font-medium leading-tight "+(showAllCats?"bg-primary text-primary-foreground":"bg-muted")}>
            {showAllCats ? "Todas" : "Solo datos"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-1.5 gap-y-0.5">
          {gastos.sort().map(c => (
            <button key={c} onClick={() => toggleGasCat(c)}
              className={`rounded-full px-3 py-0 text-[12px] font-medium leading-tight border transition ${selectedGasCats.has(c) ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background border-muted-foreground/30 text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {gastos.filter((c) => selectedGasCats.has(c)).map(c => {
              const v = data.gasByCat[c] || 0;
              const det = data.gasDet[c];
              return (<>
                <tr key={c} className="border-b last:border-0 cursor-pointer hover:bg-accent/30" onClick={() => setExpandedCat(expandedCat === `g-${c}` ? null : `g-${c}`)}>
                  <td className="p-1 font-medium">{c}{det ? <span className="ml-1.5 text-xs text-muted-foreground">({det.length})</span> : null}</td>
                  <td className="p-1 text-right tabular-nums">${$(v)}</td>
                  <td className="p-1 text-right text-xs text-muted-foreground">
                    {data.totalGas>0 ? ((v/data.totalGas)*100).toFixed(0) : 0}%
                  </td>
                </tr>
                {expandedCat === `g-${c}` && det && (
                  <tr key={`${c}-det`}>
                    <td colSpan={3} className="p-0">
                      <div className="bg-muted/20 px-3 py-2 text-xs space-y-1">
                        {det.map((d, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-muted-foreground truncate min-w-0">{d.fecha} <span className="font-medium">{d.mes || ""}</span> {d.desc?.slice(0,40) || "—"}{d.desc && d.desc.length > 40 ? "…" : ""}</span>
                            <span className="tabular-nums font-medium shrink-0">${$(d.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>);
            })}
            <tr className="border-t font-semibold">
              <td className="p-2">Total Egresos</td>
              <td className="p-2 text-right">${$(data.totalGas)}</td><td />
            </tr>
          </tbody>
        </table>
      </Card>

      {arbitrajeData.bsRecibidos > 0 && (
      <Card className="p-4">
        <h3 className="mb-2 font-semibold text-sm">💱 Análisis de Bolívares del mes</h3>

        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
            <span className="text-muted-foreground">Tasa al iniciar el mes</span>
            <div className="font-bold text-lg">{$(arbitrajeData.tasaInicio)}</div>
            <span className="text-muted-foreground">🇻🇪 BCV</span>
          </div>
          <div className="rounded bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
            <span className="text-muted-foreground">Tasa al cerrar el mes</span>
            <div className="font-bold text-lg">{$(arbitrajeData.tasaCierre)}</div>
            <span className="text-muted-foreground">🇻🇪 BCV</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">1️⃣ Tus movimientos del mes en Bolívares</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Recibiste en Bs</span>
              <span className="tabular-nums text-right">{$(arbitrajeData.bsRecibidos)}</span>
              <span className="text-xs text-muted-foreground">Bs</span>

              <span className="text-muted-foreground">Gastaste en Bs</span>
              <span className="tabular-nums text-right">{$(arbitrajeData.bsGastados)}</span>
              <span className="text-xs text-muted-foreground">Bs</span>

              <span className="font-medium border-t pt-0.5">💼 Te quedan en caja</span>
              <span className={"tabular-nums text-right font-medium border-t pt-0.5 " + (arbitrajeData.saldoBs < 0 ? "text-destructive" : "")}>{$(arbitrajeData.saldoBs)}</span>
              <span className="text-xs text-muted-foreground border-t pt-0.5">Bs</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">2️⃣ Lo que registraste en dólares (a la tasa de cada día)</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
              <span className="text-muted-foreground">USD de tus recibos</span>
              <span className="tabular-nums text-right">${$(arbitrajeData.usdIng)}</span>
              <span></span>

              <span className="text-muted-foreground">USD de tus gastos</span>
              <span className="tabular-nums text-right">${$(arbitrajeData.usdGas)}</span>
              <span></span>

              <span className="font-medium border-t pt-0.5">📝 Total registrado en $</span>
              <span className={"tabular-nums text-right font-medium border-t pt-0.5 " + (arbitrajeData.usdTotal < 0 ? "text-destructive" : "")}>${$(Math.abs(arbitrajeData.usdTotal))}</span>
              <span className="text-xs text-muted-foreground border-t pt-0.5">{(arbitrajeData.usdTotal < 0 ? "gastaste más de lo que recibiste" : "recibiste más de lo que gastaste")}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">3️⃣ ¿Cuánto valdrían hoy tus Bs en caja?</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
              <span className="text-muted-foreground"> Tus Bs ÷ tasa cierre ({$(arbitrajeData.tasaCierre)})</span>
              <span className="tabular-nums text-right">{arbitrajeData.saldoConvertido ? "$"+$(Math.abs(arbitrajeData.saldoConvertido)) : "$0"}</span>
              <span className="text-xs text-muted-foreground">valor actual en $</span>
            </div>
          </div>

          <div className={"rounded p-3 " + (arbitrajeData.ganancia >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{arbitrajeData.ganancia >= 0 ? "✅" : "❌"}</span>
                <div>
                  <div className="font-semibold text-sm">{arbitrajeData.ganancia >= 0 ? "¡Ganaste dinero!" : "Perdiste dinero 💸"}</div>
                  <p className="text-xs text-muted-foreground">
                    {arbitrajeData.ganancia >= 0
                      ? `Tus Bs valían $${$(Math.abs(arbitrajeData.usdTotal))} cuando los recibiste/gastaste, pero hoy valen $${$(Math.abs(arbitrajeData.saldoConvertido))}. Ganaste porque el Bolívar se devaluó menos de lo esperado.`
                      : `Registraste $${$(Math.abs(arbitrajeData.usdTotal))} en tus transacciones, pero tus Bs sobrantes hoy solo valen $${$(Math.abs(arbitrajeData.saldoConvertido))}. Perdiste porque el Bolívar perdió valor frente al dólar durante el mes.`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Resultado cambiario</div>
                <div className={"text-xl font-bold " + (arbitrajeData.ganancia >= 0 ? "text-green-600" : "text-red-600")}>
                  {arbitrajeData.ganancia >= 0 ? "+" : "-"}${$(Math.abs(arbitrajeData.ganancia))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      )}
      {bancosData.length > 0 && (
      <Card className="p-4 lg:col-span-3">
        <h3 className="mb-2 font-semibold text-sm">🏦 Saldos por banco/cuenta al cierre del mes</h3>
        <div className="flex flex-wrap gap-3">
          {bancosData.map(([banco, saldo]) => (
            <div key={banco} className={"rounded-lg border px-3 py-2 min-w-[140px] flex-1 " + (saldo < 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200" : "bg-green-50 dark:bg-green-950/30 border-green-200")}>
              <div className="text-xs text-muted-foreground">{banco}</div>
              <div className={"text-lg font-bold tabular-nums " + (saldo < 0 ? "text-red-600" : "text-green-600")}>
                {saldo < 0 ? "-" : ""}${$(Math.abs(saldo))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      )}
    </div>
  );
}
