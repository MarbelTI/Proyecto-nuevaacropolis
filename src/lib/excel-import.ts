import * as XLSX from "xlsx";
import type { Transaction } from "./lists-store";

export function parseExcelToTransactions(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const mapped: Transaction[] = rows.map((r) => ({
          id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          fecha: String(r.Fecha || r.fecha || ""),
          mes: String(r.Mes || r.mes || ""),
          tipo: (String(r.Tipo || r.tipo || "Ingreso") === "Gasto" ? "Gasto" : "Ingreso") as "Ingreso" | "Gasto",
          categoria: String(r.Categoria || r.Categoría || r.categoria || ""),
          descripcion: String(r.Descripcion || r.Descripción || r.descripcion || ""),
          mensualidad: String(r.Mensualidad || r.mensualidad || ""),
          moneda: (String(r.Moneda || r.moneda || "USD") === "Bolívares" ? "Bolívares" : String(r.Moneda || r.moneda || "USD") === "Pesos" ? "Pesos" : "USD") as "USD" | "Bolívares" | "Pesos",
          monto: Number(r.Monto || r.monto || 0) || 0,
          tasa: (() => { const v = r["Tasa cambio"] || r["Tasa"] || r.tasa; return v ? Number(v) : null; })(),
          montoUsd: Number(r["Monto USD"] || r["USD"] || r.montoUsd || 0) || 0,
          banco: String(r.Banco || r.banco || ""),
        }));
        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsArrayBuffer(file);
  });
}
