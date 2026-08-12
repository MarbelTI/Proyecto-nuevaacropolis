import { useEffect, useRef, useState } from "react";
import { bcvRateFor, type Transaction } from "@/lib/lists-store";
import { aNumero } from "@/lib/formato";
import { calcularMontoUsd, redondearTasa, TASA_PESOS_DEFAULT } from "@/lib/fees-logic";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

// ------------------------- Utilidades -------------------------

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = (m[1] ?? "").padStart(2, "0");
  const mm = (m[2] ?? "").padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
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
  // La tasa siempre se guarda con 2 decimales, y el monto en USD se calcula
  // con esa misma tasa redondeada para que ambos valores concuerden.
  next.tasa = redondearTasa(next.tasa);
  next.montoUsd = calcularMontoUsd(next.moneda, next.monto, next.tasa);
  return next;
}

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const MESES_LARGOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "2026-08-13" → "13/08/2026". El formulario guarda las fechas así. */
function isoToFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

/** "13/08/2026" → "ago-2026". Es la mensualidad que le corresponde por defecto. */
function mensualidadDeFecha(fecha: string): string {
  const iso = fechaToIso(fecha);
  if (!iso) return "";
  const [y, m] = iso.split("-");
  return `${MESES_CORTOS[Number(m) - 1] ?? m}-${y}`;
}

function nombreMesDeFecha(fecha: string): string {
  const iso = fechaToIso(fecha);
  if (!iso) return "";
  return MESES_LARGOS[Number(iso.split("-")[1]) - 1] ?? "";
}

/**
 * Banco que se propone según la moneda.
 *
 * Es solo un punto de partida: se elige el que más se parece a lo que se está
 * cobrando, para que el caso habitual no haya que tocarlo. Cualquier otro
 * —Binance, pago móvil, un banco concreto— se escoge a mano como siempre.
 */
function bancoParaMoneda(moneda: string, bancos: string[]): string {
  const preferencias: Record<string, string[]> = {
    Bolívares: ["Efectivo Bs", "Pago Móvil", "Bco Venezuela"],
    USD: ["Efectivo USD", "Binance"],
    Pesos: ["Bancolombia", "Binance"],
  };
  for (const candidato of preferencias[moneda] ?? []) {
    if (bancos.includes(candidato)) return candidato;
  }
  return "";
}

/** Categorías donde la descripción es el nombre de una persona. */
const CATEGORIAS_CON_NOMBRE = ["MIEMBROS", "PROBAS", "CLASE"];

// ------------------------- Componentes -------------------------

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function TransactionEditDialog({
  editing,
  onClose,
  onSave,
  ingresos,
  gastos,
  bancos,
  bcvRates,
  bcvSources,
  students = [],
}: {
  editing: Transaction | null;
  onClose: () => void;
  onSave: (t: Transaction) => void;
  ingresos: string[];
  gastos: string[];
  bancos: string[];
  bcvRates: Record<string, number>;
  bcvSources: Record<string, string>;
  /** Para sugerir el nombre en las categorías de cuota y evitar erratas. */
  students?: { nombre: string }[];
}) {
  const [draft, setDraft] = useState<Transaction | null>(null);
  /** Evita que un doble clic en Guardar cree el movimiento dos veces. */
  const guardando = useRef(false);

  // Los campos de dinero se editan como TEXTO y solo se interpretan como
  // número al escribirlos en el borrador.
  //
  // Antes eran inputs controlados por Number(): al teclear "90." el punto
  // desaparecía en el acto y el siguiente dígito se pegaba como entero, así que
  // "90.50" acababa guardado como 9050 — cien veces la cifra real, y en la tasa
  // eso descuadra el movimiento entero. Escribir "0" además vaciaba el campo.
  //
  // El texto solo manda mientras siga cuadrando con el número del borrador. Si
  // algo cambia el valor por detrás (la tasa que se rellena sola al poner la
  // fecha, por ejemplo), el texto queda obsoleto y se muestra el del modelo.
  const [textos, setTextos] = useState<Record<string, string>>({});
  const verNumero = (campo: string, valor: number | null | undefined): string => {
    const t = textos[campo];
    if (t !== undefined && aNumero(t) === (valor ?? 0)) return t;
    return valor != null && valor !== 0 ? String(valor) : "";
  };
  const escribirNumero = (campo: string, texto: string): number => {
    setTextos((prev) => ({ ...prev, [campo]: texto }));
    return aNumero(texto);
  };
  useEffect(() => {
    setDraft(editing ? { ...editing } : null);
    guardando.current = false;
  }, [editing]);
  if (!draft) return null;
  const cats = draft.tipo === "Gasto" ? gastos : ingresos;
  const update = <K extends keyof Transaction>(k: K, v: Transaction[K]) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, [k]: v };

      // Al cambiar la fecha, la mensualidad y el nombre del mes la siguen. Es
      // lo que casi siempre se quiere: se registra un pago de la semana pasada
      // y la mensualidad es la de esa fecha, no la de hoy.
      //
      // Pero solo si no se habían escrito a mano. Se considera "a mano"
      // cualquier valor que no coincidiera con el que le tocaba a la fecha
      // anterior: alguien puede pagar en agosto la cuota de junio, y eso no se
      // puede pisar.
      if (k === "fecha") {
        const antes = mensualidadDeFecha(d.fecha);
        if (!d.mensualidad || d.mensualidad === antes) {
          next.mensualidad = mensualidadDeFecha(String(v));
        }
        const mesAntes = nombreMesDeFecha(d.fecha);
        if (!d.mes || d.mes === mesAntes) {
          next.mes = nombreMesDeFecha(String(v));
        }
      }

      // La moneda arrastra el banco al sitio más probable. Si ya había uno
      // elegido para esa misma moneda se respeta.
      if (k === "moneda") {
        const sugerido = bancoParaMoneda(String(v), bancos);
        if (sugerido && (!d.banco || d.banco === bancoParaMoneda(d.moneda, bancos))) {
          next.banco = sugerido;
        }
      }

      if (k === "moneda" || k === "monto" || k === "tasa" || k === "fecha") {
        return normalizeTransactionMoney(next, bcvRates);
      }
      return next;
    });
  };

  // Las mensualidades que se ofrecen: los doce meses del año de la fecha del
  // movimiento. Si el que ya trae cae fuera —una cuota atrasada de otro año—
  // se añade, porque si no el desplegable saldría en blanco y parecería que se
  // perdió el dato.
  const anioFecha = fechaToIso(draft.fecha)?.slice(0, 4) ?? String(new Date().getFullYear());
  const mensualidades = MESES_CORTOS.map((m) => `${m}-${anioFecha}`);
  if (draft.mensualidad && !mensualidades.includes(draft.mensualidad)) {
    mensualidades.unshift(draft.mensualidad);
  }

  const pideNombre = CATEGORIAS_CON_NOMBRE.includes(draft.categoria);
  return (
    <Dialog open={!!editing} onOpenChange={(v) => !v && onClose()}>
      {/* Un clic fuera ya no cierra: son once campos y se perdían enteros sin
          preguntar. Esc sigue funcionando, que es el gesto deliberado. */}
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          {/* Título neutro a propósito: este diálogo se abre desde Transacciones
              y desde Resumen, y debe verse igual venga de donde venga. */}
          <DialogTitle>Transacciones</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {/* Calendario de verdad en vez de escribir dd/mm/aaaa: registrar algo
              de la semana pasada era teclear la fecha entera sin equivocarse. */}
          <Field label="Fecha">
            <Input
              type="date"
              value={fechaToIso(draft.fecha) ?? ""}
              onChange={(e) => update("fecha", isoToFecha(e.target.value))}
            />
          </Field>
          <Field label="Mes">
            <Input
              value={draft.mes}
              onChange={(e) => update("mes", e.target.value)}
              placeholder="se pone solo con la fecha"
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={draft.tipo || "Ingreso"}
              onValueChange={(v) => update("tipo", v as Transaction["tipo"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ingreso">Ingreso</SelectItem>
                <SelectItem value="Gasto">Gasto</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Categoría">
            <Select
              value={draft.categoria || undefined}
              onValueChange={(v) => update("categoria", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={pideNombre ? "Descripción (nombre del integrante)" : "Descripción"} full>
            {/* Con las categorías de cuota, la descripción es el nombre de una
                persona: se ofrece la lista de integrantes para que no se
                escriba cada vez de una forma distinta. Un nombre mal
                transcrito no se cruza con nada — ni con su solvencia ni con su
                ficha— y encontrarlo después cuesta muchísimo más que elegirlo
                ahora de una lista. */}
            <Input
              value={draft.descripcion}
              onChange={(e) => update("descripcion", e.target.value)}
              list={pideNombre ? "integrantes-transaccion" : undefined}
              placeholder={pideNombre ? "Empieza a escribir el nombre…" : undefined}
            />
            {pideNombre && (
              <datalist id="integrantes-transaccion">
                {students.map((s) => (
                  <option key={s.nombre} value={s.nombre} />
                ))}
              </datalist>
            )}
          </Field>
          <Field label="Mensualidad">
            <Select
              value={draft.mensualidad || undefined}
              onValueChange={(v) => update("mensualidad", v === "__ninguna__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ninguna__">
                  <span className="text-muted-foreground italic text-xs">Sin mensualidad</span>
                </SelectItem>
                {mensualidades.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Moneda">
            <Select
              value={draft.moneda || undefined}
              onValueChange={(v) => update("moneda", v as Transaction["moneda"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="Bolívares">Bolívares</SelectItem>
                <SelectItem value="Pesos">Pesos</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Banco/Cuenta">
            <Select
              value={bancos.includes(draft.banco) ? draft.banco : undefined}
              onValueChange={(v) => update("banco", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {bancos.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
                <SelectItem value="__editar__">
                  <span className="text-muted-foreground italic text-xs">
                    ✎ Editar desde Settings…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Monto">
            <Input
              inputMode="decimal"
              value={verNumero("monto", draft.monto)}
              onChange={(e) => update("monto", escribirNumero("monto", e.target.value))}
            />
          </Field>
          <Field label="Tasa">
            <div className="flex items-center gap-1">
              <Input
                inputMode="decimal"
                value={verNumero("tasa", draft.tasa)}
                onChange={(e) => {
                  const n = escribirNumero("tasa", e.target.value);
                  update("tasa", e.target.value.trim() ? n : null);
                }}
              />
              {(() => {
                const iso = fechaToIso(draft.fecha);
                const src = iso ? bcvSources[iso] : undefined;
                if (src?.includes("bcv.org.ve"))
                  return (
                    <span className="shrink-0 rounded bg-green-700/30 px-1.5 py-0.5 text-[10px] text-green-300">
                      BCV oficial
                    </span>
                  );
                if (src === "dolarapi.com")
                  return (
                    <span className="shrink-0 rounded bg-amber-700/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                      Respaldo
                    </span>
                  );
                if (draft.moneda === "Bolívares" && (draft.tasa == null || draft.tasa === 0))
                  return (
                    <span className="shrink-0 text-[10px] text-red-400">
                      Sin tasa — ingresa manual
                    </span>
                  );
                return null;
              })()}
            </div>
          </Field>
          <Field label="USD">
            <Input
              inputMode="decimal"
              value={verNumero("montoUsd", draft.montoUsd)}
              onChange={(e) => {
                const v = escribirNumero("montoUsd", e.target.value);
                update("montoUsd", v);
                if (draft.monto > 0 && v > 0 && (draft.tasa == null || draft.tasa === 0)) {
                  update("tasa", redondearTasa(draft.monto / v));
                }
              }}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {/* Dos clics rápidos creaban el movimiento por duplicado: el diálogo
              todavía no se había cerrado cuando entraba el segundo. La marca va
              en una ref y no en estado porque no hace falta repintar nada. */}
          <Button
            onClick={() => {
              if (guardando.current) return;
              guardando.current = true;
              onSave(draft);
            }}
          >
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { fechaToIso, normalizeTransactionMoney, Field, TransactionEditDialog };
