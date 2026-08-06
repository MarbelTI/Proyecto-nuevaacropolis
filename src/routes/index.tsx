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
import { useAulasMeta, useAttendance } from "@/lib/attendance-store";
import AsistenciasTab from "@/components/asistencias-tab";
import { OcrTab } from "@/components/finanzas/OcrTab";
import { TransactionsTab } from "@/components/finanzas/TransactionsTab";
import { ResumenTab } from "@/components/finanzas/ResumenTab";
import { AnalisisTab } from "@/components/finanzas/AnalisisTab";
import { DashboardTab } from "@/components/finanzas/DashboardTab";
import { TasasBcvTab } from "@/components/finanzas/TasasBcvTab";
import SolvenciasTab from "@/components/finanzas/SolvenciasTab";
import { SupabaseSync } from "@/components/finanzas/SupabaseSync";
import { AuthDialog, useAuth } from "@/components/finanzas/AuthDialog";
import { CuentasPendientes } from "@/components/finanzas/CuentasPendientes";
import { MINUTOS_INACTIVIDAD } from "@/lib/api/auth.functions";
import { useIdleLogout } from "@/lib/use-idle-logout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2,
  ScanText,
  MessageCircle,
  LogOut,
  Receipt,
  BarChart3,
  Users,
  CalendarCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

// Nombre legible del rol, para que en una PC compartida se vea de un vistazo
// con qué cuenta se está trabajando.
const ETIQUETA_ROL: Record<string, string> = {
  super_admin: "Administradora",
  finanzas: "Finanzas",
  director: "Dirección (solo lectura)",
  celador_estudios: "Control de estudio",
  celador: "Celador",
  pendiente: "Sin habilitar",
  unknown: "Sin rol",
};

// Estilos del menú lateral: en escritorio cada ítem ocupa toda la fila.
const NAV_ITEM =
  "w-full justify-start gap-2 px-2.5 py-1.5 text-[13px] lg:w-full data-[state=active]:bg-background data-[state=active]:shadow-sm";
const NAV_ICON = "h-3.5 w-3.5 shrink-0";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SISFIA — Sistema Financiero Acropolitano" },
      {
        name: "description",
        content:
          "SISFIA: OCR del libro diario, transacciones, análisis, solvencias y tasas BCV para Nueva Acrópolis Venezuela.",
      },
    ],
  }),
  component: Index,
});

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fechaToIso(fecha: string): string | null {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return fecha;
  return null;
}
const $ = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type WaLogEntry = { fecha: string; alumno: string; mensaje: string };
function readWaLog(): WaLogEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem("wa_log");
    return raw ? (JSON.parse(raw) as WaLogEntry[]) : [];
  } catch {
    return [];
  }
}

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

  const {
    session: auth,
    loading: authLoading,
    login,
    signUp,
    logout,
    forgotPassword,
    updatePassword,
    recoveryOpen,
    setRecoveryOpen,
  } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [aulasMeta, setAulasMeta] = useAulasMeta();
  const [attRecords, setAttRecords] = useAttendance();

  useEffect(() => {
    if (!authLoading && !auth.profile) setAuthDialogOpen(true);
  }, [authLoading, auth.profile]);

  // Cierre por inactividad: el tiempo depende del rol, porque una sesión de
  // finanzas desatendida en la PC compartida es mucho más delicada que la de
  // un celador pasando lista.
  const minutosInactividad = auth.profile ? (MINUTOS_INACTIVIDAD[auth.role] ?? 30) : 0;
  const { segundosRestantes, seguirActivo } = useIdleLogout(minutosInactividad, () => {
    logout();
    toast.info("Se cerró la sesión por inactividad");
  });

  const userInfo = auth.profile
    ? {
        name: auth.profile.full_name,
        canAccessExisting: auth.canAccessExisting,
        canAccessAsistencias: auth.canAccessAsistencias,
        canAccessDiagnostico: auth.canAccessDiagnostico,
        canEditAnyAula: auth.canEditAnyAula,
        readOnly: auth.readOnly,
        role: auth.role,
      }
    : {
        name: "",
        canAccessExisting: false,
        canAccessAsistencias: false,
        canAccessDiagnostico: false,
        canEditAnyAula: false,
        readOnly: false,
        role: "unknown",
      };

  useEffect(() => {
    if (bcvRateFor(bcv.rates, headerDate) != null) return;
    let cancelled = false;
    setHeaderLoading(true);
    setHeaderFetchFailed(false);
    fetchForDate({ data: { isoDate: headerDate } })
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setHeaderFetchFailed(true);
          toast.warning("No se pudo obtener la tasa BCV automáticamente — ingrésala manualmente");
          return;
        }
        const map: Record<string, number> = {};
        const smap: Record<string, string> = {};
        for (const r of res.rows) {
          map[r.isoDate] = r.rate;
          smap[r.isoDate] = res.source;
        }
        bcv.merge(map);
        setBcvSources((prev) => ({ ...prev, ...smap }));
      })
      .catch(() => {
        if (!cancelled) setHeaderFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setHeaderLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerDate]);

  const headerRate = bcvRateFor(bcv.rates, headerDate);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1920px] px-4 py-6">
        <header className="mb-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <img
              src="/logo.jpg"
              alt="Nueva Acrópolis Venezuela"
              className="h-14 w-14 rounded-full ring-2 ring-accent"
            />
            <div className="flex-1 min-w-[220px]">
              <h1 className="text-xl font-bold leading-tight">SISFIA</h1>
              <p className="text-xs opacity-90">
                <ScanText className="mr-1 inline h-3 w-3" />
                Sistema Financiero Acropolitano · Nueva Acrópolis Venezuela
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-2">
              <label className="text-xs opacity-90">Tasa BCV</label>
              <input
                type="date"
                value={headerDate}
                onChange={(e) => setHeaderDate(e.target.value)}
                className="rounded bg-primary-foreground/20 px-2 py-1 text-xs"
              />
              <span className="rounded bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground min-w-[80px] text-center">
                {headerLoading ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : headerRate != null ? (
                  `${$(headerRate)} Bs/$`
                ) : (
                  "—"
                )}
              </span>
              {(() => {
                const src = bcvSources[headerDate];
                if (src?.includes("bcv.org.ve"))
                  return (
                    <span className="rounded bg-green-700/30 px-1.5 py-0.5 text-[10px] text-green-300">
                      BCV oficial
                    </span>
                  );
                if (src === "dolarapi.com")
                  return (
                    <span className="rounded bg-amber-700/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                      Respaldo
                    </span>
                  );
                if (headerFetchFailed)
                  return (
                    <span className="rounded bg-red-700/30 px-1.5 py-0.5 text-[10px] text-red-300">
                      No disponible — ingresa manual
                    </span>
                  );
                return null;
              })()}
            </div>
            <button
              onClick={() => setWaLogOpen(true)}
              className="rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-xs hover:bg-primary-foreground/20"
              title="Historial de mensajes WhatsApp"
            >
              <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
              Log
            </button>
            <div className="flex items-center gap-2">
              {auth.role === "super_admin" && <CuentasPendientes />}
              <button
                onClick={() => setAuthDialogOpen(true)}
                className="rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-left text-xs hover:bg-primary-foreground/20"
                title="Cambiar de usuario"
              >
                {auth.profile ? (
                  <>
                    <span className="block font-medium leading-tight">
                      {auth.profile.full_name}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide opacity-80">
                      {ETIQUETA_ROL[auth.role] ?? auth.role}
                    </span>
                  </>
                ) : (
                  <span className="font-medium">Iniciar sesión</span>
                )}
              </button>
              {auth.profile && (
                <button
                  onClick={logout}
                  className="rounded-lg bg-primary-foreground/10 p-1.5 text-xs hover:bg-primary-foreground/20"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {segundosRestantes != null && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="flex-1">
              Por seguridad, la sesión se cerrará en <b>{segundosRestantes} s</b> por inactividad.
            </span>
            <Button size="sm" onClick={seguirActivo}>
              Sigo aquí
            </Button>
          </div>
        )}

        <AuthDialog
          open={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
          onLogin={login}
          onSignUp={signUp}
          loading={authLoading}
          onForgot={forgotPassword}
          onUpdatePassword={updatePassword}
          recoveryOpen={recoveryOpen}
          onRecoveryOpenChange={setRecoveryOpen}
        />

        {authLoading ? (
          <Card className="p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Verificando sesión...</p>
          </Card>
        ) : !auth.profile ? (
          <Card className="p-12 text-center">
            <h2 className="text-lg font-bold mb-2">Bienvenido a SISFIA</h2>
            <p className="text-muted-foreground mb-4">
              Inicia sesión con tu correo y contraseña para continuar.
            </p>
            <Button onClick={() => setAuthDialogOpen(true)}>Iniciar sesión</Button>
          </Card>
        ) : auth.role === "pendiente" ? (
          <Card className="mx-auto max-w-lg p-10 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h2 className="mb-2 text-lg font-bold">Tu cuenta está esperando aprobación</h2>
            <p className="text-sm text-muted-foreground">
              Se creó una cuenta con <b>{auth.profile.email}</b>, pero todavía no tiene acceso. La
              administradora de la escuela debe habilitarla y asignarte un rol.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Si crees que es un error, avísale a quien administra el sistema. Cuando te habiliten,
              cierra sesión y vuelve a entrar.
            </p>
            <Button variant="outline" className="mt-5" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          </Card>
        ) : (
          <Tabs
            defaultValue={
              userInfo.canAccessExisting
                ? "ocr"
                : userInfo.canAccessAsistencias
                  ? "asistencias"
                  : "ocr"
            }
            orientation="vertical"
            className="flex flex-col gap-4 lg:flex-row lg:items-start"
          >
            {/* Sidebar de navegación: vertical en escritorio, horizontal en móvil */}
            {/* Menú lateral fijo: se queda a la vista al desplazar contenidos
                largos (transacciones, asistencias) sin robarle ancho a la tabla. */}
            <TabsList className="h-auto w-full shrink-0 flex-row flex-wrap justify-start gap-1 rounded-xl p-1.5 lg:sticky lg:top-4 lg:w-44 lg:flex-col lg:flex-nowrap lg:items-stretch lg:self-start">
              {userInfo.canAccessExisting && (
                <TabsTrigger value="ocr" className={NAV_ITEM}>
                  <ScanText className={NAV_ICON} /> Registro OCR
                </TabsTrigger>
              )}
              {userInfo.canAccessExisting && (
                <TabsTrigger value="tx" className={NAV_ITEM}>
                  <Receipt className={NAV_ICON} /> Transacciones
                  <span className="ml-auto rounded bg-background/60 px-1.5 py-0.5 text-[11px] font-normal">
                    {transactions.list.length}
                  </span>
                </TabsTrigger>
              )}
              {userInfo.canAccessExisting && (
                <TabsTrigger value="finanzas" className={NAV_ITEM}>
                  <BarChart3 className={NAV_ICON} /> Finanzas
                </TabsTrigger>
              )}
              {userInfo.canAccessExisting && (
                <TabsTrigger value="solvencias" className={NAV_ITEM}>
                  <Users className={NAV_ICON} /> Solvencias
                </TabsTrigger>
              )}
              {userInfo.canAccessAsistencias && (
                <TabsTrigger value="asistencias" className={NAV_ITEM}>
                  <CalendarCheck className={NAV_ICON} /> Asistencias
                </TabsTrigger>
              )}
            </TabsList>

            <div className="min-w-0 flex-1">
              <TabsContent value="ocr" className="space-y-6">
                <OcrTab
                  ingresos={ingresos}
                  gastos={gastos}
                  bcvRates={bcv.rates}
                  students={students}
                  transactions={transactions}
                />
              </TabsContent>

              <TabsContent value="tx">
                <TransactionsTab
                  tx={transactions}
                  ingresos={ingresos}
                  gastos={gastos}
                  bancos={bancos}
                  setIngresos={setIngresos}
                  setGastos={setGastos}
                  setBancos={setBancos}
                  bcvRates={bcv.rates}
                  bcvSources={bcvSources}
                  students={students}
                  aulas={aulas}
                  setStudents={setStudents}
                />
              </TabsContent>

              <TabsContent value="finanzas">
                <div className="mb-4">
                  <SupabaseSync
                    transactions={transactions}
                    bcvRates={bcv}
                    students={{ list: students, setAll: setStudents }}
                  />
                </div>
                <Tabs defaultValue="resumen" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="resumen">Resumen mensual</TabsTrigger>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="analisis">Análisis anual</TabsTrigger>
                    <TabsTrigger value="bcv">Tasas BCV</TabsTrigger>
                  </TabsList>
                  <TabsContent value="resumen">
                    <ResumenTab
                      tx={transactions}
                      ingresos={ingresos}
                      gastos={gastos}
                      bancos={bancos}
                      bcvRates={bcv.rates}
                    />
                  </TabsContent>
                  <TabsContent value="dashboard">
                    <DashboardTab
                      tx={transactions.list}
                      ingresos={ingresos}
                      gastos={gastos}
                      bcvRates={bcv.rates}
                      students={students}
                    />
                  </TabsContent>
                  <TabsContent value="analisis">
                    <AnalisisTab
                      tx={transactions.list}
                      ingresos={ingresos}
                      gastos={gastos}
                      bcvRates={bcv.rates}
                    />
                  </TabsContent>
                  <TabsContent value="bcv">
                    <TasasBcvTab bcv={bcv} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="solvencias">
                <SolvenciasTab
                  students={students}
                  setStudents={setStudents}
                  aulas={aulas}
                  setAulas={setAulas}
                  tx={transactions.list}
                />
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
            </div>
          </Tabs>
        )}
      </div>

      <Dialog open={waLogOpen} onOpenChange={setWaLogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Historial de mensajes WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end -mt-2 mb-2">
            <button
              onClick={() => {
                localStorage.removeItem("wa_log");
                toast.success("Log eliminado");
              }}
              className="text-xs text-destructive hover:underline"
            >
              Eliminar todos los mensajes
            </button>
          </div>
          <div key={waLogKey} className="space-y-2 max-h-[60vh] overflow-y-auto text-sm">
            {(() => {
              const raw = readWaLog();
              if (!raw.length)
                return <p className="text-muted-foreground">Sin mensajes registrados</p>;
              const log = [...raw].reverse();
              return log.map((e: { fecha: string; alumno: string; mensaje: string }, i: number) => {
                const origIdx = raw.length - 1 - i;
                return (
                  <div key={i} className="rounded border p-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="font-medium">{e.alumno}</span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(e.fecha).toLocaleString("es-VE")}</span>
                        <button
                          onClick={() => {
                            const updated = JSON.parse(localStorage.getItem("wa_log") || "[]");
                            updated.splice(origIdx, 1);
                            localStorage.setItem("wa_log", JSON.stringify(updated));
                            setWaLogKey((k) => k + 1);
                            toast.success("Mensaje eliminado");
                          }}
                          className="text-destructive hover:underline"
                          title="Eliminar este mensaje"
                        >
                          ✕
                        </button>
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
