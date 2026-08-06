import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronRight, HandCoins } from "lucide-react";
import type { Student, Transaction } from "@/lib/lists-store";

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
 * Saca de quién es el préstamo a partir de la descripción.
 *
 * Lo acordado es escribir el nombre delante de dos puntos:
 *     "Margelys Santos : abono de agosto"
 * Eso es lo primero que se mira. Pero los movimientos que ya están cargados
 * no llevan esa forma, así que si no hay dos puntos se busca dentro de la
 * descripción a alguien de la lista de integrantes. Solo si tampoco aparece
 * se usa la descripción entera, y entonces esa fila se ve rara a propósito:
 * es la señal de que hay que corregirla.
 */
function personaDelPrestamo(descripcion: string, nombresConocidos: string[]): string {
  const desc = (descripcion || "").trim();
  if (!desc) return "(sin descripción)";

  const dosPuntos = desc.indexOf(":");
  if (dosPuntos > 0) {
    const antes = desc.slice(0, dosPuntos).trim();
    if (antes) return antes;
  }

  const plano = normalizar(desc);
  // El más largo primero: si alguien se llama "Ana" y otra "Ana María", debe
  // ganar el nombre completo.
  const porLargo = [...nombresConocidos].sort((a, b) => b.length - a.length);
  for (const nombre of porLargo) {
    if (plano.includes(normalizar(nombre))) return nombre;
  }

  return desc;
}

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
  intereses: number;
  saldo: number;
  movimientos: Movimiento[];
};

export function PrestamosTab({ tx, students }: { tx: Transaction[]; students: Student[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);

  const prestamos = useMemo<Prestamo[]>(() => {
    const nombres = students.map((s) => s.nombre).filter(Boolean);
    const porPersona = new Map<string, Prestamo>();

    for (const t of tx) {
      const esPrestamo = CAT_PRESTAMO.includes(t.categoria);
      const esInteres = CAT_INTERES.includes(t.categoria);
      if (!esPrestamo && !esInteres) continue;

      const persona = personaDelPrestamo(t.descripcion, nombres);
      const clave = normalizar(persona);
      let p = porPersona.get(clave);
      if (!p) {
        p = { persona, prestado: 0, abonado: 0, intereses: 0, saldo: 0, movimientos: [] };
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
    for (const p of lista) {
      p.saldo = p.prestado - p.abonado;
      p.movimientos.sort((a, b) => a.iso.localeCompare(b.iso));
    }
    // Primero quien más debe: es lo que hay que perseguir.
    return lista.sort((a, b) => b.saldo - a.saldo || a.persona.localeCompare(b.persona));
  }, [tx, students]);

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

  if (!prestamos.length) {
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
          persona. Por ejemplo:{" "}
          <span className="font-medium">Margelys Santos : abono de agosto</span>
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

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Préstamos por persona</h2>
          </div>
          <Input
            className="ml-auto h-8 w-56"
            placeholder="Buscar persona..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
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
                        {p.intereses > 0 ? `$${usd(p.intereses)}` : "—"}
                      </td>
                      <td className="p-2 text-right font-semibold tabular-nums">
                        ${usd(Math.max(0, p.saldo))}
                      </td>
                      <td className="p-2">
                        {pagado ? (
                          <span className="rounded-md border border-emerald-500/40 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                            {p.saldo < -0.005 ? "Devolvió de más" : "Pagado"}
                          </span>
                        ) : (
                          <span className="rounded-md border border-amber-500/40 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandida && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={6} className="p-2">
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

        <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">
          Los préstamos no entran en Solvencias: la deuda de cuota social se calcula solo con
          MIEMBROS, PROBAS y CLASE. Para que un movimiento quede asignado a alguien, escribe el
          nombre delante de dos puntos en la descripción.
        </p>
      </Card>
    </div>
  );
}
