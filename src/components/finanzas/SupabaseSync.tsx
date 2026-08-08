import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  syncTransactionsToSupabase,
  syncBcvRatesToSupabase,
  loadTransactionsFromSupabase,
  loadBcvRatesFromSupabase,
} from "@/lib/api/transactions.functions";
import { syncStudentsToSupabase, loadStudentsFromSupabase } from "@/lib/api/students.functions";
import type { Student, Transaction } from "@/lib/lists-store";
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

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SupabaseSync({
  transactions,
  bcvRates,
  students,
  onLoadFromCloud,
}: {
  transactions: {
    list: Transaction[];
    clear: () => void;
    append: (rows: Omit<Transaction, "id">[]) => void;
  };
  bcvRates: { rates: Record<string, number>; merge: (next: Record<string, number>) => void };
  students?: { list: Student[]; setAll: (next: Student[]) => void };
  onLoadFromCloud?: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const enLinea = useEstaEnLinea();

  const syncTx = useServerFn(syncTransactionsToSupabase);
  const syncBcv = useServerFn(syncBcvRatesToSupabase);
  const loadTx = useServerFn(loadTransactionsFromSupabase);
  const loadBcv = useServerFn(loadBcvRatesFromSupabase);
  const syncStu = useServerFn(syncStudentsToSupabase);
  const loadStu = useServerFn(loadStudentsFromSupabase);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const accessToken = await getAccessToken();
      const txResult = await syncTx({ data: { transactions: transactions.list, accessToken } });
      if (!txResult.ok) {
        toast.error(`Error syncing transactions: ${txResult.error}`);
        return;
      }

      const ratesArray = Object.entries(bcvRates.rates).map(([isoDate, rate]) => ({
        isoDate,
        rate,
      }));
      const bcvResult = await syncBcv({ data: { rates: ratesArray, accessToken } });
      if (!bcvResult.ok) {
        toast.error(`Error syncing BCV rates: ${bcvResult.error}`);
        return;
      }

      let stuCount = 0;
      if (students) {
        // Los alumnos que se agregaron localmente (Solvencias, import Excel)
        // pueden no tener id todavía — se les asigna uno estable antes de subir.
        const withIds = students.list.map((s) => (s.id ? s : { ...s, id: newId() }));
        if (withIds.some((s, i) => s.id !== students.list[i].id)) {
          students.setAll(withIds);
        }
        const stuResult = await syncStu({
          data: { students: withIds as (Student & { id: string })[], accessToken },
        });
        if (!stuResult.ok) {
          toast.error(`Error syncing alumnos: ${stuResult.error}`);
          return;
        }
        stuCount = stuResult.count ?? 0;
      }

      setLastSync(new Date().toLocaleString("es-VE"));
      toast.success(
        `Sincronizado: ${txResult.count} transacciones, ${bcvResult.count} tasas` +
          (students ? `, ${stuCount} alumnos` : ""),
      );
    } catch (e) {
      toast.error("Error de conexión al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const handleLoad = async () => {
    const hayLocal = transactions.list.length > 0 || (students?.list.length ?? 0) > 0;
    if (
      hayLocal &&
      !confirm(
        "Esto va a REEMPLAZAR las transacciones y alumnos que tienes en este dispositivo con lo que esté guardado en la nube. Si hiciste cambios aquí que aún no subiste, se van a perder. ¿Continuar?",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      const txResult = await loadTx({ data: { accessToken } });
      if (!txResult.ok) {
        toast.error(`Error loading: ${txResult.error}`);
        return;
      }
      if (txResult.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = txResult.data.map((r: any) => ({
          id: r.id,
          fecha: r.fecha,
          mes: r.mes,
          tipo: r.tipo,
          categoria: r.categoria,
          descripcion: r.descripcion,
          mensualidad: r.mensualidad,
          moneda: r.moneda,
          monto: Number(r.monto),
          tasa: r.tasa ? Number(r.tasa) : null,
          montoUsd: Number(r.monto_usd),
          banco: r.banco,
        }));
        mapped.sort((a: Transaction, b: Transaction) => {
          const [ad, am, ay] = a.fecha.split("/");
          const [bd, bm, by] = b.fecha.split("/");
          return `${ay}-${am}-${ad}`.localeCompare(`${by}-${bm}-${bd}`);
        });
        transactions.clear();
        transactions.append(mapped);
      }

      const bcvResult = await loadBcv({ data: { accessToken } });
      if (bcvResult.ok && Object.keys(bcvResult.data).length > 0) {
        bcvRates.merge(bcvResult.data);
      }

      if (students) {
        const stuResult = await loadStu({ data: { accessToken } });
        if (!stuResult.ok) {
          toast.error(`Error cargando alumnos: ${stuResult.error}`);
        } else if (stuResult.data.length > 0) {
          students.setAll(stuResult.data as Student[]);
        }
      }

      toast.success("Datos cargados desde la nube");
      onLoadFromCloud?.();
    } catch (e) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {lastSync ? (
            <Cloud className="h-4 w-4 text-primary" />
          ) : (
            <CloudOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Supabase Cloud</span>
          {lastSync && (
            <span className="text-xs text-muted-foreground">Última sincronización: {lastSync}</span>
          )}
        </div>
        {!enLinea && (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Sin internet: la nube no está disponible.
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoad}
            disabled={loading || syncing || !enLinea}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" />
            )}
            {loading ? "Cargando..." : "Cargar desde nube"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading || !enLinea}
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )}
            {syncing ? "Sincronizando..." : "Subir a nube"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
