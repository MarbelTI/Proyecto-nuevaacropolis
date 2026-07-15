import XLSX from "xlsx";
const wb = XLSX.readFile("C:/Users/Asesor Comercial/Documents/NuevaAcropolis_v4.xlsx");
wb.SheetNames.forEach(n => {
  const ws = wb.Sheets[n];
  const ref = ws["!ref"] || "";
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log("--- Hoja:", n, "(" + ref + ") filas:", data.length);
  data.slice(0, 25).forEach((r,i) => console.log(i+1, JSON.stringify(r)));
  console.log();
});
