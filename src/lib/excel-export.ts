import * as XLSX from "xlsx";
import type { Student, Transaction } from "./lists-store";
import { hoyVenezuela, anioVenezuela } from "./formato";

/** Lo que puede haber en una celda: un rótulo, un importe, o nada. */
type CeldaHoja = string | number | null;

const todayIso = hoyVenezuela;

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const [, d = "", mo = "", a] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  let yy = a ?? anioVenezuela();
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

function serialDate(iso: string): number {
  const d = new Date(iso);
  const excelEpoch = new Date(1899, 11, 30);
  return (d.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000);
}

export function exportTransactionsExcel(transactions: Transaction[]): void {
  if (!transactions.length) return;
  const ws = XLSX.utils.json_to_sheet(
    transactions.map((r) => ({
      Fecha: r.fecha,
      Mes: r.mes,
      Tipo: r.tipo,
      Categoría: r.categoria,
      Descripción: r.descripcion,
      Mensualidad: r.mensualidad,
      Moneda: r.moneda,
      Banco: r.banco,
      Monto: r.monto,
      "Tasa cambio": r.tasa,
      "Monto USD": r.montoUsd,
      Revisar: r.revisar,
    })),
  );
  ws["!cols"] = [
    { wch: 11 },
    { wch: 10 },
    { wch: 9 },
    { wch: 18 },
    { wch: 35 },
    { wch: 11 },
    { wch: 11 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 40 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
  XLSX.writeFile(wb, `TRANSACCIONES_${todayIso()}.xlsx`);
}

/**
 * Exporta el padrón completo, en el MISMO formato que lee "Importar Excel".
 *
 * Esto último no es un detalle: el importador (`parseExcelToStudents`) no mira
 * las columnas de una hoja cualquiera, busca hojas llamadas **BD_Temporal** y
 * **Ficha** — los nombres del Excel de asistencia del que salió el padrón. Una
 * exportación con la hoja llamada de otra forma no da error al importarla:
 * simplemente no entra ningún alumno. Por eso se replican esos dos nombres y
 * las cabeceras exactas que busca, y por eso conviene no "ordenar" este archivo
 * renombrando hojas o columnas sin mirar antes el importador.
 *
 * Tres cosas del resultado que no son fallos:
 *
 * - Si quien exporta tiene rol `finanzas` o `celador`, las columnas de la Ficha
 *   (cédula, correo, dirección, ocupación…) saldrán VACÍAS. No es que falten los
 *   datos: es que el servidor no se los envía a esos roles. Sale completo con
 *   `celador_estudios` o `super_admin`.
 * - La hoja **Cuotas** es solo para leer: el importador no la mira. Tampoco la
 *   pisa, así que las cuotas especiales sobreviven a un reimporte — pero si
 *   editas ahí un importe, no entrará. Eso se toca en "Cuotas especiales".
 * - `BD_Temporal` escribe UNA aula por persona, porque es una columna y así la
 *   lee el importador. Quien esté en dos aulas conserva la primera; el resto se
 *   deja escrito en la hoja Cuotas para que al menos no se pierda de vista.
 */
export function exportStudentsExcel(students: Student[]): void {
  if (!students.length) return;
  const wb = XLSX.utils.book_new();

  // --- Hoja 1: BD_Temporal (nombre, aula, condición, actividad, teléfono) ---
  const bd = XLSX.utils.json_to_sheet(
    students.map((s) => ({
      "Nombre del Alumno": s.nombre,
      Aula: s.aulas[0] ?? "",
      Celador: s.celadorNombre ?? "",
      Condicion: s.condicion ?? "",
      Actividad: s.actividad ?? "",
      Telefono: s.telefono ?? "",
    })),
  );
  bd["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 14 }];
  bd["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, bd, "BD_Temporal");

  // --- Hoja 2: Ficha (datos personales) ---
  // Las cabeceras van con el texto largo del formulario original porque el
  // importador las busca por subcadena: "ingreso al probacionismo",
  // "hizo miembro", "recibio de ffvv"… Acortarlas las rompe en silencio.
  const ficha = XLSX.utils.json_to_sheet(
    students.map((s) => ({
      "Nombre y Apellido :": s.nombre,
      "Indique su Documento de Identificación:": s.cedula ?? "",
      "Teléfono:": s.telefono ?? "",
      "Ocupación u oficio:": s.ocupacion ?? "",
      "Habilidades:": s.habilidades ?? "",
      "Correo electrónico:": s.correo ?? "",
      "Dirección:": s.direccion ?? "",
      "Redes sociales:": s.redesSociales ?? "",
      "Fecha de ingreso al probacionismo:": s.fechaIngreso ?? "",
      "Fecha en que se hizo miembro:": s.fechaMiembro ?? "",
      "Grado de participación:": s.gradoParticipacion ?? "",
      "Fecha en que se recibió de FFVV:": s.fechaFfvv ?? "",
      "Sede en la que participa:": s.sede ?? "",
      "Nombre del curso:": s.aulas[0] ?? "",
      "Instructor:": s.instructor ?? "",
      "Celador:": s.celadorNombre ?? "",
      "Horario:": s.horario ?? "",
      "Materias en curso:": s.materias ?? "",
      "Condicion dentro de la escuela": s.condicion ?? "",
      Estatus: s.actividad ?? "",
    })),
  );
  ficha["!cols"] = [
    { wch: 28 },
    { wch: 22 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 },
    { wch: 28 },
    { wch: 30 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 24 },
    { wch: 22 },
    { wch: 12 },
  ];
  ficha["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ficha, "Ficha");

  // --- Hoja 3: Cuotas (referencia; el importador no la lee) ---
  const cuotas = XLSX.utils.json_to_sheet(
    students.map((s) => ({
      Nombre: s.nombre,
      "Todas las aulas": s.aulas.join(", "),
      // "" y no 0 cuando no hay override: un 0 aquí significaría "esta persona
      // está becada", que es muy distinto de "paga lo que le toca por su aula".
      "Cuota fija USD": s.cuotaOverride ?? "",
      "Cuotas temporales": (s.cuotaOverridesTemporales ?? [])
        .map(
          (c) =>
            `${c.cuotaUsd} USD ${c.desde}${c.hasta ? `..${c.hasta}` : " en adelante"}${c.nota ? ` (${c.nota})` : ""}`,
        )
        .join(" · "),
      Id: s.id ?? "",
    })),
  );
  cuotas["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 40 }, { wch: 38 }];
  cuotas["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, cuotas, "Cuotas");

  XLSX.writeFile(wb, `ALUMNOS_${todayIso()}.xlsx`);
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
  const meses = [
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
  const ym = `${y}-${String(m).padStart(2, "0")}`;
  const mesLabel = meses[m - 1];

  const monthTx = transactions.filter((t) => {
    const iso = fechaToIso(t.fecha);
    return iso && iso.slice(0, 7) === ym;
  });

  // Una misma categoría puede existir en las dos listas (ej. "MTC" como
  // ingreso de las consultas y como gasto de sus materiales). Antes eso
  // generaba dos columnas con el mismo nombre "MTC" que además leían del
  // mismo `catData["MTC"]" — la misma mezcla de datos duplicada en las dos.
  // Aquí se distingue con "(Ingreso)"/"(Gasto)" SOLO cuando el nombre choca;
  // el resto de categorías conserva su columna tal como antes.
  const nombresRepetidos = new Set(ingresos.filter((c) => gastos.includes(c)));
  const colKey = (cat: string, tipo: "Ingreso" | "Gasto") =>
    nombresRepetidos.has(cat) ? `${cat} (${tipo})` : cat;

  type Entry = { monto: number; desc: string; fecha: string; mes: string };
  const catData: Record<string, Entry[]> = {};

  const cargarCategoria = (cat: string, tipo: "Ingreso" | "Gasto") => {
    const entries: Entry[] = [];
    for (const t of monthTx) {
      if (t.tipo !== tipo) continue;
      const tcat = t.categoria || "(sin categoría)";
      if (tcat === "CONVERSIÓN" || tcat !== cat) continue;
      const monto = Number(t.montoUsd) || 0;
      entries.push({
        monto: tipo === "Gasto" ? -Math.abs(monto) : Math.abs(monto),
        desc: t.descripcion || "",
        fecha: t.fecha,
        mes: t.mensualidad || "",
      });
    }
    catData[colKey(cat, tipo)] = entries;
  };
  for (const cat of ingresos) cargarCategoria(cat, "Ingreso");
  for (const cat of gastos) cargarCategoria(cat, "Gasto");

  const allCats = [
    ...ingresos.map((c) => colKey(c, "Ingreso")),
    ...gastos.map((c) => colKey(c, "Gasto")),
  ];

  // Una categoría sin movimientos no tiene entrada en catData. Antes se leía
  // `catData[cat].length` a pelo y bastaba una categoría nueva sin usar para
  // reventar la exportación entera.
  const filas = (cat: string) => catData[cat] ?? [];

  const maxRecords = Math.max(0, ...allCats.map((c) => filas(c).length));

  // Una hoja de cálculo es una rejilla de celdas sueltas: texto en las
  // cabeceras, números en los importes y null donde esa categoría no llega.
  const rm: CeldaHoja[][] = [];

  // Fila 1: encabezados de categoría
  rm.push([...allCats]);

  // Filas de datos
  for (let r = 0; r < maxRecords; r++) {
    rm.push(allCats.map((cat) => filas(cat)[r]?.monto ?? null));
  }

  // Fila de totales (valores null, se reemplazan por fórmula después)
  rm.push(allCats.map(() => null));

  // 5 filas en blanco
  for (let i = 0; i < 5; i++) rm.push([]);

  // Resumen: nombre de categoría + total
  for (const cat of allCats) {
    const total = filas(cat).reduce((s, e) => s + e.monto, 0);
    if (total !== 0) {
      rm.push([cat, null, null, null, total]);
    } else {
      rm.push([cat]);
    }
  }

  // Gran total: ingresos en col E, egresos en col F
  const totalIngMes = ingresos.reduce((s, cat) => {
    const t = filas(colKey(cat, "Ingreso")).reduce((s2, e) => s2 + e.monto, 0);
    return s + (t > 0 ? t : 0);
  }, 0);
  const totalGasMes = gastos.reduce((s, cat) => {
    const t = filas(colKey(cat, "Gasto")).reduce((s2, e) => s2 + e.monto, 0);
    return s + (t < 0 ? Math.abs(t) : 0);
  }, 0);
  rm.push([]);
  rm.push([null, null, null, null, totalIngMes, Math.abs(totalGasMes)]);

  const totalExcelRow = maxRecords + 2; // 1-indexed (fila 1 = header, filas 2.. = datos, siguiente = totales)

  const wsRm = XLSX.utils.aoa_to_sheet(rm);

  // Asignar fórmula SUM a la fila de totales
  for (let ci = 0; ci < allCats.length; ci++) {
    if (filas(allCats[ci] ?? "").length === 0) continue;
    const colLetter = XLSX.utils.encode_col(ci);
    const addr = XLSX.utils.encode_cell({ c: ci, r: totalExcelRow - 1 });
    wsRm[addr] = { f: `SUM(${colLetter}2:${colLetter}${totalExcelRow - 1})` };
  }

  // Añadir notas (comentarios) con fecha + descripción en cada celda de dato
  for (let c = 0; c < allCats.length; c++) {
    const entries = filas(allCats[c] ?? "");
    for (let r = 0; r < entries.length; r++) {
      const fila = entries[r];
      if (!fila) continue;
      const addr = XLSX.utils.encode_cell({ c, r: r + 1 });
      const cell = wsRm[addr];
      if (cell) {
        const lines = [fila.fecha];
        if (fila.mes) lines.push(fila.mes);
        if (fila.desc) lines.push(fila.desc);
        // El indicador de oculto va en el ARRAY de comentarios, no dentro de
        // cada comentario. Puesto en el objeto —como estaba— SheetJS lo ignora
        // al escribir el archivo y Excel abre la hoja con todas las notas
        // desplegadas encima de los datos, tapando las cifras.
        const notas: { a: string; t: string }[] & { hidden?: boolean } = [
          { a: "Nueva Acrópolis", t: lines.join("\n") },
        ];
        notas.hidden = true;
        cell.c = notas;
      }
    }
  }

  wsRm["!cols"] = allCats.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsRm, "RESUMEN MENSUAL");

  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
  const dataUri =
    "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + wbOut;
  const a = document.createElement("a");
  a.href = dataUri;
  a.download = `RESUMEN ${mesLabel} ${y}.xlsx`;
  a.click();
}

function saldoAcumuladoAntes(transactions: Transaction[], year: number, month: number): number {
  let saldo = 0;
  const ymLimite = `${year}-${String(month).padStart(2, "0")}`;
  for (const t of transactions) {
    const iso = fechaToIso(t.fecha);
    if (!iso) continue;
    if (iso.slice(0, 7) >= ymLimite) continue;
    if (t.categoria === "CONVERSIÓN") continue;
    const usd = Number(t.montoUsd) || 0;
    if (t.tipo === "Ingreso") saldo += Math.abs(usd);
    else if (t.tipo === "Gasto") saldo -= Math.abs(usd);
  }
  return saldo;
}

export function exportInformeOina(
  transactions: Transaction[],
  year: number,
  month: number,
  ingresos: string[],
  gastos: string[],
): void {
  const meses = [
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
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const mesLabel = meses[month - 1];

  const monthTx = transactions.filter((t) => {
    const iso = fechaToIso(t.fecha);
    return iso && iso.slice(0, 7) === ym;
  });

  const saldoAnterior = saldoAcumuladoAntes(transactions, year, month);

  type CatTotal = { debe: number; haber: number };
  const cats: Record<string, CatTotal> = {};

  for (const cat of ingresos) cats[cat] = { debe: 0, haber: 0 };
  for (const cat of gastos) cats[cat] = { debe: 0, haber: 0 };

  for (const t of monthTx) {
    const cat = t.categoria || "(sin categoría)";
    if (cat === "CONVERSIÓN") continue;
    if (!cats[cat]) cats[cat] = { debe: 0, haber: 0 };
    const usd = Number(t.montoUsd) || 0;
    if (t.tipo === "Ingreso") cats[cat].debe += Math.abs(usd);
    else if (t.tipo === "Gasto") cats[cat].haber += Math.abs(usd);
  }

  const entries = Object.entries(cats).filter(([_, v]) => v.debe > 0 || v.haber > 0);
  const totalDebe = entries.reduce((s, [_, v]) => s + v.debe, 0);
  const totalHaber = entries.reduce((s, [_, v]) => s + v.haber, 0);

  const fmtNum = '#,##0.00;(#,##0.00);"-"';
  const fmtPct = '0.0%;(0.0%);"-"';

  const rm: CeldaHoja[][] = [];
  rm.push(["Informe OINA — " + mesLabel + " " + year]);
  rm.push([]);
  rm.push(["CUENTAS", "DEBE", "HABER", "ACUMULADO", "% DEBE", "% HABER"]);
  rm.push(["Saldo del mes anterior", 0, 0, saldoAnterior, "", ""]);

  let acumulado = saldoAnterior;
  for (const [cat, v] of entries) {
    acumulado += v.debe - v.haber;
    const pctDe = totalDebe > 0 ? v.debe / totalDebe : 0;
    const pctHa = totalHaber > 0 ? v.haber / totalHaber : 0;
    rm.push([cat, v.debe, v.haber, acumulado, pctDe, pctHa]);
  }

  rm.push([]);
  const totalAcum = saldoAnterior + totalDebe - totalHaber;
  rm.push(["TOTALES", totalDebe, totalHaber, totalAcum, 1, 1]);
  rm.push([]);
  rm.push([
    "Debe (Ingresos) - Haber (Gastos) = Diferencia",
    "",
    "",
    totalDebe - totalHaber,
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rm);
  ws["!cols"] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];

  // Aplicar formato de número a las celdas
  for (let r = 0; r < rm.length; r++) {
    for (let c = 1; c <= 5; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") {
        cell.z = c >= 4 ? fmtPct : fmtNum;
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "OINA");

  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
  const dataUri =
    "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + wbOut;
  const a = document.createElement("a");
  a.href = dataUri;
  a.download = `OINA_${mesLabel}_${year}.xlsx`;
  a.click();
}
