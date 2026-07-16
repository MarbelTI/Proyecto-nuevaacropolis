import * as XLSX from "xlsx";
import type { Transaction } from "./lists-store";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2,"0"); const mm = m[2].padStart(2,"0");
  let yy = m[3] ?? String(new Date().getFullYear()); if (yy.length===2) yy = "20"+yy;
  return `${yy}-${mm}-${dd}`;
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

  const rm: any[][] = [];

  // Fila 1: encabezados de categoría
  rm.push([...allCats]);

  // Filas de datos
  for (let r = 0; r < maxRecords; r++) {
    rm.push(allCats.map(cat => (r < catData[cat].length ? catData[cat][r].monto : null)));
  }

  // Fila de totales (valores null, se reemplazan por fórmula después)
  rm.push(allCats.map(() => null));

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

  const totalExcelRow = maxRecords + 2; // 1-indexed (fila 1 = header, filas 2.. = datos, siguiente = totales)

  const wsRm = XLSX.utils.aoa_to_sheet(rm);

  // Asignar fórmula SUM a la fila de totales
  for (let ci = 0; ci < allCats.length; ci++) {
    if (catData[allCats[ci]].length === 0) continue;
    const colLetter = XLSX.utils.encode_col(ci);
    const addr = XLSX.utils.encode_cell({ c: ci, r: totalExcelRow - 1 });
    wsRm[addr] = { f: `SUM(${colLetter}2:${colLetter}${totalExcelRow - 1})` };
  }

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
        cell.c = [{ a: "Nueva Acrópolis", t: lines.join("\n"), hidden: true }];
      }
    }
  }

  wsRm["!cols"] = allCats.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsRm, "RESUMEN MENSUAL");

  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `RESUMEN ${mesLabel} ${y}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
