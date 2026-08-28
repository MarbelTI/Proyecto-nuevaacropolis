import { useState } from "react";
import { bcvRateFor, bcvRateSugerida, CORTE_TASA_BINANCE_ISO } from "@/lib/lists-store";
import { aNumero } from "@/lib/formato";
import { calcularMontoUsd, formatTasa, redondearTasa, TASA_PESOS_DEFAULT } from "@/lib/fees-logic";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator, ClipboardCopy, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// ------------------------- Utilidades -------------------------

/** Mismo formato de 2 decimales que usa la tabla de transacciones. */
const $ = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoToFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/**
 * Cifra para meter en un campo editable: sin separador de miles a propósito.
 * Un "4,500.00" dentro del campo se vuelve ambiguo en cuanto la persona borra
 * los decimales, y "4,500" podría leerse como 4.5. Vacío cuando no hay
 * resultado todavía, que no es lo mismo que un 0.00 calculado.
 */
function mostrar(n: number): string {
  return n > 0 ? n.toFixed(2) : "";
}

type MonedaLocal = "Bolívares" | "Pesos";
type MonedaOrigen = MonedaLocal | "USD";

function BotonCopiar({ valor, titulo }: { valor: string; titulo: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0"
      disabled={!valor}
      title={titulo}
      onClick={() => {
        navigator.clipboard
          .writeText(valor)
          .then(() => toast.success(`Copiado: ${valor}`))
          .catch(() => toast.error("No se pudo copiar"));
      }}
    >
      <ClipboardCopy className="h-4 w-4" />
    </Button>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// ------------------------- Calculadora -------------------------

/**
 * Todo el estado y los cálculos de la calculadora, aparte de dónde se
 * renderiza.
 *
 * OJO con quién llama a este hook: el componente que lo llama es el que
 * mantiene vivo el estado. `CalculadoraPanel` es puramente de presentación
 * (no llama al hook) justamente para poder vivir dentro de un `DialogContent`
 * de Radix, que desmonta sus hijos al cerrarse — si el estado viviera ahí
 * adentro, cerrar y reabrir la calculadora borraría lo que ya se había
 * escrito. Por eso cada quien que use `CalculadoraPanel` (el propio
 * `CalculadoraDialog`, o el diálogo de editar una transacción) llama a este
 * hook desde un componente que sigue montado aunque la calculadora se
 * cierre.
 */
function useCalculadoraState(
  bcvRates: Record<string, number>,
  bcvRatesEuro: Record<string, number>,
  fechaReferencia?: string,
  /** Tipo (Ingreso/Gasto) de la transacción de referencia, para que el botón
   * de tasa sugerida coincida con la que el propio formulario ya sugirió —
   * si no se pasa (calculadora suelta, sin transacción), se comporta como
   * un Gasto: siempre BCV, igual que antes de esta distinción. */
  tipoReferencia: string = "",
) {
  const [pestana, setPestana] = useState("convertir");

  // --- Pestaña "Convertir" ---
  const [moneda, setMoneda] = useState<MonedaOrigen>("Bolívares");
  const [tasaStr, setTasaStr] = useState("");
  const [montoStr, setMontoStr] = useState("");
  const [usdStr, setUsdStr] = useState("");
  // Cuál de los dos importes escribió la persona: el otro se calcula a partir
  // de él. Guardar el lado activo (en vez de escribir en los dos estados) evita
  // que los campos se pisen entre sí mientras se teclea.
  const [ladoActivo, setLadoActivo] = useState<"local" | "usd">("local");

  // --- Pestaña "¿Qué tasa fue?" ---
  const [tasaMoneda, setTasaMoneda] = useState<MonedaLocal>("Bolívares");
  const [tasaMontoStr, setTasaMontoStr] = useState("");
  const [tasaUsdStr, setTasaUsdStr] = useState("");

  const fechaRef = fechaReferencia || todayIso();
  const esHoy = fechaRef === todayIso();
  const bcvHoy = bcvRateFor(bcvRates, fechaRef);
  const bcvRefEuro = bcvRateFor(bcvRatesEuro, fechaRef);

  // La tasa se redondea aquí, igual que al guardar un movimiento, para que la
  // calculadora y la tabla no den dos resultados distintos con la misma cifra.
  const tasa = redondearTasa(aNumero(tasaStr));
  const esUsd = moneda === "USD";

  const montoLocal = aNumero(montoStr);
  const usdEscrito = aNumero(usdStr);

  const usdCalculado = calcularMontoUsd(moneda, montoLocal, tasa);
  // Camino inverso de `calcularMontoUsd`: cuántos bolívares/pesos hay que
  // cobrar para recibir los dólares pedidos.
  const localCalculado = esUsd ? usdEscrito : tasa && tasa > 0 ? usdEscrito * tasa : 0;

  const valorLocal = ladoActivo === "local" ? montoStr : mostrar(localCalculado);
  const valorUsd = ladoActivo === "usd" ? usdStr : mostrar(usdCalculado);
  const resultado = ladoActivo === "local" ? usdCalculado : localCalculado;

  // Atajo de tasa según la moneda: los pesos usan la tasa fija con la que ya
  // trabaja el resto del sistema. Los bolívares usan la MISMA regla que el
  // formulario de la transacción (bcvRateSugerida): BCV normalmente, o Euro
  // para un Ingreso desde el 24/06/2026 — antes esto siempre traía la del
  // BCV aunque el formulario, al lado, hubiera sugerido la del euro.
  const tasaSugeridaBolivares = bcvRateSugerida(tipoReferencia, fechaRef, bcvRates, bcvRatesEuro);
  const tasaSugerida = moneda === "Pesos" ? TASA_PESOS_DEFAULT : tasaSugeridaBolivares;
  const sugeridaEsEuro =
    tipoReferencia === "Ingreso" &&
    fechaRef >= CORTE_TASA_BINANCE_ISO &&
    bcvRefEuro != null &&
    tasaSugeridaBolivares === bcvRefEuro;
  const etiquetaSugerida =
    moneda === "Pesos"
      ? "Tasa habitual"
      : sugeridaEsEuro
        ? esHoy
          ? "Tasa Euro de hoy"
          : `Tasa Euro del ${isoToFecha(fechaRef)}`
        : esHoy
          ? "Tasa BCV de hoy"
          : `Tasa BCV del ${isoToFecha(fechaRef)}`;

  const tasaDeducidaCruda = (() => {
    const monto = aNumero(tasaMontoStr);
    const usd = aNumero(tasaUsdStr);
    if (monto <= 0 || usd <= 0) return null;
    return redondearTasa(monto / usd);
  })();
  const tasaDeducida = tasaDeducidaCruda && tasaDeducidaCruda > 0 ? tasaDeducidaCruda : null;

  // Comparar con el BCV es la mitad de la pregunta: no basta con saber la tasa,
  // interesa saber si se pagó por encima o por debajo de la oficial.
  const difVsBcv =
    tasaDeducida != null && tasaMoneda === "Bolívares" && bcvHoy != null && bcvHoy > 0
      ? ((tasaDeducida - bcvHoy) / bcvHoy) * 100
      : null;

  const limpiar = () => {
    setTasaStr("");
    setMontoStr("");
    setUsdStr("");
    setLadoActivo("local");
    setTasaMontoStr("");
    setTasaUsdStr("");
  };

  return {
    pestana,
    setPestana,
    moneda,
    setMoneda,
    tasaStr,
    setTasaStr,
    ladoActivo,
    tasaMoneda,
    setTasaMoneda,
    tasaMontoStr,
    setTasaMontoStr,
    tasaUsdStr,
    setTasaUsdStr,
    fechaRef,
    esHoy,
    bcvHoy,
    bcvRefEuro,
    tasa,
    esUsd,
    montoLocal,
    usdEscrito,
    usdCalculado,
    localCalculado,
    valorLocal,
    valorUsd,
    resultado,
    tasaSugerida,
    etiquetaSugerida,
    tasaDeducida,
    difVsBcv,
    limpiar,
    setMontoStr,
    setUsdStr,
    setLadoActivo,
  };
}

type CalculadoraState = ReturnType<typeof useCalculadoraState>;

/**
 * Cuerpo de la calculadora de conversión, sin el Dialog alrededor y sin
 * estado propio — así se puede meter tanto en su propio diálogo suelto
 * (`CalculadoraDialog`) como incrustada al lado de otro formulario (edición
 * de una transacción), donde un segundo Dialog modal la taparía.
 *
 * Existe porque no todo el mundo paga a la tasa del BCV: cuando alguien paga en
 * bolívares a otra tasa hay que sacar a mano cuántos dólares son, o al revés,
 * cuántos bolívares hay que cobrar por una cuota. No guarda nada ni toca las
 * transacciones: es una servilleta, no un formulario.
 */
export function CalculadoraPanel({ state }: { state: CalculadoraState }) {
  const s = state;

  return (
    <div>
      {/* Tasas del día de referencia (el de la transacción que se está
          editando, o hoy si se abrió suelta), para tenerlas a la vista sin
          salir a la pestaña de Tasas BCV. */}
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          {s.esHoy ? "Tasas de hoy" : `Tasas del ${isoToFecha(s.fechaRef)}`}:
        </span>{" "}
        <span className="tabular-nums font-medium">
          Bs/$ {s.bcvHoy != null ? formatTasa(s.bcvHoy) : "—"}
        </span>
        <span className="text-muted-foreground"> · </span>
        <span className="tabular-nums font-medium">
          Bs/€ {s.bcvRefEuro != null ? formatTasa(s.bcvRefEuro) : "—"}
        </span>
      </div>

      <Tabs value={s.pestana} onValueChange={s.setPestana} className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="convertir">Convertir</TabsTrigger>
          <TabsTrigger value="tasa">¿Qué tasa fue?</TabsTrigger>
        </TabsList>

        <TabsContent value="convertir" className="mt-4 space-y-3">
          <Campo label="Moneda">
            <Select value={s.moneda} onValueChange={(v) => s.setMoneda(v as MonedaOrigen)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bolívares">Bolívares</SelectItem>
                <SelectItem value="Pesos">Pesos</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </Campo>

          {!s.esUsd && (
            <Campo label={`Tasa (${s.moneda} por 1 USD)`}>
              <div className="flex gap-2">
                <Input
                  value={s.tasaStr}
                  inputMode="decimal"
                  placeholder="Ej: 90.50"
                  onChange={(e) => s.setTasaStr(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={s.tasaSugerida == null}
                  title={
                    s.tasaSugerida != null
                      ? `Rellena ${formatTasa(s.tasaSugerida)} para empezar. Puedes escribir otra encima.`
                      : "No hay tasa BCV cargada para esa fecha"
                  }
                  onClick={() =>
                    s.tasaSugerida != null && s.setTasaStr(String(redondearTasa(s.tasaSugerida)))
                  }
                >
                  {s.etiquetaSugerida}
                </Button>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {s.tasaSugerida != null ? (
                  <>
                    El botón trae {formatTasa(s.tasaSugerida)} como punto de partida.{" "}
                    <strong className="font-medium text-foreground">
                      Escribe encima la tasa a la que se pagó de verdad
                    </strong>{" "}
                    si fue otra.
                  </>
                ) : (
                  "No hay tasa BCV cargada para esa fecha; escríbela a mano."
                )}
              </p>
            </Campo>
          )}

          <Campo label={s.esUsd ? "Monto en USD" : `Monto en ${s.moneda}`}>
            <div className="flex gap-1">
              <Input
                value={s.valorLocal}
                inputMode="decimal"
                placeholder="0.00"
                className="tabular-nums"
                onChange={(e) => {
                  s.setMontoStr(e.target.value);
                  s.setLadoActivo("local");
                }}
              />
              <BotonCopiar
                valor={s.ladoActivo === "usd" ? mostrar(s.localCalculado) : ""}
                titulo={`Copiar el monto en ${s.moneda}`}
              />
            </div>
          </Campo>

          <Campo label="Equivale en USD">
            <div className="flex gap-1">
              <Input
                value={s.valorUsd}
                inputMode="decimal"
                placeholder="0.00"
                className="tabular-nums"
                onChange={(e) => {
                  s.setUsdStr(e.target.value);
                  s.setLadoActivo("usd");
                }}
              />
              <BotonCopiar
                valor={s.ladoActivo === "local" ? mostrar(s.usdCalculado) : ""}
                titulo="Copiar el monto en USD"
              />
            </div>
          </Campo>

          {/* Se dice explícitamente porque un campo que se rellena solo
              parece de solo lectura y nadie intenta escribir en él. */}
          <p className="text-[11px] leading-snug text-muted-foreground">
            Escribe en cualquiera de los dos: el otro se calcula solo.
            {!s.esUsd && (!s.tasa || s.tasa <= 0) && (
              <span className="text-amber-600 dark:text-amber-500">
                {" "}
                Falta la tasa para poder convertir.
              </span>
            )}
          </p>

          {s.resultado > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <span className="tabular-nums">
                {s.esUsd
                  ? `$${$(s.resultado)}`
                  : s.ladoActivo === "local"
                    ? `${$(s.montoLocal)} ${s.moneda} = $${$(s.usdCalculado)}`
                    : `$${$(s.usdEscrito)} = ${$(s.localCalculado)} ${s.moneda}`}
              </span>
              {!s.esUsd && s.tasa != null && (
                <span className="text-muted-foreground"> · a {formatTasa(s.tasa)}</span>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasa" className="mt-4 space-y-3">
          <p className="text-xs leading-snug text-muted-foreground">
            Si sabes cuánto se pagó y a cuántos dólares equivalía, aquí sale la tasa que se
            aplicó.
          </p>

          <Campo label="Moneda">
            <Select value={s.tasaMoneda} onValueChange={(v) => s.setTasaMoneda(v as MonedaLocal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bolívares">Bolívares</SelectItem>
                <SelectItem value="Pesos">Pesos</SelectItem>
              </SelectContent>
            </Select>
          </Campo>

          <Campo label={`Monto pagado en ${s.tasaMoneda}`}>
            <Input
              value={s.tasaMontoStr}
              inputMode="decimal"
              placeholder="0.00"
              className="tabular-nums"
              onChange={(e) => s.setTasaMontoStr(e.target.value)}
            />
          </Campo>

          <Campo label="Equivalente en USD">
            <Input
              value={s.tasaUsdStr}
              inputMode="decimal"
              placeholder="0.00"
              className="tabular-nums"
              onChange={(e) => s.setTasaUsdStr(e.target.value)}
            />
          </Campo>

          <div className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Tasa aplicada</p>
                <p className="text-lg font-semibold tabular-nums">{formatTasa(s.tasaDeducida)}</p>
              </div>
              <BotonCopiar
                valor={s.tasaDeducida != null ? String(s.tasaDeducida) : ""}
                titulo="Copiar la tasa"
              />
            </div>
            {s.difVsBcv != null && (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {Math.abs(s.difVsBcv) < 0.05
                  ? `Es la misma tasa BCV de esa fecha (${formatTasa(s.bcvHoy)}).`
                  : `${$(Math.abs(s.difVsBcv))}% ${s.difVsBcv > 0 ? "por encima" : "por debajo"} de la tasa BCV de esa fecha (${formatTasa(s.bcvHoy)}).`}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={s.limpiar}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpiar
        </Button>
      </div>
    </div>
  );
}

/**
 * Calculadora suelta en su propio diálogo modal — el botón flotante de la
 * pestaña Transacciones. Para la que se abre al lado de un formulario de
 * edición sin taparlo, usar `CalculadoraPanel` + `useCalculadoraState`
 * directamente (ver `TransactionEditDialog`).
 */
export function CalculadoraDialog({
  open,
  onOpenChange,
  bcvRates,
  bcvRatesEuro = {},
  fechaReferencia,
  tipoReferencia,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bcvRates: Record<string, number>;
  bcvRatesEuro?: Record<string, number>;
  fechaReferencia?: string;
  tipoReferencia?: string;
}) {
  const state = useCalculadoraState(bcvRates, bcvRatesEuro, fechaReferencia, tipoReferencia);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Calculadora
          </DialogTitle>
          <DialogDescription>
            Para cuentas sueltas de conversión. No guarda nada ni modifica los movimientos.
          </DialogDescription>
        </DialogHeader>
        <CalculadoraPanel state={state} />
      </DialogContent>
    </Dialog>
  );
}

export { useCalculadoraState };
export type { CalculadoraState };
