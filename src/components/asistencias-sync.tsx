import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  syncAttendanceToSupabase,
  loadAttendanceFromSupabase,
} from "@/lib/api/attendance.functions";
import type {
  AulaMeta,
  AttendanceRecord,
  ReflexionMeta,
  ReflexionAsistencia,
} from "@/lib/attendance-store";
import { supabase } from "@/lib/supabase";
import { useEstaEnLinea } from "@/lib/conexion";

async function getAccessToken(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Quien puede subir es quien marca asistencia: tecnología, control de estudio
 * y los celadores. Al celador el servidor le recorta el envío a su aula, y las
 * políticas de la base lo impiden de todos modos.
 */
function puedeSubir(role?: string): boolean {
  return role === "super_admin" || role === "celador_estudios" || role === "celador";
}

export type AsistenciasSyncProps = {
  aulasMeta: AulaMeta[];
  setAulasMeta: Dispatch<SetStateAction<AulaMeta[]>>;
  records: AttendanceRecord[];
  setRecords: Dispatch<SetStateAction<AttendanceRecord[]>>;
  reflexionesMeta: ReflexionMeta[];
  setReflexionesMeta: Dispatch<SetStateAction<ReflexionMeta[]>>;
  reflexionAsistencia: ReflexionAsistencia[];
  setReflexionAsistencia: Dispatch<SetStateAction<ReflexionAsistencia[]>>;
  role?: string;
  /** true = solo el botón de cargar, para la pantalla de "aún no hay nada". */
  soloCargar?: boolean;
};

export function AsistenciasSync({
  aulasMeta,
  setAulasMeta,
  records,
  setRecords,
  reflexionesMeta,
  setReflexionesMeta,
  reflexionAsistencia,
  setReflexionAsistencia,
  role,
  soloCargar = false,
}: AsistenciasSyncProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [ultima, setUltima] = useState<string | null>(null);
  const enLinea = useEstaEnLinea();

  const subir = useServerFn(syncAttendanceToSupabase);
  const cargar = useServerFn(loadAttendanceFromSupabase);

  const handleSubir = async () => {
    if (!aulasMeta.length) {
      toast.error("No hay nada que subir. Importa primero el Excel.");
      return;
    }
    setSubiendo(true);
    try {
      const accessToken = await getAccessToken();
      const res = await subir({
        data: {
          aulas: aulasMeta,
          records,
          reflexionesMeta,
          reflexionAsistencia,
          accessToken,
        },
      });
      if (!res.ok) {
        toast.error(`No se pudo subir: ${res.error}`);
        return;
      }
      setUltima(new Date().toLocaleString("es-VE"));
      toast.success(
        `Subido: ${res.aulas} aulas, ${res.asistencias} asistencias, ` +
          `${res.reflexiones} reflexiones, ${res.entregas} entregas`,
      );
    } catch {
      toast.error("Error de conexión al subir");
    } finally {
      setSubiendo(false);
    }
  };

  const handleCargar = async () => {
    // Cargar PISA lo que haya en este dispositivo. Si el celador marcó
    // asistencia hoy y todavía no la subió, la perdería sin enterarse.
    if (
      records.length > 0 &&
      !confirm(
        "Esto va a REEMPLAZAR las asistencias de este dispositivo con las que " +
          "estén en la nube. Si marcaste algo aquí que aún no subiste, se pierde. " +
          "¿Continuar?",
      )
    ) {
      return;
    }
    setCargando(true);
    try {
      const accessToken = await getAccessToken();
      const res = await cargar({ data: { accessToken } });
      if (!res.ok) {
        toast.error(`No se pudo cargar: ${res.error}`);
        return;
      }
      if (!res.aulas.length) {
        toast.info("No hay asistencias en la nube todavía.");
        return;
      }
      setAulasMeta(res.aulas as AulaMeta[]);
      setRecords(res.records as AttendanceRecord[]);
      setReflexionesMeta(res.reflexionesMeta as ReflexionMeta[]);
      setReflexionAsistencia(res.reflexionAsistencia as ReflexionAsistencia[]);
      setUltima(new Date().toLocaleString("es-VE"));
      toast.success(`Cargadas ${res.aulas.length} aulas desde la nube`);
    } catch {
      toast.error("Error de conexión al cargar");
    } finally {
      setCargando(false);
    }
  };

  const botonCargar = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCargar}
      disabled={cargando || subiendo || !enLinea}
      title={enLinea ? undefined : "Sin internet no se puede acceder a la nube"}
    >
      {cargando ? (
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <CloudOff className="mr-1 h-3.5 w-3.5" />
      )}
      {cargando ? "Cargando..." : "Cargar desde nube"}
    </Button>
  );

  if (soloCargar) return botonCargar;

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {ultima ? (
            <Cloud className="h-4 w-4 text-primary" />
          ) : (
            <CloudOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Asistencias en la nube</span>
          {ultima && <span className="text-xs text-muted-foreground">Última vez: {ultima}</span>}
        </div>
        <div className="ml-auto flex gap-2">
          {botonCargar}
          {puedeSubir(role) && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSubir}
              disabled={subiendo || cargando || !enLinea}
              title={enLinea ? undefined : "Sin internet no se puede acceder a la nube"}
            >
              {subiendo ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="mr-1 h-3.5 w-3.5" />
              )}
              {subiendo ? "Subiendo..." : "Subir a nube"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
