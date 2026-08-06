import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCuentasPendientes,
  resolverCuentaPendiente,
  type PerfilPendiente,
  type UserRole,
} from "@/lib/api/auth.functions";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";

const ROLES: { value: Exclude<UserRole, "pendiente" | "unknown">; label: string }[] = [
  { value: "celador", label: "Celador (su aula)" },
  { value: "celador_estudios", label: "Control de estudio" },
  { value: "finanzas", label: "Finanzas" },
  { value: "director", label: "Director (solo lectura)" },
  { value: "super_admin", label: "Administrador total" },
];

async function getAccessToken(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Panel para habilitar cuentas nuevas. Solo se muestra a super_admin: quien
 * se registra con un correo desconocido queda sin acceso hasta que aquí se
 * le asigne un rol.
 */
export function CuentasPendientes() {
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [pendientes, setPendientes] = useState<PerfilPendiente[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});

  const listar = useServerFn(listarCuentasPendientes);
  const resolver = useServerFn(resolverCuentaPendiente);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const accessToken = await getAccessToken();
      const res = await listar({ data: { accessToken } });
      if (res.ok) setPendientes(res.data);
    } catch {
      /* silencioso: el panel es secundario */
    } finally {
      setCargando(false);
    }
  }, [listar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const decidir = async (p: PerfilPendiente, aprobar: boolean) => {
    const rol = (roles[p.id] ?? "celador") as (typeof ROLES)[number]["value"];
    if (!aprobar && !confirm(`¿Rechazar el acceso de ${p.email}? Podrás habilitarla más adelante.`))
      return;
    const accessToken = await getAccessToken();
    const res = await resolver({
      data: { userId: p.id, aprobar, role: rol, accessToken },
    });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo actualizar");
      return;
    }
    toast.success(aprobar ? `${p.email} habilitada como ${rol}` : `${p.email} rechazada`);
    setPendientes((prev) => prev.filter((x) => x.id !== p.id));
  };

  if (!cargando && pendientes.length === 0) return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          cargar();
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/30"
        title="Cuentas nuevas esperando aprobación"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {pendientes.length} solicitud{pendientes.length === 1 ? "" : "es"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Cuentas esperando aprobación
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Estas personas se registraron con un correo que no está en la lista de la escuela. No
            tienen acceso a nada hasta que les asignes un rol aquí. Si no reconoces un correo,
            recházalo.
          </p>
          {cargando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {pendientes.map((p) => (
                <Card key={p.id} className="flex flex-wrap items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.email}</p>
                    {p.created_at && (
                      <p className="text-[11px] text-muted-foreground">
                        Se registró el {new Date(p.created_at).toLocaleString("es-VE")}
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
              {pendientes.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay solicitudes pendientes.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
