import { useEffect, useState } from "react";
import {
  bcvRateFor,
  type Transaction,
} from "@/lib/lists-store";
import {
  calcularMontoUsd,
  TASA_PESOS_DEFAULT,
} from "@/lib/fees-logic";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

// ------------------------- Utilidades -------------------------

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2,"0"); const mm = m[2].padStart(2,"0");
  let yy = m[3] ?? String(new Date().getFullYear()); if (yy.length===2) yy = "20"+yy;
  return `${yy}-${mm}-${dd}`;
}

function normalizeTransactionMoney(tx: Transaction, bcvRates: Record<string, number>): Transaction {
  const next = { ...tx };
  if (next.moneda === "Pesos" && (next.tasa == null || next.tasa === 0)) {
    next.tasa = TASA_PESOS_DEFAULT;
  }
  if (next.moneda === "Bolívares" && (next.tasa == null || next.tasa === 0)) {
    const iso = fechaToIso(next.fecha);
    if (iso) {
      const r = bcvRateFor(bcvRates, iso);
      if (r != null) next.tasa = r;
    }
  }
  next.montoUsd = calcularMontoUsd(next.moneda, next.monto, next.tasa);
  return next;
}

// ------------------------- Componentes -------------------------

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function TransactionEditDialog({
  editing, onClose, onSave, ingresos, gastos, bancos, bcvRates, bcvSources,
}: {
  editing: Transaction | null; onClose: () => void; onSave: (t: Transaction) => void;
  ingresos: string[]; gastos: string[]; bancos: string[]; bcvRates: Record<string, number>;
  bcvSources: Record<string, string>;
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
        return normalizeTransactionMoney(next, bcvRates);
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
          <Field label="Monto"><Input value={String(draft.monto || "")} onChange={(e)=>update("monto", Number(e.target.value) || 0)} /></Field>
          <Field label="Tasa">
            <div className="flex items-center gap-1">
              <Input value={draft.tasa != null ? String(draft.tasa) : ""} onChange={(e)=>update("tasa", e.target.value ? Number(e.target.value) : null)} />
              {(() => {
                const iso = fechaToIso(draft.fecha);
                const src = iso ? bcvSources[iso] : undefined;
                if (src?.includes("bcv.org.ve"))
                  return <span className="shrink-0 rounded bg-green-700/30 px-1.5 py-0.5 text-[10px] text-green-300">BCV oficial</span>;
                if (src === "dolarapi.com")
                  return <span className="shrink-0 rounded bg-amber-700/30 px-1.5 py-0.5 text-[10px] text-amber-300">Respaldo</span>;
                if (draft.moneda === "Bolívares" && (draft.tasa == null || draft.tasa === 0))
                  return <span className="shrink-0 text-[10px] text-red-400">Sin tasa — ingresa manual</span>;
                return null;
              })()}
            </div>
          </Field>
          <Field label="USD">
            <Input value={String(draft.montoUsd || "")} onChange={(e)=>{
              const v = Number(e.target.value) || 0;
              update("montoUsd", v);
              if (draft.monto > 0 && v > 0 && (draft.tasa == null || draft.tasa === 0)) {
                update("tasa", draft.monto / v);
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

export { fechaToIso, normalizeTransactionMoney, Field, TransactionEditDialog };
