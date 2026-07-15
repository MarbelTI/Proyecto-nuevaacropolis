import XLSX from "xlsx";
const wb = XLSX.readFile("C:/Users/Asesor Comercial/Documents/Proyecto-nuevaacropolis/margelys ingresos - egresos junio26.xlsx");
const names = wb.SheetNames;
names.forEach(n => {
  const ws = wb.Sheets[n];
  const ref = ws["!ref"] || "";
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log("--- Hoja:", n, "(" + ref + ")");
  data.slice(0, 20).forEach((r,i) => console.log(i+1, JSON.stringify(r)));
  console.log("... total filas:", data.length);
  console.log();
});
