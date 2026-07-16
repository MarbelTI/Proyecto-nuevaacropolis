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
  const y = year;
  const m = month;
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const ym = `${y}-${String(m).padStart(2,"0")}`;
  const mesLabel = meses[m-1];

  const monthTx = transactions.filter(t => {
    const iso = fechaToIso(t.fecha);
    return iso && iso.slice(0,7) === ym;
  });

  const allCats = [...ingresos, ...gastos];

  type Entry = { monto: number; desc: string; fecha: string; mes: string };
  const catData: Record<string, Entry[]> = {};
  for (const cat of allCats) catData[cat] = [];

  for (const t of monthTx) {
    const cat = t.categoria || "(sin categoría)";
    if (cat === "CONVERSIÓN") continue;
    if (!catData[cat]) continue;
    const monto = Number(t.montoUsd) || 0;
    const isGasto = t.tipo === "Gasto";
    catData[cat].push({
      monto: isGasto ? -Math.abs(monto) : Math.abs(monto),
      desc: t.descripcion || "",
      fecha: t.fecha,
      mes: t.mensualidad || "",
    });
  }

  const maxRecords = Math.max(0, ...allCats.map(c => catData[c].length));
  const totalRowIdx = maxRecords + 1; // 0-indexed, +1 por header
  const lastDataRow = totalRowIdx;    // última fila de datos (0-indexed)

  const rm: any[][] = [];

  // Fila 1: encabezados de categoría
  rm.push([...allCats]);

  // Filas de datos
  for (let r = 0; r < maxRecords; r++) {
    rm.push(allCats.map(cat => (r < catData[cat].length ? catData[cat][r].monto : null)));
  }

  // Fila de totales con fórmula SUM
  rm.push(allCats.map((cat, ci) => {
    const hasData = catData[cat].length > 0;
    if (!hasData) return null;
    const colLetter = XLSX.utils.encode_col(ci);
    return { f: `SUM(${colLetter}2:${colLetter}${lastDataRow + 1})` };
  }));

  // 5 filas en blanco
  for (let i = 0; i < 5; i++) rm.push([]);

  // Resumen: nombre de categoría + total
  for (const cat of allCats) {
    const total = catData[cat].reduce((s, e) => s + e.monto, 0);
    if (total !== 0) {
      rm.push([cat, null, null, null, total]);
    } else {
      rm.push([cat]);
    }
  }

  // Gran total: ingresos en col E, egresos en col F
  const totalIngMes = ingresos.reduce((s, cat) => {
    const t = catData[cat].reduce((s2, e) => s2 + e.monto, 0);
    return s + (t > 0 ? t : 0);
  }, 0);
  const totalGasMes = gastos.reduce((s, cat) => {
    const t = catData[cat].reduce((s2, e) => s2 + e.monto, 0);
    return s + (t < 0 ? Math.abs(t) : 0);
  }, 0);
  rm.push([]);
  rm.push([null, null, null, null, totalIngMes, Math.abs(totalGasMes)]);

  const wsRm = XLSX.utils.aoa_to_sheet(rm);

  // Añadir notas (comentarios) con fecha + descripción en cada celda de dato
  for (let c = 0; c < allCats.length; c++) {
    const cat = allCats[c];
    const entries = catData[cat];
    for (let r = 0; r < entries.length; r++) {
      const addr = XLSX.utils.encode_cell({ c, r: r + 1 });
      const cell = wsRm[addr];
      if (cell) {
        const lines = [entries[r].fecha];
        if (entries[r].mes) lines.push(entries[r].mes);
        if (entries[r].desc) lines.push(entries[r].desc);
        cell.c = [{ a: "Nueva Acrópolis", t: lines.join("\n") }];
      }
    }
  }

  wsRm["!cols"] = allCats.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsRm, "RESUMEN MENSUAL");

  XLSX.writeFile(wb, `RESUMEN ${mesLabel} ${y}.xlsx`);
}
