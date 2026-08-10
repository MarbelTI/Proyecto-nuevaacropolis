import { useState } from "react";
import { bcvRateFor } from "@/lib/lists-store";
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
 * Calculadora de conversión, aparte del registro de movimientos.
 *
 * Existe porque no todo el mundo paga a la tasa del BCV: cuando alguien paga en
 * bolívares a otra tasa hay que sacar a mano cuántos dólares son, o al revés,
 * cuántos bolívares hay que cobrar por una cuota. No guarda nada ni toca las
 * transacciones: es una servilleta, no un formulario.
 *
 * OJO con dónde vive el estado: está en este componente y no dentro del
 * `DialogContent`, que Radix desmonta al cerrar. Así, cerrar el diálogo para
 * mirar un dato de la tabla y volver a abrirlo no borra lo que ya se había
 * escrito.
 */
export function CalculadoraDialog({
  open,
  onOpenChange,
  bcvRates,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bcvRates: Record<string, number>;
}) {
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

  const bcvHoy = bcvRateFor(bcvRates, todayIso());

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

  // Atajo de tasa según la moneda: los bolívares se mueven todos los días y la
  // referencia es el BCV; los pesos usan la tasa fija con la que ya trabaja el
  // resto del sistema.
  const tasaSugerida = moneda === "Pesos" ? TASA_PESOS_DEFAULT : bcvHoy;
  const etiquetaSugerida = moneda === "Pesos" ? "Tasa habitual" : "Tasa BCV de hoy";

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

        {/* Controlada desde fuera del DialogContent por lo mismo que el resto
            del estado: al reabrir se vuelve a la pestaña donde se estaba. */}
        <Tabs value={pestana} onValueChange={setPestana}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="convertir">Convertir</TabsTrigger>
            <TabsTrigger value="tasa">¿Qué tasa fue?</TabsTrigger>
          </TabsList>

          <TabsContent value="convertir" className="mt-4 space-y-3">
            <Campo label="Moneda">
              <Select value={moneda} onValueChange={(v) => setMoneda(v as MonedaOrigen)}>
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

            {!esUsd && (
              <Campo label={`Tasa (${moneda} por 1 USD)`}>
                <div className="flex gap-2">
                  <Input
                    value={tasaStr}
                    inputMode="decimal"
                    placeholder="Ej: 90.50"
                    onChange={(e) => setTasaStr(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={tasaSugerida == null}
                    title={
                      tasaSugerida != null
                        ? `Rellena ${formatTasa(tasaSugerida)} para empezar. Puedes escribir otra encima.`
                        : "No hay tasa BCV cargada para hoy"
                    }
                    onClick={() =>
                      tasaSugerida != null && setTasaStr(String(redondearTasa(tasaSugerida)))
                    }
                  >
                    {etiquetaSugerida}
                  </Button>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {tasaSugerida != null ? (
                    <>
                      El botón trae {formatTasa(tasaSugerida)} como punto de partida.{" "}
                      <strong className="font-medium text-foreground">
                        Escribe encima la tasa a la que se pagó de verdad
                      </strong>{" "}
                      si fue otra.
                    </>
                  ) : (
                    "No hay tasa BCV cargada para hoy; escríbela a mano."
                  )}
                </p>
              </Campo>
            )}

            <Campo label={esUsd ? "Monto en USD" : `Monto en ${moneda}`}>
              <div className="flex gap-1">
                <Input
                  value={valorLocal}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="tabular-nums"
                  onChange={(e) => {
                    setMontoStr(e.target.value);
                    setLadoActivo("local");
                  }}
                />
                <BotonCopiar
                  valor={ladoActivo === "usd" ? mostrar(localCalculado) : ""}
                  titulo={`Copiar el monto en ${moneda}`}
                />
              </div>
            </Campo>

            <Campo label="Equivale en USD">
              <div className="flex gap-1">
                <Input
                  value={valorUsd}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="tabular-nums"
                  onChange={(e) => {
                    setUsdStr(e.target.value);
                    setLadoActivo("usd");
                  }}
                />
                <BotonCopiar
                  valor={ladoActivo === "local" ? mostrar(usdCalculado) : ""}
                  titulo="Copiar el monto en USD"
                />
              </div>
            </Campo>

            {/* Se dice explícitamente porque un campo que se rellena solo
                parece de solo lectura y nadie intenta escribir en él. */}
            <p className="text-[11px] leading-snug text-muted-foreground">
              Escribe en cualquiera de los dos: el otro se calcula solo.
              {!esUsd && (!tasa || tasa <= 0) && (
                <span className="text-amber-600 dark:text-amber-500">
                  {" "}
                  Falta la tasa para poder convertir.
                </span>
              )}
            </p>

            {resultado > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <span className="tabular-nums">
                  {esUsd
                    ? `$${$(resultado)}`
                    : ladoActivo === "local"
                      ? `${$(montoLocal)} ${moneda} = $${$(usdCalculado)}`
                      : `$${$(usdEscrito)} = ${$(localCalculado)} ${moneda}`}
                </span>
                {!esUsd && tasa != null && (
                  <span className="text-muted-foreground"> · a {formatTasa(tasa)}</span>
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
              <Select value={tasaMoneda} onValueChange={(v) => setTasaMoneda(v as MonedaLocal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bolívares">Bolívares</SelectItem>
                  <SelectItem value="Pesos">Pesos</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo label={`Monto pagado en ${tasaMoneda}`}>
              <Input
                value={tasaMontoStr}
                inputMode="decimal"
                placeholder="0.00"
                className="tabular-nums"
                onChange={(e) => setTasaMontoStr(e.target.value)}
              />
            </Campo>

            <Campo label="Equivalente en USD">
              <Input
                value={tasaUsdStr}
                inputMode="decimal"
                placeholder="0.00"
                className="tabular-nums"
                onChange={(e) => setTasaUsdStr(e.target.value)}
              />
            </Campo>

            <div className="rounded-md border bg-muted/40 p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tasa aplicada</p>
                  <p className="text-lg font-semibold tabular-nums">{formatTasa(tasaDeducida)}</p>
                </div>
                <BotonCopiar
                  valor={tasaDeducida != null ? String(tasaDeducida) : ""}
                  titulo="Copiar la tasa"
                />
              </div>
              {difVsBcv != null && (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {Math.abs(difVsBcv) < 0.05
                    ? `Es la misma tasa del BCV de hoy (${formatTasa(bcvHoy)}).`
                    : `${$(Math.abs(difVsBcv))}% ${difVsBcv > 0 ? "por encima" : "por debajo"} de la tasa BCV de hoy (${formatTasa(bcvHoy)}).`}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpiar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
