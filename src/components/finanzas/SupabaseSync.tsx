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
import type { BcvRates, Student, Transaction } from "@/lib/lists-store";
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

import { nuevoId as newId } from "@/lib/utils";

export function SupabaseSync({
  transactions,
  bcvRates,
  students,
  onLoadFromCloud,
}: {
  transactions: {
    list: Transaction[];
    // replaceAll y no clear+append: append reasigna ids nuevos, y encadenar las
    // dos operaciones no reemplaza nada (ver el comentario en handleLoad).
    replaceAll: (rows: Transaction[]) => void;
  };
  bcvRates: { rates: BcvRates; merge: (next: BcvRates) => void };
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

      // La columna `rate` (dólar) es NOT NULL en Supabase: una fecha cargada
      // a mano con SOLO tasa euro (sin dólar) no tiene cómo subirse todavía,
      // así que se deja fuera de esta sincronización hasta que tenga dólar.
      const ratesArray = Object.entries(bcvRates.rates)
        .filter(([, r]) => r.dolar != null)
        .map(([isoDate, r]) => ({
          isoDate,
          rate: r.dolar as number,
          rateEuro: r.euro,
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
        if (withIds.some((s, i) => s.id !== students.list[i]?.id)) {
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
          // `r.revisar` no existe todavía en Supabase (la migración está
          // creada pero sin correr) — el `?? ""` hace que esto siga
          // funcionando ahora y empiece a traer el valor real en cuanto se
          // corra, sin tocar este archivo otra vez.
          revisar: r.revisar ?? "",
        }));
        mapped.sort((a: Transaction, b: Transaction) => {
          const [ad, am, ay] = a.fecha.split("/");
          const [bd, bm, by] = b.fecha.split("/");
          return `${ay}-${am}-${ad}`.localeCompare(`${by}-${bm}-${bd}`);
        });
        // Aquí antes se hacía clear() y luego append(), y ninguna de las dos
        // cosas salía bien:
        //   - las dos closures capturan el mismo `list` del render, así que el
        //     append deshacía el clear y quedaba lo local MÁS lo de la nube;
        //   - append reasigna un id nuevo a cada fila, tirando el id que trae
        //     la nube, así que el siguiente "Subir a nube" insertaba filas
        //     nuevas en vez de actualizar las que ya estaban.
        // Resultado: cada ciclo cargar/subir duplicaba el libro contable.
        transactions.replaceAll(mapped);
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
