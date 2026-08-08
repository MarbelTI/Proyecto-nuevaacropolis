import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, ChevronRight, HandCoins, Link2, X } from "lucide-react";
import type { Student, Transaction } from "@/lib/lists-store";
import { usePrestamoAliases, unir, separar, type GrupoPrestamo } from "@/lib/prestamos-alias";

/**
 * Categorías que son movimiento de préstamo y NO cuota social.
 *
 * El dinero que sale es lo prestado; el que entra, lo que la persona va
 * devolviendo. Los intereses van aparte porque no bajan la deuda: son
 * ingreso de la escuela.
 *
 * Nada de esto entra en Solvencias, que solo mira MIEMBROS, PROBAS y CLASE.
 */
const CAT_PRESTAMO = ["PRESTAMO", "PRÉSTAMOS, PROFESOR"];
const CAT_INTERES = ["INTERESES PTAMO"];

function usd(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaToIso(fecha: string): string {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return "";
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * ¿De quién es este préstamo? Devuelve null cuando no se sabe.
 *
 * Devolver null es la parte importante. Antes, si no se reconocía a nadie se
 * usaba la descripción entera como si fuera el nombre de una persona, y la
 * tabla se llenaba de filas tipo "abono ptmo" o "deposito" haciéndose pasar por
 * gente. Un préstamo sin dueño no es una persona con un nombre raro: es un
 * préstamo sin dueño, y merece decirlo así.
 *
 * Los que devuelven null se agrupan aparte, al final de la pantalla, para
 * asignarlos a mano.
 *
 * El orden de búsqueda:
 *
 * 1. Las equivalencias cargadas desde la pantalla. Mandan sobre todo lo demás
 *    porque son una decisión explícita: si se dijo que "míos" es Manuela
 *    Zambrano, no hay nada que discutir.
 * 2. Lo que va antes de los dos puntos ("Jesús Rodríguez: abono"), que es la
 *    forma acordada de escribirlo — PERO solo si de verdad parece un nombre.
 *    "abono ptmo: 50" tiene dos puntos y no nombra a nadie.
 * 3. Un integrante de la lista de la escuela mencionado en la descripción.
 *    Esto reconoce lo ya cargado sin tener que reescribirlo.
 */
function personaDelPrestamo(
  descripcion: string,
  nombresConocidos: string[],
  grupos: GrupoPrestamo[],
): string | null {
  const desc = (descripcion || "").trim();
  if (!desc) return null;
  const plano = normalizar(desc);

  // La clave más larga primero: si se configuró "Ricardo" y también "Ricardo
  // García" para personas distintas, gana la más específica.
  const claves = grupos
    .flatMap((g) => g.claves.map((c) => ({ persona: g.persona, clave: c })))
    .sort((a, b) => b.clave.length - a.clave.length);
  for (const { persona, clave } of claves) {
    if (plano.includes(normalizar(clave))) return persona;
  }

  const dosPuntos = desc.indexOf(":");
  if (dosPuntos > 0) {
    const antes = desc.slice(0, dosPuntos).trim();
    if (pareceNombre(antes)) return antes;
  }

  const porLargo = [...nombresConocidos].sort((a, b) => b.length - a.length);
  for (const nombre of porLargo) {
    if (plano.includes(normalizar(nombre))) return nombre;
  }

  return null;
}

/**
 * ¿Este texto parece el nombre de una persona?
 *
 * No hay forma perfecta de saberlo, pero sí una regla que acierta con lo que se
 * escribe de verdad en el libro: un nombre son una o más palabras de letras,
 * sin cifras y sin verbos de movimiento de dinero.
 *
 * Sirve para que "abono ptmo: 50" no cree una persona llamada "abono ptmo",
 * mientras "Jesús Rodríguez: abono" sí reconozca a Jesús Rodríguez.
 */
function pareceNombre(texto: string): boolean {
  const t = texto.trim();
  if (t.length < 3 || t.length > 60) return false;
  if (/\d/.test(t)) return false;

  const palabras = normalizar(t).split(" ").filter(Boolean);
  if (!palabras.length || palabras.length > 5) return false;

  // Palabras que delatan que esto es un concepto contable, no una persona.
  const NO_SON_NOMBRES = [
    "abono",
    "abonos",
    "pago",
    "pagos",
    "prestamo",
    "prestamos",
    "ptmo",
    "ptamo",
    "deposito",
    "transferencia",
    "efectivo",
    "saldo",
    "cuota",
    "interes",
    "intereses",
    "devolucion",
    "se",
    "le",
    "por",
    "del",
    "para",
  ];
  if (palabras.some((p) => NO_SON_NOMBRES.includes(p))) return false;

  // Solo letras: descarta códigos y referencias bancarias.
  return palabras.every((p) => /^[a-zñ]+$/.test(p));
}

/**
 * Saca la tasa de la descripción: "Ricardo García: se presta 10%" → 0.10.
 *
 * Se escribe a mano en cada préstamo porque no todos llevan la misma, y
 * algunos no llevan ninguna. No hay tasa por defecto a propósito: si no está
 * escrita, no se estima nada. Inventar un 10% donde no lo hay sería peor que
 * dejarlo vacío, porque nadie revisa una cifra que ya parece calculada.
 */
function tasaDeDescripcion(desc: string): number | null {
  const m = (desc || "").match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return isFinite(n) && n > 0 && n <= 100 ? n / 100 : null;
}

const mesDe = (iso: string) => iso.slice(0, 7);

type Movimiento = {
  fecha: string;
  iso: string;
  descripcion: string;
  tipo: string;
  categoria: string;
  usd: number;
};

type Prestamo = {
  persona: string;
  prestado: number;
  abonado: number;
  /** Intereses REALMENTE registrados en el libro. Es dinero, no estimación. */
  intereses: number;
  saldo: number;
  movimientos: Movimiento[];
  /** Tasa escrita en la descripción, si la hay. */
  tasa: number | null;
  /** El préstamo salió del mes en que se dio: dentro del mismo mes no se cobra. */
  cruzoDeMes: boolean;
  /** Solo orientativo. NUNCA entra en los totales ni en el saldo. */
  interesEstimado: number;
  /** Cruzó de mes, tiene tasa, y lo cobrado se queda corto. */
  faltaCobrarInteres: boolean;
};

export function PrestamosTab({ tx, students }: { tx: Transaction[]; students: Student[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [grupos, setGrupos] = usePrestamoAliases();
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [uniendoAbierto, setUniendoAbierto] = useState(false);
  const [destino, setDestino] = useState("");
  const [verGrupos, setVerGrupos] = useState(false);

  // Los movimientos que no se pudieron atribuir a nadie. No son personas: son
  // préstamos esperando dueño, y van en su propio bloque al final.
  const sueltos = useMemo<Movimiento[]>(() => {
    const nombres = students.map((s) => s.nombre).filter(Boolean);
    return tx
      .filter((t) => CAT_PRESTAMO.includes(t.categoria) || CAT_INTERES.includes(t.categoria))
      .filter((t) => personaDelPrestamo(t.descripcion, nombres, grupos) === null)
      .map((t) => ({
        fecha: t.fecha,
        iso: fechaToIso(t.fecha),
        descripcion: t.descripcion || "(sin descripción)",
        tipo: t.tipo,
        categoria: t.categoria,
        usd: Math.abs(Number(t.montoUsd) || 0),
      }))
      .sort((a, b) => a.iso.localeCompare(b.iso));
  }, [tx, students, grupos]);

  const prestamos = useMemo<Prestamo[]>(() => {
    const nombres = students.map((s) => s.nombre).filter(Boolean);
    const porPersona = new Map<string, Prestamo>();

    for (const t of tx) {
      const esPrestamo = CAT_PRESTAMO.includes(t.categoria);
      const esInteres = CAT_INTERES.includes(t.categoria);
      if (!esPrestamo && !esInteres) continue;

      const persona = personaDelPrestamo(t.descripcion, nombres, grupos);
      if (persona === null) continue; // va al bloque de sin asignar
      const clave = normalizar(persona);
      let p = porPersona.get(clave);
      if (!p) {
        p = {
          persona,
          prestado: 0,
          abonado: 0,
          intereses: 0,
          saldo: 0,
          movimientos: [],
          tasa: null,
          cruzoDeMes: false,
          interesEstimado: 0,
          faltaCobrarInteres: false,
        };
        porPersona.set(clave, p);
      }

      const monto = Math.abs(Number(t.montoUsd) || 0);
      if (esInteres) p.intereses += monto;
      else if (t.tipo === "Gasto") p.prestado += monto;
      else p.abonado += monto;

      p.movimientos.push({
        fecha: t.fecha,
        iso: fechaToIso(t.fecha),
        descripcion: t.descripcion || "",
        tipo: t.tipo,
        categoria: t.categoria,
        usd: monto,
      });
    }

    const lista = [...porPersona.values()];
    const mesActual = new Date().toISOString().slice(0, 7);

    for (const p of lista) {
      p.saldo = p.prestado - p.abonado;
      p.movimientos.sort((a, b) => a.iso.localeCompare(b.iso));

      const entregas = p.movimientos.filter(
        (m) => m.tipo === "Gasto" && !CAT_INTERES.includes(m.categoria),
      );
      const devoluciones = p.movimientos.filter(
        (m) => m.tipo === "Ingreso" && !CAT_INTERES.includes(m.categoria),
      );

      // La tasa se busca primero en el movimiento donde se entregó el dinero,
      // que es donde tiene sentido pactarla.
      p.tasa =
        entregas.map((m) => tasaDeDescripcion(m.descripcion)).find((t) => t != null) ??
        p.movimientos.map((m) => tasaDeDescripcion(m.descripcion)).find((t) => t != null) ??
        null;

      const mesesEntrega = entregas.map((m) => mesDe(m.iso)).filter(Boolean);
      const ultimaEntrega = mesesEntrega.length ? mesesEntrega[mesesEntrega.length - 1] : "";
      const mesesDevolucion = devoluciones.map((m) => mesDe(m.iso)).filter(Boolean);
      const ultimaDevolucion = mesesDevolucion.length
        ? mesesDevolucion[mesesDevolucion.length - 1]
        : "";

      // Dentro del mismo mes no se cobra interés. Si sigue debiendo, se compara
      // con el mes en curso; si ya pagó, con el mes en que terminó de pagar.
      if (ultimaEntrega) {
        p.cruzoDeMes =
          p.saldo > 0.005
            ? ultimaEntrega < mesActual
            : !!ultimaDevolucion && ultimaDevolucion > ultimaEntrega;
      }

      p.interesEstimado = p.cruzoDeMes && p.tasa ? p.prestado * p.tasa : 0;
      p.faltaCobrarInteres = p.interesEstimado > 0 && p.intereses < p.interesEstimado - 0.005;
    }
    // Primero quien más debe: es lo que hay que perseguir.
    return lista.sort((a, b) => b.saldo - a.saldo || a.persona.localeCompare(b.persona));
  }, [tx, students, grupos]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return prestamos;
    return prestamos.filter((p) => normalizar(p.persona).includes(q));
  }, [prestamos, busqueda]);

  const totales = useMemo(() => {
    const prestado = prestamos.reduce((s, p) => s + p.prestado, 0);
    const abonado = prestamos.reduce((s, p) => s + p.abonado, 0);
    const intereses = prestamos.reduce((s, p) => s + p.intereses, 0);
    // Un saldo negativo significa que devolvió de más; no debe tapar lo que
    // otros deben, así que en el total pendiente solo cuentan los positivos.
    const pendiente = prestamos.reduce((s, p) => s + Math.max(0, p.saldo), 0);
    const conSaldo = prestamos.filter((p) => p.saldo > 0.005).length;
    return { prestado, abonado, intereses, pendiente, conSaldo };
  }, [prestamos]);

  const alternarSeleccion = (persona: string) =>
    setSeleccion((prev) =>
      prev.includes(persona) ? prev.filter((p) => p !== persona) : [...prev, persona],
    );

  /**
   * Al abrir el diálogo se propone el nombre más largo de los marcados. Entre
   * "Ricardo" y "Ricardo García" el completo es casi siempre el bueno, así que
   * en la mayoría de los casos basta con confirmar.
   */
  const abrirUnion = () => {
    const masLargo = [...seleccion].sort((a, b) => b.length - a.length)[0] ?? "";
    setDestino(masLargo);
    setUniendoAbierto(true);
  };

  const confirmarUnion = () => {
    const nombre = destino.trim();
    if (!nombre || !seleccion.length) return;
    // Se aplican una tras otra sobre el resultado anterior; hacerlo sobre
    // `grupos` cada vez perdería todas menos la última.
    let next = grupos;
    for (const etiqueta of seleccion) next = unir(next, nombre, etiqueta);
    setGrupos(next);
    setUniendoAbierto(false);
    setSeleccion([]);
    setDestino("");
  };

  // Solo se da por vacío si NO hay nada de nada. Con préstamos sin asignar hay
  // trabajo que hacer y hay que enseñarlo, aunque todavía no haya ni una
  // persona reconocida.
  if (!prestamos.length && !sueltos.length) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold">Préstamos</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Todavía no hay movimientos en las categorías de préstamo.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Al registrar uno, escribe el nombre delante de dos puntos para que quede asignado a esa
          persona. Por ejemplo: <span className="font-medium">Ricardo García: abono</span>
        </p>
      </Card>
    );
  }

  const tiles = [
    { etiqueta: "Prestado", valor: totales.prestado, ayuda: "Total que ha salido" },
    { etiqueta: "Devuelto", valor: totales.abonado, ayuda: "Total que ha vuelto" },
    { etiqueta: "Por cobrar", valor: totales.pendiente, ayuda: `${totales.conSaldo} persona(s)` },
    { etiqueta: "Intereses", valor: totales.intereses, ayuda: "No bajan la deuda" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.etiqueta} className="p-3">
            <div className="text-xs text-muted-foreground">{t.etiqueta}</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums">${usd(t.valor)}</div>
            <div className="text-[11px] text-muted-foreground">{t.ayuda}</div>
          </Card>
        ))}
      </div>

      {/* Va aquí arriba, fuera de las tarjetas, porque se marcan filas en dos
          tablas distintas —personas y sin asignar— y la acción tiene que
          alcanzarse igual desde las dos. */}
      {seleccion.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
          <span className="text-xs font-medium">
            {seleccion.length} seleccionado{seleccion.length > 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">{seleccion.join(" · ")}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSeleccion([])}>
              Quitar selección
            </Button>
            <Button size="sm" className="text-xs" onClick={abrirUnion}>
              <Link2 className="mr-1 h-3.5 w-3.5" />
              Unir en una sola persona
            </Button>
          </div>
        </div>
      )}

      {prestamos.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Préstamos por persona</h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {grupos.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setVerGrupos((v) => !v)}
                >
                  <Link2 className="mr-1 h-3.5 w-3.5" />
                  Nombres unidos ({grupos.length})
                </Button>
              )}
              <Input
                className="h-8 w-56"
                placeholder="Buscar persona..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {verGrupos && (
            <div className="mb-3 rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Cada movimiento cuya descripción contenga una de estas palabras se suma a esa
                persona.
              </p>
              <div className="space-y-1.5">
                {grupos.map((g) => (
                  <div key={g.persona} className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-medium">{g.persona}</span>
                    <span className="text-muted-foreground">←</span>
                    {g.claves.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5"
                      >
                        {c}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          title={`Dejar de asociar «${c}» con ${g.persona}`}
                          onClick={() => setGrupos(separar(grupos, g.persona, c))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="w-8 p-2"></th>
                  <th className="p-2 text-left font-medium">Persona</th>
                  <th className="p-2 text-right font-medium">Prestado</th>
                  <th className="p-2 text-right font-medium">Devuelto</th>
                  <th className="p-2 text-right font-medium">Intereses</th>
                  <th className="p-2 text-right font-medium">Saldo</th>
                  <th className="p-2 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const clave = normalizar(p.persona);
                  const expandida = abierta === clave;
                  const pagado = p.saldo <= 0.005;
                  return (
                    <Fragment key={clave}>
                      <tr
                        className="cursor-pointer border-b transition hover:bg-muted/40 hover:font-semibold"
                        onClick={() => setAbierta(expandida ? null : clave)}
                      >
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={seleccion.includes(p.persona)}
                            onChange={() => alternarSeleccion(p.persona)}
                            title={`Marcar «${p.persona}» para unir`}
                          />
                        </td>
                        <td className="p-2">
                          <span className="flex items-center gap-1">
                            <ChevronRight
                              className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                                expandida ? "rotate-90" : ""
                              }`}
                            />
                            {p.persona}
                          </span>
                        </td>
                        <td className="p-2 text-right tabular-nums">${usd(p.prestado)}</td>
                        <td className="p-2 text-right tabular-nums">${usd(p.abonado)}</td>
                        <td className="p-2 text-right tabular-nums text-muted-foreground">
                          <div>{p.intereses > 0 ? `$${usd(p.intereses)}` : "—"}</div>
                          {p.interesEstimado > 0 && (
                            <div
                              className="text-[10px] italic opacity-70"
                              title={`Estimación: ${Math.round((p.tasa ?? 0) * 100)}% de $${usd(p.prestado)}. No entra en ningún total.`}
                            >
                              est. ${usd(p.interesEstimado)}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right font-semibold tabular-nums">
                          ${usd(Math.max(0, p.saldo))}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap items-center gap-1">
                            {pagado ? (
                              <span className="rounded-md border border-emerald-500/40 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                                {p.saldo < -0.005 ? "Devolvió de más" : "Pagado"}
                              </span>
                            ) : (
                              <span className="rounded-md border border-amber-500/40 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                Pendiente
                              </span>
                            )}
                            {p.faltaCobrarInteres && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-md border border-orange-500/40 bg-orange-50 px-1.5 py-0.5 text-[11px] text-orange-900 dark:bg-orange-950/40 dark:text-orange-200"
                                title="Pasó de mes y el interés cobrado no llega a la estimación. Es un recordatorio, no una deuda calculada."
                              >
                                <AlertCircle className="h-3 w-3" />
                                Revisar interés
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandida && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={7} className="p-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="p-1 text-left font-medium">Fecha</th>
                                  <th className="p-1 text-left font-medium">Concepto</th>
                                  <th className="p-1 text-left font-medium">Descripción</th>
                                  <th className="p-1 text-right font-medium">USD</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.movimientos.map((m, i) => {
                                  const esInteres = CAT_INTERES.includes(m.categoria);
                                  const concepto = esInteres
                                    ? "Interés"
                                    : m.tipo === "Gasto"
                                      ? "Se prestó"
                                      : "Devolvió";
                                  return (
                                    <tr key={i} className="border-t border-border/50">
                                      <td className="p-1 tabular-nums">{m.fecha}</td>
                                      <td className="p-1">{concepto}</td>
                                      <td className="p-1 text-muted-foreground">{m.descripcion}</td>
                                      <td className="p-1 text-right tabular-nums">${usd(m.usd)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!visibles.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nadie coincide con «{busqueda}».
            </p>
          )}

          <div className="mt-3 space-y-1.5 border-t pt-3 text-[11px] text-muted-foreground">
            <p>
              Los préstamos no entran en Solvencias: la deuda de cuota social se calcula solo con
              MIEMBROS, PROBAS y CLASE. Si la misma persona aparece escrita de varias formas,
              márcalas y usa «Unir»; queda agrupada también para lo que se cargue en adelante.
            </p>
            <p>
              <span className="font-medium">Intereses.</span> La cifra de arriba es lo que realmente
              se cobró. Para que aparezca la estimación en cursiva, escribe la tasa en la
              descripción del préstamo — por ejemplo{" "}
              <span className="font-medium">«Ricardo García: se presta 10%»</span>. Solo se estima
              si el préstamo pasó de mes; dentro del mismo mes no se cobra interés.{" "}
              <span className="font-medium">
                La estimación no suma en ningún total ni aumenta el saldo:
              </span>{" "}
              es un recordatorio para revisar, no una deuda calculada.
            </p>
          </div>
        </Card>
      )}

      {/*
        Préstamos sin dueño.

        Van aparte y no dentro de la tabla de personas a propósito: antes, cuando
        no se reconocía a nadie se usaba la descripción entera como si fuera un
        nombre, y aparecían filas como "abono ptmo" haciéndose pasar por gente.
        Un movimiento sin dueño no es una persona con nombre raro.

        Se marcan y se asignan con el mismo botón «Unir» que el resto: la
        descripción pasa a ser una equivalencia de esa persona, así que lo que se
        cargue después con ese mismo texto ya entra solo.
      */}
      {sueltos.length > 0 && (
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold">Préstamos sin asignar ({sueltos.length})</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            En estos movimientos no se reconoce de quién son. Márcalos y pulsa «Unir en una sola
            persona» para asignarlos; a partir de ahí se agrupan solos.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="w-8 p-2"></th>
                  <th className="p-2 text-left font-medium">Fecha</th>
                  <th className="p-2 text-left font-medium">Concepto</th>
                  <th className="p-2 text-left font-medium">Descripción</th>
                  <th className="p-2 text-right font-medium">USD</th>
                </tr>
              </thead>
              <tbody>
                {sueltos.map((m, i) => {
                  const esInteres = CAT_INTERES.includes(m.categoria);
                  const concepto = esInteres
                    ? "Interés"
                    : m.tipo === "Gasto"
                      ? "Se prestó"
                      : "Devolvió";
                  return (
                    <tr key={`${m.iso}-${i}`} className="border-b transition hover:bg-muted/40">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          checked={seleccion.includes(m.descripcion)}
                          onChange={() => alternarSeleccion(m.descripcion)}
                          title={`Marcar «${m.descripcion}» para asignar`}
                        />
                      </td>
                      <td className="p-2 tabular-nums">{m.fecha}</td>
                      <td className="p-2">{concepto}</td>
                      <td className="p-2 text-muted-foreground">{m.descripcion}</td>
                      <td className="p-2 text-right tabular-nums">${usd(m.usd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">
            Para que no vuelvan a caer aquí, escribe el nombre delante de dos puntos al registrar el
            movimiento: <span className="font-medium">«Jesús Rodríguez: abono»</span>. Si en la hoja
            no se distingue de quién es, es mejor dejarlo sin asignar que atribuírselo a la persona
            equivocada.
          </p>
        </Card>
      )}

      <Dialog open={uniendoAbierto} onOpenChange={(v) => !v && setUniendoAbierto(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Unir {seleccion.length} nombre{seleccion.length > 1 ? "s" : ""} en una sola persona
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {seleccion.map((s) => (
                <span key={s} className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs">
                  {s}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos estos pasarán a contarse como una sola persona. Se aplica también a lo que se
              cargue después.
            </p>
            <div>
              <label className="text-xs text-muted-foreground">Nombre definitivo</label>
              <Input
                list="personas-prestamo"
                value={destino}
                autoFocus
                placeholder="Ricardo García"
                onChange={(e) => setDestino(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmarUnion()}
              />
              <datalist id="personas-prestamo">
                {prestamos.map((p) => (
                  <option key={p.persona} value={p.persona} />
                ))}
                {students.map((s) => (
                  <option key={s.nombre} value={s.nombre} />
                ))}
              </datalist>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUniendoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarUnion} disabled={!destino.trim()}>
              Unir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
