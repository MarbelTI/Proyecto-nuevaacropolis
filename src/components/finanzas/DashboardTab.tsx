import { useMemo, useState } from "react";
import type { Transaction, Student } from "@/lib/lists-store";
import { Card } from "@/components/ui/card";
import { usd } from "@/lib/formato";
import { ReporteEjecutivo } from "@/components/finanzas/ReporteEjecutivo";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
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
const MESES_ABR = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// Paleta validada para daltonismo y contraste (light + dark) con
// scripts/validate_palette.js. La separación verde/terracota queda en la
// banda que exige codificación secundaria: por eso cada serie lleva
// SIEMPRE leyenda, flecha (↑/↓) y su valor escrito — nunca solo color.
const C_ING = "#3F8A5F"; // ingresos
const C_GAS = "#C25E45"; // gastos

const $ = usd;
const $0 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

/** Suma ingresos/gastos en USD de un conjunto de movimientos. */
function totales(rows: Transaction[]) {
  let ing = 0,
    gas = 0;
  for (const t of rows) {
    const usd = Number(t.montoUsd) || 0;
    if (t.tipo === "Ingreso") ing += usd;
    else if (t.tipo === "Gasto") gas += usd;
  }
  return { ing, gas, neto: ing - gas };
}

/** Top N categorías por monto, de un tipo dado. */
function topCategorias(rows: Transaction[], tipo: "Ingreso" | "Gasto", n: number) {
  const acc = new Map<string, number>();
  for (const t of rows) {
    if (t.tipo !== tipo) continue;
    const cat = t.categoria || "(sin categoría)";
    acc.set(cat, (acc.get(cat) || 0) + (Number(t.montoUsd) || 0));
  }
  return [...acc.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/** Variación porcentual contra el periodo anterior. */
function variacion(actual: number, previo: number): number | null {
  if (!previo) return null;
  return ((actual - previo) / Math.abs(previo)) * 100;
}

function Delta({ pct, invertido = false }: { pct: number | null; invertido?: boolean }) {
  if (pct == null) {
    return <span className="text-[11px] text-muted-foreground">sin periodo anterior</span>;
  }
  const sube = pct > 0.5,
    baja = pct < -0.5;
  // En gastos, subir es malo (invertido); en ingresos, subir es bueno.
  const bueno = invertido ? baja : sube;
  const color =
    !sube && !baja ? "text-muted-foreground" : bueno ? "text-[#3F8A5F]" : "text-[#C25E45]";
  const Icon = sube ? ArrowUp : baja ? ArrowDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${color}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(pct).toFixed(0)}% vs. periodo anterior
    </span>
  );
}

/** Lista rankeada con barra proporcional — más legible que un gráfico para un top corto. */
function TopLista({
  titulo,
  datos,
  color,
  total,
}: {
  titulo: string;
  datos: [string, number][];
  color: string;
  total: number;
}) {
  const max = datos.length ? datos[0][1] : 0;
  return (
    <Card className="p-4">
      <h3 className="mb-2.5 text-xs font-semibold">{titulo}</h3>
      {datos.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Sin movimientos en este periodo
        </p>
      ) : (
        <ol className="space-y-2">
          {datos.map(([cat, val], i) => {
            const pctDelTotal = total > 0 ? (val / total) * 100 : 0;
            return (
              <li key={cat}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{i + 1}.</span>
                    <span className="truncate text-[11px]" title={cat}>
                      {cat}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums">
                    ${$0(val)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      {pctDelTotal.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${max > 0 ? (val / max) * 100 : 0}%`, background: color }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

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
  students?: Student[];
}) {
  const years = useMemo(() => {
    const s = new Set<number>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (iso) s.add(Number(iso.slice(0, 4)));
    }
    s.add(new Date().getFullYear());
    return Array.from(s).sort((a, b) => b - a);
  }, [tx]);

  const [year, setYear] = useState<number>(years[0]);
  const [month, setMonth] = useState<number | null>(null);

  const mesesConDatos = useMemo(() => {
    const s = new Set<number>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (iso && Number(iso.slice(0, 4)) === year) s.add(Number(iso.slice(5, 7)));
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [tx, year]);

  /** Movimientos del periodo seleccionado. */
  const periodoTx = useMemo(
    () =>
      tx.filter((t) => {
        const iso = fechaToIso(t.fecha);
        if (!iso || Number(iso.slice(0, 4)) !== year) return false;
        return month ? Number(iso.slice(5, 7)) === month : true;
      }),
    [tx, year, month],
  );

  /** Periodo anterior (mes anterior, o año anterior si la vista es anual). */
  const previoTx = useMemo(() => {
    const [pYear, pMonth] = month
      ? month === 1
        ? [year - 1, 12]
        : [year, month - 1]
      : [year - 1, null];
    return tx.filter((t) => {
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== pYear) return false;
      return pMonth ? Number(iso.slice(5, 7)) === pMonth : true;
    });
  }, [tx, year, month]);

  const act = useMemo(() => totales(periodoTx), [periodoTx]);
  const prev = useMemo(() => totales(previoTx), [previoTx]);

  const top5Gastos = useMemo(() => topCategorias(periodoTx, "Gasto", 5), [periodoTx]);
  const top3Ingresos = useMemo(() => topCategorias(periodoTx, "Ingreso", 3), [periodoTx]);

  const tendencia = useMemo(() => {
    const map = new Map<number, { mes: string; Ingresos: number; Gastos: number }>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== year) continue;
      const m = Number(iso.slice(5, 7));
      if (!map.has(m)) map.set(m, { mes: MESES_ABR[m - 1], Ingresos: 0, Gastos: 0 });
      const d = map.get(m)!;
      const usd = Number(t.montoUsd) || 0;
      if (t.tipo === "Ingreso") d.Ingresos += usd;
      else if (t.tipo === "Gasto") d.Gastos += usd;
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [tx, year]);

  /** Totales en la moneda original de cada movimiento (sin convertir). */
  const porMoneda = useMemo(() => {
    const base = {
      USD: { ing: 0, gas: 0, n: 0 },
      Bolívares: { ing: 0, gas: 0, n: 0 },
      Pesos: { ing: 0, gas: 0, n: 0 },
    };
    for (const t of periodoTx) {
      // Los movimientos sin moneda marcada se cuentan como USD (es el caso
      // por defecto en la carga manual y en el OCR).
      const m = t.moneda === "Bolívares" || t.moneda === "Pesos" ? t.moneda : "USD";
      const monto = Number(t.monto) || 0;
      base[m].n++;
      if (t.tipo === "Ingreso") base[m].ing += monto;
      else if (t.tipo === "Gasto") base[m].gas += monto;
    }
    return base;
  }, [periodoTx]);

  const tasaBcv = useMemo(() => {
    const ym = month ? `${year}-${String(month).padStart(2, "0")}` : null;
    const keys = Object.keys(bcvRates).sort();
    const match = ym
      ? keys.filter((k) => k.startsWith(ym))
      : keys.filter((k) => k.startsWith(String(year)));
    return match.length ? bcvRates[match[match.length - 1]] : null;
  }, [bcvRates, year, month]);

  const periodoLabel = month ? `${MESES_ES[month - 1]} ${year}` : `Año ${year}`;
  const periodoPrevioLabel = month
    ? month === 1
      ? `Diciembre ${year - 1}`
      : `${MESES_ES[month - 2]} ${year}`
    : `Año ${year - 1}`;

  return (
    <div className="space-y-3">
      {/* ---------- Encabezado y selector de periodo ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Resumen ejecutivo
          </span>
          <h1 className="text-lg font-bold tracking-tight">{periodoLabel}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                  (year === y
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50")
                }
              >
                {y}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setMonth(null)}
              className={
                "rounded-full border px-2 py-1 text-[11px] font-medium transition " +
                (!month
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50")
              }
            >
              Todo el año
            </button>
            {mesesConDatos.map((m) => (
              <button
                key={m}
                onClick={() => setMonth(m)}
                className={
                  "rounded-full border px-2 py-1 text-[11px] font-medium transition " +
                  (month === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50")
                }
              >
                {MESES_ABR[m - 1]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {periodoTx.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No hay movimientos registrados en {periodoLabel}.</p>
        </Card>
      ) : (
        <>
          {/* ---------- Los números que importan + resumen ---------- */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ArrowUp className="h-3 w-3" style={{ color: C_ING }} aria-hidden />
                Ingresos
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                US$ {$0(act.ing)}
              </p>
              <Delta pct={variacion(act.ing, prev.ing)} />
            </Card>

            <Card className="p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ArrowDown className="h-3 w-3" style={{ color: C_GAS }} aria-hidden />
                Gastos
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                US$ {$0(act.gas)}
              </p>
              <Delta pct={variacion(act.gas, prev.gas)} invertido />
            </Card>

            <Card className="p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Balance
              </p>
              <p
                className="mt-1 text-xl font-bold tracking-tight tabular-nums"
                style={{ color: act.neto >= 0 ? C_ING : C_GAS }}
              >
                {act.neto >= 0 ? "+" : "−"}US$ {$0(Math.abs(act.neto))}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {act.neto >= 0 ? "Superávit" : "Déficit"} ·{" "}
                {act.ing > 0
                  ? `${((act.neto / act.ing) * 100).toFixed(0)}% de los ingresos`
                  : "sin ingresos"}
              </p>
            </Card>

            {/* 4ª tarjeta: el resumen en palabras */}
            <Card
              className="border-l-[3px] p-3.5"
              style={{ borderLeftColor: act.neto >= 0 ? C_ING : C_GAS }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                En resumen
              </p>
              <p className="mt-1 text-[11px] leading-snug">
                {act.neto >= 0 ? "Ingresó" : "Faltó"} <b>US$ {$(Math.abs(act.neto))}</b>{" "}
                {act.neto >= 0 ? "más de lo gastado" : "para cubrir los gastos"}
                {top5Gastos[0] && (
                  <>
                    . Mayor gasto: <b>{top5Gastos[0][0]}</b>
                  </>
                )}
                {prev.ing || prev.gas ? (
                  <>
                    . Vs. {periodoPrevioLabel.toLowerCase()}: ingresos{" "}
                    {act.ing >= prev.ing ? "↑" : "↓"}, gastos {act.gas >= prev.gas ? "↑" : "↓"}
                  </>
                ) : null}
                .
              </p>
            </Card>
          </div>

          {/* ---------- Tops + gráfico, en una sola fila ---------- */}
          <div className="grid gap-3 lg:grid-cols-3">
            <TopLista
              titulo="En qué se gastó más — Top 5"
              datos={top5Gastos}
              color={C_GAS}
              total={act.gas}
            />
            <TopLista
              titulo="De dónde vino el dinero — Top 3"
              datos={top3Ingresos}
              color={C_ING}
              total={act.ing}
            />

            {tendencia.length > 1 ? (
              <Card className="p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-xs font-semibold">Mes a mes · {year}</h3>
                  <span className="text-[10px] text-muted-foreground">USD</span>
                </div>
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tendencia}
                      barGap={1}
                      margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="currentColor"
                        className="text-border"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        tickFormatter={(v) => `$${$0(v)}`}
                      />
                      <ReTooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--popover))",
                          fontSize: 11,
                        }}
                        formatter={(v: number, name: string) => [`US$ ${$0(v)}`, name]}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconSize={8} />
                      <Bar dataKey="Ingresos" fill={C_ING} radius={[3, 3, 0, 0]} maxBarSize={14} />
                      <Bar dataKey="Gastos" fill={C_GAS} radius={[3, 3, 0, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ) : (
              <ReporteEjecutivo tx={tx} year={year} month={month} periodoLabel={periodoLabel} />
            )}
          </div>

          {/* ---------- Puntos de atención + moneda local ---------- */}
          <div className="grid gap-3 lg:grid-cols-2">
            {tendencia.length > 1 && (
              <ReporteEjecutivo tx={tx} year={year} month={month} periodoLabel={periodoLabel} />
            )}

            <Card className="p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-xs font-semibold">Movimientos en cada moneda</h3>
                {tasaBcv && (
                  <span className="text-[10px] text-muted-foreground">BCV {$(tasaBcv)} Bs/US$</span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["Dólares", "US$", porMoneda.USD],
                    ["Bolívares", "Bs.", porMoneda.Bolívares],
                    ["Pesos", "COP $", porMoneda.Pesos],
                  ] as const
                ).map(([label, simbolo, v]) => (
                  <div
                    key={label}
                    className={"rounded-lg border p-2.5 " + (v.n === 0 ? "opacity-50" : "")}
                  >
                    <p className="mb-1 flex items-baseline justify-between text-xs font-medium">
                      {label}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {v.n} mov.
                      </span>
                    </p>
                    <dl className="space-y-0.5 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">↑ Ingresos</dt>
                        <dd className="font-semibold tabular-nums">
                          {simbolo} {$0(v.ing)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">↓ Gastos</dt>
                        <dd className="font-semibold tabular-nums">
                          {simbolo} {$0(v.gas)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 border-t pt-0.5">
                        <dt className="text-muted-foreground">Balance</dt>
                        <dd
                          className="font-semibold tabular-nums"
                          style={{ color: v.ing - v.gas >= 0 ? C_ING : C_GAS }}
                        >
                          {v.ing - v.gas < 0 ? "−" : ""}
                          {simbolo} {$0(Math.abs(v.ing - v.gas))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                Cifras en la moneda original de cada movimiento, sin convertir. Los montos de
                distinta moneda no se pueden sumar entre sí.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
