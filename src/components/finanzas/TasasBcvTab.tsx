import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchBcvQuarter } from "@/lib/bcv.functions";
import { getAccessToken } from "@/lib/supabase";
import { useBcvRates, type BcvRates, type BcvRateEntry } from "@/lib/lists-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, Plus, RefreshCw, Pencil, X } from "lucide-react";
import { formatTasa } from "@/lib/fees-logic";
import { toast } from "sonner";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoToFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function TasasBcvTab({ bcv }: { bcv: ReturnType<typeof useBcvRates> }) {
  const fetchQuarter = useServerFn(fetchBcvQuarter);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState<string>(todayIso());
  const [nuevaTasaDolar, setNuevaTasaDolar] = useState<string>("");
  const [nuevaTasaEuro, setNuevaTasaEuro] = useState<string>("");
  /** Fecha que se está corrigiendo desde el lápiz de la tabla, o null si el
   * formulario de arriba está en modo "cargar tasa nueva". */
  const [editandoIso, setEditandoIso] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const cargarTrimestres = async () => {
    setLoadingAuto(true);
    let total = 0;
    const y = new Date().getFullYear();
    const accessToken = await getAccessToken();
    for (const q of [1, 2, 3, 4]) {
      try {
        const res = await fetchQuarter({ data: { year: y, quarter: q, accessToken } });
        if (!res || !res.rows.length) continue;
        // Solo se completa lo que falte por fecha: si ya hay tasa dólar
        // guardada para ese día no se pisa, y lo mismo para la tasa euro por
        // separado — así una fecha puede tener el dólar cargado a mano y
        // recibir aquí solo el euro que faltaba.
        const nuevas: BcvRates = {};
        for (const r of res.rows) {
          const existente = bcv.rates[r.isoDate];
          const entry: BcvRateEntry = {};
          if (existente?.dolar == null && r.dolar != null) entry.dolar = r.dolar;
          if (existente?.euro == null && r.euro != null) entry.euro = r.euro;
          if (entry.dolar != null || entry.euro != null) nuevas[r.isoDate] = entry;
        }
        const c = Object.keys(nuevas).length;
        if (c) {
          bcv.merge(nuevas);
          total += c;
        }
      } catch {
        /* ignore */
      }
    }
    toast.success(
      total ? `${total} tasas cargadas desde el BCV` : "No se encontraron nuevas tasas",
    );
    setLoadingAuto(false);
  };

  const importarXls = async (file: File) => {
    setLoadingImport(true);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const encontradas: BcvRates = {};
      for (const sheetName of wb.SheetNames) {
        const m = sheetName.match(/^(\d{2})(\d{2})(\d{4})$/);
        if (!m) continue;
        const iso = `${m[3]}-${m[2]}-${m[1]}`;
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const cellUsd = ws["G15"];
        const dolar = typeof cellUsd?.v === "number" ? cellUsd.v : Number(cellUsd?.v);
        const cellEur = ws["G11"];
        const euro = typeof cellEur?.v === "number" ? cellEur.v : Number(cellEur?.v);
        const entry: BcvRateEntry = {};
        if (dolar && dolar > 1) entry.dolar = dolar;
        if (euro && euro > 1) entry.euro = euro;
        if (entry.dolar != null || entry.euro != null) encontradas[iso] = entry;
      }
      const cant = Object.keys(encontradas).length;
      if (cant) {
        bcv.merge(encontradas);
        toast.success(`${cant} tasas importadas desde ${file.name}`);
      } else {
        toast.error("No se encontraron tasas en G11/G15. ¿Es el XLS del BCV?");
      }
    } catch (err) {
      toast.error(`Error al leer XLS: ${(err as Error).message}`);
    } finally {
      setLoadingImport(false);
    }
  };

  const limpiarFormulario = () => {
    setEditandoIso(null);
    setNuevaFecha(todayIso());
    setNuevaTasaDolar("");
    setNuevaTasaEuro("");
  };

  const editarFila = (iso: string, entry: BcvRateEntry) => {
    setEditandoIso(iso);
    setNuevaFecha(iso);
    setNuevaTasaDolar(entry.dolar != null ? String(entry.dolar) : "");
    setNuevaTasaEuro(entry.euro != null ? String(entry.euro) : "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const agregarManual = () => {
    const d = nuevaTasaDolar.trim() ? Number(nuevaTasaDolar) : undefined;
    const e = nuevaTasaEuro.trim() ? Number(nuevaTasaEuro) : undefined;
    if (d == null && e == null) {
      toast.error("Cargá al menos una tasa (dólar o euro)");
      return;
    }
    if ((d != null && (!d || d <= 0)) || (e != null && (!e || e <= 0))) {
      toast.error("Tasa inválida");
      return;
    }
    const partial: { dolar?: number; euro?: number } = {};
    if (d != null) partial.dolar = d;
    if (e != null) partial.euro = e;
    bcv.set(nuevaFecha, partial);
    toast.success(editandoIso ? "Tasa corregida" : "Tasa guardada");
    limpiarFormulario();
  };

  const rows = Object.entries(bcv.rates).sort((a, b) => b[0].localeCompare(a[0]));

  // Sin tasas guardadas, se traen las del BCV al abrir la pestaña.
  //
  // Aquí había además un bcv.clean(iso => iso.startsWith("2025")) que borraba
  // TODAS las tasas de 2025. Era una limpieza pensada para ejecutarse una vez,
  // pero corría en cada montaje del componente, y Radix desmonta la pestaña
  // cada vez que se sale de ella: quien importaba el XLS de 2025 lo perdía al
  // volver, y los movimientos de ese año se quedaban sin tasa.
  useEffect(() => {
    if (!Object.keys(bcv.rates).length) cargarTrimestres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tasas BCV (bolívares por dólar y por euro)</h2>
          <p className="text-xs text-muted-foreground">{rows.length} días cargados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={cargarTrimestres} disabled={loadingAuto} size="sm">
            {loadingAuto ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar tasas
          </Button>
          <input
            type="file"
            id="importBcvXls"
            accept=".xls,.xlsx"
            style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await importarXls(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={loadingImport}
            onClick={() => document.getElementById("importBcvXls")?.click()}
          >
            {loadingImport ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Importar XLS
          </Button>
        </div>
      </div>

      <div ref={formRef} className="mb-4 rounded-lg border bg-muted/30 p-3">
        {editandoIso && (
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="rounded bg-amber-500/20 px-2 py-1 font-medium text-amber-700 dark:text-amber-400">
              Editando tasa del {isoToFecha(editandoIso)}
            </span>
            <button
              type="button"
              onClick={limpiarFormulario}
              className="flex items-center gap-1 text-muted-foreground underline hover:text-foreground"
            >
              <X className="h-3 w-3" /> Cancelar
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Fecha</label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="block rounded border bg-background px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tasa Bs/$</label>
            <Input
              value={nuevaTasaDolar}
              onChange={(e) => setNuevaTasaDolar(e.target.value)}
              className="w-32"
              placeholder="212.34"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tasa Bs/€</label>
            <Input
              value={nuevaTasaEuro}
              onChange={(e) => setNuevaTasaEuro(e.target.value)}
              className="w-32"
              placeholder="230.50"
            />
          </div>
          <Button onClick={agregarManual}>
            <Plus className="mr-2 h-4 w-4" /> {editandoIso ? "Actualizar tasa" : "Guardar tasa"}
          </Button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        <table className="mx-auto w-full max-w-lg text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-center text-muted-foreground">
              <th className="p-2 font-medium">Fecha</th>
              <th className="p-2 font-medium">Tasa Bs/$</th>
              <th className="p-2 font-medium">Tasa Bs/€</th>
              <th className="p-2 font-medium" aria-label="Editar" />
            </tr>
          </thead>
          <tbody>
            {rows.map(([iso, r]) => (
              <tr key={iso} className="border-b text-center last:border-0">
                <td className="p-2">{isoToFecha(iso)}</td>
                {/* Dos decimales, los mismos con los que se guarda la tasa.
                    Mostrar cuatro daba la impresión de una precisión que el
                    cálculo no usa: el monto en dólares sale de la tasa
                    redondeada. */}
                <td className="p-2 tabular-nums">{r.dolar != null ? formatTasa(r.dolar) : "—"}</td>
                <td className="p-2 tabular-nums">{r.euro != null ? formatTasa(r.euro) : "—"}</td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => editarFila(iso, r)}
                    title={`Corregir la tasa del ${isoToFecha(iso)}`}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  Sin tasas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
