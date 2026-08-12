import { useMemo } from "react";
import type { Transaction } from "@/lib/lists-store";
import { Card } from "@/components/ui/card";
import { usd } from "@/lib/formato";
import { AlertTriangle } from "lucide-react";

const $ = usd;

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const [, d = "", mo = "", a] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  let yy = a ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

// Palabras clave para identificar gastos fijos/estructurales. Se comparan
// sin distinguir mayúsculas ni tildes y por coincidencia parcial, para que
// sigan funcionando si se renombra una categoría (ej. "Alquiler local 2026").
const CLAVES_GASTO_FIJO = [
  "alquiler",
  "arriendo",
  "honorario",
  "servicio",
  "nomina",
  "luz",
  "agua",
  "electricidad",
  "internet",
  "condominio",
  "aseo",
];

function sinTildes(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function esGastoFijo(categoria: string): boolean {
  const c = sinTildes(categoria);
  return CLAVES_GASTO_FIJO.some((k) => c.includes(k));
}

/**
 * Insights calculados sobre el MISMO periodo que muestra el dashboard
 * (un mes concreto, o el año completo si `month` es null).
 */
export function ReporteEjecutivo({
  tx,
  year,
  month,
  periodoLabel,
}: {
  tx: Transaction[];
  year: number;
  month: number | null;
  periodoLabel: string;
}) {
  const report = useMemo(() => {
    const gasCat: Record<string, number> = {};
    let ingTotal = 0,
      gasTotal = 0,
      ingNoUsd = 0,
      totalTx = 0;

    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0, 4)) !== year) continue;
      if (month && Number(iso.slice(5, 7)) !== month) continue;
      const usd = Number(t.montoUsd) || 0;
      totalTx++;
      if (t.tipo === "Ingreso") {
        ingTotal += usd;
        if (t.moneda && t.moneda !== "USD") ingNoUsd += usd;
      } else if (t.tipo === "Gasto") {
        gasTotal += usd;
        const cat = t.categoria || "Otros";
        gasCat[cat] = (gasCat[cat] || 0) + usd;
      }
    }

    let gastoFijo = 0;
    for (const [cat, val] of Object.entries(gasCat)) {
      if (esGastoFijo(cat)) gastoFijo += val;
    }

    const neto = ingTotal - gasTotal;
    const ratio = gasTotal > 0 ? ingTotal / gasTotal : 0;
    const salud =
      ratio >= 1.5 ? "excelente" : ratio >= 1 ? "buena" : ratio >= 0.8 ? "regular" : "crítica";

    return {
      totalTx,
      ingTotal,
      gasTotal,
      neto,
      salud,
      gastoFijo,
      pctGastoFijo: ingTotal > 0 ? (gastoFijo / ingTotal) * 100 : null,
      pctIngNoUsd: ingTotal > 0 ? (ingNoUsd / ingTotal) * 100 : null,
    };
  }, [tx, year, month]);

  if (report.totalTx === 0) return null;

  const items: { icono: string; texto: React.ReactNode; alerta?: boolean }[] = [];

  if (report.neto < 0) {
    items.push({
      alerta: true,
      icono: "⚠️",
      texto: (
        <>
          <b>Déficit en {periodoLabel.toLowerCase()}:</b> los gastos superaron a los ingresos en US$
          {$(Math.abs(report.neto))}.
        </>
      ),
    });
  }

  if (report.pctGastoFijo != null && report.gastoFijo > 0) {
    const alto = report.pctGastoFijo > 60;
    items.push({
      alerta: alto,
      icono: alto ? "⚠️" : "ℹ️",
      texto: (
        <>
          <b>Gastos fijos:</b> US${$(report.gastoFijo)} — {report.pctGastoFijo.toFixed(0)}% de los
          ingresos {alto ? "· por encima del 60% recomendado" : "· dentro del 60% recomendado"}
        </>
      ),
    });
  }

  if (report.pctIngNoUsd != null && report.pctIngNoUsd > 0) {
    items.push({
      icono: "💱",
      texto: (
        <>
          <b>Moneda local:</b> {report.pctIngNoUsd.toFixed(0)}% de los ingresos entró en bolívares o
          pesos, sujeto a la tasa del día de cada pago.
        </>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" />
        Puntos de atención · {periodoLabel}
        <span className="ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
          Salud: {report.salud}
        </span>
      </h3>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className={
              "rounded px-2 py-1.5 text-xs leading-relaxed " +
              (it.alerta ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/60")
            }
          >
            <span className="mr-1">{it.icono}</span>
            {it.texto}
          </li>
        ))}
      </ul>
    </Card>
  );
}
