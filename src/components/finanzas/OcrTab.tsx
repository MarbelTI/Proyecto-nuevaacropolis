import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeJournalImage, type Entry } from "@/lib/ocr.functions";
import {
  bcvRateFor,
  useTransactions,
  type Student,
} from "@/lib/lists-store";
import {
  calcularMontoUsd,
  TASA_PESOS_DEFAULT,
} from "@/lib/fees-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Upload, Plus, Trash2, Save, X,
} from "lucide-react";
import { toast } from "sonner";

// ------------------------- Utilidades -------------------------

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2,"0"); const mm = m[2].padStart(2,"0");
  let yy = m[3] ?? String(new Date().getFullYear()); if (yy.length===2) yy = "20"+yy;
  return `${yy}-${mm}-${dd}`;
}

function emptyEntry(): Entry {
  return { fecha:"", mes:"", tipo:"Ingreso", categoria:"", descripcion:"",
    mensualidad:"", moneda:"USD", monto:"", tasa:"", montoUsd:"" };
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject; r.readAsDataURL(file);
  });
}

/** Aplica reglas: pesos → tasa 4000 por defecto; bolívares → tasa BCV del día; recalcula USD. */
function normalizeMoneyRow<T extends { fecha:string; moneda:string; monto:string; tasa:string; montoUsd:string }>(
  row: T, bcvRates: Record<string, number>,
): T {
  const next = { ...row };
  if (next.moneda === "Pesos" && (!next.tasa || Number(next.tasa) === 0)) {
    next.tasa = String(TASA_PESOS_DEFAULT);
  }
  if (next.moneda === "Bolívares" && (!next.tasa || Number(next.tasa) === 0)) {
    const iso = fechaToIso(next.fecha);
    if (iso) {
      const r = bcvRateFor(bcvRates, iso);
      if (r != null) next.tasa = String(r);
    }
  }
  const montoNum = Number(next.monto) || 0;
  const tasaNum = next.tasa ? Number(next.tasa) : null;
  next.montoUsd = String(calcularMontoUsd(next.moneda, montoNum, tasaNum));
  return next;
}

type PreviewItem = { name: string; url: string; status: "pending"|"processing"|"ok"|"error"; count: number };

// ------------------------- Componentes -------------------------

function EntriesTable({
  entries, ingresos, gastos, updateEntry, duplicateRow, removeRow,
}: {
  entries: Entry[]; ingresos: string[]; gastos: string[];
  updateEntry: <K extends keyof Entry>(i:number, f:K, v:Entry[K]) => void;
  duplicateRow: (i:number) => void; removeRow: (i:number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {["Fecha","Mes","Tipo","Categoría","Descripción","Mens.","Moneda","Monto","Tasa","USD",""].map((h) => (
              <th key={h} className="p-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e,i) => {
            const cats = e.tipo === "Gasto" ? gastos : ingresos;
            return (
              <tr key={i} className="border-b last:border-0 align-top">
                <td className="p-1"><Input value={e.fecha} onChange={(x)=>updateEntry(i,"fecha",x.target.value)} className="h-9 w-28" /></td>
                <td className="p-1"><Input value={e.mes} onChange={(x)=>updateEntry(i,"mes",x.target.value)} className="h-9 w-24" /></td>
                <td className="p-1">
                  <Select value={e.tipo||"Ingreso"} onValueChange={(v)=>updateEntry(i,"tipo",v as Entry["tipo"])}>
                    <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Ingreso">Ingreso</SelectItem><SelectItem value="Gasto">Gasto</SelectItem></SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Select value={e.categoria||undefined} onValueChange={(v)=>updateEntry(i,"categoria",v)}>
                    <SelectTrigger className="h-9 w-40"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{cats.map((c)=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-1"><Input value={e.descripcion} onChange={(x)=>updateEntry(i,"descripcion",x.target.value)} className="h-9 min-w-[200px]" /></td>
                <td className="p-1"><Input value={e.mensualidad} onChange={(x)=>updateEntry(i,"mensualidad",x.target.value)} className="h-9 w-24" placeholder="abr-2026" /></td>
                <td className="p-1">
                  <Select value={e.moneda||undefined} onValueChange={(v)=>updateEntry(i,"moneda",v as Entry["moneda"])}>
                    <SelectTrigger className="h-9 w-28"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="Bolívares">Bolívares</SelectItem>
                      <SelectItem value="Pesos">Pesos</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1"><Input value={e.monto} onChange={(x)=>updateEntry(i,"monto",x.target.value)} className="h-9 w-24" /></td>
                <td className="p-1"><Input value={e.tasa} onChange={(x)=>updateEntry(i,"tasa",x.target.value)} className="h-9 w-24" /></td>
                <td className="p-1"><Input value={e.montoUsd} readOnly className="h-9 w-24 bg-muted/40" title="Calculado automáticamente" /></td>
                <td className="p-1">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" onClick={()=>duplicateRow(i)}><Plus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={()=>removeRow(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OcrTab({
  ingresos, gastos, bcvRates, students, transactions,
}: {
  ingresos: string[];
  gastos: string[];
  bcvRates: Record<string, number>;
  students: Student[];
  transactions: ReturnType<typeof useTransactions>;
}) {
  const analyze = useServerFn(analyzeJournalImage);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{done:number;total:number}>({done:0,total:0});
  const [entries, setEntries] = useState<Entry[]>([]);

  const processFiles = async (files: File[]) => {
    const newItems: PreviewItem[] = await Promise.all(files.map(async (f) => ({
      name: f.name, url: await fileToDataUrl(f), status: "pending" as const, count: 0,
    })));
    const startIndex = previews.length;
    setPreviews((p) => [...p, ...newItems]);
    setLoading(true);
    setProgress({ done: 0, total: files.length });

    let okCount = 0, errCount = 0, zeroCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const idx = startIndex + i;
        setPreviews((p) => p.map((x,j) => j===idx ? { ...x, status:"processing" } : x));
        try {
          const base64 = newItems[i].url.split(",")[1];
          if (!base64) throw new Error("No se pudo leer la imagen");
          const result = await analyze({
            data: {
              imageBase64: base64, mimeType: f.type || "image/jpeg", ingresos, gastos,
              students: students.filter((s) => s.actividad !== "Retirado")
                .map((s) => ({ nombre: s.nombre, aulas: s.aulas })),
            },
          });
          const normalized = (result.entries ?? []).map((e) => normalizeMoneyRow(e, bcvRates));
          setEntries((prev) => [...prev, ...normalized]);
          setPreviews((p) => p.map((x,j) => j===idx ? { ...x, status:"ok", count: normalized.length } : x));
          if (normalized.length === 0) {
            zeroCount++;
            toast.warning(`Foto ${idx+1} (${f.name}): no se detectaron filas. Revisa o reintenta.`);
          } else {
            okCount++;
          }
        } catch (err) {
          console.error("OCR error on", f.name, err);
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Foto ${idx+1} (${f.name}): ${msg}`, { duration: 8000 });
          setPreviews((p) => p.map((x,j) => j===idx ? { ...x, status:"error" } : x));
          errCount++;
        }
        setProgress({ done: i+1, total: files.length });
      }
    } finally {
      setLoading(false);
    }
    if (okCount > 0) toast.success(`${okCount} foto(s) OK${zeroCount?`, ${zeroCount} sin filas`:""}${errCount?`, ${errCount} con error`:""}`);
    else if (errCount) toast.error(`Ninguna foto se procesó (${errCount} con error). Reintenta.`);
  };

  const cancelarCarga = () => {
    setLoading(false);
    setPreviews((p) => p.map((x) => x.status === "processing" || x.status === "pending" ? { ...x, status: "error" as const } : x));
    toast.info("Carga reiniciada. Puedes volver a subir fotos.");
  };

  const handleFiles = async (files: FileList) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) { toast.error("Selecciona al menos una imagen"); return; }
    await processFiles(arr);
  };

  const removePreview = (idx: number) => setPreviews((p) => p.filter((_,i) => i!==idx));
  const updateEntry = <K extends keyof Entry>(i: number, field: K, value: Entry[K]) => {
    setEntries((e) => e.map((row, idx) => {
      if (idx !== i) return row;
      const next = { ...row, [field]: value } as Entry;
      if (field === "tipo") {
        const valid = value === "Ingreso" ? ingresos : gastos;
        if (next.categoria && !valid.includes(next.categoria)) next.categoria = "";
      }
      if (field === "moneda" || field === "monto" || field === "tasa" || field === "fecha") {
        return normalizeMoneyRow(next, bcvRates);
      }
      return next;
    }));
  };
  const addRow = () => setEntries((e) => [...e, emptyEntry()]);
  const duplicateRow = (i: number) => setEntries((e) => {
    const c = [...e]; c.splice(i+1, 0, { ...e[i] }); return c;
  });
  const removeRow = (i: number) => setEntries((e) => e.filter((_,idx) => idx!==i));
  const clearOcr = () => {
    if (confirm("¿Vaciar el lector (fotos y entradas)?")) { setEntries([]); setPreviews([]); }
  };

  const guardarEnTransacciones = () => {
    if (!entries.length) return;
    transactions.append(
      entries.map((e) => ({
        fecha:e.fecha, mes:e.mes, tipo:e.tipo, categoria:e.categoria,
        descripcion:e.descripcion, mensualidad:e.mensualidad, moneda:e.moneda,
        monto: Number(e.monto) || 0,
        tasa: e.tasa ? Number(e.tasa) : null,
        montoUsd: Number(e.montoUsd) || 0,
        banco:"",
      })),
    );
    setEntries([]); setPreviews([]);
    toast.success(`${entries.length} transacciones guardadas`);
  };

  return (
    <>
      <Card className="p-6">
        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-secondary p-8 text-center transition hover:bg-accent/20">
          <input type="file" accept="image/*" multiple
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value=""; }}
            disabled={loading} />
          <Upload className="mb-3 h-10 w-10 text-primary" />
          <h3 className="font-semibold">
            {previews.length===0 ? "Arrastra o haz clic para subir imágenes" : "Agregar más fotos"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Se procesan una por una en orden y las filas se agregan debajo de las anteriores.
          </p>
        </label>

        {previews.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((p,i) => (
              <div key={i} className="relative rounded-lg border p-2">
                <img src={p.url} alt={p.name} className="h-32 w-full rounded object-cover" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="truncate" title={p.name}>{i+1}. {p.name}</span>
                  <span>
                    {p.status==="pending" && <span className="text-muted-foreground">…</span>}
                    {p.status==="processing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {p.status==="ok" && <span className="font-medium text-primary">✓ {p.count}</span>}
                    {p.status==="error" && <span className="text-destructive">✗</span>}
                  </span>
                </div>
                {!loading && (
                  <button onClick={() => removePreview(i)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analizando foto {progress.done+1} de {progress.total}…
            <Button variant="ghost" size="sm" onClick={cancelarCarga}>Cancelar</Button>
          </div>
        )}
      </Card>

      {entries.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Entradas extraídas ({entries.length})</h2>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={clearOcr}>Vaciar</Button>
              <Button variant="outline" onClick={addRow}><Plus className="mr-2 h-4 w-4" /> Fila</Button>
              <Button onClick={guardarEnTransacciones}>
                <Save className="mr-2 h-4 w-4" /> Guardar en Transacciones
              </Button>
            </div>
          </div>
          <EntriesTable
            entries={entries} ingresos={ingresos} gastos={gastos}
            updateEntry={updateEntry} duplicateRow={duplicateRow} removeRow={removeRow}
          />
        </Card>
      )}
    </>
  );
}
