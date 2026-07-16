import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchBcvForDate } from "@/lib/bcv.functions";
import {
  bcvRateFor,
  useBcvRates,
  useEditableAulas,
  useEditableList,
  useEditableStudents,
  useTransactions,
} from "@/lib/lists-store";
import {
  useAulasMeta,
  useAttendance,
  useCurrentUser,
  getUserInfo,
} from "@/lib/attendance-store";
import AsistenciasTab from "@/components/asistencias-tab";
import { OcrTab } from "@/components/finanzas/OcrTab";
import { TransactionsTab } from "@/components/finanzas/TransactionsTab";
import { ResumenTab } from "@/components/finanzas/ResumenTab";
import { AnalisisTab } from "@/components/finanzas/AnalisisTab";
import { TasasBcvTab } from "@/components/finanzas/TasasBcvTab";
import SolvenciasTab from "@/components/finanzas/SolvenciasTab";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, ScanText, MessageCircle,
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

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fechaToIso(fecha: string): string | null {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return fecha;
  return null;
}
const $ = (n: number) => n.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});

function Index() {
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
  const [headerFetchFailed, setHeaderFetchFailed] = useState(false);
  const [bcvSources, setBcvSources] = useState<Record<string, string>>({});
  const fetchForDate = useServerFn(fetchBcvForDate);

  const [currentUser, setCurrentUser] = useCurrentUser();
  const [aulasMeta, setAulasMeta] = useAulasMeta();
  const [attRecords, setAttRecords] = useAttendance();
  const userInfo = getUserInfo(currentUser, aulasMeta);
  const [userDialogOpen, setUserDialogOpen] = useState(!currentUser);

  useEffect(() => {
    if (bcvRateFor(bcv.rates, headerDate) != null) return;
    let cancelled = false;
    setHeaderLoading(true);
    setHeaderFetchFailed(false);
    fetchForDate({ data: { isoDate: headerDate } })
      .then((res) => {
        if (cancelled) return;
        if (!res) { setHeaderFetchFailed(true); toast.warning("No se pudo obtener la tasa BCV automáticamente — ingrésala manualmente"); return; }
        const map: Record<string, number> = {};
        const smap: Record<string, string> = {};
        for (const r of res.rows) { map[r.isoDate] = r.rate; smap[r.isoDate] = res.source; }
        bcv.merge(map);
        setBcvSources((prev) => ({ ...prev, ...smap }));
      })
      .catch(() => { if (!cancelled) setHeaderFetchFailed(true); })
      .finally(() => { if (!cancelled) setHeaderLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerDate]);

  const headerRate = bcvRateFor(bcv.rates, headerDate);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1920px] px-4 py-6">
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

            <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-2">
              <label className="text-xs opacity-90">Tasa BCV</label>
              <input type="date" value={headerDate}
                onChange={(e) => setHeaderDate(e.target.value)}
                className="rounded bg-primary-foreground/20 px-2 py-1 text-xs" />
              <span className="rounded bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground min-w-[80px] text-center">
                {headerLoading ? <Loader2 className="inline h-3 w-3 animate-spin" /> :
                  headerRate != null ? `${$(headerRate)} Bs/$` : "—"}
              </span>
              {(() => {
                const src = bcvSources[headerDate];
                if (src?.includes("bcv.org.ve"))
                  return <span className="rounded bg-green-700/30 px-1.5 py-0.5 text-[10px] text-green-300">BCV oficial</span>;
                if (src === "dolarapi.com")
                  return <span className="rounded bg-amber-700/30 px-1.5 py-0.5 text-[10px] text-amber-300">Respaldo</span>;
                if (headerFetchFailed)
                  return <span className="rounded bg-red-700/30 px-1.5 py-0.5 text-[10px] text-red-300">No disponible — ingresa manual</span>;
                return null;
              })()}
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
            <OcrTab
              ingresos={ingresos} gastos={gastos}
              bcvRates={bcv.rates} students={students}
              transactions={transactions}
            />
          </TabsContent>

          <TabsContent value="tx">
            <TransactionsTab tx={transactions} ingresos={ingresos} gastos={gastos} bancos={bancos}
              setIngresos={setIngresos} setGastos={setGastos} setBancos={setBancos} bcvRates={bcv.rates}
              bcvSources={bcvSources}
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
                <ResumenTab tx={transactions} ingresos={ingresos} gastos={gastos} bancos={bancos} bcvRates={bcv.rates} />
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
                const origIdx = raw.length - 1 - i;
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
