import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeJournalImage, type Entry } from "@/lib/ocr.functions";
import { aNumero, aDosDecimales, CELDA_NUMERO } from "@/lib/formato";
import { bcvRateFor, firmaTransaccion, useTransactions, type Student } from "@/lib/lists-store";
import { calcularMontoUsd, redondearTasa, TASA_PESOS_DEFAULT } from "@/lib/fees-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

// ------------------------- Utilidades -------------------------

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

function emptyEntry(): Entry {
  const d = new Date();
  const h = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return {
    fecha: h,
    mes: "",
    tipo: "Ingreso",
    categoria: "",
    descripcion: "",
    mensualidad: "",
    moneda: "USD",
    monto: "",
    tasa: "",
    montoUsd: "",
  };
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Aplica reglas: pesos → tasa 4000 por defecto; bolívares → tasa BCV del día; recalcula USD. */
function normalizeMoneyRow<
  T extends { fecha: string; moneda: string; monto: string; tasa: string; montoUsd: string },
>(row: T, bcvRates: Record<string, number>): T {
  // Las cifras de esta tabla viajan como TEXTO: es lo que devuelve el modelo y
  // es lo que se escribe a mano encima. Se leen siempre con aNumero, nunca con
  // Number(): Number("1.234,56") es NaN y acababa entrando como 0 sin avisar,
  // que es justo lo que no puede pasar en un libro contable.
  const next = { ...row };
  if (next.moneda === "Pesos" && aNumero(next.tasa) === 0) {
    next.tasa = TASA_PESOS_DEFAULT.toFixed(2);
  }
  if (next.moneda === "Bolívares" && aNumero(next.tasa) === 0) {
    const iso = fechaToIso(next.fecha);
    if (iso) {
      const r = bcvRateFor(bcvRates, iso);
      if (r != null) next.tasa = r.toFixed(2);
    }
  }
  // La tasa se guarda siempre con 2 decimales (venga del BCV o escrita a mano),
  // y el monto en USD se calcula con esa misma tasa redondeada.
  const tasaNum = redondearTasa(next.tasa ? aNumero(next.tasa) : null);
  if (tasaNum != null) next.tasa = tasaNum.toFixed(2);
  const montoNum = aNumero(next.monto);
  next.montoUsd = calcularMontoUsd(next.moneda, montoNum, tasaNum).toFixed(2);
  return next;
}

export type PreviewItem = {
  name: string;
  url: string;
  status: "pending" | "processing" | "ok" | "error";
  count: number;
};

// Un mes tiene como máximo 7 hojas del libro diario — límite duro para no
// disparar el costo de la API de IA por error (ej. seleccionar la carpeta entera).
const MAX_IMAGENES = 7;

// ------------------------- Componentes -------------------------

function EntriesTable({
  entries,
  ingresos,
  gastos,
  updateEntry,
  duplicateRow,
  removeRow,
  duplicados,
  problemas,
}: {
  entries: Entry[];
  ingresos: string[];
  gastos: string[];
  updateEntry: <K extends keyof Entry>(i: number, f: K, v: Entry[K]) => void;
  duplicateRow: (i: number) => void;
  removeRow: (i: number) => void;
  /** Índices de filas que ya existen en Transacciones o están repetidas aquí. */
  duplicados: Set<number>;
  /** Índice → qué está mal leído en esa fila. */
  problemas: Map<number, string[]>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {[
              "Fecha",
              "Mes",
              "Tipo",
              "Categoría",
              "Descripción",
              "Mens.",
              "Moneda",
              "Monto",
              "Tasa",
              "USD",
              "",
            ].map((h) => (
              <th key={h} className="p-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const cats = e.tipo === "Gasto" ? gastos : ingresos;
            const esDup = duplicados.has(i);
            // El ámbar (mal leído) manda sobre el rosado (duplicada): de nada
            // sirve saber que está repetida si además está mal.
            const fallos = problemas.get(i);
            return (
              <tr
                key={i}
                className={
                  "border-b last:border-0 align-top " +
                  (fallos
                    ? "bg-amber-100 dark:bg-amber-950/40"
                    : esDup
                      ? "bg-pink-100 dark:bg-pink-950/40"
                      : "")
                }
                title={
                  fallos
                    ? `Mal leído: ${fallos.join(" · ")}`
                    : esDup
                      ? "Este movimiento ya existe en Transacciones"
                      : undefined
                }
              >
                <td className="p-1">
                  <Input
                    value={e.fecha}
                    onChange={(x) => updateEntry(i, "fecha", x.target.value)}
                    className="h-9 w-28"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={e.mes}
                    onChange={(x) => updateEntry(i, "mes", x.target.value)}
                    className="h-9 w-24"
                  />
                </td>
                <td className="p-1">
                  <Select
                    value={e.tipo || "Ingreso"}
                    onValueChange={(v) => updateEntry(i, "tipo", v as Entry["tipo"])}
                  >
                    <SelectTrigger className="h-9 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ingreso">Ingreso</SelectItem>
                      <SelectItem value="Gasto">Gasto</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Select
                    value={e.categoria || undefined}
                    onValueChange={(v) => updateEntry(i, "categoria", v)}
                  >
                    <SelectTrigger className="h-9 w-40">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {cats.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Input
                    value={e.descripcion}
                    onChange={(x) => updateEntry(i, "descripcion", x.target.value)}
                    className="h-9 min-w-[200px]"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={e.mensualidad}
                    onChange={(x) => updateEntry(i, "mensualidad", x.target.value)}
                    className="h-9 w-24"
                    placeholder="abr-2026"
                  />
                </td>
                <td className="p-1">
                  <Select
                    value={e.moneda || undefined}
                    onValueChange={(v) => updateEntry(i, "moneda", v as Entry["moneda"])}
                  >
                    <SelectTrigger className="h-9 w-28">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="Bolívares">Bolívares</SelectItem>
                      <SelectItem value="Pesos">Pesos</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                {/* Dinero: a la derecha, con cifras de ancho fijo y dos
                    decimales al salir del campo. Alineado a la izquierda se
                    leía como texto —y de hecho lo era— y no había forma de
                    comparar dos importes de un vistazo. */}
                <td className="p-1">
                  <Input
                    inputMode="decimal"
                    value={e.monto}
                    onChange={(x) => updateEntry(i, "monto", x.target.value)}
                    onBlur={(x) => updateEntry(i, "monto", aDosDecimales(x.target.value))}
                    className={`h-9 w-24 ${CELDA_NUMERO}`}
                  />
                </td>
                <td className="p-1">
                  <Input
                    inputMode="decimal"
                    value={e.tasa}
                    onChange={(x) => updateEntry(i, "tasa", x.target.value)}
                    onBlur={(x) => updateEntry(i, "tasa", aDosDecimales(x.target.value))}
                    className={`h-9 w-24 ${CELDA_NUMERO}`}
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={e.montoUsd}
                    readOnly
                    className={`h-9 w-24 bg-muted/40 ${CELDA_NUMERO}`}
                    title="Calculado automáticamente"
                  />
                </td>
                <td className="p-1">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" onClick={() => duplicateRow(i)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
  ingresos,
  gastos,
  bcvRates,
  students,
  transactions,
  entries,
  setEntries,
  previews,
  setPreviews,
}: {
  ingresos: string[];
  gastos: string[];
  bcvRates: Record<string, number>;
  students: Student[];
  transactions: ReturnType<typeof useTransactions>;
  /**
   * Las filas extraídas y las fotos viven en el componente padre, no aquí.
   *
   * Radix desmonta el contenido de la pestaña que no está activa, así que con
   * el estado dentro de este componente bastaba con ir un momento a
   * Transacciones —a comprobar un pago repetido, por ejemplo— para perder
   * varias hojas de libro diario ya revisadas a mano. Al vivir arriba, el
   * trabajo sobrevive al cambio de pestaña.
   */
  entries: Entry[];
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  previews: PreviewItem[];
  setPreviews: React.Dispatch<React.SetStateAction<PreviewItem[]>>;
}) {
  const analyze = useServerFn(analyzeJournalImage);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  // Sin padrón cargado, el modelo no tiene contra qué contrastar la letra y
  // transcribe nombres a ojo. Es un fallo silencioso: las filas salen con
  // aspecto normal y los nombres mal.
  const sinPadron = students.length === 0;

  const processFiles = async (files: File[]) => {
    const newItems: PreviewItem[] = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        url: await fileToDataUrl(f),
        status: "pending" as const,
        count: 0,
      })),
    );
    const startIndex = previews.length;
    setPreviews((p) => [...p, ...newItems]);
    setLoading(true);
    setProgress({ done: 0, total: files.length });

    let okCount = 0,
      errCount = 0,
      zeroCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const idx = startIndex + i;
        setPreviews((p) => p.map((x, j) => (j === idx ? { ...x, status: "processing" } : x)));
        try {
          const base64 = newItems[i].url.split(",")[1];
          if (!base64) throw new Error("No se pudo leer la imagen");
          let accessToken: string | undefined;
          try {
            const s = await supabase.auth.getSession();
            accessToken = s.data.session?.access_token ?? undefined;
          } catch {
            /* sesión no disponible */
          }
          const result = await analyze({
            data: {
              imageBase64: base64,
              mimeType: f.type || "image/jpeg",
              ingresos,
              gastos,
              // Incluye también alumnos retirados: el libro diario puede tener
              // pagos históricos de alguien que ya no está activo.
              students: students.map((s) => ({ nombre: s.nombre, aulas: s.aulas })),
              accessToken,
            },
          });
          const normalized = (result.entries ?? []).map((e) => normalizeMoneyRow(e, bcvRates));
          setEntries((prev) => [...prev, ...normalized]);
          setPreviews((p) =>
            p.map((x, j) => (j === idx ? { ...x, status: "ok", count: normalized.length } : x)),
          );
          if (normalized.length === 0) {
            zeroCount++;
            toast.warning(
              `Foto ${idx + 1} (${f.name}): no se detectaron filas. Revisa o reintenta.`,
            );
          } else {
            okCount++;
          }
        } catch (err) {
          console.error("OCR error on", f.name, err);
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Foto ${idx + 1} (${f.name}): ${msg}`, { duration: 8000 });
          setPreviews((p) => p.map((x, j) => (j === idx ? { ...x, status: "error" } : x)));
          errCount++;
        }
        setProgress({ done: i + 1, total: files.length });
      }
    } finally {
      setLoading(false);
    }
    if (okCount > 0)
      toast.success(
        `${okCount} foto(s) OK${zeroCount ? `, ${zeroCount} sin filas` : ""}${errCount ? `, ${errCount} con error` : ""}`,
      );
    else if (errCount) toast.error(`Ninguna foto se procesó (${errCount} con error). Reintenta.`);
  };

  const cancelarCarga = () => {
    setLoading(false);
    setPreviews((p) =>
      p.map((x) =>
        x.status === "processing" || x.status === "pending"
          ? { ...x, status: "error" as const }
          : x,
      ),
    );
    toast.info("Carga reiniciada. Puedes volver a subir fotos.");
  };

  const handleFiles = async (files: FileList) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) {
      toast.error("Selecciona al menos una imagen");
      return;
    }
    const restantes = MAX_IMAGENES - previews.length;
    if (restantes <= 0) {
      toast.error(
        `Máximo ${MAX_IMAGENES} imágenes por carga (un mes = máx. 7 hojas). Vacía el lector para empezar otro mes.`,
      );
      return;
    }
    if (arr.length > restantes) {
      toast.warning(
        `Solo se procesarán ${restantes} de las ${arr.length} imágenes (máximo ${MAX_IMAGENES} por carga).`,
      );
    }
    if (sinPadron) {
      toast.warning("Sin lista de alumnos: los nombres saldrán como se lean, sin corregir.");
    }
    await processFiles(arr.slice(0, restantes));
  };

  const removePreview = (idx: number) => setPreviews((p) => p.filter((_, i) => i !== idx));
  const updateEntry = <K extends keyof Entry>(i: number, field: K, value: Entry[K]) => {
    setEntries((e) =>
      e.map((row, idx) => {
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
      }),
    );
  };
  /**
   * Índices de filas que ya están registradas en Transacciones, o que se
   * repiten dentro del propio lote escaneado (ej. la misma hoja subida dos
   * veces). Se marcan en rosado para revisarlas antes de guardar.
   */
  /**
   * Filas que el modelo devolvió mal leídas: categoría que no existe, importe
   * ilegible, fecha que no se entiende.
   *
   * El modelo responde con seguridad aunque se haya equivocado, así que sin
   * esto una categoría inventada o un monto que no es un número entraban en el
   * libro y el error solo aparecía después, cuadrando cuentas. Se marcan en
   * ámbar y no se puede guardar hasta arreglarlas.
   */
  const problemas = useMemo(() => {
    const m = new Map<number, string[]>();
    entries.forEach((e, i) => {
      const fallos: string[] = [];
      const cats = e.tipo === "Gasto" ? gastos : ingresos;

      if (!e.tipo) fallos.push("falta decir si es ingreso o gasto");
      if (!fechaToIso(e.fecha)) fallos.push("la fecha no se entiende");
      if (!e.categoria) fallos.push("sin categoría");
      else if (!cats.includes(e.categoria)) fallos.push(`la categoría «${e.categoria}» no existe`);

      const montoTexto = e.monto.trim();
      if (!montoTexto) fallos.push("sin monto");
      else if (aNumero(montoTexto) === 0) fallos.push(`el monto «${montoTexto}» no es una cifra`);

      if (!e.moneda) fallos.push("sin moneda");
      else if (e.moneda !== "USD" && aNumero(e.tasa) === 0) fallos.push("falta la tasa");

      if (fallos.length) m.set(i, fallos);
    });
    return m;
  }, [entries, ingresos, gastos]);

  const duplicados = useMemo(() => {
    const yaRegistradas = new Set(transactions.list.map((t) => firmaTransaccion(t)));
    const vistasEnLote = new Set<string>();
    const dup = new Set<number>();
    entries.forEach((e, i) => {
      const firma = firmaTransaccion(e);
      if (yaRegistradas.has(firma) || vistasEnLote.has(firma)) dup.add(i);
      vistasEnLote.add(firma);
    });
    return dup;
  }, [entries, transactions.list]);

  const addRow = () => setEntries((e) => [...e, emptyEntry()]);
  const duplicateRow = (i: number) =>
    setEntries((e) => {
      const c = [...e];
      c.splice(i + 1, 0, { ...e[i] });
      return c;
    });
  const removeRow = (i: number) => setEntries((e) => e.filter((_, idx) => idx !== i));
  const clearOcr = () => {
    if (confirm("¿Vaciar el lector (fotos y entradas)?")) {
      setEntries([]);
      setPreviews([]);
    }
  };

  const guardar = (soloNuevas: boolean) => {
    // Nada entra al libro con errores de lectura sin arreglar. Es más barato
    // corregir una casilla aquí que buscar el descuadre dentro de un mes.
    if (problemas.size > 0) {
      toast.error(
        `${problemas.size} fila(s) en ámbar tienen algo mal leído. Corrígelas antes de guardar.`,
      );
      return;
    }
    const aGuardar = soloNuevas ? entries.filter((_, i) => !duplicados.has(i)) : entries;
    if (!aGuardar.length) {
      toast.info("No hay filas nuevas que guardar");
      return;
    }
    transactions.append(
      aGuardar.map((e) => ({
        fecha: e.fecha,
        mes: e.mes,
        tipo: e.tipo,
        categoria: e.categoria,
        descripcion: e.descripcion,
        mensualidad: e.mensualidad,
        moneda: e.moneda,
        monto: aNumero(e.monto),
        tasa: e.tasa ? aNumero(e.tasa) || null : null,
        montoUsd: aNumero(e.montoUsd),
        banco: "",
      })),
    );
    const omitidas = entries.length - aGuardar.length;
    setEntries([]);
    setPreviews([]);
    toast.success(
      `${aGuardar.length} transacciones guardadas` +
        (omitidas ? ` · ${omitidas} duplicada(s) omitida(s)` : ""),
    );
  };

  return (
    <>
      <Card className="p-6">
        {sinPadron && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium text-amber-300">No hay lista de alumnos cargada</p>
            <p className="mt-1 text-muted-foreground">
              El lector corrige los nombres manuscritos comparándolos con el padrón. Sin él, los va
              a transcribir tal como los lea y saldrán mal escritos. Carga los integrantes en
              Solvencias antes de escanear.
            </p>
          </div>
        )}
        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-secondary p-8 text-center transition hover:bg-accent/20">
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
            disabled={loading}
          />
          <Upload className="mb-3 h-10 w-10 text-primary" />
          <h3 className="font-semibold">
            {previews.length === 0
              ? "Arrastra o haz clic para subir imágenes"
              : "Agregar más fotos"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Se procesan una por una en orden y las filas se agregan debajo de las anteriores.
          </p>
        </label>

        {previews.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((p, i) => (
              <div key={i} className="relative rounded-lg border p-2">
                <img src={p.url} alt={p.name} className="h-32 w-full rounded object-cover" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="truncate" title={p.name}>
                    {i + 1}. {p.name}
                  </span>
                  <span>
                    {p.status === "pending" && <span className="text-muted-foreground">…</span>}
                    {p.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {p.status === "ok" && (
                      <span className="font-medium text-primary">✓ {p.count}</span>
                    )}
                    {p.status === "error" && <span className="text-destructive">✗</span>}
                  </span>
                </div>
                {!loading && (
                  <button
                    onClick={() => removePreview(i)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-destructive-foreground"
                  >
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
            Analizando foto {progress.done + 1} de {progress.total}…
            <Button variant="ghost" size="sm" onClick={cancelarCarga}>
              Cancelar
            </Button>
          </div>
        )}
      </Card>

      {entries.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Entradas extraídas ({entries.length})</h2>
              {problemas.size > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <span className="inline-block h-3 w-3 rounded-sm bg-amber-200 dark:bg-amber-900" />
                  {problemas.size} fila(s) en ámbar están mal leídas — pasa el ratón por encima para
                  ver qué falla. Hay que arreglarlas antes de guardar.
                </p>
              )}
              {duplicados.size > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-3 w-3 rounded-sm bg-pink-200 dark:bg-pink-900" />
                  {duplicados.size} fila(s) en rosado ya existen en Transacciones (o están repetidas
                  aquí)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={clearOcr}>
                Vaciar
              </Button>
              <Button variant="outline" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" /> Fila
              </Button>
              {duplicados.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => guardar(true)}
                  disabled={problemas.size > 0}
                >
                  <Save className="mr-2 h-4 w-4" /> Guardar solo las nuevas (
                  {entries.length - duplicados.size})
                </Button>
              )}
              <Button
                onClick={() => guardar(false)}
                disabled={problemas.size > 0}
                title={
                  problemas.size > 0
                    ? "Hay filas mal leídas (en ámbar). Corrígelas para poder guardar."
                    : undefined
                }
              >
                <Save className="mr-2 h-4 w-4" />
                {duplicados.size > 0 ? "Guardar todas" : "Guardar en Transacciones"}
              </Button>
            </div>
          </div>
          <EntriesTable
            entries={entries}
            ingresos={ingresos}
            gastos={gastos}
            updateEntry={updateEntry}
            duplicateRow={duplicateRow}
            removeRow={removeRow}
            duplicados={duplicados}
            problemas={problemas}
          />
        </Card>
      )}
    </>
  );
}
