import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchBcvQuarter } from "@/lib/bcv.functions";
import { useBcvRates, type BcvRates } from "@/lib/lists-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isoToFecha(iso: string): string {
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function TasasBcvTab({ bcv }: { bcv: ReturnType<typeof useBcvRates> }) {
  const fetchQuarter = useServerFn(fetchBcvQuarter);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState<string>(todayIso());
  const [nuevaTasa, setNuevaTasa] = useState<string>("");

  const cargarTrimestres = async () => {
    setLoadingAuto(true);
    let total = 0;
    const y = new Date().getFullYear();
    for (const q of [1, 2, 3, 4]) {
      try {
        const res = await fetchQuarter({ data: { year: y, quarter: q } });
        if (!res || !res.rows.length) continue;
        const nuevas: Record<string, number> = {};
        for (const r of res.rows) {
          if (!bcv.rates[r.isoDate]) nuevas[r.isoDate] = r.rate;
        }
        const c = Object.keys(nuevas).length;
        if (c) { bcv.merge(nuevas); total += c; }
      } catch { /* ignore */ }
    }
    toast.success(total ? `${total} tasas cargadas desde el BCV` : "No se encontraron nuevas tasas");
    setLoadingAuto(false);
  };

  const importarXls = async (file: File) => {
    setLoadingImport(true);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const encontradas: Record<string, number> = {};
      for (const sheetName of wb.SheetNames) {
        const m = sheetName.match(/^(\d{2})(\d{2})(\d{4})$/);
        if (!m) continue;
        const iso = `${m[3]}-${m[2]}-${m[1]}`;
        const ws = wb.Sheets[sheetName];
        const cell = ws["G15"];
        const rate = typeof cell?.v === "number" ? cell.v : Number(cell?.v);
        if (rate && rate > 1) encontradas[iso] = rate;
      }
      const cant = Object.keys(encontradas).length;
      if (cant) {
        bcv.merge(encontradas);
        toast.success(`${cant} tasas importadas desde ${file.name}`);
      } else {
        toast.error("No se encontraron tasas en G15. ¿Es el XLS del BCV?");
      }
    } catch (err) {
      toast.error(`Error al leer XLS: ${(err as Error).message}`);
    } finally {
      setLoadingImport(false);
    }
  };

  const agregarManual = () => {
    const r = Number(nuevaTasa);
    if (!r || r <= 0) { toast.error("Tasa inválida"); return; }
    bcv.set(nuevaFecha, r);
    setNuevaTasa("");
    toast.success("Tasa guardada");
  };

  const rows = Object.entries(bcv.rates).sort((a,b)=>b[0].localeCompare(a[0]));

  useEffect(() => {
    const cur = Object.keys(bcv.rates).filter((k) => !k.startsWith("2025"));
    bcv.clean((iso) => iso.startsWith("2025"));
    if (!cur.length) cargarTrimestres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tasas BCV (bolívares por dólar)</h2>
          <p className="text-xs text-muted-foreground">
            {rows.length} días cargados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={cargarTrimestres} disabled={loadingAuto} size="sm">
            {loadingAuto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar tasas
          </Button>
          <input type="file" id="importBcvXls" accept=".xls,.xlsx" style={{display:"none"}}
            onChange={async (e) => {
              const f = e.target.files?.[0]; if (f) await importarXls(f);
              e.target.value = "";
            }} />
          <Button variant="outline" size="sm" disabled={loadingImport}
            onClick={() => document.getElementById("importBcvXls")?.click()}>
            {loadingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar XLS
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
        <div>
          <label className="text-xs text-muted-foreground">Fecha</label>
          <input type="date" value={nuevaFecha} onChange={(e)=>setNuevaFecha(e.target.value)}
            className="block rounded border bg-background px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tasa Bs/$</label>
          <Input value={nuevaTasa} onChange={(e)=>setNuevaTasa(e.target.value)} className="w-32" placeholder="212.34" />
        </div>
        <Button onClick={agregarManual}><Plus className="mr-2 h-4 w-4" /> Guardar tasa</Button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Fecha</th>
              <th className="p-2 font-medium text-right">Tasa Bs/$</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([iso,r]) => (
              <tr key={iso} className="border-b last:border-0">
                <td className="p-2">{isoToFecha(iso)}</td>
                <td className="p-2 text-right tabular-nums">{r.toFixed(4)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={2} className="py-8 text-center text-muted-foreground">Sin tasas</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
