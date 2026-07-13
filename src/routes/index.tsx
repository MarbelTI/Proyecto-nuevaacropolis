import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { analyzeJournalImage, type Entry } from "@/lib/ocr.functions";
import { fetchBcvForDate, fetchBcvQuarter } from "@/lib/bcv.functions";
import {
  bcvRateFor,
  useBcvRates,
  useEditableAulas,
  useEditableList,
  useEditableStudents,
  useTransactions,
  type Student,
  type Transaction,
} from "@/lib/lists-store";
import {
  useAulasMeta,
  useAttendance,
  useCurrentUser,
  getUserInfo,
  type AulaMeta,
  type AttendanceRecord,
} from "@/lib/attendance-store";
import AsistenciasTab from "@/components/asistencias-tab";
import {
  calcularCuotasDebidas,
  calcularMontoUsd,
  cuotaMensualUSD,
  currentYm,
  precioClase,
  TASA_PESOS_DEFAULT,
} from "@/lib/fees-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Upload, Plus, Trash2, ScanText, Download, X,
  Settings, Pencil, Save, RefreshCw, MessageCircle, ClipboardCopy,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SISFIA — Sistema Financiero Acropolitano" },
      { name: "description", content: "SISFIA: OCR del libro diario, transacciones, análisis, solvencias y tasas BCV para Nueva Acrópolis Venezuela." },
    ],
  }),
  component: Index,
});

// ------------------------- Utilidades -------------------------

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

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
function isoToFecha(iso: string): string {
  const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`;
}
const $ = (n: number) => n.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
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
  next.montoUsd = calcularMontoUsd(next.moneda, next.monto, next.tasa);
  return next;
}

// Limpia el teléfono a solo dígitos y añade prefijo internacional si falta.
function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("58") || digits.startsWith("57")) return digits;
  if (digits.startsWith("0")) return "58" + digits.slice(1); // Venezuela 04xx → 58 4xx
  if (digits.length === 10) return "58" + digits;
  return digits;
}

function whatsappUrl(phone: string | undefined, text: string): string | null {
  const p = normalizePhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
function logWhatsApp(alumno: string, msg: string) {
  const log = JSON.parse(localStorage.getItem("wa_log") || "[]");
  log.push({ fecha: new Date().toISOString(), alumno, mensaje: msg });
  localStorage.setItem("wa_log", JSON.stringify(log));
}
function copyAndLog(msg: string, alumno: string) {
  navigator.clipboard.writeText(msg).then(() => {
    logWhatsApp(alumno, msg);
    toast.success(`Mensaje copiado para ${alumno}`);
  }).catch(() => toast.error("No se pudo copiar"));
}

// ------------------------- Página -------------------------

type PreviewItem = { name: string; url: string; status: "pending"|"processing"|"ok"|"error"; count: number };

function Index() {
  const analyze = useServerFn(analyzeJournalImage);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{done:number;total:number}>({done:0,total:0});
  const [entries, setEntries] = useState<Entry[]>([]);

  const [ingresos, setIngresos] = useEditableList("ingresos");
  const [gastos, setGastos] = useEditableList("gastos");
  const [bancos, setBancos] = useEditableList("bancos");
  const [aulas, setAulas] = useEditableAulas();
  const [waLogOpen, setWaLogOpen] = useState(false);
  const [waLogKey, setWaLogKey] = useState(0);
  const [students, setStudents] = useEditableStudents();
  const transactions = useTransactions();
  const bcv = useBcvRates();
  const [headerDate, setHeaderDate] = useState<string>(todayIso());
  const [headerLoading, setHeaderLoading] = useState(false);
  const fetchForDate = useServerFn(fetchBcvForDate);

  const [currentUser, setCurrentUser] = useCurrentUser();
  const [aulasMeta, setAulasMeta] = useAulasMeta();
  const [attRecords, setAttRecords] = useAttendance();
  const userInfo = getUserInfo(currentUser, aulasMeta);
  const [userDialogOpen, setUserDialogOpen] = useState(!currentUser);

  // Auto-cargar la tasa BCV cuando cambia la fecha y no la tenemos.
  useEffect(() => {
    if (bcvRateFor(bcv.rates, headerDate) != null) return;
    let cancelled = false;
    setHeaderLoading(true);
    fetchForDate({ data: { isoDate: headerDate } })
      .then((res) => {
        if (cancelled || !res) return;
        const map: Record<string, number> = {};
        for (const r of res.rows) map[r.isoDate] = r.rate;
        bcv.merge(map);
      })
      .catch(() => { /* silencioso, se puede cargar manual */ })
      .finally(() => { if (!cancelled) setHeaderLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerDate]);

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
          const normalized = (result.entries ?? []).map((e) => normalizeMoneyRow(e, bcv.rates));
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
      // Cambios de moneda/monto/tasa/fecha → recalcular USD y tasa por defecto.
      if (field === "moneda" || field === "monto" || field === "tasa" || field === "fecha") {
        return normalizeMoneyRow(next, bcv.rates);
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
        monto:e.monto, tasa:e.tasa, montoUsd:e.montoUsd, banco:"",
      })),
    );
    setEntries([]); setPreviews([]);
    toast.success(`${entries.length} transacciones guardadas`);
  };

  const headerRate = bcvRateFor(bcv.rates, headerDate);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1920px] px-4 py-6">
        {/* -------- HEADER -------- */}
        <header className="mb-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <img src="/logo.jpg" alt="Nueva Acrópolis Venezuela"
              className="h-14 w-14 rounded-full ring-2 ring-accent" />
            <div className="flex-1 min-w-[220px]">
              <h1 className="text-xl font-bold leading-tight">SISFIA</h1>
              <p className="text-xs opacity-90">
                <ScanText className="mr-1 inline h-3 w-3" />
                Sistema Financiero Acropolitano · Nueva Acrópolis Venezuela
              </p>
            </div>

            {/* Widget de tasa BCV */}
            <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-2">
              <label className="text-xs opacity-90">Tasa BCV</label>
              <input type="date" value={headerDate}
                onChange={(e) => setHeaderDate(e.target.value)}
                className="rounded bg-primary-foreground/20 px-2 py-1 text-xs" />
              <span className="rounded bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground min-w-[80px] text-center">
                {headerLoading ? <Loader2 className="inline h-3 w-3 animate-spin" /> :
                  headerRate != null ? `${$(headerRate)} Bs/$` : "—"}
              </span>
            </div>
            <button onClick={()=>setWaLogOpen(true)} className="rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-xs hover:bg-primary-foreground/20" title="Historial de mensajes WhatsApp">
              <MessageCircle className="mr-1 inline h-3.5 w-3.5" />Log
            </button>
            <button onClick={()=>setUserDialogOpen(true)}
              className="rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-xs hover:bg-primary-foreground/20 font-medium">
              {currentUser || "Seleccionar usuario"}
            </button>
          </div>
        </header>

        {/* Diálogo de selección de usuario */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Seleccionar usuario</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              {aulasMeta.length > 0 && (
                <p className="text-xs text-muted-foreground mb-1">Usuarios del sistema:</p>
              )}
              {[
                { name: "Manuela Zambrano", desc: "TI — Finanzas" },
                { name: "Margelys Santos", desc: "Finanzas" },
                { name: "Ricardo Garcia", desc: "Director — Acceso completo" },
                { name: "Karina Rodrigues", desc: "Coordinación — Todas las aulas" },
                ...aulasMeta
                  .filter((a, i, arr) => arr.findIndex((x) => x.celador === a.celador) === i)
                  .map((a) => ({ name: a.celador, desc: `Celador — ${a.nombre}` })),
              ].map((u) => (
                <button key={u.name} onClick={() => { setCurrentUser(u.name); setUserDialogOpen(false); }}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent transition">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{u.desc}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* -------- TABS -------- */}
        {!currentUser ? (
          <Card className="p-12 text-center">
            <h2 className="text-lg font-bold mb-2">Bienvenido a SISFIA</h2>
            <p className="text-muted-foreground mb-4">Selecciona tu usuario para continuar.</p>
            <Button onClick={()=>setUserDialogOpen(true)}>Seleccionar usuario</Button>
          </Card>
        ) : (
        <Tabs defaultValue={userInfo.canAccessExisting ? "ocr" : userInfo.canAccessAsistencias ? "asistencias" : "ocr"} className="w-full">
          <TabsList className="mb-4 flex flex-wrap">
            {userInfo.canAccessExisting && <TabsTrigger value="ocr">Registro OCR</TabsTrigger>}
            {userInfo.canAccessExisting && <TabsTrigger value="tx">Transacciones ({transactions.list.length})</TabsTrigger>}
            {userInfo.canAccessExisting && <TabsTrigger value="finanzas">Finanzas</TabsTrigger>}
            {userInfo.canAccessExisting && <TabsTrigger value="solvencias">Solvencias</TabsTrigger>}
            {userInfo.canAccessAsistencias && <TabsTrigger value="asistencias">Asistencias</TabsTrigger>}
          </TabsList>

          <TabsContent value="ocr" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="tx">
            <TransactionsTab tx={transactions} ingresos={ingresos} gastos={gastos} bancos={bancos}
              setIngresos={setIngresos} setGastos={setGastos} setBancos={setBancos} bcvRates={bcv.rates}
              students={students} aulas={aulas} setStudents={setStudents} />
          </TabsContent>

          <TabsContent value="finanzas">
            <Tabs defaultValue="resumen" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="resumen">Resumen mensual</TabsTrigger>
                <TabsTrigger value="analisis">Análisis anual</TabsTrigger>
                <TabsTrigger value="bcv">Tasas BCV</TabsTrigger>
              </TabsList>
              <TabsContent value="resumen">
                <ResumenTab tx={transactions.list} ingresos={ingresos} gastos={gastos} bancos={bancos} bcvRates={bcv.rates} />
              </TabsContent>
              <TabsContent value="analisis">
                <AnalisisTab tx={transactions.list} ingresos={ingresos} gastos={gastos} bcvRates={bcv.rates} />
              </TabsContent>
              <TabsContent value="bcv">
                <TasasBcvTab bcv={bcv} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="solvencias">
            <SolvenciasTab students={students} setStudents={setStudents}
              aulas={aulas} setAulas={setAulas} tx={transactions.list} />
          </TabsContent>

          {userInfo.canAccessAsistencias && (
            <TabsContent value="asistencias">
              <AsistenciasTab
                aulasMeta={aulasMeta}
                setAulasMeta={setAulasMeta}
                records={attRecords}
                setRecords={setAttRecords}
                user={userInfo}
              />
            </TabsContent>
          )}
        </Tabs>
        )}
      </div>

      <Dialog open={waLogOpen} onOpenChange={setWaLogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Historial de mensajes WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end -mt-2 mb-2">
            <button onClick={() => { localStorage.removeItem("wa_log"); toast.success("Log eliminado"); }} className="text-xs text-destructive hover:underline">Eliminar todos los mensajes</button>
          </div>
          <div key={waLogKey} className="space-y-2 max-h-[60vh] overflow-y-auto text-sm">
            {(() => {
              const raw = JSON.parse(localStorage.getItem("wa_log") || "[]");
              if (!raw.length) return <p className="text-muted-foreground">Sin mensajes registrados</p>;
              const log = [...raw].reverse();
              return log.map((e: {fecha:string; alumno:string; mensaje:string}, i: number) => {
                const origIdx = raw.length - 1 - i; // índice original en el array (para eliminar)
                return (
                <div key={i} className="rounded border p-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{e.alumno}</span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(e.fecha).toLocaleString("es-VE")}</span>
                      <button onClick={() => {
                        const updated = JSON.parse(localStorage.getItem("wa_log") || "[]");
                        updated.splice(origIdx, 1);
                        localStorage.setItem("wa_log", JSON.stringify(updated));
                        setWaLogKey(k=>k+1);
                        toast.success("Mensaje eliminado");
                      }} className="text-destructive hover:underline" title="Eliminar este mensaje">✕</button>
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words">{e.mensaje}</p>
                </div>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SUBCOMPONENTES
// ============================================================

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

// ---------------- Transacciones ----------------

function findStudentInDesc(desc: string, students: Student[]): Student | null {
  const n = normalizeName(desc);
  for (const s of students) {
    const sn = normalizeName(s.nombre);
    if (n.includes(sn)) return s;
  }
  return null;
}

function TransactionsTab({
  tx, ingresos, gastos, bancos, bcvRates, students, aulas, setStudents, setIngresos, setGastos, setBancos,
}: {
  tx: ReturnType<typeof useTransactions>;
  ingresos: string[]; gastos: string[]; bancos: string[];
  setIngresos: (n: string[]) => void; setGastos: (n: string[]) => void; setBancos: (n: string[]) => void;
  bcvRates: Record<string, number>;
  students: Student[]; aulas: string[]; setStudents: (n: Student[]) => void;
}) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [searchQ, setSearchQ] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [studentTx, setStudentTx] = useState<{ name: string; tx: Transaction[] } | null>(null);
  const [editTxStudent, setEditTxStudent] = useState<Student | null>(null);
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterMoneda, setFilterMoneda] = useState<string>("");
  const [filterCategoria, setFilterCategoria] = useState<string>("");
  const [filterBanco, setFilterBanco] = useState<string>("");

  const filtered = useMemo(() => {
    const sq = searchQ.trim().toLowerCase();
    return tx.list.filter((r) => {
      const iso = fechaToIso(r.fecha);
      if (!iso) return true;
      if (from && iso < from) return false;
      if (to && iso > to) return false;
      if (sq) {
        const descOk = r.descripcion?.toLowerCase().includes(sq);
        const catOk = r.categoria?.toLowerCase().includes(sq);
        const nameOk = findStudentInDesc(r.descripcion, students)?.nombre.toLowerCase().includes(sq);
        if (!descOk && !catOk && !nameOk) return false;
      }
      if (filterTipo && r.tipo !== filterTipo) return false;
      if (filterMoneda && r.moneda !== filterMoneda) return false;
      if (filterCategoria && r.categoria !== filterCategoria) return false;
      if (filterBanco === "__sin_banco__" && (r.banco || "") !== "") return false;
      if (filterBanco && filterBanco !== "__sin_banco__" && filterBanco !== "__todos__" && r.banco !== filterBanco) return false;
      return true;
    });
  }, [tx.list, from, to, searchQ, students, filterTipo, filterMoneda, filterBanco, filterCategoria]);

  const anyFilterActive = !!(from || to || searchQ.trim() || filterTipo || filterMoneda || filterCategoria || filterBanco);

  const exportExcel = () => {
    if (!filtered.length) { toast.error("No hay transacciones en el rango"); return; }
    const ws = XLSX.utils.json_to_sheet(filtered.map((r) => ({
      Fecha:r.fecha, Mes:r.mes, Tipo:r.tipo, Categoría:r.categoria,
      Descripción:r.descripcion, Mensualidad:r.mensualidad, Moneda:r.moneda,
      Banco:r.banco, Monto:r.monto, "Tasa cambio":r.tasa, "Monto USD":r.montoUsd,
    })));
    ws["!cols"] = [{wch:11},{wch:10},{wch:9},{wch:18},{wch:35},{wch:11},{wch:11},{wch:12},{wch:12},{wch:12},{wch:14}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
    XLSX.writeFile(wb, `TRANSACCIONES_${todayIso()}.xlsx`);
    toast.success("Excel descargado");
  };

  const eliminarRango = () => {
    if (!filtered.length) { toast.error("Nada que eliminar en el rango"); return; }
    const label = from || to ? `entre ${from||"inicio"} y ${to||"hoy"}` : "TODAS las transacciones";
    if (!confirm(`¿Eliminar ${filtered.length} transacciones ${label}?`)) return;
    const idsRemove = new Set(filtered.map((r) => r.id));
    tx.removeMany(idsRemove);
    toast.success(`${idsRemove.size} eliminadas`);
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Transacciones acumuladas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const empty = { fecha:"", mes:"", id:"__new__", tipo:"Ingreso" as const, categoria:"", descripcion:"", mensualidad:"", moneda:"USD" as const, monto:"", tasa:"", montoUsd:"", banco:"" };
            setEditing(empty);
          }}>
            <Plus className="mr-1 h-4 w-4" /> Fila
          </Button>
          <input type="file" id="importExcel" accept=".xlsx,.xls" style={{display:"none"}}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const buf = await file.arrayBuffer();
                const wb = XLSX.read(buf, { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
                const mapped = rows.map((r) => ({
                  fecha: String(r.Fecha || r.fecha || ""),
                  mes: String(r.Mes || r.mes || ""),
                  tipo: (String(r.Tipo || r.tipo || "Ingreso") === "Gasto" ? "Gasto" : "Ingreso") as "Ingreso" | "Gasto",
                  categoria: String(r.Categoria || r.Categoría || r.categoria || ""),
                  descripcion: String(r.Descripcion || r.Descripción || r.descripcion || ""),
                  mensualidad: String(r.Mensualidad || r.mensualidad || ""),
                  moneda: (String(r.Moneda || r.moneda || "USD") === "Bolívares" ? "Bolívares" : String(r.Moneda || r.moneda || "USD") === "Pesos" ? "Pesos" : "USD") as "USD" | "Bolívares" | "Pesos",
                  monto: String(r.Monto || r.monto || "0"),
                  tasa: String(r["Tasa cambio"] || r["Tasa"] || r.tasa || ""),
                  montoUsd: String(r["Monto USD"] || r["USD"] || r.montoUsd || ""),
                  banco: String(r.Banco || r.banco || ""),
                }));
                if (!mapped.length) { toast.error("Excel vacío o formato no reconocido"); return; }
                tx.append(mapped);
                toast.success(`${mapped.length} transacciones importadas`);
              } catch (err) {
                toast.error(`Error al leer Excel: ${(err as Error).message}`);
              }
              e.target.value = "";
            }} />
          <Button variant="outline" size="sm" onClick={() => document.getElementById("importExcel")?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Importar Excel
          </Button>
          <Input value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} placeholder="Buscar en descripción…" className="w-48" />
          <label className="text-xs text-muted-foreground">Desde</label>
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm" />
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm" />
          <Button variant="outline" size="sm" onClick={()=>{ setFrom(""); setTo(""); setSearchQ(""); }}>Limpiar filtro</Button>
          <Button onClick={exportExcel}><Download className="mr-2 h-4 w-4" /> Excel</Button>
          <Button variant="ghost" onClick={eliminarRango}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar rango
          </Button>
          <button onClick={()=>setCatOpen(true)} className="rounded-full p-2 hover:bg-accent" title="Categorías">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Mostrando {filtered.length} de {tx.list.length}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Fecha</th>
              <th className="p-2 font-medium">
                <select value={filterTipo} onChange={(e)=>setFilterTipo(e.target.value)} className="w-full bg-transparent text-xs font-medium outline-none">
                  <option value="">Tipo</option>
                  <option value="Ingreso">Ingreso</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </th>
              <th className="p-2 font-medium">
                <input value={filterCategoria} onChange={(e)=>setFilterCategoria(e.target.value)} placeholder="Categoría…" className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50" />
              </th>
              <th className="p-2 font-medium">Descripción</th>
              <th className="p-2 font-medium">Mens.</th>
              <th className="p-2 font-medium">
                <select value={filterMoneda} onChange={(e)=>setFilterMoneda(e.target.value)} className="w-full bg-transparent text-xs font-medium outline-none">
                  <option value="">Moneda</option>
                  <option value="USD">USD</option>
                  <option value="Bolívares">Bolívares</option>
                  <option value="Pesos">Pesos</option>
                </select>
              </th>
              <th className="p-2 font-medium">
                <Select value={filterBanco || undefined} onValueChange={(v)=>setFilterBanco(v)}>
                  <SelectTrigger className="h-auto border-0 p-0 shadow-none text-xs font-medium text-muted-foreground"><SelectValue placeholder="Banco…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    {bancos.map((b)=> <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    <SelectItem value="__sin_banco__">(sin banco)</SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="p-2 font-medium">Monto</th>
              <th className="p-2 font-medium">Tasa</th>
              <th className="p-2 font-medium">USD</th>
              <th className="p-2 font-medium"></th>
              <th className="p-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-2">{r.fecha}</td>
                <td className="p-2 text-xs">{r.tipo}</td>
                <td className="p-2 text-xs">{r.categoria}</td>
                <td className="p-2">{r.descripcion}</td>
                <td className="p-2 text-xs">{r.mensualidad}</td>
                <td className="p-2 text-xs">{r.moneda}</td>
                <td className="p-2 text-xs text-muted-foreground">{r.banco || "—"}</td>
                <td className="p-2 text-right tabular-nums">{isNaN(Number(r.monto)) ? r.monto : $(Number(r.monto))}</td>
                <td className="p-2 text-right tabular-nums text-xs">{r.tasa}</td>
                <td className="p-2 text-right tabular-nums font-medium">{$(Number(r.montoUsd)||0)}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={()=>tx.duplicateAfter(r.id)} title="Duplicar fila debajo"><Plus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={()=>setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={()=>tx.remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
                <td className="p-2">
                  {(() => {
                    const s = findStudentInDesc(r.descripcion, students);
                    if (!s) return (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground" title="No se encontró alumno en la descripción">
                        <MessageCircle className="h-4 w-4 opacity-30" />
                      </span>
                    );
                    if (!s.telefono) return (
                      <button onClick={() => setEditTxStudent(s)} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" title="Agregar teléfono">
                        <MessageCircle className="h-4 w-4 opacity-50" />
                      </button>
                    );
                    const moneda = r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "COP" : "USD";
                    const concepto = r.mensualidad ? `mensualidad de ${r.mensualidad}` : r.descripcion || `pago`;
                    const msg = `¡Hola, ${s.nombre.split(" ")[0]}! Te confirmamos la recepción de tu pago por un monto de $${$(Number(r.montoUsd)||0)} (${r.monto} ${moneda}) correspondiente a: ${concepto}. Tu cuenta se encuentra al día. ¡Gracias por formar parte de nuestra escuela!`;
                    const url = whatsappUrl(s.telefono, msg);
                    return url ? (<>
                      <a href={url} target="_blank" rel="noopener noreferrer" onClick={()=>logWhatsApp(s.nombre, msg)} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent" title={`Enviar WhatsApp a ${s.nombre}`}>
                        <MessageCircle className="h-4 w-4 text-primary" />
                      </a>
                      <button onClick={()=>copyAndLog(msg, s.nombre)} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" title="Copiar mensaje">
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </button>
                    </>) : null;
                  })()}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">Sin transacciones</td></tr>
            )}
            {anyFilterActive && filtered.length > 1 && (
              <tr className="border-t-2 font-semibold bg-accent/20">
                <td className="p-2 text-xs" colSpan={7}>Total ({filtered.length} filas)</td>
                <td className="p-2 text-right tabular-nums">{$(filtered.reduce((s,r)=>s+(Number(r.monto)||0),0))}</td>
                <td className="p-2" />
                <td className="p-2 text-right tabular-nums">${$(filtered.reduce((s,r)=>s+(Number(r.montoUsd)||0),0))}</td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TransactionEditDialog
        editing={editing} onClose={()=>setEditing(null)}
        ingresos={ingresos} gastos={gastos} bancos={bancos} bcvRates={bcvRates}
        onSave={(next) => {
          if (next.id === "__new__") {
            const { id, ...rest } = next;
            tx.append([rest]);
            setEditing(null);
            toast.success("Transacción creada");
          } else {
            tx.replace(next.id, next);
            setEditing(null);
            toast.success("Transacción actualizada");
          }
        }}
      />

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Categorías</DialogTitle></DialogHeader>
          <Tabs defaultValue="ing">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ing">Ingresos</TabsTrigger>
              <TabsTrigger value="gas">Gastos</TabsTrigger>
              <TabsTrigger value="bn">Bancos</TabsTrigger>
            </TabsList>
            <TabsContent value="ing" className="mt-4">
              <SimpleListEditor items={ingresos} setItems={setIngresos} placeholder="Nueva categoría de ingreso…" />
            </TabsContent>
            <TabsContent value="gas" className="mt-4">
              <SimpleListEditor items={gastos} setItems={setGastos} placeholder="Nueva categoría de gasto…" />
            </TabsContent>
            <TabsContent value="bn" className="mt-4">
              <SimpleListEditor items={bancos} setItems={setBancos} placeholder="Nuevo banco/cuenta…" />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <StudentEditDialog
        open={editTxStudent !== null}
        student={editTxStudent}
        aulas={aulas}
        lastPay={null}
        onClose={() => setEditTxStudent(null)}
        onSave={(next) => {
          setStudents(students.map((s) => s.nombre === next.nombre ? next : s));
          setEditTxStudent(null);
          toast.success("Guardado");
        }}
      />
    </Card>
  );
}

function TransactionEditDialog({
  editing, onClose, onSave, ingresos, gastos, bancos, bcvRates,
}: {
  editing: Transaction | null; onClose: () => void; onSave: (t: Transaction) => void;
  ingresos: string[]; gastos: string[]; bancos: string[]; bcvRates: Record<string, number>;
}) {
  const [draft, setDraft] = useState<Transaction | null>(null);
  useEffect(() => { setDraft(editing ? { ...editing } : null); }, [editing]);
  if (!draft) return null;
  const cats = draft.tipo === "Gasto" ? gastos : ingresos;
  const update = <K extends keyof Transaction>(k: K, v: Transaction[K]) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, [k]: v };
      if (k === "moneda" || k === "monto" || k === "tasa" || k === "fecha") {
        return normalizeMoneyRow(next, bcvRates);
      }
      return next;
    });
  };
  return (
    <Dialog open={!!editing} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Modificar transacción</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha (dd/mm/aaaa)"><Input value={draft.fecha} onChange={(e)=>update("fecha", e.target.value)} /></Field>
          <Field label="Mes"><Input value={draft.mes} onChange={(e)=>update("mes", e.target.value)} /></Field>
          <Field label="Tipo">
            <Select value={draft.tipo||"Ingreso"} onValueChange={(v)=>update("tipo", v as Transaction["tipo"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Ingreso">Ingreso</SelectItem><SelectItem value="Gasto">Gasto</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Categoría">
            <Select value={draft.categoria||undefined} onValueChange={(v)=>update("categoria", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{cats.map((c)=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Descripción" full><Input value={draft.descripcion} onChange={(e)=>update("descripcion", e.target.value)} /></Field>
          <Field label="Mensualidad"><Input value={draft.mensualidad} onChange={(e)=>update("mensualidad", e.target.value)} placeholder="abr-2026" /></Field>
          <Field label="Moneda">
            <Select value={draft.moneda||undefined} onValueChange={(v)=>update("moneda", v as Transaction["moneda"])}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="Bolívares">Bolívares</SelectItem>
                <SelectItem value="Pesos">Pesos</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Banco/Cuenta">
            <Select value={bancos.includes(draft.banco) ? draft.banco : undefined} onValueChange={(v)=>update("banco", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {bancos.map((b)=> <SelectItem key={b} value={b}>{b}</SelectItem>)}
                <SelectItem value="__editar__">
                  <span className="text-muted-foreground italic text-xs">✎ Editar desde Categorías…</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Monto"><Input value={draft.monto} onChange={(e)=>update("monto", e.target.value)} /></Field>
          <Field label="Tasa"><Input value={draft.tasa} onChange={(e)=>update("tasa", e.target.value)} /></Field>
          <Field label="USD">
            <Input value={draft.montoUsd} onChange={(e)=>{
              const v = e.target.value;
              update("montoUsd", v);
              const m = Number(draft.monto);
              const u = Number(v);
              if (m > 0 && u > 0 && (!draft.tasa || Number(draft.tasa) === 0)) {
                update("tasa", String(m / u));
              }
            }} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={()=>onSave(draft)}><Save className="mr-2 h-4 w-4" /> Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// ---------------- Análisis financiero ----------------

function AnalisisTab({
  tx, ingresos, gastos, bcvRates,
}: { tx: Transaction[]; ingresos: string[]; gastos: string[]; bcvRates: Record<string, number> }) {
  const yearsSet = new Set<number>();
  for (const t of tx) {
    const iso = fechaToIso(t.fecha);
    if (iso) yearsSet.add(Number(iso.slice(0,4)));
  }
  yearsSet.add(new Date().getFullYear());
  const years = Array.from(yearsSet).sort((a,b)=>b-a);
  const [year, setYear] = useState<number>(years[0]);
  const [capitalInicial, setCapitalInicial] = useState<string>("0");

  const build = (cats: string[], tipo: "Ingreso"|"Gasto") => {
    const m: Record<string, number[]> = {};
    for (const c of cats) m[c] = Array(12).fill(0);
    for (const t of tx) {
      if (t.tipo !== tipo) continue;
      const iso = fechaToIso(t.fecha);
      if (!iso || Number(iso.slice(0,4)) !== year) continue;
      const mi = Number(iso.slice(5,7)) - 1;
      const cat = t.categoria || "(sin categoría)";
      if (!m[cat]) m[cat] = Array(12).fill(0);
      m[cat][mi] += Number(t.montoUsd) || 0;
    }
    return m;
  };
  const matIng = build(ingresos, "Ingreso");
  const matGas = build(gastos, "Gasto");

  // Neto por mes y acumulado (efectivo disponible desde año previo hasta cada mes).
  const totalesIng = Array(12).fill(0); const totalesGas = Array(12).fill(0);
  Object.values(matIng).forEach((row) => row.forEach((v,i)=> totalesIng[i]+=v));
  Object.values(matGas).forEach((row) => row.forEach((v,i)=> totalesGas[i]+=v));
  const neto = totalesIng.map((v,i)=> v - totalesGas[i]);

  // Neto de años previos (para arrastrar el efectivo inicial).
  const arrastre = tx.reduce((acc,t) => {
    const iso = fechaToIso(t.fecha);
    if (!iso) return acc;
    if (Number(iso.slice(0,4)) >= year) return acc;
    const usd = Number(t.montoUsd) || 0;
    return acc + (t.tipo === "Ingreso" ? usd : t.tipo === "Gasto" ? -usd : 0);
  }, 0);



  const capIniNum = Number(capitalInicial) || 0;
  const acumulado: number[] = [];
  neto.reduce((cum,v,i) => { const nv = cum + v; acumulado[i] = nv; return nv; }, arrastre + capIniNum);

  const lastMonthIdx = (() => {
    for (let i=11;i>=0;i--) if (totalesIng[i]>0 || totalesGas[i]>0) return i;
    return -1;
  })();

  const renderBlock = (title: string, mat: Record<string, number[]>, colorClass: string) => {
    const cats = Object.keys(mat).sort();
    const totales = Array(12).fill(0);
    cats.forEach((c) => mat[c].forEach((v,i)=> totales[i]+=v));
    return (
      <>
        <tr className={`${colorClass} font-semibold`}>
          <td className="p-2" colSpan={16}>{title}</td>
        </tr>
        {cats.map((c) => {
          const row = mat[c];
          const total = row.reduce((s,v)=> s+v, 0);
          const meses = row.filter((v)=> v>0).length || 1;
          const promedio = total / meses;
          const varPct = lastMonthIdx > 0 && row[lastMonthIdx-1] > 0
            ? ((row[lastMonthIdx]-row[lastMonthIdx-1])/row[lastMonthIdx-1])*100 : null;
          return (
            <tr key={c} className="border-b">
              <td className="p-2 text-xs">{c}</td>
              {row.map((v,i)=> <td key={i} className="p-1 text-right text-xs tabular-nums">{v>0?v.toFixed(0):""}</td>)}
              <td className="p-1 text-right text-xs font-medium">{total.toFixed(0)}</td>
              <td className="p-1 text-right text-xs">{promedio.toFixed(0)}</td>
              <td className="p-1 text-right text-xs">{varPct==null?"—":`${varPct>0?"+":""}${varPct.toFixed(0)}%`}</td>
            </tr>
          );
        })}
        <tr className="border-b bg-muted/50 font-semibold">
          <td className="p-2 text-xs">Total {title}</td>
          {totales.map((v,i)=> <td key={i} className="p-1 text-right text-xs tabular-nums">{v>0?v.toFixed(0):""}</td>)}
          <td className="p-1 text-right text-xs">{totales.reduce((s,v)=>s+v,0).toFixed(0)}</td>
          <td /><td />
        </tr>
      </>
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Análisis financiero anual (USD)</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Arrastre años anteriores: <span className="font-semibold">${$(arrastre)}</span></span>
            <span className="flex items-center gap-1">
              Capital inicial:
              <Input type="number" value={capitalInicial} onChange={(e)=>setCapitalInicial(e.target.value)} className="h-7 w-20 text-xs" />
            </span>
          </div>
        </div>
        <Select value={String(year)} onValueChange={(v)=>setYear(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y)=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Categoría</th>
              {MESES_ES.map((m)=> <th key={m} className="p-1 text-right font-medium text-xs">{m.slice(0,3)}</th>)}
              <th className="p-1 text-right font-medium text-xs">Total</th>
              <th className="p-1 text-right font-medium text-xs">Prom.</th>
              <th className="p-1 text-right font-medium text-xs">Var%</th>
            </tr>
          </thead>
          <tbody>
            {renderBlock("Ingresos", matIng, "bg-primary/10")}
            {/* separación visual */}
            <tr><td colSpan={16} className="h-4"></td></tr>
            {renderBlock("Egresos", matGas, "bg-destructive/10")}
            <tr><td colSpan={16} className="h-4"></td></tr>
            <tr className="border-t bg-accent/20 font-bold">
              <td className="p-2 text-xs">Neto mensual</td>
              {neto.map((v,i)=> (
                <td key={i} className={"p-1 text-right text-xs tabular-nums " + (v<0?"text-destructive":"")}>
                  {v!==0 ? v.toFixed(0) : ""}
                </td>
              ))}
              <td className="p-1 text-right text-xs">{neto.reduce((s,v)=>s+v,0).toFixed(0)}</td>
              <td /><td />
            </tr>
            <tr className="border-b bg-accent/40 font-bold">
              <td className="p-2 text-xs">Efectivo acumulado</td>
              {acumulado.map((v,i)=> (
                <td key={i} className={"p-1 text-right text-xs tabular-nums " + (v<0?"text-destructive":"")}>
                  {v.toFixed(0)}
                </td>
              ))}
              <td /><td /><td />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------- Resumen mensual ----------------

const EGRESOS_PRINCIPALES = ["ALQUILER","SERVICIOS PUBLICOS","INTERNET","CONTADORA","PRESTAMO"];

function ResumenTab({ tx, ingresos, gastos, bancos, bcvRates }: { tx: Transaction[]; ingresos: string[]; gastos: string[]; bancos: string[]; bcvRates: Record<string,number> }) {
  const [ym, setYm] = useState<string>(currentYm());
  const [selectedIngCats, setSelectedIngCats] = useState<Set<string>>(new Set());
  const [selectedGasCats, setSelectedGasCats] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);

  const data = useMemo(() => {
    const ingByCat: Record<string, number> = {};
    const gasByCat: Record<string, number> = {};
    type Det = { desc: string; monto: number; fecha: string; mes?: string };
    const ingDet: Record<string, Det[]> = {};
    const gasDet: Record<string, Det[]> = {};
    for (const c of ingresos) { ingByCat[c] = 0; }
    for (const c of gastos) { gasByCat[c] = 0; }
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0,7) !== ym) continue;
      const usd = Number(t.montoUsd) || 0;
      const c = t.categoria || "(sin categoría)";
      if (c === "CONVERSIÓN") continue; // no aparece en resumen mensual
      if (t.tipo === "Ingreso") {
        ingByCat[c] = (ingByCat[c] || 0) + usd;
        if (!ingDet[c]) ingDet[c] = [];
        ingDet[c].push({ desc: t.descripcion, monto: usd, fecha: t.fecha, mes: t.mensualidad });
      } else if (t.tipo === "Gasto") {
        gasByCat[c] = (gasByCat[c] || 0) + usd;
        if (!gasDet[c]) gasDet[c] = [];
        gasDet[c].push({ desc: t.descripcion, monto: usd, fecha: t.fecha, mes: t.mensualidad });
      }
    }
    const totalIng = Object.values(ingByCat).reduce((s,v)=>s+v,0);
    const totalGas = Object.values(gasByCat).reduce((s,v)=>s+v,0);
    return { ingByCat, gasByCat, ingDet, gasDet, totalIng, totalGas };
  }, [tx, ym, ingresos, gastos]);

  const [y, m] = ym.split("-").map(Number);

  // Arbitraje: análisis de bolívares del mes
  const arbitrajeData = useMemo(() => {
    let bsRecibidos = 0, bsGastados = 0, usdIng = 0, usdGas = 0;
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0,7) !== ym) continue;
      if (t.moneda !== "Bolívares") continue;
      const monto = Number(t.monto) || 0;
      const usd = Number(t.montoUsd) || 0;
      if (t.tipo === "Ingreso") { bsRecibidos += monto; usdIng += usd; }
      else if (t.tipo === "Gasto") { bsGastados += monto; usdGas += usd; }
    }
    const saldoBs = bsRecibidos - bsGastados;
    const usdTotal = usdIng - usdGas;
    // Tasa BCV inicio del mes
    let tasaInicio = 0;
    for (let d = 1; d <= 31; d++) {
      const li = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      tasaInicio = bcvRates[li] ?? 0;
      if (tasaInicio > 0) break;
    }
    // Tasa BCV cierre del mes
    const lastDay = new Date(y, m, 0);
    let tasaCierre = 0;
    for (let d = lastDay.getDate(); d >= 1; d--) {
      const li = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      tasaCierre = bcvRates[li] ?? 0;
      if (tasaCierre > 0) break;
    }
    const saldoConvertido = tasaCierre > 0 ? saldoBs / tasaCierre : 0;
    const ganancia = tasaCierre > 0 ? saldoConvertido - usdTotal : 0;
    return { bsRecibidos, bsGastados, saldoBs, usdIng, usdGas, usdTotal, tasaInicio, tasaCierre, saldoConvertido, ganancia };
  }, [tx, ym, y, m, bcvRates]);

  // Balance por banco/cuenta del mes
  const bancosData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tx) {
      const iso = fechaToIso(t.fecha);
      if (!iso || iso.slice(0,7) !== ym) continue;
      const banco = t.banco || "(sin banco)";
      const usd = Number(t.montoUsd) || 0;
      map.set(banco, (map.get(banco) || 0) + (t.tipo === "Ingreso" ? usd : -usd));
    }
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [tx, ym]);

  // Al cambiar de mes o toggle, auto-seleccionar categorías según showAllCats
  useEffect(() => {
    const catsConDatos = (cats: string[], byCat: Record<string,number>) =>
      new Set(cats.filter((c) => byCat[c] > 0));
    if (showAllCats) {
      setSelectedIngCats(new Set(ingresos));
      setSelectedGasCats(new Set(gastos));
    } else {
      setSelectedIngCats(catsConDatos(ingresos, data.ingByCat));
      setSelectedGasCats(catsConDatos(gastos, data.gasByCat));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, showAllCats]);

  const toggleIngCat = (cat: string) => {
    setSelectedIngCats(p => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  };
  const toggleGasCat = (cat: string) => {
    setSelectedGasCats(p => {
      const n = new Set(p);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  };

  const pillsHeight = useMemo(() => {
    const maxLen = Math.max(ingresos.length, gastos.length);
    // ~30px por fila, asumir ~3 filas mínimo para que sea generoso
    return Math.max(Math.ceil(maxLen / 2) * 32, 96);
  }, [ingresos, gastos]);

  const exportExcelResumen = () => {
    const wb = XLSX.utils.book_new();
    const monthTx = tx.filter(t => {
      const iso = fechaToIso(t.fecha);
      return iso && iso.slice(0,7) === ym;
    });

    // -------- HOJA 1: MOVIMIENTOS --------
    // Formato matriz: cada categoría es una columna, una fila por transacción.
    // Con el conteo visible (ej. "MIEMBROS (29)") la fila de totales queda justo
    // después del último registro de la categoría con más datos.
    const allCats = [...new Set([...ingresos, ...gastos])];
    const numCats = allCats.length;
    const sheetData: any[][] = [[...allCats]];
    for (const t of monthTx) {
      const row: any[] = Array(numCats).fill(0);
      const ci = allCats.indexOf(t.categoria || "");
      if (ci >= 0) {
        let val = Number(t.montoUsd) || 0;
        if (t.tipo === "Gasto") val = -val;
        row[ci] = val;
      }
      sheetData.push(row);
    }
    const lastDataRow = monthTx.length + 1;
    const totalRow: any[] = [];
    for (let c = 0; c < numCats; c++) {
      const col = XLSX.utils.encode_col(c + 1);
      totalRow.push(`=SUMA(${col}2:${col}${lastDataRow})`);
    }
    sheetData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!comments"] = [];
    for (let i = 0; i < monthTx.length; i++) {
      const t = monthTx[i];
      const ci = allCats.indexOf(t.categoria || "");
      const note = [t.descripcion, t.mensualidad].filter(Boolean).join(" · ");
      if (ci >= 0 && note) {
        ws["!comments"].push({
          ref: XLSX.utils.encode_cell({ r: i + 1, c: ci }),
          cell: { a: "SISFIA", t: note },
        });
      }
    }
    ws["!cols"] = allCats.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, "MOVIMIENTOS");

    // -------- HOJA 2: RESUMEN (DEBE | HABER | SALDO) --------
    const resTotalRow = monthTx.length + 2;
    const resumenData: any[][] = [["Categoría", "DEBE (ingresos)", "HABER (egresos)", "SALDO"]];
    for (let c = 0; c < numCats; c++) {
      const col = XLSX.utils.encode_col(c + 1);
      resumenData.push([
        allCats[c],
        `=MOVIMIENTOS!${col}${resTotalRow}`,
        "",
        "",
      ]);
    }
    resumenData.push(["", "", "", ""]);
    const totalFilaRes = numCats + 2;
    resumenData.push(["TOTAL GENERAL",
      `=SUMA(B2:B${totalFilaRes})`,
      `=SUMA(C2:C${totalFilaRes})`,
      `=SUMA(D2:D${totalFilaRes})`,
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet(resumenData);
    ws2["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, "RESUMEN");

    XLSX.writeFile(wb, `RESUMEN_${ym}_${todayIso()}.xlsx`);
    toast.success("Excel descargado");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Resumen mensual</h2>
            <Button variant="outline" size="sm" onClick={exportExcelResumen}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(m)} onValueChange={(v)=>setYm(`${y}-${v.padStart(2,"0")}`)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{MESES_ES.map((mn,i)=><SelectItem key={i} value={String(i+1)}>{mn}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" value={y} onChange={(e)=>setYm(`${e.target.value}-${String(m).padStart(2,"0")}`)} className="w-24" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Neto</div>
              <div className={"text-xl font-bold " + (data.totalIng - data.totalGas < 0 ? "text-destructive" : "")}>
                ${$(data.totalIng - data.totalGas)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Ingresos</h3>
          <span className="text-base font-bold text-primary">${$(data.totalIng)}</span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <button onClick={()=>setShowAllCats(!showAllCats)}
            className={"rounded-full px-4 py-px text-[13px] font-medium leading-none "+(showAllCats?"bg-primary text-primary-foreground":"bg-muted")}>
            {showAllCats ? "Todas" : "Solo datos"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-1.5 gap-y-1" style={{ minHeight: pillsHeight }}>
          {ingresos.sort().map(c => (
            <button key={c} onClick={() => toggleIngCat(c)}
              className={`rounded-full px-4 py-px text-[13px] font-medium leading-none border transition ${selectedIngCats.has(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/30 text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {ingresos.filter((c) => selectedIngCats.has(c)).map(c => {
              const v = data.ingByCat[c] || 0;
              const det = data.ingDet[c];
              return (<>
                <tr key={c} className="border-b last:border-0 cursor-pointer hover:bg-accent/30" onClick={() => setExpandedCat(expandedCat === c ? null : c)}>
                  <td className="p-1 font-medium">{c}{det ? <span className="ml-1.5 text-xs text-muted-foreground">({det.length})</span> : null}</td>
                  <td className="p-1 text-right tabular-nums">${$(v)}</td>
                  <td className="p-1 text-right text-xs text-muted-foreground">
                    {data.totalIng>0 ? ((v/data.totalIng)*100).toFixed(0) : 0}%
                  </td>
                </tr>
                {expandedCat === c && det && (
                  <tr key={`${c}-det`}>
                    <td colSpan={3} className="p-0">
                      <div className="bg-muted/20 px-3 py-2 text-xs space-y-1">
                        {det.map((d, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-muted-foreground truncate min-w-0">{d.fecha} <span className="font-medium">{d.mes || ""}</span> {d.desc?.slice(0,40) || "—"}{d.desc && d.desc.length > 40 ? "…" : ""}</span>
                            <span className="tabular-nums font-medium shrink-0">${$(d.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>);
            })}
            <tr className="border-t font-semibold">
              <td className="p-2">Total Ingresos</td>
              <td className="p-2 text-right">${$(data.totalIng)}</td><td />
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-destructive">Egresos</h3>
          <span className="text-base font-bold text-destructive">${$(data.totalGas)}</span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <button onClick={()=>setShowAllCats(!showAllCats)}
            className={"rounded-full px-4 py-px text-[13px] font-medium leading-none "+(showAllCats?"bg-primary text-primary-foreground":"bg-muted")}>
            {showAllCats ? "Todas" : "Solo datos"}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-1.5 gap-y-1" style={{ minHeight: pillsHeight }}>
          {gastos.sort().map(c => (
            <button key={c} onClick={() => toggleGasCat(c)}
              className={`rounded-full px-4 py-px text-[13px] font-medium leading-none border transition ${selectedGasCats.has(c) ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background border-muted-foreground/30 text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {gastos.filter((c) => selectedGasCats.has(c)).map(c => {
              const v = data.gasByCat[c] || 0;
              const det = data.gasDet[c];
              return (<>
                <tr key={c} className="border-b last:border-0 cursor-pointer hover:bg-accent/30" onClick={() => setExpandedCat(expandedCat === `g-${c}` ? null : `g-${c}`)}>
                  <td className="p-1 font-medium">{c}{det ? <span className="ml-1.5 text-xs text-muted-foreground">({det.length})</span> : null}</td>
                  <td className="p-1 text-right tabular-nums">${$(v)}</td>
                  <td className="p-1 text-right text-xs text-muted-foreground">
                    {data.totalGas>0 ? ((v/data.totalGas)*100).toFixed(0) : 0}%
                  </td>
                </tr>
                {expandedCat === `g-${c}` && det && (
                  <tr key={`${c}-det`}>
                    <td colSpan={3} className="p-0">
                      <div className="bg-muted/20 px-3 py-2 text-xs space-y-1">
                        {det.map((d, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-muted-foreground truncate min-w-0">{d.fecha} <span className="font-medium">{d.mes || ""}</span> {d.desc?.slice(0,40) || "—"}{d.desc && d.desc.length > 40 ? "…" : ""}</span>
                            <span className="tabular-nums font-medium shrink-0">${$(d.monto)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>);
            })}
            <tr className="border-t font-semibold">
              <td className="p-2">Total Egresos</td>
              <td className="p-2 text-right">${$(data.totalGas)}</td><td />
            </tr>
          </tbody>
        </table>
      </Card>

      {arbitrajeData.bsRecibidos > 0 && (
      <Card className="p-4">
        <h3 className="mb-2 font-semibold text-sm">💱 Análisis de Bolívares del mes</h3>

        {/* Tasa de cambio al inicio vs cierre */}
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
            <span className="text-muted-foreground">Tasa al iniciar el mes</span>
            <div className="font-bold text-lg">{$(arbitrajeData.tasaInicio)}</div>
            <span className="text-muted-foreground">🇻🇪 BCV</span>
          </div>
          <div className="rounded bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
            <span className="text-muted-foreground">Tasa al cerrar el mes</span>
            <div className="font-bold text-lg">{$(arbitrajeData.tasaCierre)}</div>
            <span className="text-muted-foreground">🇻🇪 BCV</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {/* Paso 1: Lo que pasó en el mes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">1️⃣ Tus movimientos del mes en Bolívares</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Recibiste en Bs</span>
              <span className="tabular-nums text-right">{$(arbitrajeData.bsRecibidos)}</span>
              <span className="text-xs text-muted-foreground">Bs</span>

              <span className="text-muted-foreground">Gastaste en Bs</span>
              <span className="tabular-nums text-right">{$(arbitrajeData.bsGastados)}</span>
              <span className="text-xs text-muted-foreground">Bs</span>

              <span className="font-medium border-t pt-0.5">💼 Te quedan en caja</span>
              <span className={"tabular-nums text-right font-medium border-t pt-0.5 " + (arbitrajeData.saldoBs < 0 ? "text-destructive" : "")}>{$(arbitrajeData.saldoBs)}</span>
              <span className="text-xs text-muted-foreground border-t pt-0.5">Bs</span>
            </div>
          </div>

          {/* Paso 2: Lo que registraste en dólares */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">2️⃣ Lo que registraste en dólares (a la tasa de cada día)</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
              <span className="text-muted-foreground">USD de tus recibos</span>
              <span className="tabular-nums text-right">${$(arbitrajeData.usdIng)}</span>
              <span></span>

              <span className="text-muted-foreground">USD de tus gastos</span>
              <span className="tabular-nums text-right">${$(arbitrajeData.usdGas)}</span>
              <span></span>

              <span className="font-medium border-t pt-0.5">📝 Total registrado en $</span>
              <span className={"tabular-nums text-right font-medium border-t pt-0.5 " + (arbitrajeData.usdTotal < 0 ? "text-destructive" : "")}>${$(Math.abs(arbitrajeData.usdTotal))}</span>
              <span className="text-xs text-muted-foreground border-t pt-0.5">{(arbitrajeData.usdTotal < 0 ? "gastaste más de lo que recibiste" : "recibiste más de lo que gastaste")}</span>
            </div>
          </div>

          {/* Paso 3: Conversión a tasa de cierre */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">3️⃣ ¿Cuánto valdrían hoy tus Bs en caja?</p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
              <span className="text-muted-foreground"> Tus Bs ÷ tasa cierre ({$(arbitrajeData.tasaCierre)})</span>
              <span className="tabular-nums text-right">{arbitrajeData.saldoConvertido ? "$"+$(Math.abs(arbitrajeData.saldoConvertido)) : "$0"}</span>
              <span className="text-xs text-muted-foreground">valor actual en $</span>
            </div>
          </div>

          {/* Resultado final */}
          <div className={"rounded p-3 " + (arbitrajeData.ganancia >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{arbitrajeData.ganancia >= 0 ? "✅" : "❌"}</span>
                <div>
                  <div className="font-semibold text-sm">{arbitrajeData.ganancia >= 0 ? "¡Ganaste dinero!" : "Perdiste dinero 💸"}</div>
                  <p className="text-xs text-muted-foreground">
                    {arbitrajeData.ganancia >= 0
                      ? `Tus Bs valían $${$(Math.abs(arbitrajeData.usdTotal))} cuando los recibiste/gastaste, pero hoy valen $${$(Math.abs(arbitrajeData.saldoConvertido))}. Ganaste porque el Bolívar se devaluó menos de lo esperado.`
                      : `Registraste $${$(Math.abs(arbitrajeData.usdTotal))} en tus transacciones, pero tus Bs sobrantes hoy solo valen $${$(Math.abs(arbitrajeData.saldoConvertido))}. Perdiste porque el Bolívar perdió valor frente al dólar durante el mes.`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Resultado cambiario</div>
                <div className={"text-xl font-bold " + (arbitrajeData.ganancia >= 0 ? "text-green-600" : "text-red-600")}>
                  {arbitrajeData.ganancia >= 0 ? "+" : "-"}${$(Math.abs(arbitrajeData.ganancia))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      )}
      {bancosData.length > 0 && (
      <Card className="p-4 lg:col-span-3">
        <h3 className="mb-2 font-semibold text-sm">🏦 Saldos por banco/cuenta al cierre del mes</h3>
        <div className="flex flex-wrap gap-3">
          {bancosData.map(([banco, saldo]) => (
            <div key={banco} className={"rounded-lg border px-3 py-2 min-w-[140px] flex-1 " + (saldo < 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200" : "bg-green-50 dark:bg-green-950/30 border-green-200")}>
              <div className="text-xs text-muted-foreground">{banco}</div>
              <div className={"text-lg font-bold tabular-nums " + (saldo < 0 ? "text-red-600" : "text-green-600")}>
                {saldo < 0 ? "-" : ""}${$(Math.abs(saldo))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      )}
    </div>
  );
}

function Chip({ label, v, destructive }: { label: string; v: number; destructive?: boolean }) {
  return (
    <div className={"rounded p-2 " + (destructive ? "bg-destructive/10" : "bg-primary/10")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">${$(v)}</div>
    </div>
  );
}

// ---------------- Solvencias ----------------

function normalizeName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

function SolvenciasTab({
  students, setStudents, aulas, setAulas, tx,
}: {
  students: Student[]; setStudents: (n: Student[]) => void;
  aulas: string[]; setAulas: (n: string[]) => void;
  tx: Transaction[];
}) {
  const [filterActividad, setFilterActividad] = useState<"Activo"|"Retirado"|"Todos">("Activo");
  const [q, setQ] = useState("");
  const [nuevaAula, setNuevaAula] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [aulasOpen, setAulasOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [viewTxStudent, setViewTxStudent] = useState<Student | null>(null);

  // último pago por alumno
  const lastPayByStudent = useMemo(() => {
    const map = new Map<string, { fecha: string; monto: number; mes?: string }>();
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      if (!["MIEMBROS","PROBAS","CLASE"].includes(t.categoria)) continue;
      const iso = fechaToIso(t.fecha); if (!iso) continue;
      const desc = normalizeName(t.descripcion);
      for (const s of students) {
        const nn = normalizeName(s.nombre);
        const first = nn.split(" ")[0]; const last = nn.split(" ").slice(-1)[0];
        if (first && last && desc.includes(first) && desc.includes(last)) {
          const prev = map.get(s.nombre);
          if (!prev || iso > (fechaToIso(prev.fecha)||"")) {
            map.set(s.nombre, { fecha: t.fecha, monto: Number(t.montoUsd) || 0, mes: t.mensualidad });
          }
        }
      }
    }
    return map;
  }, [tx, students]);

  const filteredStudents = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students
      .map((st, idx) => ({ st, idx }))
      .filter(({ st }) => {
        if (filterActividad !== "Todos" && (st.actividad ?? "Activo") !== filterActividad) return false;
        if (!s) return true;
        return st.nombre.toLowerCase().includes(s) || st.aulas.some((a)=>a.toLowerCase().includes(s));
      });
  }, [students, q, filterActividad]);

  const visibleStudents = useMemo(() => {
    // Con filtro "Todos" se ven todos; en otro caso solo los que ya tienen pagos
    if (filterActividad === "Todos" || filterActividad === "Retirado") return filteredStudents;
    return filteredStudents.filter(({ st }) => {
      if (st.condicion === "ClasePorClase") return true;
      return lastPayByStudent.has(st.nombre);
    });
  }, [filteredStudents, lastPayByStudent, filterActividad]);

  // Agrupar por aula (usa la primera aula del alumno).
  const grouped = useMemo(() => {
    const g = new Map<string, { st: Student; idx: number }[]>();
    for (const item of visibleStudents) {
      const aula = item.st.aulas[0] || "Sin aula";
      if (!g.has(aula)) g.set(aula, []);
      g.get(aula)!.push(item);
    }
    // Ordenar cada aula: celador primero, luego alfabético.
    for (const arr of g.values()) {
      arr.sort((a,b) => {
        if (!!a.st.celador !== !!b.st.celador) return a.st.celador ? -1 : 1;
        return a.st.nombre.localeCompare(b.st.nombre);
      });
    }
    return Array.from(g.entries()).sort(([,a],[,b]) => a.length - b.length);
  }, [visibleStudents]);

  const addAula = () => {
    const n = nuevaAula.trim(); if (!n) return;
    if (aulas.some((a)=>a.toLowerCase()===n.toLowerCase())) { toast.error("Ya existe"); return; }
    setAulas([...aulas, n]); setNuevaAula(""); toast.success("Aula creada");
  };
  const removeAula = (a: string) => {
    if (!confirm(`Eliminar aula "${a}"?`)) return;
    setAulas(aulas.filter((x)=>x!==a));
    setStudents(students.map((s) => ({ ...s, aulas: s.aulas.filter((x)=>x!==a) })));
  };

  const ymNow = currentYm();
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcDisp, setCalcDisp] = useState("0");
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const calcInput = (v: string) => setCalcDisp(d => d === "0" ? v : d + v);
  const calcOpPress = (op: string) => { setCalcPrev(Number(calcDisp)); setCalcOp(op); setCalcDisp("0"); };
  const calcEq = () => { if (calcOp && calcPrev !== null) { const r = calcOp === "+" ? calcPrev+Number(calcDisp) : calcOp === "-" ? calcPrev-Number(calcDisp) : calcOp === "*" ? calcPrev*Number(calcDisp) : calcPrev/Number(calcDisp); setCalcDisp(String(r)); setCalcOp(null); setCalcPrev(null); } };
  const calcClear = () => { setCalcDisp("0"); setCalcOp(null); setCalcPrev(null); };

  // Ancho uniforme de columnas entre todas las aulas (referencia: nombre más largo)
  const colWidths = useMemo(() => {
    let maxNombre = 0, maxFecha = 0, maxAbono = 0, maxMes = 0;
    for (const s of students) {
      const extras = s.celador ? 100 : 0; // espacio extra para badge "celador"
      maxNombre = Math.max(maxNombre, s.nombre.length * 8 + extras);
    }
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      maxFecha = Math.max(maxFecha, t.fecha.length * 7.5);
      maxAbono = Math.max(maxAbono, String(t.montoUsd || "").length * 8);
      maxMes = Math.max(maxMes, t.mensualidad.length * 7.5);
    }
    return { nombre: 290, fecha: Math.max(maxFecha, 100), abono: Math.max(maxAbono, 70), mes: 70 };
  }, [students, tx]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Miembros y solvencia <span className="ml-2 text-sm font-normal text-muted-foreground">{students.length} participantes</span></h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterActividad} onValueChange={(v)=>setFilterActividad(v as typeof filterActividad)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activos</SelectItem>
                <SelectItem value="Retirado">Retirados</SelectItem>
                <SelectItem value="Todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar…" className="w-56" />
            <Button variant="outline" onClick={()=>setAulasOpen(true)}>Aulas ({aulas.length})</Button>
            <Button onClick={()=>setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Agregar</Button>
          </div>
        </div>
      </Card>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {grouped.map(([aula, list]) => {
        const isCollapsed = collapsed[aula] ?? false;
        return (
        <Card key={aula} className="p-4">
          <button
            type="button"
            onClick={() => setCollapsed({ ...collapsed, [aula]: !isCollapsed })}
            className="mb-3 flex w-full items-center justify-between text-left"
          >
            <h3 className="text-base font-semibold text-primary">
              <span className="mr-2 inline-block w-3">{isCollapsed ? "▶" : "▼"}</span>
              {aula}
            </h3>
            <span className="text-xs text-muted-foreground">{list.length} participantes</span>
          </button>
          {!isCollapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: colWidths.nombre }} />
                <col style={{ width: colWidths.fecha }} />
                <col style={{ width: colWidths.mes }} />
                <col style={{ width: colWidths.abono }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
              </colgroup>
              <thead>
                <tr className="border-b text-center text-muted-foreground text-xs">
                  <th className="p-2 font-medium text-left">Integrante</th>
                  <th className="p-2 font-medium">Último pago</th>
                  <th className="p-2 font-medium">Pagó</th>
                  <th className="p-2 font-medium">Abono</th>
                  <th className="p-2 font-medium">Estado</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ st, idx }) => {
                  const pay = lastPayByStudent.get(st.nombre);
                  const lastYm = pay ? (fechaToIso(pay.fecha) || "").slice(0,7) : null;
                  const deuda = calcularCuotasDebidas(st, lastYm, ymNow, pay?.monto);
                  const esPorClase = st.condicion === "ClasePorClase";
                  // Sin abonos aún → dejar estado en blanco hasta el primer pago.
                  const sinHistorial = !pay && !esPorClase;
                  return (
                    <tr key={idx} className="border-b last:border-0">
                      <td className={"p-2 " + (st.celador ? "font-bold" : "font-medium")}>
                        <button onClick={()=>setViewTxStudent(st)} className="text-left underline-offset-2 hover:underline" title="Ver pagos del integrante">
                          {st.nombre}
                        </button>
                        {st.celador && <span className="ml-2 rounded bg-accent px-1.5 py-px text-[10px] uppercase text-accent-foreground">celador</span>}
                      </td>
                      <td className="p-2 text-xs text-center">{pay?.fecha ?? "—"}</td>
                      <td className="p-2 text-xs text-center">{pay?.mes ? pay.mes.replace("2026","26") : "—"}</td>
                      <td className="p-2 text-center text-xs tabular-nums">{pay ? `$${$(pay.monto)}` : "—"}</td>
                      <td className="p-2 text-xs">
                        {esPorClase
                          ? <span className="rounded bg-muted px-2 py-px">Por clase</span>
                          : sinHistorial
                            ? <span className="text-muted-foreground">—</span>
                            : deuda.meses === 0
                              ? <span className="rounded bg-primary/20 px-2 py-px text-primary">Al día</span>
                              : <span className="rounded bg-destructive/20 px-2 py-px text-destructive text-xs font-bold">
                                  {deuda.meses}M
                                </span>}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {(() => {
                            const cuota = cuotaMensualUSD(st, ymNow);
                            const monto = esPorClase ? precioClase(ymNow) : deuda.totalUSD;
                            const msg = esPorClase
                              ? `Hola ${st.nombre.split(" ")[0]}, te recordamos que la clase de hoy en Nueva Acrópolis tiene un valor de $${$(precioClase(ymNow))}. ¡Te esperamos!`
                              : deuda.meses === 0
                                ? `¡Hola, ${st.nombre.split(" ")[0]}! Te confirmamos que tu cuenta se encuentra al día. Gracias por tu puntualidad y compromiso con Nueva Acrópolis. ¡Un abrazo!`
                                : `Hola ${st.nombre.split(" ")[0]}, junto con saludarte, te informamos que registramos un saldo pendiente en tu cuenta de ${deuda.meses} ${deuda.meses===1?"mensualidad":"mensualidades"} equivalentes a $${$(monto)}. Para mantener activo tu acceso a la escuela y no interrumpir tu aprendizaje, te agradecemos coordinar el pago a la brevedad. Quedamos atentos a cualquier duda o al envío de tu comprobante.`;
                            const url = whatsappUrl(st.telefono, msg);
                            return url ? (<>
                              <a href={url} target="_blank" rel="noopener noreferrer" onClick={()=>logWhatsApp(st.nombre, msg)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                                title={`Enviar WhatsApp a ${st.telefono}`}>
                                <MessageCircle className="h-4 w-4 text-primary" />
                              </a>
                              <button onClick={()=>copyAndLog(msg, st.nombre)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                                title="Copiar mensaje">
                                <ClipboardCopy className="h-3.5 w-3.5" />
                              </button>
                            </>) : (
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground opacity-30 cursor-not-allowed" title="Agrega teléfono desde editar">
                                <MessageCircle className="h-4 w-4" />
                              </span>
                            );
                          })()}
                          <Button variant="ghost" size="icon" onClick={()=>setEditIdx(idx)}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </Card>
        );
      })}
      </div>

      {!grouped.length && (
        <Card className="p-8 text-center text-muted-foreground">Sin resultados</Card>
      )}

      <StudentEditDialog
        open={editIdx !== null}
        student={editIdx != null ? students[editIdx] : null}
        aulas={aulas}
        lastPay={editIdx != null ? lastPayByStudent.get(students[editIdx].nombre) ?? null : null}
        onClose={()=>setEditIdx(null)}
        onSave={(next) => {
          if (editIdx == null) return;
          setStudents(students.map((s,i)=> i===editIdx ? next : s));
          setEditIdx(null); toast.success("Guardado");
        }}
        onDelete={() => {
          if (editIdx == null) return;
          if (!confirm(`Eliminar a ${students[editIdx].nombre}?`)) return;
          setStudents(students.filter((_,i)=> i!==editIdx));
          setEditIdx(null); toast.success("Eliminado");
        }}
      />
      <StudentEditDialog
        open={addOpen} student={null} aulas={aulas} lastPay={null}
        onClose={()=>setAddOpen(false)}
        onSave={(next) => {
          if (students.some((s)=> s.nombre.toLowerCase()===next.nombre.toLowerCase())) {
            toast.error("Ya existe"); return;
          }
          setStudents([...students, next]);
          setAddOpen(false); toast.success("Agregado");
        }}
      />

      <Dialog open={aulasOpen} onOpenChange={setAulasOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aulas / Cursos</DialogTitle></DialogHeader>
          <div className="mb-3 flex gap-2">
            <Input value={nuevaAula} onChange={(e)=>setNuevaAula(e.target.value)}
              onKeyDown={(e)=> e.key==="Enter" && addAula()} placeholder="Nueva aula…" />
            <Button onClick={addAula}><Plus className="mr-2 h-4 w-4" /> Aula</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {aulas.map((a) => (
              <span key={a} className="flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-sm">
                {a}
                <button onClick={()=>removeAula(a)} className="rounded-full p-0.5 hover:bg-destructive/20">
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </span>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <StudentTxDialog student={viewTxStudent} tx={tx} onClose={()=>setViewTxStudent(null)} />
    </div>
  );
}

function StudentTxDialog({ student, tx, onClose }: { student: Student | null; tx: Transaction[]; onClose: () => void }) {
  const [tab, setTab] = useState<"todo"|"ingresos"|"egresos">("todo");
  const filtered = useMemo(() => {
    if (!student) return [];
    return tx.filter((r) => {
      const found = findStudentInDesc(r.descripcion, [student]);
      return found !== null;
    });
  }, [tx, student]);
  const rows = tab === "todo" ? filtered : filtered.filter((r) => r.tipo === (tab==="ingresos"?"Ingreso":"Gasto"));
  const totalUsd = rows.reduce((s, r) => s + (Number(r.montoUsd) || 0), 0);
  return (
    <Dialog open={!!student} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student?.nombre ?? ""}</DialogTitle>
          <p className="text-xs text-muted-foreground">{filtered.length} transacciones</p>
        </DialogHeader>
        <div className="mb-3 flex gap-2">
          {(["todo","ingresos","egresos"] as const).map((t) => (
            <button key={t} onClick={()=>setTab(t)}
              className={"rounded-full px-3 py-1 text-xs " + (tab===t ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {t==="todo"?"Todas":t==="ingresos"?"Solo ingresos":"Solo egresos"}
            </button>
          ))}
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground text-xs">
                <th className="p-1">Fecha</th>
                <th className="p-1">Categoría</th>
                <th className="p-1">Descripción</th>
                <th className="p-1 text-right">Monto</th>
                <th className="p-1 text-right">USD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-1 text-xs">{r.fecha}</td>
                  <td className="p-1 text-xs">{r.categoria}</td>
                  <td className="p-1 text-xs max-w-48 truncate" title={r.descripcion}>{r.descripcion}</td>
                  <td className="p-1 text-right text-xs tabular-nums">{isNaN(Number(r.monto)) ? r.monto : $(Number(r.monto))} {r.moneda==="Bolívares"?"Bs":r.moneda==="Pesos"?"$COP":"$"}</td>
                  <td className="p-1 text-right text-xs tabular-nums">${$(Number(r.montoUsd)||0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t pt-2 text-right text-sm font-semibold">Total USD: ${$(totalUsd)}</div>
      </DialogContent>
    </Dialog>
  );
}

function StudentEditDialog({
  open, student, aulas, lastPay, onClose, onSave, onDelete,
}: {
  open: boolean; student: Student | null; aulas: string[];
  lastPay: { fecha: string; monto: number } | null;
  onClose: () => void; onSave: (s: Student) => void; onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<Student>({ nombre:"", aulas:[], actividad:"Activo", fechaIngreso:"2026-01-01" });
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDraft(student ?? { nombre:"", aulas:[], actividad:"Activo", condicion:"Miembro", fechaIngreso:"2026-01-01" });
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);

  const toggle = (a: string) => setDraft((d) =>
    d.aulas.includes(a) ? { ...d, aulas: d.aulas.filter((x)=>x!==a) } : { ...d, aulas: [...d.aulas, a] });

  const ymNow = currentYm();
  const cuotaAplicada = cuotaMensualUSD(draft, ymNow);
  const lastYm = lastPay ? (fechaToIso(lastPay.fecha) || "").slice(0,7) : null;
  const deuda = calcularCuotasDebidas(draft, lastYm, ymNow, lastPay?.monto);
  const esPorClase = draft.condicion === "ClasePorClase";
  const precioClaseActual = precioClase(ymNow);

  // Placeholder disimulado: si la persona tiene una tarifa fija distinta, usarla como ejemplo;
  // si no, mostrar 20/15/13.50/0 rotando.
  const placeholderExamples = ["$20.00", "$15.00", "$13.50", "$0.00", "$25.00"];
  const placeholder = placeholderExamples[(draft.nombre.length) % placeholderExamples.length];

  return (
    <Dialog open={open} onOpenChange={(v)=> !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{student ? "Modificar integrante" : "Nuevo integrante"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nombre</label>
            <Input value={draft.nombre} onChange={(e)=>setDraft({ ...draft, nombre:e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Aulas</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {aulas.map((a) => (
                <button key={a} type="button" onClick={()=>toggle(a)}
                  className={"rounded-full border px-2.5 py-1 text-xs " +
                    (draft.aulas.includes(a) ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Condición</label>
              <Select value={draft.condicion ?? "Miembro"} onValueChange={(v)=>setDraft({ ...draft, condicion: v as Student["condicion"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Miembro">Miembro</SelectItem>
                  <SelectItem value="Probacionista">Probacionista</SelectItem>
                  <SelectItem value="ClasePorClase">Clase por clase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Actividad</label>
              <Select value={draft.actividad ?? "Activo"} onValueChange={(v)=>setDraft({ ...draft, actividad: v as Student["actividad"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Retirado">Retirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="celador" type="checkbox" checked={!!draft.celador}
              onChange={(e)=>setDraft({ ...draft, celador: e.target.checked })} />
            <label htmlFor="celador" className="text-sm">Es celador(a)</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Cuota mensual (USD)</label>
              <Input type="number" step="0.01" value={draft.cuotaOverride ?? ""}
                placeholder={`ejemplo: ${placeholder}`}
                onChange={(e)=>setDraft({ ...draft, cuotaOverride: e.target.value==="" ? undefined : Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Teléfono (WhatsApp)</label>
              <Input value={draft.telefono ?? ""} placeholder="04141234567"
                onChange={(e)=>setDraft({ ...draft, telefono: e.target.value || undefined })} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Fecha de ingreso</label>
            <Input type="date" value={draft.fechaIngreso ?? "2026-01-01"}
              onChange={(e)=>setDraft({ ...draft, fechaIngreso: e.target.value || undefined })} />
          </div>

          {/* Panel de estado (todo lo derivado se muestra aquí, no en la tabla). */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
            {esPorClase ? (
              <>
                <div>Modalidad: <span className="font-semibold">Pago por clase</span></div>
                <div>Precio referencial por clase ({MESES_ES[Number(ymNow.slice(5,7))-1]} {ymNow.slice(0,4)}): <span className="font-semibold">${$(precioClaseActual)}</span></div>
              </>
            ) : (
              <>
                <div>Cuota aplicada este mes: <span className="font-semibold">${$(cuotaAplicada)}</span></div>
                <div>Meses debidos: <span className="font-semibold">{deuda.meses}</span></div>
                <div>Deuda total: <span className="font-semibold">${$(deuda.totalUSD)}</span></div>
              </>
            )}
            {lastPay && <div>Último pago: {lastPay.fecha} (${$(lastPay.monto)})</div>}
          </div>
        </div>
        <DialogFooter>
          {onDelete && <Button variant="ghost" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4 text-destructive" /> Eliminar</Button>}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={()=>onSave(draft)} disabled={!draft.nombre.trim()}><Save className="mr-2 h-4 w-4" /> Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Tasas BCV ----------------

function TasasBcvTab({ bcv }: { bcv: ReturnType<typeof useBcvRates> }) {
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

  // Limpiar tasas de 2025 al montar; si queda vacío, cargar trimestres del año
  useEffect(() => {
    const cur = Object.keys(bcv.rates).filter((k) => !k.startsWith("2025"));
    bcv.clean((iso) => iso.startsWith("2025"));
    if (!cur.length) cargarTrimestres();
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

// ---------------- Editor simple de listas ----------------

function SimpleListEditor({
  items, setItems, placeholder,
}: { items: string[]; setItems: (n: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim(); if (!v) return;
    if (items.some((x)=> x.toLowerCase()===v.toLowerCase())) { toast.error("Ya existe"); return; }
    setItems([...items, v]); setDraft("");
  };
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Input value={draft} onChange={(e)=>setDraft(e.target.value)}
          onKeyDown={(e)=> e.key==="Enter" && add()} placeholder={placeholder} />
        <Button onClick={add}><Plus className="mr-2 h-4 w-4" /> Agregar</Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((c,i) => (
          <li key={i} className="flex items-center gap-1 rounded-md border bg-card px-2 py-1">
            <Input value={c} onChange={(e)=> setItems(items.map((x,j)=> j===i ? e.target.value : x))}
              className="h-8 border-0 shadow-none focus-visible:ring-0" />
            <Button variant="ghost" size="icon" onClick={()=> setItems(items.filter((_,j)=> j!==i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
