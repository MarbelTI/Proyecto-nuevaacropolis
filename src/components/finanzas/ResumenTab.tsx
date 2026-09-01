import { useEffect, useMemo, useState } from "react";
import { useTransactions, type Transaction } from "@/lib/lists-store";
import { currentYm } from "@/lib/fees-logic";
import { exportResumenExcel, exportInformeOina } from "@/lib/excel-export";
import { Card } from "@/components/ui/card";
import { usd } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionEditDialog } from "./TransactionEditDialog";
import { Edit2, Download, Flag } from "lucide-react";
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

const $ = usd;

/** $1,234.56 · negativo como ($1,234.56), sintaxis financiera estándar. */
function fmtUsd(v: number): string {
  const abs = `$${$(Math.abs(v))}`;
  return v < 0 ? `(${abs})` : abs;
}
/** Bs 1,234.56, sin signo $ — negativo como (Bs 1,234.56). */
function fmtBs(v: number): string {
  const abs = `Bs ${$(Math.abs(v))}`;
  return v < 0 ? `(${abs})` : abs;
}

/** "Bs ", "COP " o "$" según la moneda — con el espacio ya incluido. */
function simboloMoneda(moneda: string): string {
  if (moneda === "Bolívares") return "Bs ";
  if (moneda === "Pesos") return "COP ";
  return "$";
}
/** -$1,234.56 / Bs -1,234.56, sin paréntesis — para la tabla de bancos. */
function fmtMonto(v: number, simbolo: string): string {
  return `${v < 0 ? "-" : ""}${simbolo}${$(Math.abs(v))}`;
}

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

export function ResumenTab({
  tx: txObj,
  ingresos,
  gastos,
  bancos,
  bcvRates,
  bcvRatesEuro,
}: {
  tx: ReturnType<typeof useTransactions>;
  ingresos: string[];
  gastos: string[];
  bancos: string[];
  bcvRates: Record<string, number>;
  bcvRatesEuro: Record<string, number>;
}) {
  const tx = txObj.list;
  const [ym, setYm] = useState<string>(currentYm());
  const [selectedIngCats, setSelectedIngCats] = useState<Set<string>>(new Set());
  const [selectedGasCats, setSelectedGasCats] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  /** Igual que en Transacciones: clic en un movimiento del detalle lo marca en
   *  verde para no perderse comparando renglón por renglón contra un Excel. */
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const data = useMemo(() => {
    const ingByCat: Record<string, number> = {};
    const gasByCat: Record<string, number> = {};
    type Det = {
      id: string;
      desc: string;
      monto: number;
      fecha: string;
      mes?: string;
      revisar?: string;
    };
    const ingDet: Record<string, Det[]> = {};
    const gasDet: Record<string, Det[]> = {};
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
          id: t.id,
          desc: t.descripcion,
          monto: usd,
          fecha: t.fecha,
          mes: t.mensualidad,
          revisar: t.revisar,
        });
      } else if (t.tipo === "Gasto") {
        gasByCat[c] = (gasByCat[c] || 0) + usd;
        if (!gasDet[c]) gasDet[c] = [];
        gasDet[c].push({
          id: t.id,
          desc: t.descripcion,
          monto: usd,
          fecha: t.fecha,
          mes: t.mensualidad,
          revisar: t.revisar,
        });
      }
    }
    const totalIng = Object.values(ingByCat).reduce((s, v) => s + v, 0);
    const totalGas = Object.values(gasByCat).reduce((s, v) => s + v, 0);
    return { ingByCat, gasByCat, ingDet, gasDet, totalIng, totalGas };
  }, [tx, ym, ingresos, gastos]);

  /**
   * Total de lo que realmente se está mostrando, no de todas las categorías
   * que existan. Antes "Neto" y los totales de Ingresos/Egresos sumaban
   * TODO sin importar qué píldoras estuvieran activas — si se quitaba o se
   * dejaba una sola categoría, el detalle cambiaba pero el total seguía
   * siendo el de siempre, así que no cuadraba con lo que se veía en pantalla.
   */
  const totalIngVisible = useMemo(
    () =>
      ingresos
        .filter((c) => selectedIngCats.has(c))
        .reduce((s, c) => s + (data.ingByCat[c] || 0), 0),
    [ingresos, selectedIngCats, data.ingByCat],
  );
  const totalGasVisible = useMemo(
    () =>
      gastos
        .filter((c) => selectedGasCats.has(c))
        .reduce((s, c) => s + (data.gasByCat[c] || 0), 0),
    [gastos, selectedGasCats, data.gasByCat],
  );

  const [y, m] = ym.split("-").map(Number);

  const arbitrajeData = useMemo(() => {
    let bsRecibidos = 0,
      bsGastados = 0,
      usdIng = 0,
      usdGas = 0;
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
    return { bsRecibidos, bsGastados, saldoBs, usdIng, usdGas, usdTotal, tasaInicio, tasaCierre };
  }, [tx, ym, y, m, bcvRates]);

  // Una cuenta va casi siempre en una sola moneda, pero se agrupa por
  // banco+moneda (no solo por banco) por si acaso: mezclar Bs y USD del mismo
  // "Binance" en un solo saldo nativo no significaría nada.
  type BancoRow = {
    banco: string;
    moneda: string;
    ingresoNativo: number;
    ingresoUsd: number;
    gastoNativo: number;
    gastoUsd: number;
    nativo: number;
    usd: number;
  };
  const bancosData = useMemo(() => {
    const map = new Map<string, BancoRow>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0, 7) !== ym) continue;
      const banco = t.banco || "(sin banco)";
      const moneda = t.moneda || "USD";
      const key = `${banco}${moneda}`;
      const nativoAbs = Number(t.monto) || 0;
      const usdAbs = Number(t.montoUsd) || 0;
      const row: BancoRow = map.get(key) ?? {
        banco,
        moneda,
        ingresoNativo: 0,
        ingresoUsd: 0,
        gastoNativo: 0,
        gastoUsd: 0,
        nativo: 0,
        usd: 0,
      };
      if (t.tipo === "Ingreso") {
        row.ingresoNativo += nativoAbs;
        row.ingresoUsd += usdAbs;
        row.nativo += nativoAbs;
        row.usd += usdAbs;
      } else {
        row.gastoNativo += nativoAbs;
        row.gastoUsd += usdAbs;
        row.nativo -= nativoAbs;
        row.usd -= usdAbs;
      }
      map.set(key, row);
    }
    return Array.from(map.values()).sort(
      (a, b) => a.banco.localeCompare(b.banco) || a.moneda.localeCompare(b.moneda),
    );
  }, [tx, ym]);

  // Total consolidado en USD: la suma de TODAS las cuentas del mes, sin
  // importar qué categorías estén activas con las píldoras — es dinero real
  // en caja/banco, no debería desaparecer porque se filtró una categoría.
  // Coincide con el "Neto" del encabezado solo cuando no hay ningún filtro de
  // categoría puesto (el caso normal); si se filtra, cada número responde a
  // una pregunta distinta a propósito.
  const totalBancosUsd = useMemo(
    () => bancosData.reduce((s, r) => s + r.usd, 0),
    [bancosData],
  );
  const totalIngresosBancosUsd = useMemo(
    () => bancosData.reduce((s, r) => s + r.ingresoUsd, 0),
    [bancosData],
  );
  const totalGastosBancosUsd = useMemo(
    () => bancosData.reduce((s, r) => s + r.gastoUsd, 0),
    [bancosData],
  );

  useEffect(() => {
    const catsConDatos = (cats: string[], byCat: Record<string, number>) =>
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
    setSelectedIngCats((p) => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
      return n;
    });
  };
  const toggleGasCat = (cat: string) => {
    setSelectedGasCats((p) => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat);
      else n.add(cat);
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
  const exportOina = () => {
    exportInformeOina(tx, y, m, ingresos, gastos);
    toast.success("Informe OINA descargado");
  };

  const mostrarBolivares = arbitrajeData.bsRecibidos > 0 || arbitrajeData.bsGastados > 0;
  const mostrarBancos = bancosData.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Resumen mensual</h2>
            <Button variant="outline" size="sm" onClick={exportExcelResumen}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportOina}>
              <Download className="mr-2 h-4 w-4" /> Informe OINA
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(m)} onValueChange={(v) => setYm(`${y}-${v.padStart(2, "0")}`)}>
              <SelectTrigger className="w-32">
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
            <Input
              type="number"
              value={y}
              onChange={(e) => setYm(`${e.target.value}-${String(m).padStart(2, "0")}`)}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Neto</div>
              <div
                className={
                  "text-xl font-bold " +
                  (totalIngVisible - totalGasVisible < 0 ? "text-destructive" : "")
                }
              >
                ${$(totalIngVisible - totalGasVisible)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:col-span-3 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Ingresos</h3>
          <span className="text-base font-bold text-primary">${$(totalIngVisible)}</span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <button
            onClick={() => setShowAllCats(!showAllCats)}
            className={
              "rounded-full px-3 py-0 text-[12px] font-medium leading-tight " +
              (showAllCats ? "bg-primary text-primary-foreground" : "bg-muted")
            }
          >
            {showAllCats ? "Todas" : "Solo datos"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-1.5 gap-y-0.5">
          {/* Copia antes de ordenar: `ingresos` es el estado de useEditableList
              que llega por props, y .sort() ordena EN EL SITIO — reordenaba las
              categorías del usuario y lo dejaba guardado. */}
          {[...ingresos].sort().map((c) => (
            <button
              key={c}
              onClick={() => toggleIngCat(c)}
              className={`rounded-full px-3 py-0 text-[12px] font-medium leading-tight border transition ${selectedIngCats.has(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/30 text-muted-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {ingresos
              .filter((c) => selectedIngCats.has(c))
              .map((c) => {
                const v = data.ingByCat[c] || 0;
                const det = data.ingDet[c];
                return (
                  <>
                    <tr
                      key={c}
                      className="border-b last:border-0 cursor-pointer hover:bg-accent/30"
                      onClick={() => setExpandedCat(expandedCat === c ? null : c)}
                    >
                      <td className="p-1 font-medium">
                        {c}
                        {det ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({det.length})
                          </span>
                        ) : null}
                      </td>
                      <td className="p-1 text-right tabular-nums">${$(v)}</td>
                      <td className="p-1 text-right text-xs text-muted-foreground">
                        {totalIngVisible > 0 ? ((v / totalIngVisible) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                    {expandedCat === c && det && (
                      <tr key={`${c}-det`}>
                        <td colSpan={3} className="p-0">
                          <div className="bg-muted/20 px-3 py-2 text-xs space-y-1">
                            {det.map((d) => {
                              const isFocused = focusedId === d.id;
                              const tieneRevisar = !!d.revisar;
                              return (
                                <div
                                  key={d.id}
                                  onClick={() =>
                                    setFocusedId((prev) => (prev === d.id ? null : d.id))
                                  }
                                  title={tieneRevisar ? `Por revisar: ${d.revisar}` : undefined}
                                  className={
                                    "flex cursor-pointer items-center justify-between gap-2 rounded px-1 -mx-1 " +
                                    (isFocused
                                      ? "bg-green-100 ring-2 ring-inset ring-amber-400 dark:bg-green-950/30"
                                      : tieneRevisar
                                        ? "bg-blue-50 dark:bg-blue-950/30"
                                        : "")
                                  }
                                >
                                  <span className="text-muted-foreground truncate min-w-0">
                                    {d.fecha} <span className="font-medium">{d.mes || ""}</span>{" "}
                                    {d.desc?.slice(0, 40) || "—"}
                                    {d.desc && d.desc.length > 40 ? "…" : ""}
                                  </span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    {tieneRevisar && (
                                      <Flag className="h-3 w-3 fill-current text-blue-600 dark:text-blue-400" />
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const found = txObj.list.find((t) => t.id === d.id);
                                        if (found) setEditingTx(found);
                                      }}
                                      className="text-muted-foreground hover:text-primary p-0.5"
                                      title="Editar"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <span className="tabular-nums font-medium">${$(d.monto)}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            <tr className="border-t font-semibold">
              <td className="p-2">Total Ingresos</td>
              <td className="p-2 text-right">${$(totalIngVisible)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-destructive">Egresos</h3>
          <span className="text-base font-bold text-destructive">${$(totalGasVisible)}</span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <button
            onClick={() => setShowAllCats(!showAllCats)}
            className={
              "rounded-full px-3 py-0 text-[12px] font-medium leading-tight " +
              (showAllCats ? "bg-primary text-primary-foreground" : "bg-muted")
            }
          >
            {showAllCats ? "Todas" : "Solo datos"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-1.5 gap-y-0.5">
          {/* Misma razón que en ingresos: copiar antes de ordenar. */}
          {[...gastos].sort().map((c) => (
            <button
              key={c}
              onClick={() => toggleGasCat(c)}
              className={`rounded-full px-3 py-0 text-[12px] font-medium leading-tight border transition ${selectedGasCats.has(c) ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background border-muted-foreground/30 text-muted-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {gastos
              .filter((c) => selectedGasCats.has(c))
              .map((c) => {
                const v = data.gasByCat[c] || 0;
                const det = data.gasDet[c];
                return (
                  <>
                    <tr
                      key={c}
                      className="border-b last:border-0 cursor-pointer hover:bg-accent/30"
                      onClick={() => setExpandedCat(expandedCat === `g-${c}` ? null : `g-${c}`)}
                    >
                      <td className="p-1 font-medium">
                        {c}
                        {det ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({det.length})
                          </span>
                        ) : null}
                      </td>
                      <td className="p-1 text-right tabular-nums">${$(v)}</td>
                      <td className="p-1 text-right text-xs text-muted-foreground">
                        {totalGasVisible > 0 ? ((v / totalGasVisible) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                    {expandedCat === `g-${c}` && det && (
                      <tr key={`${c}-det`}>
                        <td colSpan={3} className="p-0">
                          <div className="bg-muted/20 px-3 py-2 text-xs space-y-1">
                            {det.map((d) => {
                              const isFocused = focusedId === d.id;
                              const tieneRevisar = !!d.revisar;
                              return (
                                <div
                                  key={d.id}
                                  onClick={() =>
                                    setFocusedId((prev) => (prev === d.id ? null : d.id))
                                  }
                                  title={tieneRevisar ? `Por revisar: ${d.revisar}` : undefined}
                                  className={
                                    "flex cursor-pointer items-center justify-between gap-2 rounded px-1 -mx-1 " +
                                    (isFocused
                                      ? "bg-green-100 ring-2 ring-inset ring-amber-400 dark:bg-green-950/30"
                                      : tieneRevisar
                                        ? "bg-blue-50 dark:bg-blue-950/30"
                                        : "")
                                  }
                                >
                                  <span className="text-muted-foreground truncate min-w-0">
                                    {d.fecha} <span className="font-medium">{d.mes || ""}</span>{" "}
                                    {d.desc?.slice(0, 40) || "—"}
                                    {d.desc && d.desc.length > 40 ? "…" : ""}
                                  </span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    {tieneRevisar && (
                                      <Flag className="h-3 w-3 fill-current text-blue-600 dark:text-blue-400" />
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const found = txObj.list.find((t) => t.id === d.id);
                                        if (found) setEditingTx(found);
                                      }}
                                      className="text-muted-foreground hover:text-primary p-0.5"
                                      title="Editar"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <span className="tabular-nums font-medium">${$(d.monto)}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            <tr className="border-t font-semibold">
              <td className="p-2">Total Egresos</td>
              <td className="p-2 text-right">${$(totalGasVisible)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </Card>
      </div>

      {/* Bolívares y disponibilidad de caja/bancos van juntas, más
          compactas, separadas del resumen de categorías de arriba. */}
      {(mostrarBolivares || mostrarBancos) && (
      <div className="grid gap-4 lg:col-span-3 lg:grid-cols-3">
      {mostrarBolivares && (
        <Card className={"p-4 " + (mostrarBancos ? "" : "lg:col-span-3")}>
          <h3 className="mb-2 text-sm font-semibold">Análisis de Bolívares del mes</h3>

          {/* Cinta compacta: solo las dos tasas de referencia. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Tasa BCV</span>
            <span>
              Inicio <span className="font-medium tabular-nums">{fmtBs(arbitrajeData.tasaInicio)}</span>
            </span>
            <span>
              Cierre <span className="font-medium tabular-nums">{fmtBs(arbitrajeData.tasaCierre)}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1 font-medium">Concepto</th>
                  <th className="py-1 text-right font-medium">Monto (Bs)</th>
                  <th className="py-1 text-right font-medium">Equivalencia (USD)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-1.5">(+) Ingresos en Bs</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {fmtBs(arbitrajeData.bsRecibidos)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{fmtUsd(arbitrajeData.usdIng)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5">(-) Gastos en Bs</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {fmtBs(arbitrajeData.bsGastados)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{fmtUsd(arbitrajeData.usdGas)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-1.5">(=) Saldo del mes</td>
                  <td
                    className={
                      "py-1.5 text-right tabular-nums " +
                      (arbitrajeData.saldoBs < 0 ? "text-destructive" : "")
                    }
                  >
                    {fmtBs(arbitrajeData.saldoBs)}
                  </td>
                  <td
                    className={
                      "py-1.5 text-right tabular-nums " +
                      (arbitrajeData.usdTotal < 0 ? "text-destructive" : "")
                    }
                  >
                    {fmtUsd(arbitrajeData.usdTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Nota: conversión acumulada a la tasa oficial del día de cada registro.
          </p>
        </Card>
      )}
      {mostrarBancos && (
        <Card className={"p-4 " + (mostrarBolivares ? "lg:col-span-2" : "lg:col-span-3")}>
          <h3 className="mb-2 text-sm font-semibold">Disponibilidad en Caja y Bancos al Cierre</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1 font-medium">Cuenta/Banco</th>
                  <th className="py-1 font-medium">Moneda</th>
                  <th className="py-1 text-right font-medium">Ingresos (Nativo)</th>
                  <th className="py-1 text-right font-medium">Ingresos (USD)</th>
                  <th className="py-1 text-right font-medium">Gastos (Nativo)</th>
                  <th className="py-1 text-right font-medium">Gastos (USD)</th>
                  <th className="py-1 text-right font-medium">Saldo (Nativo)</th>
                  <th className="py-1 text-right font-medium">Saldo (USD)</th>
                </tr>
              </thead>
              <tbody>
                {bancosData.map((r) => (
                  <tr key={`${r.banco}-${r.moneda}`} className="border-b last:border-0">
                    <td className="py-1.5">{r.banco}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "COP" : "USD"}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmtMonto(r.ingresoNativo, simboloMoneda(r.moneda))}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmtMonto(r.ingresoUsd, "$")}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmtMonto(r.gastoNativo, simboloMoneda(r.moneda))}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{fmtMonto(r.gastoUsd, "$")}</td>
                    <td
                      className={
                        "py-1.5 text-right tabular-nums font-medium " +
                        (r.nativo < 0 ? "text-destructive" : "")
                      }
                    >
                      {fmtMonto(r.nativo, simboloMoneda(r.moneda))}
                    </td>
                    <td
                      className={
                        "py-1.5 text-right tabular-nums font-medium " +
                        (r.usd < 0 ? "text-destructive" : "")
                      }
                    >
                      {fmtMonto(r.usd, "$")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-1.5" colSpan={2}>
                    Total consolidado
                  </td>
                  <td className="py-1.5" />
                  <td className="py-1.5 text-right tabular-nums">
                    {fmtMonto(totalIngresosBancosUsd, "$")}
                  </td>
                  <td className="py-1.5" />
                  <td className="py-1.5 text-right tabular-nums">
                    {fmtMonto(totalGastosBancosUsd, "$")}
                  </td>
                  <td className="py-1.5" />
                  <td
                    className={
                      "py-1.5 text-right tabular-nums " +
                      (totalBancosUsd < 0 ? "text-destructive" : "")
                    }
                  >
                    {fmtMonto(totalBancosUsd, "$")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
      </div>
      )}
      <TransactionEditDialog
        editing={editingTx}
        onClose={() => setEditingTx(null)}
        onSave={(t) => {
          txObj.replace(t.id, t);
          setEditingTx(null);
          toast.success("Transacción actualizada");
        }}
        ingresos={ingresos}
        gastos={gastos}
        bancos={bancos}
        bcvRates={bcvRates}
        bcvRatesEuro={bcvRatesEuro}
        bcvSources={{}}
      />
    </div>
  );
}
