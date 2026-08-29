import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCuentasPendientes,
  listarTodasLasCuentas,
  resolverCuentaPendiente,
  listarActividad,
  type PerfilPendiente,
  type PerfilCompleto,
  type ActivityLogRow,
  type UserRole,
} from "@/lib/api/auth.functions";
import {
  listarPapelera,
  restaurarDePapelera,
  type PapeleraRow,
} from "@/lib/api/transactions.functions";
import type { Transaction, useTransactions } from "@/lib/lists-store";
import { getAccessToken } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, Users, Mail, Trash2, History } from "lucide-react";
import { toast } from "sonner";

const ROLES: { value: Exclude<UserRole, "pendiente" | "unknown">; label: string }[] = [
  { value: "celador", label: "Celador (su aula)" },
  { value: "celador_estudios", label: "Control de estudio" },
  { value: "finanzas", label: "Finanzas" },
  { value: "director", label: "Director (solo lectura)" },
  { value: "super_admin", label: "Administrador total" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-VE");
  } catch {
    return iso;
  }
}

/**
 * Panel de super_admin: cuentas del sistema (aprobar, ver a todas, mandar un
 * enlace de contraseña), registro de actividad y papelera de transacciones.
 *
 * Reemplaza a `CuentasPendientes.tsx` — mismo patrón de server function +
 * tabla + `Select` de rol, ampliado con pestañas.
 */
export function PanelUsuarios({
  transactions,
}: {
  /** Para restaurar una fila de la papelera directo a la tabla de Transacciones. */
  transactions: Pick<ReturnType<typeof useTransactions>, "list" | "replaceAll">;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"cuentas" | "actividad" | "papelera">("cuentas");

  const [cargandoCuentas, setCargandoCuentas] = useState(false);
  const [pendientes, setPendientes] = useState<PerfilPendiente[]>([]);
  const [cuentas, setCuentas] = useState<PerfilCompleto[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});

  const [cargandoActividad, setCargandoActividad] = useState(false);
  const [actividad, setActividad] = useState<ActivityLogRow[]>([]);
  const [filtroPersona, setFiltroPersona] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const [cargandoPapelera, setCargandoPapelera] = useState(false);
  const [papelera, setPapelera] = useState<PapeleraRow[]>([]);

  const listarPendientesFn = useServerFn(listarCuentasPendientes);
  const listarCuentasFn = useServerFn(listarTodasLasCuentas);
  const resolverFn = useServerFn(resolverCuentaPendiente);
  const listarActividadFn = useServerFn(listarActividad);
  const listarPapeleraFn = useServerFn(listarPapelera);
  const restaurarFn = useServerFn(restaurarDePapelera);

  const cargarCuentas = useCallback(async () => {
    setCargandoCuentas(true);
    try {
      const accessToken = await getAccessToken();
      const [pend, todas] = await Promise.all([
        listarPendientesFn({ data: { accessToken } }),
        listarCuentasFn({ data: { accessToken } }),
      ]);
      if (pend.ok) setPendientes(pend.data);
      if (todas.ok) setCuentas(todas.data);
    } catch {
      /* silencioso: el panel es secundario */
    } finally {
      setCargandoCuentas(false);
    }
  }, [listarPendientesFn, listarCuentasFn]);

  const cargarActividad = useCallback(async () => {
    setCargandoActividad(true);
    try {
      const accessToken = await getAccessToken();
      const res = await listarActividadFn({ data: { accessToken } });
      if (res.ok) setActividad(res.data);
    } catch {
      /* silencioso */
    } finally {
      setCargandoActividad(false);
    }
  }, [listarActividadFn]);

  const cargarPapelera = useCallback(async () => {
    setCargandoPapelera(true);
    try {
      const accessToken = await getAccessToken();
      const res = await listarPapeleraFn({ data: { accessToken } });
      if (res.ok) setPapelera(res.data);
    } catch {
      /* silencioso */
    } finally {
      setCargandoPapelera(false);
    }
  }, [listarPapeleraFn]);

  useEffect(() => {
    if (!open) return;
    if (tab === "cuentas") cargarCuentas();
    else if (tab === "actividad") cargarActividad();
    else cargarPapelera();
  }, [open, tab, cargarCuentas, cargarActividad, cargarPapelera]);

  const decidir = async (p: PerfilPendiente, aprobar: boolean) => {
    const rol = (roles[p.id] ?? "celador") as (typeof ROLES)[number]["value"];
    if (!aprobar && !confirm(`¿Rechazar el acceso de ${p.email}? Podrás habilitarla más adelante.`))
      return;
    const accessToken = await getAccessToken();
    const res = await resolverFn({ data: { userId: p.id, aprobar, role: rol, accessToken } });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo actualizar");
      return;
    }
    toast.success(aprobar ? `${p.email} habilitada como ${rol}` : `${p.email} rechazada`);
    cargarCuentas();
  };

  const enviarEnlace = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) toast.error(`No se pudo enviar: ${error.message}`);
    else toast.success(`Enlace de restablecer contraseña enviado a ${email}`);
  };

  /**
   * Restaurar usa `replaceAll`, no `append`: `append` le asigna un `id`
   * nuevo a cada fila (ver `useTransactions()` en lists-store.ts), y aquí
   * hace falta conservar el `id` original — si la fila se llega a subir a
   * la nube más adelante, debe seguir siendo la misma transacción, no una
   * copia nueva. `replaceAll` reordena por fecha sola, no descarta nada.
   */
  const restaurar = async (row: PapeleraRow) => {
    const accessToken = await getAccessToken();
    const res = await restaurarFn({ data: { id: row.id, accessToken } });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo restaurar");
      return;
    }
    const restaurada = {
      ...res.transaction,
      tipo: res.transaction.tipo as Transaction["tipo"],
      moneda: res.transaction.moneda as Transaction["moneda"],
      revisar: res.revisar ?? "",
    } satisfies Transaction;
    transactions.replaceAll([...transactions.list, restaurada]);
    toast.success("Fila restaurada en Transacciones");
    setPapelera((prev) => prev.filter((r) => r.id !== row.id));
  };

  const actividadFiltrada = actividad.filter((a) => {
    if (filtroPersona && !a.actor_email.toLowerCase().includes(filtroPersona.toLowerCase()))
      return false;
    const dia = a.created_at.slice(0, 10);
    if (filtroDesde && dia < filtroDesde) return false;
    if (filtroHasta && dia > filtroHasta) return false;
    return true;
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-xs font-medium hover:bg-primary-foreground/20"
        title="Cuentas, actividad y papelera"
      >
        <Users className="h-3.5 w-3.5" />
        Usuarios
        {pendientes.length > 0 && (
          <span className="rounded-full bg-amber-500/90 px-1.5 text-[10px] font-bold text-white">
            {pendientes.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Panel de usuarios
            </DialogTitle>
          </DialogHeader>

          <div className="mb-1 flex gap-2">
            {(["cuentas", "actividad", "papelera"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  "rounded-full px-3 py-1 text-xs " +
                  (tab === t ? "bg-primary text-primary-foreground" : "bg-muted")
                }
              >
                {t === "cuentas" ? "Cuentas" : t === "actividad" ? "Actividad" : "Papelera"}
              </button>
            ))}
          </div>

          {tab === "cuentas" && (
            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {cargandoCuentas ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {pendientes.length > 0 && (
                    <div className="mb-2 space-y-2">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Esperando aprobación
                      </p>
                      {pendientes.map((p) => (
                        <Card key={p.id} className="flex flex-wrap items-center gap-2 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.email}</p>
                            {p.created_at && (
                              <p className="text-[11px] text-muted-foreground">
                                Se registró el {fmt(p.created_at)}
                              </p>
                            )}
                          </div>
                          <Select
                            value={roles[p.id] ?? "celador"}
                            onValueChange={(v) => setRoles((prev) => ({ ...prev, [p.id]: v }))}
                          >
                            <SelectTrigger className="h-8 w-48 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => decidir(p, true)}>
                            Habilitar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => decidir(p, false)}>
                            Rechazar
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}

                  <p className="text-xs font-medium text-muted-foreground">Todas las cuentas</p>
                  {cuentas
                    .filter((c) => c.aprobado)
                    .map((c) => (
                      <Card key={c.id} className="flex flex-wrap items-center gap-2 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.email}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {ROLE_LABEL[c.role] ?? c.role} · última conexión: {fmt(c.ultimo_acceso)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => enviarEnlace(c.email)}
                          title="Le llega un correo de Supabase; ella pone su propia contraseña"
                        >
                          <Mail className="mr-1.5 h-3.5 w-3.5" />
                          Enviar enlace
                        </Button>
                      </Card>
                    ))}
                  {!cargandoCuentas && cuentas.length === 0 && pendientes.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No hay cuentas registradas.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "actividad" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Filtrar por correo…"
                  value={filtroPersona}
                  onChange={(e) => setFiltroPersona(e.target.value)}
                  className="h-8 max-w-[220px]"
                />
                <Input
                  type="date"
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                  className="h-8 w-36"
                />
                <Input
                  type="date"
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                  className="h-8 w-36"
                />
              </div>
              <div className="max-h-[50vh] overflow-auto rounded-lg border">
                <table className="w-full min-w-[500px] text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-1.5 font-medium">Cuándo</th>
                      <th className="px-2 py-1.5 font-medium">Quién</th>
                      <th className="px-2 py-1.5 font-medium">Acción</th>
                      <th className="px-2 py-1.5 font-medium">Resumen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoActividad ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                        </td>
                      </tr>
                    ) : actividadFiltrada.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          Sin actividad registrada.
                        </td>
                      </tr>
                    ) : (
                      actividadFiltrada.map((a) => (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="whitespace-nowrap px-2 py-1">{fmt(a.created_at)}</td>
                          <td className="px-2 py-1">{a.actor_email}</td>
                          <td className="px-2 py-1">
                            <History className="mr-1 inline h-3 w-3 text-muted-foreground" />
                            {a.accion}
                          </td>
                          <td className="px-2 py-1 text-muted-foreground">{a.resumen || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "papelera" && (
            <div className="max-h-[55vh] overflow-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-1.5 font-medium">Eliminada</th>
                    <th className="px-2 py-1.5 font-medium">Por</th>
                    <th className="px-2 py-1.5 font-medium">Acción</th>
                    <th className="px-2 py-1.5 font-medium">Fecha / Descripción</th>
                    <th className="px-2 py-1.5 font-medium text-right">Monto</th>
                    <th className="px-1 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {cargandoPapelera ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : papelera.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        <Trash2 className="mx-auto mb-1 h-5 w-5" />
                        La papelera está vacía.
                      </td>
                    </tr>
                  ) : (
                    papelera.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-2 py-1">{fmt(r.eliminado_en)}</td>
                        <td className="px-2 py-1">{r.eliminado_por_email}</td>
                        <td className="px-2 py-1">{r.accion}</td>
                        <td className="max-w-[220px] truncate px-2 py-1" title={r.descripcion}>
                          {r.fecha} · {r.descripcion}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">
                          {r.monto} {r.moneda}
                        </td>
                        <td className="px-1 py-1">
                          <Button size="sm" variant="outline" onClick={() => restaurar(r)}>
                            Restaurar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
