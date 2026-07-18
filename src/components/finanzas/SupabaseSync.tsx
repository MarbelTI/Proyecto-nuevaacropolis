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
import type { Transaction } from "@/lib/lists-store";

export function SupabaseSync({
  transactions,
  bcvRates,
  onLoadFromCloud,
}: {
  transactions: {
    list: Transaction[];
    clear: () => void;
    append: (rows: Omit<Transaction, "id">[]) => void;
  };
  bcvRates: { rates: Record<string, number>; merge: (next: Record<string, number>) => void };
  onLoadFromCloud?: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const syncTx = useServerFn(syncTransactionsToSupabase);
  const syncBcv = useServerFn(syncBcvRatesToSupabase);
  const loadTx = useServerFn(loadTransactionsFromSupabase);
  const loadBcv = useServerFn(loadBcvRatesFromSupabase);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const txResult = await syncTx({ data: { transactions: transactions.list } });
      if (!txResult.ok) {
        toast.error(`Error syncing transactions: ${txResult.error}`);
        return;
      }

      const ratesArray = Object.entries(bcvRates.rates).map(([isoDate, rate]) => ({
        isoDate,
        rate,
      }));
      const bcvResult = await syncBcv({ data: { rates: ratesArray } });
      if (!bcvResult.ok) {
        toast.error(`Error syncing BCV rates: ${bcvResult.error}`);
        return;
      }

      setLastSync(new Date().toLocaleString("es-VE"));
      toast.success(`Sincronizado: ${txResult.count} transacciones, ${bcvResult.count} tasas`);
    } catch (e) {
      toast.error("Error de conexión al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const handleLoad = async () => {
    setLoading(true);
    try {
      const txResult = await loadTx();
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

      const bcvResult = await loadBcv();
      if (bcvResult.ok && Object.keys(bcvResult.data).length > 0) {
        bcvRates.merge(bcvResult.data);
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
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleLoad} disabled={loading || syncing}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" />
            )}
            {loading ? "Cargando..." : "Cargar desde nube"}
          </Button>
          <Button variant="default" size="sm" onClick={handleSync} disabled={syncing || loading}>
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
