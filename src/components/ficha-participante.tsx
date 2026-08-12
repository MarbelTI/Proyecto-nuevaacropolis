import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, Wallet, GraduationCap, Lock, Tent } from "lucide-react";
import type { Student, Transaction } from "@/lib/lists-store";
import type {
  AulaMeta,
  AttendanceRecord,
  ReflexionMeta,
  ReflexionAsistencia,
} from "@/lib/attendance-store";
import { calcularCuotasDebidas, currentYm, resumirPagos } from "@/lib/fees-logic";
import { grupoDeCategoria } from "@/lib/categorias";
import { usd } from "@/lib/formato";

/** Los mismos colores validados que usa el Diagnóstico Global. */
const C_ASIST = "#3F8A5F";
const C_REFLEX = "#BF5A22";

/** Un movimiento de esta persona, ya listo para pintar. */
type Mov = {
  fecha: string;
  iso: string;
  mensualidad: string;
  usd: number;
  categoria: string;
  tipo: string;
  descripcion: string;
};

function norm(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Los nombres no se escriben igual en la lista de integrantes que en la hoja
 * de asistencia. Se considera la misma persona si todas las palabras del
 * nombre más corto están en el más largo.
 *
 * Se exigen dos palabras como mínimo: con una sola, "Milagro" uniría a las dos
 * Milagros que hay en la escuela, que son personas distintas.
 */
function mismaPersona(a: string, b: string): boolean {
  const ta = norm(a).split(" ").filter(Boolean);
  const tb = norm(b).split(" ").filter(Boolean);
  if (!ta.length || !tb.length) return false;
  const corto = ta.length <= tb.length ? ta : tb;
  const largo = ta.length <= tb.length ? tb : ta;
  if (corto.length < 2) return false;
  return corto.every((t) => largo.includes(t));
}

function fechaToIso(fecha: string): string {
  const m = (fecha || "").trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return "";
  const [, d = "", mo = "", a] = m;
  let yy = a ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/**
 * La cédula, el correo y la dirección son de control de estudio. Finanzas
 * trabaja solo con nombre y teléfono, y los celadores ni eso. Está decidido
 * así por la escuela, y esta pantalla junta datos de todos lados: es
 * justamente donde más fácil sería filtrarlos sin querer.
 */
function veDatosPersonales(role?: string): boolean {
  return role === "super_admin" || role === "celador_estudios";
}

function Barra({ valor, total, color }: { valor: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {valor}/{total} · {pct}%
      </span>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | undefined }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{etiqueta}</div>
      <div className="text-sm">
        {valor?.trim() ? valor : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

export function FichaParticipante({
  students,
  tx,
  aulasMeta,
  records,
  reflexionesMeta,
  reflexionAsistencia,
  role,
}: {
  students: Student[];
  tx: Transaction[];
  aulasMeta: AulaMeta[];
  records: AttendanceRecord[];
  reflexionesMeta: ReflexionMeta[];
  reflexionAsistencia: ReflexionAsistencia[];
  role?: string;
}) {
  const [q, setQ] = useState("");
  const [elegido, setElegido] = useState<string | null>(null);
  const puedeVerDatos = veDatosPersonales(role);

  // Busca por nombre o por cédula. La cédula se compara solo con dígitos, así
  // que da igual si se escribe con puntos, con V- delante o sin nada.
  const resultados = useMemo(() => {
    const texto = norm(q);
    const digitos = q.replace(/\D/g, "");
    if (texto.length < 2 && digitos.length < 3) return [];
    return students.filter((s) => {
      if (texto.length >= 2 && norm(s.nombre).includes(texto)) return true;
      if (digitos.length >= 3 && (s.cedula ?? "").replace(/\D/g, "").includes(digitos)) return true;
      return false;
    });
  }, [students, q]);

  const persona = useMemo(() => {
    if (elegido) return students.find((s) => s.nombre === elegido) ?? null;
    return resultados.length === 1 ? resultados[0] : null;
  }, [elegido, resultados, students]);

  /**
   * Lo que esta persona ha pagado a la escuela, repartido por concepto.
   *
   * Quedan FUERA dos cosas, cada una por su motivo:
   *
   * - Los servicios (terapias, mitología, taichí): ahí el nombre de la
   *   descripción suele ser el de quien cobra, no el de quien paga. Quien
   *   administra las consultas de otro aparecería con decenas de movimientos
   *   ajenos y su ficha diría cualquier cosa menos cómo está ella.
   *
   * - Los préstamos: solo los tienen cinco personas y tienen su propia
   *   pantalla en Finanzas, con su saldo y su detalle. Repetirlos aquí llenaba
   *   la ficha de un bloque vacío para casi todo el mundo.
   */
  const movimientos = useMemo(() => {
    const vacio = { cuota: [] as Mov[], actividades: [] as Mov[] };
    if (!persona) return vacio;

    const suyos = tx.filter((t) => mismaPersona(t.descripcion, persona.nombre));
    for (const t of suyos) {
      const grupo = grupoDeCategoria(t.categoria);
      if (grupo === "servicio" || grupo === "tecnica" || grupo === "prestamo") continue;

      const m: Mov = {
        fecha: t.fecha,
        iso: fechaToIso(t.fecha),
        mensualidad: t.mensualidad || "",
        usd: Number(t.montoUsd) || 0,
        categoria: t.categoria,
        tipo: t.tipo,
        descripcion: t.descripcion || "",
      };
      if (grupo === "cuota" && t.tipo === "Ingreso") vacio.cuota.push(m);
      else if (t.tipo === "Ingreso") vacio.actividades.push(m);
    }

    const recientePrimero = (a: Mov, b: Mov) => b.iso.localeCompare(a.iso);
    vacio.cuota.sort(recientePrimero);
    vacio.actividades.sort(recientePrimero);
    return vacio;
  }, [tx, persona]);

  const pagos = movimientos.cuota;

  /**
   * Aquí NO se expone la cuota individual, a propósito.
   *
   * Hay personas becadas y personas que pagan menos de los 20 USD estándar.
   * Esta ficha se abre delante de quien sea —en clase, en el mostrador—, así
   * que mostrar la cuota de la persona dejaría a la vista de terceros que paga
   * menos que el resto. Se conservan los meses debidos y el total, que es lo
   * que finanzas necesita para gestionar el cobro.
   */
  const deuda = useMemo(() => {
    if (!persona) return null;
    const ym = currentYm();
    const ultimo = pagos.length ? pagos[0] : null;
    // La deuda son los meses que ningún pago declara cubrir (columna
    // mensualidad), no los posteriores a la fecha del último pago: pagar en
    // agosto la mensualidad de enero no deja a nadie al día.
    const resumen = resumirPagos(
      pagos.map((p) => ({ iso: p.iso, mensualidad: p.mensualidad, monto: p.usd })),
    );
    return {
      ...calcularCuotasDebidas(persona, resumen, ym),
      ultimo,
    };
  }, [persona, pagos]);

  // ---- Asistencias por aula ----
  const asistencia = useMemo(() => {
    if (!persona) return [];
    const activas = aulasMeta.filter((a) => a.activa !== false);
    const salida: {
      aula: string;
      asistio: number;
      clases: number;
      entregadas: number;
      reflexiones: number;
    }[] = [];

    for (const aula of activas) {
      const mios = records.filter(
        (r) => r.aula === aula.nombre && mismaPersona(r.alumno, persona.nombre),
      );
      if (!mios.length) continue;

      // Los días marcados "no hubo clase" no cuentan como falta de nadie.
      const conClase = mios.filter((r) => r.asistencia !== "NC" && r.asistencia !== "");
      const asistio = conClase.filter((r) => r.asistencia === "A").length;

      const refsAula = reflexionesMeta.filter((r) => r.aula === aula.nombre);
      const idsAula = new Set(refsAula.map((r) => r.id));
      const misEntregas = reflexionAsistencia.filter(
        (e) => idsAula.has(e.reflexionId) && mismaPersona(e.alumno, persona.nombre),
      );
      const entregadas = misEntregas.filter((e) => e.estado === "E").length;

      salida.push({
        aula: aula.nombre,
        asistio,
        clases: conClase.length,
        entregadas,
        reflexiones: refsAula.length,
      });
    }
    return salida;
  }, [persona, aulasMeta, records, reflexionesMeta, reflexionAsistencia]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setElegido(null);
            }}
            placeholder={puedeVerDatos ? "Buscar por nombre o cédula…" : "Buscar por nombre…"}
            className="max-w-md"
          />
        </div>

        {q.trim().length > 0 && !resultados.length && (
          <p className="mt-3 text-sm text-muted-foreground">Nadie coincide con «{q}».</p>
        )}

        {resultados.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {resultados.slice(0, 30).map((s) => (
              <button
                key={s.nombre}
                type="button"
                onClick={() => setElegido(s.nombre)}
                className={`rounded-md border px-2 py-1 text-xs transition hover:bg-accent ${
                  persona?.nombre === s.nombre ? "border-primary bg-accent" : ""
                }`}
              >
                {s.nombre}
                <span className="ml-1 text-muted-foreground">
                  {s.aulas[0] ? `· ${s.aulas[0]}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {!persona && !q.trim() && (
        <Card className="p-8 text-center">
          <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Escribe un nombre {puedeVerDatos && "o una cédula "}para ver la ficha completa: sus
            datos, cómo va de mensualidades, en qué cursos está y su asistencia.
          </p>
        </Card>
      )}

      {persona && (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">{persona.nombre}</h2>
              {persona.celador && (
                <span className="rounded-md border px-1.5 py-0.5 text-[11px]">celador(a)</span>
              )}
              {persona.condicion && (
                <span className="rounded-md border px-1.5 py-0.5 text-[11px]">
                  {persona.condicion}
                </span>
              )}
              <span
                className={`rounded-md border px-1.5 py-0.5 text-[11px] ${
                  (persona.actividad ?? "Activo") === "Activo"
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "text-muted-foreground"
                }`}
              >
                {persona.actividad ?? "Activo"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Dato etiqueta="Teléfono" valor={persona.telefono} />
              <Dato etiqueta="Ingreso" valor={persona.fechaIngreso} />
              {puedeVerDatos ? (
                <>
                  <Dato etiqueta="Cédula" valor={persona.cedula} />
                  <Dato etiqueta="Correo" valor={persona.correo} />
                  <Dato etiqueta="Dirección" valor={persona.direccion} />
                  <Dato etiqueta="Ocupación" valor={persona.ocupacion} />
                  <Dato etiqueta="Grado de participación" valor={persona.gradoParticipacion} />
                  <Dato etiqueta="Sede" valor={persona.sede} />
                </>
              ) : (
                <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground md:col-span-2">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Cédula, correo y dirección son de control de estudio.
                </div>
              )}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Mensualidades</h3>
              </div>

              {deuda && (
                <div className="mb-3 rounded-lg border p-3">
                  {deuda.meses > 0 ? (
                    <>
                      <div className="text-2xl font-bold tabular-nums">${usd(deuda.totalUSD)}</div>
                      <div className="text-xs text-muted-foreground">
                        {deuda.meses === 1 ? "1 mes pendiente" : `${deuda.meses} meses pendientes`}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Al día con su cuota
                    </div>
                  )}
                </div>
              )}

              {pagos.length ? (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b text-muted-foreground">
                        <th className="p-1 text-left font-medium">Fecha</th>
                        <th className="p-1 text-left font-medium">Mes que paga</th>
                        <th className="p-1 text-left font-medium">Categoría</th>
                        <th className="p-1 text-right font-medium">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagos.map((p, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-1 tabular-nums">{p.fecha}</td>
                          <td className="p-1">{p.mensualidad || "—"}</td>
                          <td className="p-1 text-muted-foreground">{p.categoria}</td>
                          <td className="p-1 text-right tabular-nums">${usd(p.usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay pagos de cuota registrados a su nombre.
                </p>
              )}
            </Card>

            {/* Cada concepto en su propio bloque. Mezclarlos era justo el
                problema: no se distinguia si alguien estaba al dia con la
                cuota o si simplemente habia pagado un campamento. */}
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Tent className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Otras actividades</h3>
              </div>
              {movimientos.actividades.length ? (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b text-muted-foreground">
                        <th className="p-1 text-left font-medium">Fecha</th>
                        <th className="p-1 text-left font-medium">Actividad</th>
                        <th className="p-1 text-left font-medium">Detalle</th>
                        <th className="p-1 text-right font-medium">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.actividades.map((m, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-1 tabular-nums">{m.fecha}</td>
                          <td className="p-1">{m.categoria}</td>
                          <td className="p-1 text-muted-foreground">{m.descripcion}</td>
                          <td className="p-1 text-right tabular-nums">${usd(m.usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No ha pagado campamentos, cenas ni otras actividades.
                </p>
              )}
            </Card>
          </div>

          {/* Curso y asistencia juntos. Separarlos obligaba a nombrar dos veces
              la misma aula y a saltar de un bloque a otro para responder algo
              tan simple como "en Krishna I, ¿cómo va?". */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Cursos y asistencia</h3>
            </div>
            {persona.aulas.length ? (
              <div className="space-y-2">
                {persona.aulas.map((a) => {
                  const meta = aulasMeta.find((m) => m.nombre === a);
                  const asis = asistencia.find((x) => x.aula === a);
                  return (
                    <div key={a} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-medium">{a}</span>
                        {meta && (
                          <span className="text-[11px] text-muted-foreground">
                            {meta.diaSemana} · celador: {meta.celador || "—"} · {meta.condicion}
                          </span>
                        )}
                        {meta?.activa === false && (
                          <span className="rounded-md border border-amber-400 px-1.5 py-0.5 text-[10px] text-amber-800 dark:text-amber-200">
                            archivada
                          </span>
                        )}
                      </div>

                      {asis ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-xs text-muted-foreground">
                              Asistencia
                            </span>
                            <Barra valor={asis.asistio} total={asis.clases} color={C_ASIST} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-xs text-muted-foreground">
                              Reflexiones
                            </span>
                            <Barra
                              valor={asis.entregadas}
                              total={asis.reflexiones}
                              color={C_REFLEX}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Sin registros de asistencia en esta aula. Puede que el nombre esté escrito
                          distinto en la hoja que en la lista de integrantes.
                        </p>
                      )}
                    </div>
                  );
                })}
                <p className="border-t pt-2 text-[11px] text-muted-foreground">
                  Los días marcados «no hubo clase» no cuentan como falta.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No está asignado a ningún aula.</p>
            )}
          </Card>

          {/* Decirlo en pantalla, no solo en el código: quien mire esta ficha
              tiene que saber que falta algo a propósito, o creerá que está
              viendo todo el dinero de esa persona. */}
          <p className="text-[11px] text-muted-foreground">
            Esta ficha no incluye terapias, mitología, taichí ni herbolaria —en esas categorías el
            nombre suele ser el de quien cobra, no el de quien paga— ni los préstamos, que tienen su
            propia pantalla en Finanzas. Todo se ve completo en Transacciones.
          </p>
        </>
      )}
    </div>
  );
}
