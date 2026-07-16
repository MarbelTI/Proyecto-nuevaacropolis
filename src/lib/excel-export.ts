import * as XLSX from "xlsx";
import type { Transaction } from "./lists-store";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fechaToIso(fecha: string): string | null {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return fecha;
  return null;
}

function serialDate(iso: string): number {
  const d = new Date(iso);
  const excelEpoch = new Date(1899, 11, 30);
  return (d.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000);
}

export function exportTransactionsExcel(transactions: Transaction[]): void {
  if (!transactions.length) return;
  const ws = XLSX.utils.json_to_sheet(transactions.map((r) => ({
    Fecha: r.fecha, Mes: r.mes, Tipo: r.tipo, Categoría: r.categoria,
    Descripción: r.descripcion, Mensualidad: r.mensualidad, Moneda: r.moneda,
    Banco: r.banco, Monto: r.monto, "Tasa cambio": r.tasa, "Monto USD": r.montoUsd,
  })));
  ws["!cols"] = [{wch:11},{wch:10},{wch:9},{wch:18},{wch:35},{wch:11},{wch:11},{wch:12},{wch:12},{wch:12},{wch:14}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
  XLSX.writeFile(wb, `TRANSACCIONES_${todayIso()}.xlsx`);
}

export function exportResumenExcel(
  transactions: Transaction[],
  year: number,
  month: number,
  ingresos: string[],
  gastos: string[],
): void {
  const wb = XLSX.utils.book_new();
  const allTx = transactions;
  const y = year;
  const m = month;
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const ym = `${y}-${String(m).padStart(2,"0")}`;

  const txHeader = ["Fecha","Mes Contable","Tipo","Categoría","Nombre / Descripción","Mes Mensualidad","Moneda","Monto Original","Tasa Bs/$","Monto USD"];
  const txRows: any[][] = [];
  txRows.push([`📋  TRANSACCIONES  |  Nueva Acrópolis SC  |  ${y}-${y+1}`]);
  txRows.push(txHeader);
  for (const t of allTx) {
    const iso = fechaToIso(t.fecha);
    if (!iso || iso.slice(0,4) !== String(y)) continue;
    txRows.push([
      iso ? serialDate(iso) : "",
      t.mes || "",
      t.tipo || "",
      t.categoria || "",
      t.descripcion || "",
      t.mensualidad || "",
      t.moneda || "USD",
      Number(t.monto) || 0,
      Number(t.tasa) || "",
      Number(t.montoUsd) || 0,
    ]);
  }
  const wsTx = XLSX.utils.aoa_to_sheet(txRows);
  wsTx["!cols"] = [{wch:12},{wch:14},{wch:10},{wch:16},{wch:42},{wch:16},{wch:10},{wch:14},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb, wsTx, "TRANSACCIONES");

  const allCats = [...new Set([...ingresos, ...gastos])];
  const ingCats = ingresos.sort();
  const gasCats = gastos.sort();
  const af: any[][] = [];

  af.push([`📊  ANÁLISIS FINANCIERO POR CATEGORÍA  |  Nueva Acrópolis SC  |  ${y}`]);
  af.push(["Tipo","Categoría",...meses,"TOTAL","PROMEDIO/MES","VARIACIÓN E→Últ."]);
  af.push([null,null,...meses]);

  const sumaCatMes = (cat: string, mesIdx: number): number => {
    let total = 0;
    for (const t of allTx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0,4) !== String(y)) continue;
      const tm = parseInt(iso.slice(5,7),10);
      if (tm !== mesIdx + 1) continue;
      if (t.categoria !== cat) continue;
      total += Number(t.montoUsd) || 0;
    }
    return total;
  };

  for (const c of ingCats) {
    const vals = meses.map((_,i) => sumaCatMes(c, i));
    const total = vals.reduce((a,b) => a + b, 0);
    const prom = total / 12;
    const firstNonZero = vals.find(v => v > 0) ?? 0;
    const lastNonZero = [...vals].reverse().find(v => v > 0) ?? 0;
    const varE = firstNonZero && lastNonZero ? ((lastNonZero - firstNonZero) / firstNonZero * 100).toFixed(1) : "";
    af.push(["Ingreso", c, ...vals, total, prom, varE]);
  }
  const totalIngVals = meses.map((_,i) => ingCats.reduce((s,c) => s + sumaCatMes(c,i), 0));
  const totalIngSum = totalIngVals.reduce((a,b)=>a+b,0);
  af.push(["","TOTAL INGRESOS", ...totalIngVals, totalIngSum, totalIngSum/12, ""]);
  af.push([]);

  for (const c of gasCats) {
    const vals = meses.map((_,i) => sumaCatMes(c, i));
    const total = vals.reduce((a,b) => a + b, 0);
    const prom = total / 12;
    const firstNonZero = vals.find(v => v > 0) ?? 0;
    const lastNonZero = [...vals].reverse().find(v => v > 0) ?? 0;
    const varE = firstNonZero && lastNonZero ? ((lastNonZero - firstNonZero) / firstNonZero * 100).toFixed(1) : "";
    af.push(["Egreso", c, ...vals, total, prom, varE]);
  }
  const totalGasVals = meses.map((_,i) => gasCats.reduce((s,c) => s + sumaCatMes(c,i), 0));
  const totalGasSum = totalGasVals.reduce((a,b)=>a+b,0);
  af.push(["","TOTAL EGRESOS", ...totalGasVals, totalGasSum, totalGasSum/12, ""]);

  const wsAf = XLSX.utils.aoa_to_sheet(af);
  wsAf["!cols"] = [{wch:10},{wch:22},...meses.map(()=>({wch:12})),{wch:10},{wch:12},{wch:16}];
  XLSX.utils.book_append_sheet(wb, wsAf, "ANÁLISIS FINANCIERO");

  const monthTx = allTx.filter(t => {
    const iso = fechaToIso(t.fecha);
    return iso && iso.slice(0,7) === ym;
  });
  const mesLabel = meses[m-1];
  const rm: any[][] = [];
  rm.push([`📅  RESUMEN MENSUAL  |  ${mesLabel} ${y}`]);
  rm.push([]);
  rm.push(["MES SELECCIONADO →", mesLabel]);
  rm.push([]);
  rm.push(["INDICADORES DEL MES"]);
  rm.push(["Total Ingresos","Total Egresos","Margen Neto","Alquiler","Cuotas M+P"]);
  const rmIngTotal = ingCats.reduce((s,c) => s + sumaCatMes(c, m-1), 0);
  const rmGasTotal = gasCats.reduce((s,c) => s + sumaCatMes(c, m-1), 0);
  const alquiler = sumaCatMes("ALQUILER", m-1);
  const cuotasMP = sumaCatMes("MIEMBROS", m-1) + sumaCatMes("PROBAS", m-1);
  rm.push([rmIngTotal, rmGasTotal, rmIngTotal - rmGasTotal, alquiler, cuotasMP]);
  rm.push([]);

  const nPagos = (cat: string, mesIdx: number): number =>
    allTx.filter(t => {
      const iso = fechaToIso(t.fecha);
      if (!iso || parseInt(iso.slice(5,7),10) !== mesIdx+1) return false;
      if (t.categoria !== cat) return false;
      return true;
    }).length;

  rm.push(["↑  INGRESOS DEL MES"]);
  rm.push(["Categoría","Monto USD","N° Pagos","% del Total Ing.","% Acum. hasta este mes"]);
  let acumPct = 0;
  for (const c of ingCats) {
    const val = sumaCatMes(c, m-1);
    if (val === 0) continue;
    const np = nPagos(c, m-1);
    const pct = rmIngTotal ? (val / rmIngTotal * 100).toFixed(1) : "0";
    acumPct += Number(pct);
    rm.push([c, val, np, pct, acumPct.toFixed(1)]);
  }
  rm.push([]);
  rm.push(["↓  EGRESOS DEL MES"]);
  rm.push(["Categoría","Monto USD","N° Pagos","% del Total Eg.","% Acum. hasta este mes"]);
  let acumPctE = 0;
  for (const c of gasCats) {
    const val = sumaCatMes(c, m-1);
    if (val === 0) continue;
    const np = nPagos(c, m-1);
    const pct = rmGasTotal ? (val / rmGasTotal * 100).toFixed(1) : "0";
    acumPctE += Number(pct);
    rm.push([c, val, np, pct, acumPctE.toFixed(1)]);
  }

  const wsRm = XLSX.utils.aoa_to_sheet(rm);
  wsRm["!cols"] = [{wch:24},{wch:12},{wch:10},{wch:18},{wch:22}];
  XLSX.utils.book_append_sheet(wb, wsRm, "RESUMEN MENSUAL");

  XLSX.writeFile(wb, `RESUMEN_${ym}_${todayIso()}.xlsx`);
}
