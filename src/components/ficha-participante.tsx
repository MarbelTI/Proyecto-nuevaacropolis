import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, Wallet, GraduationCap, CalendarCheck, Lock } from "lucide-react";
import type { Student, Transaction } from "@/lib/lists-store";
import type {
  AulaMeta,
  AttendanceRecord,
  ReflexionMeta,
  ReflexionAsistencia,
} from "@/lib/attendance-store";
import { calcularCuotasDebidas, currentYm } from "@/lib/fees-logic";

/** Los mismos colores validados que usa el Diagnóstico Global. */
const C_ASIST = "#3F8A5F";
const C_REFLEX = "#BF5A22";

/** Categorías que son pago de cuota. Préstamos y demás quedan fuera. */
const CAT_CUOTA = ["MIEMBROS", "PROBAS", "CLASE"];

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
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function usd(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
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

  // ---- Mensualidades ----
  const pagos = useMemo(() => {
    if (!persona) return [];
    return tx
      .filter((t) => t.tipo === "Ingreso" && CAT_CUOTA.includes(t.categoria))
      .filter((t) => mismaPersona(t.descripcion, persona.nombre))
      .map((t) => ({
        fecha: t.fecha,
        iso: fechaToIso(t.fecha),
        mensualidad: t.mensualidad || "",
        usd: Number(t.montoUsd) || 0,
        categoria: t.categoria,
      }))
      .sort((a, b) => b.iso.localeCompare(a.iso));
  }, [tx, persona]);

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
    const ultimoYm = ultimo ? ultimo.iso.slice(0, 7) : null;
    return {
      ...calcularCuotasDebidas(persona, ultimoYm, ym, ultimo?.usd),
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
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2">
                    <div className="text-[11px] text-muted-foreground">Meses debidos</div>
                    <div className="text-lg font-bold tabular-nums">{deuda.meses}</div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="text-[11px] text-muted-foreground">Debe</div>
                    <div className="text-lg font-bold tabular-nums">${usd(deuda.totalUSD)}</div>
                  </div>
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

            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Cursos</h3>
              </div>
              {persona.aulas.length ? (
                <div className="space-y-1.5">
                  {persona.aulas.map((a) => {
                    const meta = aulasMeta.find((m) => m.nombre === a);
                    return (
                      <div key={a} className="rounded-lg border p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{a}</span>
                          {meta?.activa === false && (
                            <span className="rounded-md border border-amber-400 px-1.5 py-0.5 text-[10px] text-amber-800 dark:text-amber-200">
                              archivada
                            </span>
                          )}
                        </div>
                        {meta && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {meta.diaSemana} · celador: {meta.celador || "—"} · {meta.condicion}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No está asignado a ningún aula.</p>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Asistencia</h3>
            </div>
            {asistencia.length ? (
              <div className="space-y-3">
                {asistencia.map((a) => (
                  <div key={a.aula}>
                    <div className="mb-1 text-sm font-medium">{a.aula}</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-xs text-muted-foreground">
                          Asistencia
                        </span>
                        <Barra valor={a.asistio} total={a.clases} color={C_ASIST} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-xs text-muted-foreground">
                          Reflexiones
                        </span>
                        <Barra valor={a.entregadas} total={a.reflexiones} color={C_REFLEX} />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="border-t pt-2 text-[11px] text-muted-foreground">
                  Los días marcados «no hubo clase» no cuentan como falta.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No aparece en ninguna lista de asistencia. Puede que el nombre esté escrito distinto
                en la hoja de asistencia que en la lista de integrantes.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
