import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchBcvForDate } from "@/lib/bcv.functions";
import { getAccessToken } from "@/lib/supabase";
import {
  bcvRateFor,
  useBcvRates,
  useEditableAulas,
  useEditableList,
  useEditableStudents,
  useTransactions,
  type BcvRates,
} from "@/lib/lists-store";
import { useAulasMeta, useAttendance } from "@/lib/attendance-store";
import { NOMBRE_APP, SUBTITULO, TITULO_PAGINA, DESCRIPCION } from "@/lib/branding";
import AsistenciasTab from "@/components/asistencias-tab";
import { OcrTab, type PreviewItem } from "@/components/finanzas/OcrTab";
import type { Entry } from "@/lib/ocr.functions";
import { TransactionsTab } from "@/components/finanzas/TransactionsTab";
import { ResumenTab } from "@/components/finanzas/ResumenTab";
import { AnalisisTab } from "@/components/finanzas/AnalisisTab";
import { DashboardTab } from "@/components/finanzas/DashboardTab";
import { TasasBcvTab } from "@/components/finanzas/TasasBcvTab";
import SolvenciasTab from "@/components/finanzas/SolvenciasTab";
import { SupabaseSync } from "@/components/finanzas/SupabaseSync";
import { PrestamosTab } from "@/components/finanzas/PrestamosTab";
import { TransactionEditDialog } from "@/components/finanzas/TransactionEditDialog";
import { AuthDialog, useAuth } from "@/components/finanzas/AuthDialog";
import { PanelUsuarios } from "@/components/finanzas/PanelUsuarios";
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
  ChevronDown,
  Cloud,
  WifiOff,
} from "lucide-react";
import { useEstaEnLinea } from "@/lib/conexion";
import { toast } from "sonner";

// Nombre legible del rol, para que en una PC compartida se vea de un vistazo
// con qué cuenta se está trabajando.
const ETIQUETA_ROL: Record<string, string> = {
  super_admin: "Tecnologías",
  finanzas: "Finanzas",
  director: "Dirección (solo lectura)",
  celador_estudios: "Control de estudio",
  celador: "Celador",
  pendiente: "Sin habilitar",
  unknown: "Sin rol",
};

// Estilos del menú lateral: en escritorio cada ítem ocupa toda la fila.
// El ancho es la clave de que el menú cambie de forma según la pantalla.
//
// En escritorio (lg) el menú es una columna lateral y cada opción ocupa todo
// el ancho de esa columna. En pantallas estrechas —un teléfono, o la ventana
// a media pantalla— el menú pasa a ser una barra horizontal, y ahí cada opción
// debe medir lo que mida su texto: con w-full se apilarían una debajo de otra
// y volveríamos a tener una columna, solo que ocupando el ancho entero.
const NAV_ITEM =
  "w-auto justify-start gap-2 px-2.5 py-1.5 text-[13px] lg:w-full data-[state=active]:bg-background data-[state=active]:shadow-sm";
const NAV_ICON = "h-3.5 w-3.5 shrink-0";
// Las vistas de Finanzas cuelgan del grupo: van sangradas y algo más chicas
// para que se lea de un vistazo que dependen de él.
const NAV_SUB =
  "w-auto justify-start gap-2 py-1 pl-3 pr-2 text-[12px] text-muted-foreground lg:w-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: TITULO_PAGINA }, { name: "description", content: DESCRIPCION }],
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
  /** Transacción que se está corrigiendo desde la pestaña de Préstamos. */
  const [prestamoEnEdicion, setPrestamoEnEdicion] = useState<string | null>(null);

  /**
   * El trabajo del lector OCR vive aquí, no dentro de OcrTab.
   *
   * Radix desmonta el contenido de la pestaña inactiva. Con el estado dentro
   * del componente, ir un momento a Transacciones —a comprobar si un pago ya
   * estaba registrado, por ejemplo— borraba las hojas ya escaneadas y
   * corregidas a mano. Subiéndolo un nivel, el trabajo sobrevive al cambio de
   * pestaña y solo se vacía cuando se guarda o se pulsa vaciar.
   */
  const [ocrEntries, setOcrEntries] = useState<Entry[]>([]);
  const [ocrPreviews, setOcrPreviews] = useState<PreviewItem[]>([]);
  const enLinea = useEstaEnLinea();
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
  const [finanzasAbierto, setFinanzasAbierto] = useState(true);
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
    if (bcvRateFor(bcv.ratesDolar, headerDate) != null) return;
    let cancelled = false;
    setHeaderLoading(true);
    setHeaderFetchFailed(false);
    getAccessToken()
      .then((accessToken) => fetchForDate({ data: { isoDate: headerDate, accessToken } }))
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setHeaderFetchFailed(true);
          toast.warning("No se pudo obtener la tasa BCV automáticamente — ingrésala manualmente");
          return;
        }
        const map: BcvRates = {};
        const smap: Record<string, string> = {};
        for (const r of res.rows) {
          map[r.isoDate] = r.euro != null ? { dolar: r.dolar, euro: r.euro } : { dolar: r.dolar };
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

  const headerRate = bcvRateFor(bcv.ratesDolar, headerDate);
  const headerRateEuro = bcvRateFor(bcv.ratesEuro, headerDate);

  return (
    <div className="min-h-screen bg-background">
      {/*
        Sin internet la aplicación pasa a solo lectura, y hay que decirlo bien
        claro: los datos viven en el navegador y solo llegan a la nube cuando
        alguien pulsa «Subir a nube». Trabajar sin conexión sería trabajar para
        nada, y peor, sin saberlo.

        Va arriba del todo y fijo, no como un aviso que se cierra: mientras la
        limitación esté vigente, tiene que estar a la vista.
      */}
      {!enLinea && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Sin conexión a internet. Puedes consultar todo, pero no registrar ni modificar: lo que
            escribieras ahora no se guardaría en la nube y se perdería.
          </span>
        </div>
      )}
      <div className="mx-auto max-w-[1920px] px-4 py-6">
        <header className="mb-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg">
          {/* Dos filas en vez de una sola: con todo en una fila, el widget de
              Tasas BCV competía por espacio con el logo/título y el acceso a
              sesión, y en un celular (~360-390px) el segundo perdía y quedaba
              cortado fuera de pantalla. Cada fila envuelve por su cuenta. */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <img
                  src="/logo.jpg"
                  alt="Nueva Acrópolis Venezuela"
                  className="h-14 w-14 shrink-0 rounded-full ring-2 ring-accent"
                />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold leading-tight">{NOMBRE_APP}</h1>
                  <p className="text-xs opacity-90">
                    <ScanText className="mr-1 inline h-3 w-3" />
                    {SUBTITULO}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setWaLogOpen(true)}
                  className="rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-xs hover:bg-primary-foreground/20"
                  title="Historial de mensajes WhatsApp"
                >
                  <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
                  Log
                </button>
                {auth.role === "super_admin" && <PanelUsuarios transactions={transactions} />}
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

            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-2">
              <label className="text-xs opacity-90">Tasas BCV</label>
              <input
                type="date"
                value={headerDate}
                onChange={(e) => setHeaderDate(e.target.value)}
                className="rounded bg-primary-foreground/20 px-2 py-1 text-xs"
              />
              <span className="rounded bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground text-center">
                {headerLoading ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : headerRate != null ? (
                  `${$(headerRate)} Bs/$`
                ) : (
                  "—"
                )}
              </span>
              <span className="rounded bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground text-center">
                {headerLoading ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : headerRateEuro != null ? (
                  `${$(headerRateEuro)} Bs/€`
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
            <h2 className="text-lg font-bold mb-2">Bienvenido a {NOMBRE_APP}</h2>
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
                  <span className="rounded bg-background/60 px-1.5 py-0.5 text-[11px] font-normal lg:ml-auto">
                    {transactions.list.length}
                  </span>
                </TabsTrigger>
              )}
              {/* Finanzas agrupa sus cuatro vistas aquí mismo. Antes vivían en
                  una segunda fila de pestañas dentro del contenido, que era
                  justo el menú viejo que el lateral vino a reemplazar. */}
              {userInfo.canAccessExisting && (
                <>
                  <button
                    type="button"
                    onClick={() => setFinanzasAbierto((v) => !v)}
                    aria-expanded={finanzasAbierto}
                    className="flex w-auto items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium hover:bg-background/60 lg:w-full"
                  >
                    <BarChart3 className={NAV_ICON} /> Finanzas
                    <ChevronDown
                      className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform ${
                        finanzasAbierto ? "" : "-rotate-90"
                      }`}
                    />
                  </button>
                  {finanzasAbierto && (
                    /*
                      En la barra horizontal, el submenú se va al final y ocupa
                      una fila entera para él solo (order-last + w-full). Si no,
                      se metía entre "Finanzas" y el resto y empujaba Solvencias
                      y Escolásticas a la fila de abajo: abrir Finanzas movía de
                      sitio opciones que no tenían nada que ver.

                      En la columna lateral de escritorio no hace falta: ahí el
                      submenú cuelga debajo de Finanzas, que es donde toca.
                    */
                    <div className="order-last flex w-full flex-row flex-wrap gap-1 lg:order-none lg:w-auto lg:flex-col lg:flex-nowrap">
                      <TabsTrigger value="resumen" className={NAV_SUB}>
                        Resumen mensual
                      </TabsTrigger>
                      <TabsTrigger value="dashboard" className={NAV_SUB}>
                        Dashboard
                      </TabsTrigger>
                      <TabsTrigger value="analisis" className={NAV_SUB}>
                        Análisis anual
                      </TabsTrigger>
                      <TabsTrigger value="prestamos" className={NAV_SUB}>
                        Préstamos
                      </TabsTrigger>
                      <TabsTrigger value="bcv" className={NAV_SUB}>
                        Tasas BCV
                      </TabsTrigger>
                    </div>
                  )}
                </>
              )}
              {userInfo.canAccessExisting && (
                <TabsTrigger value="solvencias" className={NAV_ITEM}>
                  <Users className={NAV_ICON} /> Solvencias
                </TabsTrigger>
              )}
              {userInfo.canAccessAsistencias && (
                <TabsTrigger value="asistencias" className={NAV_ITEM}>
                  <CalendarCheck className={NAV_ICON} /> Escolásticas
                </TabsTrigger>
              )}
              {/* Copiar la base entera va aparte y solo para la administradora:
                  "Cargar desde nube" reemplaza lo que haya en este equipo. */}
              {auth.role === "super_admin" && (
                <TabsTrigger value="nube" className={NAV_ITEM}>
                  <Cloud className={NAV_ICON} /> Copia en la nube
                </TabsTrigger>
              )}
            </TabsList>

            <div className="min-w-0 flex-1">
              <TabsContent value="ocr" className="space-y-6">
                <OcrTab
                  ingresos={ingresos}
                  gastos={gastos}
                  bcvRates={bcv.ratesDolar}
                  bcvRatesEuro={bcv.ratesEuro}
                  students={students}
                  transactions={transactions}
                  entries={ocrEntries}
                  setEntries={setOcrEntries}
                  previews={ocrPreviews}
                  setPreviews={setOcrPreviews}
                />
              </TabsContent>

              {/* forceMount: Radix desmonta el contenido de la pestaña inactiva
                  por defecto, y con eso Transacciones perdía el filtro de
                  fecha y la fila enfocada en verde cada vez que se iba a otra
                  pestaña (ej. Solvencias) y se volvía. Con forceMount queda
                  montada siempre y solo se oculta con CSS. */}
              <TabsContent value="tx" forceMount className="data-[state=inactive]:hidden">
                <TransactionsTab
                  tx={transactions}
                  ingresos={ingresos}
                  gastos={gastos}
                  bancos={bancos}
                  setIngresos={setIngresos}
                  setGastos={setGastos}
                  setBancos={setBancos}
                  bcvRates={bcv.ratesDolar}
                  bcvRatesEuro={bcv.ratesEuro}
                  bcvSources={bcvSources}
                  students={students}
                  aulas={aulas}
                  setStudents={setStudents}
                  readOnly={userInfo.readOnly}
                />
              </TabsContent>

              {/* forceMount: mismo motivo que en "tx" — sin esto, ir a Transacciones
                  y volver reseteaba el mes elegido y la fila enfocada. */}
              <TabsContent value="resumen" forceMount className="data-[state=inactive]:hidden">
                <ResumenTab
                  tx={transactions}
                  ingresos={ingresos}
                  gastos={gastos}
                  bancos={bancos}
                  bcvRates={bcv.ratesDolar}
                  bcvRatesEuro={bcv.ratesEuro}
                />
              </TabsContent>

              <TabsContent value="dashboard">
                <DashboardTab
                  tx={transactions.list}
                  ingresos={ingresos}
                  gastos={gastos}
                  bcvRates={bcv.ratesDolar}
                  students={students}
                />
              </TabsContent>

              <TabsContent value="analisis">
                <AnalisisTab
                  tx={transactions.list}
                  ingresos={ingresos}
                  gastos={gastos}
                  bcvRates={bcv.ratesDolar}
                />
              </TabsContent>

              <TabsContent value="prestamos">
                <PrestamosTab
                  tx={transactions.list}
                  students={students}
                  onEditar={setPrestamoEnEdicion}
                />
                {/* El mismo formulario de Transacciones, para corregir sin
                    tener que salir de Préstamos y buscar la fila a mano. */}
                <TransactionEditDialog
                  editing={transactions.list.find((t) => t.id === prestamoEnEdicion) ?? null}
                  onClose={() => setPrestamoEnEdicion(null)}
                  ingresos={ingresos}
                  gastos={gastos}
                  bancos={bancos}
                  bcvRates={bcv.ratesDolar}
                  bcvRatesEuro={bcv.ratesEuro}
                  bcvSources={bcvSources}
                  students={students}
                  onSave={(next) => {
                    transactions.replace(next.id, next);
                    setPrestamoEnEdicion(null);
                    toast.success("Transacción actualizada");
                  }}
                />
              </TabsContent>

              <TabsContent value="bcv">
                <TasasBcvTab bcv={bcv} />
              </TabsContent>

              <TabsContent value="nube" className="space-y-4">
                <Card className="p-6">
                  <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
                    <Cloud className="h-5 w-5" /> Copia en la nube
                  </h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Hoy los datos viven en <b>este navegador y esta computadora</b>. Si se borra el
                    historial o se daña el equipo, se pierden. Aquí se copian a Supabase, que es la
                    base de datos en internet.
                  </p>
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="mb-1 text-sm font-medium">⬆️ Subir a nube</p>
                      <p className="text-xs text-muted-foreground">
                        Guarda en internet lo que tienes en esta computadora: transacciones, tasas y
                        alumnos. Es la copia de seguridad. No borra nada.
                      </p>
                    </div>
                    <div className="rounded-lg border border-destructive/40 p-3">
                      <p className="mb-1 text-sm font-medium text-destructive">
                        ⬇️ Cargar desde nube
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Al revés: trae lo que hay en internet y <b>reemplaza</b> lo de esta
                        computadora. Úsalo solo al empezar en un equipo nuevo. Si tienes cambios sin
                        subir, se pierden. Te pide confirmación antes.
                      </p>
                    </div>
                  </div>
                  <SupabaseSync
                    transactions={transactions}
                    bcvRates={bcv}
                    students={{ list: students, setAll: setStudents }}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="solvencias">
                <SolvenciasTab
                  students={students}
                  setStudents={setStudents}
                  aulas={aulas}
                  setAulas={setAulas}
                  tx={transactions.list}
                  attAulas={aulasMeta}
                  attRecords={attRecords}
                  puedeGestionarCuotas={
                    auth.role === "super_admin" || auth.role === "finanzas"
                  }
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
                    students={students}
                    tx={transactions.list}
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
