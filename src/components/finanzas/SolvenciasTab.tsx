import { useMemo, useState } from "react";
import type { Student, Transaction } from "@/lib/lists-store";
import type { AulaMeta, AttendanceRecord } from "@/lib/attendance-store";
import {
  calcularCuotasDebidas,
  cuotaMensualUSD,
  currentYm,
  precioClase,
  resumirPagos,
  type PagosDelAlumno,
} from "@/lib/fees-logic";
import { armarMensaje, usePlantillas } from "@/lib/mensajes-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usd, aNumero, anioVenezuela, CELDA_NUMERO } from "@/lib/formato";
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
import {
  Plus,
  Trash2,
  MessageCircle,
  ClipboardCopy,
  Pencil,
  Save,
  X,
  Upload,
  UserPlus,
  Users,
  Settings2,
  Eye,
  EyeOff,
} from "lucide-react";
import { parseExcelToStudents } from "@/lib/excel-import";
import { toast } from "sonner";

// ------------------------- Constants -------------------------

const MESES_ES = [
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

const $ = usd;

// ------------------------- Helpers -------------------------

const MES_MAP: Record<string, string> = {
  enero: "ene",
  febrero: "feb",
  marzo: "mar",
  abril: "abr",
  mayo: "may",
  junio: "jun",
  julio: "jul",
  agosto: "ago",
  septiembre: "sep",
  octubre: "oct",
  noviembre: "nov",
  diciembre: "dic",
  "01": "ene",
  "02": "feb",
  "03": "mar",
  "04": "abr",
  "05": "may",
  "06": "jun",
  "07": "jul",
  "08": "ago",
  "09": "sep",
  "10": "oct",
  "11": "nov",
  "12": "dic",
};

function formatMes(mes: string): string {
  // Already "abr-26" or "ene-25" — return as-is
  if (/^[a-z]{3}-\d{2}$/i.test(mes)) return mes.toLowerCase();
  // "abr-2026" → "abr-26"
  const m = mes.match(/^(\d{1,2}|[a-z]{3,9})[-\s]\s*(\d{4})$/i);
  if (m) {
    const abr = MES_MAP[m[1].toLowerCase()] ?? m[1].slice(0, 3).toLowerCase();
    return `${abr}-${m[2].slice(2)}`;
  }
  // "2026-01" or "01/2026" → "ene-26"
  const m2 = mes.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m2) {
    const mm = m2[2].padStart(2, "0");
    return `${MES_MAP[mm] ?? mm}-${m2[1].slice(2)}`;
  }
  const m3 = mes.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m3) {
    const mm = m3[1].padStart(2, "0");
    return `${MES_MAP[mm] ?? mm}-${m3[2].slice(2)}`;
  }
  return mes;
}

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3] ?? anioVenezuela();
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * La cuota distinta de una persona puede ser permanente (siempre pagó 15) o
 * empezar en un mes concreto (desde junio paga 25). Son dos campos distintos
 * en la ficha; esto los lee como una sola cosa para poder mostrarlos juntos.
 *
 * De los tramos con fecha solo interesa el abierto —el que no tiene "hasta"—,
 * que es el que sigue vigente. Los cerrados son historia y no se tocan.
 */
function leerCuotaEspecial(s: Student): { monto?: number; desde?: string } {
  const vigente = (s.cuotaOverridesTemporales ?? []).find((o) => !o.hasta);
  if (vigente) return { monto: vigente.cuotaUsd, desde: vigente.desde };
  return { monto: s.cuotaOverride, desde: undefined };
}

/**
 * Guarda la cuota en el campo que corresponde: `cuotaOverride` si aplica
 * siempre, `cuotaOverridesTemporales` si arranca en un mes.
 *
 * Nunca se escriben los dos. El cálculo mira primero el permanente, así que
 * si quedaran ambos, la fecha no serviría de nada y los meses anteriores
 * saldrían con el importe nuevo — justo lo contrario de lo que se pide al
 * escribir "desde junio".
 */
function escribirCuotaEspecial(s: Student, monto?: number, desde?: string): Student {
  // Los tramos ya cerrados se conservan tal cual: son el histórico.
  const cerrados = (s.cuotaOverridesTemporales ?? []).filter((o) => o.hasta);
  const historico = cerrados.length ? cerrados : undefined;

  if (monto === undefined) {
    return { ...s, cuotaOverride: undefined, cuotaOverridesTemporales: historico };
  }
  if (desde) {
    return {
      ...s,
      cuotaOverride: undefined,
      cuotaOverridesTemporales: [...cerrados, { cuotaUsd: monto, desde }],
    };
  }
  return { ...s, cuotaOverride: monto, cuotaOverridesTemporales: historico };
}

/**
 * Diálogo de cuotas especiales: quién paga algo distinto de la cuota general.
 *
 * Vive detrás de un engranaje y no enseña ni una cifra hasta que se abre. Esta
 * pantalla se usa delante de gente —en clase, en el mostrador— y hay personas
 * becadas y personas que pagan menos; dejar esos importes a la vista sería
 * decirle a cualquiera que pase quién paga cuánto. Mismo criterio que en la
 * ficha del participante, donde la cuota individual tampoco se muestra.
 *
 * Se edita sobre una copia y solo se escribe al guardar, así que cerrar sin
 * querer no deja a nadie con la cuota a medio cambiar.
 */
function CuotasEspecialesDialog({
  open,
  onClose,
  students,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (next: Student[]) => void;
}) {
  const [borrador, setBorrador] = useState<Student[]>(students);
  const [busca, setBusca] = useState("");
  const [inicializado, setInicializado] = useState(false);
  /**
   * Los importes van tapados como una contraseña. Se ve QUE hay algo escrito,
   * no cuánto. El ojo los enseña a petición: sin poder verlos nunca, un 15
   * tecleado como 1.5 quedaría invisible y se cobraría mal durante meses.
   * Siempre arranca oculto, también al reabrir el diálogo.
   */
  const [mostrar, setMostrar] = useState(false);

  if (open && !inicializado) {
    setBorrador(students);
    setBusca("");
    setMostrar(false);
    setInicializado(true);
  }
  if (!open && inicializado) setInicializado(false);

  const filtrados = borrador
    .map((st, idx) => ({ st, idx }))
    .filter(({ st }) => !busca || normalizeName(st.nombre).includes(normalizeName(busca)));

  const conExcepcion = borrador.filter((s) => leerCuotaEspecial(s).monto !== undefined).length;

  const cambiar = (idx: number, monto?: number, desde?: string) =>
    setBorrador((prev) =>
      prev.map((s, i) => (i === idx ? escribirCuotaEspecial(s, monto, desde) : s)),
    );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Cuotas especiales</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Quien no aparezca aquí con un importe paga la cuota general del mes. Un <b>0</b> escrito a
          mano significa que no paga —una beca— y se respeta; dejarlo vacío no es lo mismo, porque
          entonces se le calcula la cuota general. El mes de «desde» hace que el importe valga a
          partir de ahí y no toca los meses anteriores.
        </p>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nombre…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMostrar((v) => !v)}
            title={mostrar ? "Ocultar los importes" : "Ver los importes"}
            aria-label={mostrar ? "Ocultar los importes" : "Ver los importes"}
          >
            {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Integrante</th>
                <th className="w-28 px-2 py-1.5 font-medium">USD</th>
                <th className="w-36 px-2 py-1.5 font-medium">Desde el mes</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(({ st, idx }) => {
                const ce = leerCuotaEspecial(st);
                return (
                  <tr key={st.id ?? `${st.nombre}-${idx}`} className="border-b last:border-0">
                    <td className="truncate px-2 py-1" title={st.nombre}>
                      {st.nombre}
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type={mostrar ? "number" : "password"}
                        step="0.01"
                        inputMode="decimal"
                        autoComplete="off"
                        className={`h-8 ${CELDA_NUMERO}`}
                        value={ce.monto ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          // Tapado no hay corrector visual, así que se rechaza
                          // lo que no sea una cifra en vez de dejar que "abc"
                          // se convierta en 0 — que aquí significaría beca.
                          if (v && !/^[\d.,]+$/.test(v)) return;
                          cambiar(idx, v === "" ? undefined : aNumero(v), ce.desde);
                        }}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="month"
                        className="h-8"
                        disabled={ce.monto === undefined}
                        value={ce.desde ?? ""}
                        onChange={(e) => cambiar(idx, ce.monto, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
              {!filtrados.length && (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-muted-foreground">
                    Nadie con ese nombre
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {conExcepcion} con cuota propia de {borrador.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSave(borrador);
                onClose();
              }}
            >
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Todas las palabras del nombre más corto están dentro del más largo:
 * "Carlos Jimenez" ⊆ "Carlos Angel Jimenez".
 *
 * Por sí sola no distingue personas —"Milagro" encaja con cualquier Milagro de
 * la escuela—, así que quien la use tiene que acotar el universo o comprobar
 * que el candidato sea único.
 */
function nombreContenidoEn(a: string, b: string): boolean {
  const ta = normalizeName(a).split(/\s+/).filter(Boolean);
  const tb = normalizeName(b).split(/\s+/).filter(Boolean);
  if (!ta.length || !tb.length) return false;
  const corto = ta.length <= tb.length ? ta : tb;
  const largo = ta.length <= tb.length ? tb : ta;
  return corto.every((t) => largo.includes(t));
}

/**
 * ¿Son la misma persona escrita de dos formas?
 *
 * Comparar únicamente nombre y apellido no sirve, y el caso real que lo
 * demuestra son las dos Milagro Contreras de la escuela: "Milagro Elena
 * Contreras" (control de estudio, Krishna III) y "Milagro Elizabeth Contreras
 * Márquez" (celadora de Krishna II). Comparten nombre y apellido pero son dos
 * personas distintas; el segundo nombre es justo lo que las diferencia.
 *
 * De ahí el mínimo de dos palabras: con una sola en común esto daría iguales a
 * dos hermanos, y fusionar a dos personas pierde a una de las dos.
 */
function mismoNombre(a: string, b: string): boolean {
  const corto = Math.min(
    normalizeName(a).split(/\s+/).filter(Boolean).length,
    normalizeName(b).split(/\s+/).filter(Boolean).length,
  );
  if (corto < 2) return false;
  return nombreContenidoEn(a, b);
}

/**
 * ¿Cuál de los que pasan lista en un aula es su celador?
 *
 * La hoja de asistencia guarda el nombre del celador en la cabecera, y ahí casi
 * siempre está escrito con el nombre de pila a secas ("Milagro"). `mismoNombre`
 * exige dos palabras en común, así que con ese dato NUNCA coincidía con nadie y
 * ningún celador llegaba marcado a solvencias.
 *
 * Aquí sí se puede aflojar la comparación, porque el universo no es la escuela
 * entera sino un aula: la coincidencia por una sola palabra se acepta solo
 * cuando señala a UNA persona del grupo. Si hay dos candidatas no se marca a
 * ninguna — es preferible un celador sin insignia que la insignia puesta a
 * quien no lo es.
 */
function celadorDelAula(nombreCelador: string, roster: Set<string>): string | null {
  const clave = normalizeName(nombreCelador).split(/\s+/).filter(Boolean).join(" ");
  if (!clave) return null;
  if (roster.has(clave)) return clave;
  const candidatos = [...roster].filter((alumno) => nombreContenidoEn(clave, alumno));
  return candidatos.length === 1 ? candidatos[0] : null;
}

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("58") || digits.startsWith("57")) return digits;
  if (digits.startsWith("0")) return "58" + digits.slice(1);
  if (digits.length === 10) return "58" + digits;
  return digits;
}

function whatsappUrl(phone: string | undefined, text: string): string | null {
  const p = normalizePhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

function logWhatsApp(alumno: string, msg: string) {
  const log = JSON.parse(localStorage.getItem("wa_log") || "[]");
  log.push({ fecha: new Date().toISOString(), alumno, mensaje: msg });
  localStorage.setItem("wa_log", JSON.stringify(log));
}

function copyAndLog(msg: string, alumno: string) {
  navigator.clipboard
    .writeText(msg)
    .then(() => {
      logWhatsApp(alumno, msg);
      toast.success(`Mensaje copiado para ${alumno}`);
    })
    .catch(() => toast.error("No se pudo copiar"));
}

/**
 * Categorías que son cuota social. Lo que se paga por pertenecer a la escuela,
 * y nada más.
 *
 * Todo lo demás —un campamento, una consulta de MTC, un curso de mitología, un
 * préstamo— es dinero que se mueve entre la misma persona y la escuela, pero NO
 * dice nada sobre si está solvente. Mezclarlo aquí solo confunde: alguien que
 * pagó un campamento parecería estar al día sin haber pagado su mensualidad.
 *
 * El detalle completo de una persona, con todo separado por concepto, está en
 * Escolásticas › Ficha del participante. Esta pantalla responde a una sola
 * pregunta: ¿está al día con su cuota?
 */
const CATEGORIAS_CUOTA = ["MIEMBROS", "PROBAS", "CLASE"];

function findStudentInDesc(desc: string, students: Student[]): Student | null {
  const n = normalizeName(desc);
  for (const s of students) {
    const sn = normalizeName(s.nombre);
    if (n.includes(sn)) return s;
  }
  return null;
}

// ------------------------- Sub-Dialogs -------------------------

function StudentTxDialog({
  student,
  tx,
  onClose,
}: {
  student: Student | null;
  tx: Transaction[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"todo" | "ingresos" | "egresos">("todo");
  const filtered = useMemo(() => {
    if (!student) return [];
    return tx.filter((r) => {
      if (!CATEGORIAS_CUOTA.includes(r.categoria)) return false;
      return findStudentInDesc(r.descripcion, [student]) !== null;
    });
  }, [tx, student]);
  const rows =
    tab === "todo"
      ? filtered
      : filtered.filter((r) => r.tipo === (tab === "ingresos" ? "Ingreso" : "Gasto"));
  const totalUsd = rows.reduce((s, r) => s + (Number(r.montoUsd) || 0), 0);
  return (
    <Dialog open={!!student} onOpenChange={(v) => !v && onClose()}>
      {/* Un clic fuera ya no descarta la ficha entera sin preguntar. */}
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{student?.nombre ?? ""}</DialogTitle>
          <p className="text-xs text-muted-foreground">{filtered.length} transacciones</p>
        </DialogHeader>
        <div className="mb-3 flex gap-2">
          {(["todo", "ingresos", "egresos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "rounded-full px-3 py-1 text-xs " +
                (tab === t ? "bg-primary text-primary-foreground" : "bg-muted")
              }
            >
              {t === "todo" ? "Todas" : t === "ingresos" ? "Solo ingresos" : "Solo egresos"}
            </button>
          ))}
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground text-xs">
                <th className="p-1">Fecha</th>
                <th className="p-1">I/G</th>
                <th className="p-1">Categoría</th>
                <th className="p-1">Descripción</th>
                <th className="p-1 text-right">Monto</th>
                <th className="p-1 text-right">USD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-1 text-xs">{r.fecha}</td>
                  <td className="p-1 text-center">
                    <span
                      className={
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold " +
                        (r.tipo === "Ingreso"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300")
                      }
                    >
                      {r.tipo === "Ingreso" ? "I" : "G"}
                    </span>
                  </td>
                  <td className="p-1 text-xs">{r.categoria}</td>
                  <td className="p-1 text-xs max-w-48 truncate" title={r.descripcion}>
                    {r.descripcion}
                  </td>
                  <td className="p-1 text-right text-xs tabular-nums">
                    {isNaN(Number(r.monto)) ? r.monto : $(Number(r.monto))}{" "}
                    {r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "$COP" : "$"}
                  </td>
                  <td className="p-1 text-right text-xs tabular-nums">
                    ${$(Number(r.montoUsd) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t pt-2 text-right text-sm font-semibold">
          Total USD: ${$(totalUsd)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StudentEditDialog({
  open,
  student,
  aulas,
  lastPay,
  pagos,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  student: Student | null;
  aulas: string[];
  lastPay: { fecha: string; monto: number } | null;
  /** Meses que los pagos declaran cubrir. Null = sin pagos registrados. */
  pagos: PagosDelAlumno | null;
  onClose: () => void;
  onSave: (s: Student) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<Student>({
    nombre: "",
    aulas: [],
    actividad: "Activo",
    fechaIngreso: "2026-01-01",
  });
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDraft(
      student ?? {
        nombre: "",
        aulas: [],
        actividad: "Activo",
        condicion: "Miembro",
        fechaIngreso: "2026-01-01",
      },
    );
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);

  const toggle = (a: string) =>
    setDraft((d) =>
      d.aulas.includes(a)
        ? { ...d, aulas: d.aulas.filter((x) => x !== a) }
        : { ...d, aulas: [...d.aulas, a] },
    );

  const ymNow = currentYm();
  const cuotaAplicada = cuotaMensualUSD(draft, ymNow);
  const deuda = calcularCuotasDebidas(draft, pagos, ymNow);
  const esPorClase = draft.condicion === "ClasePorClase";
  const precioClaseActual = precioClase(ymNow);

  const placeholderExamples = ["$20.00", "$15.00", "$13.50", "$0.00", "$25.00"];
  const placeholder = placeholderExamples[draft.nombre.length % placeholderExamples.length];
  const cuotaEspecial = leerCuotaEspecial(draft);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{student ? "Modificar integrante" : "Nuevo integrante"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nombre</label>
            <Input
              value={draft.nombre}
              onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Aulas</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {aulas.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggle(a)}
                  className={
                    "rounded-full border px-2.5 py-1 text-xs " +
                    (draft.aulas.includes(a)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background")
                  }
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Condición</label>
              <Select
                value={draft.condicion ?? "Miembro"}
                onValueChange={(v) => setDraft({ ...draft, condicion: v as Student["condicion"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Miembro">Miembro</SelectItem>
                  <SelectItem value="Probacionista">Probacionista</SelectItem>
                  <SelectItem value="ClasePorClase">Clase por clase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Actividad</label>
              <Select
                value={draft.actividad ?? "Activo"}
                onValueChange={(v) => setDraft({ ...draft, actividad: v as Student["actividad"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Retirado">Retirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="celador"
              type="checkbox"
              checked={!!draft.celador}
              onChange={(e) => setDraft({ ...draft, celador: e.target.checked })}
            />
            <label htmlFor="celador" className="text-sm">
              Es celador(a)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Cuota mensual (USD)</label>
              <Input
                type="number"
                step="0.01"
                value={cuotaEspecial.monto ?? ""}
                placeholder={`ejemplo: ${placeholder}`}
                onChange={(e) =>
                  setDraft(
                    escribirCuotaEspecial(
                      draft,
                      e.target.value === "" ? undefined : Number(e.target.value),
                      cuotaEspecial.desde,
                    ),
                  )
                }
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Vacío = la cuota general del mes.
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Desde el mes (opcional)</label>
              <Input
                type="month"
                value={cuotaEspecial.desde ?? ""}
                disabled={cuotaEspecial.monto === undefined}
                onChange={(e) =>
                  setDraft(escribirCuotaEspecial(draft, cuotaEspecial.monto, e.target.value))
                }
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Vacío = siempre. Con mes, lo anterior no se toca.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Teléfono (WhatsApp)</label>
              <Input
                value={draft.telefono ?? ""}
                placeholder="04141234567"
                onChange={(e) => setDraft({ ...draft, telefono: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fecha de ingreso</label>
              <Input
                type="date"
                value={draft.fechaIngreso ?? "2026-01-01"}
                onChange={(e) => setDraft({ ...draft, fechaIngreso: e.target.value || undefined })}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
            {esPorClase ? (
              <>
                <div>
                  Modalidad: <span className="font-semibold">Pago por clase</span>
                </div>
                <div>
                  Precio referencial por clase ({MESES_ES[Number(ymNow.slice(5, 7)) - 1]}{" "}
                  {ymNow.slice(0, 4)}):{" "}
                  <span className="font-semibold">${$(precioClaseActual)}</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  Cuota aplicada este mes:{" "}
                  <span className="font-semibold">${$(cuotaAplicada)}</span>
                </div>
                <div>
                  Meses debidos: <span className="font-semibold">{deuda.meses}</span>
                </div>
                <div>
                  Deuda total: <span className="font-semibold">${$(deuda.totalUSD)}</span>
                </div>
              </>
            )}
            {lastPay && (
              <div>
                Último pago: {lastPay.fecha} (${$(lastPay.monto)})
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          {onDelete && (
            <Button variant="ghost" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(draft)} disabled={!draft.nombre.trim()}>
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------- SolvenciasTab -------------------------

export default function SolvenciasTab({
  students,
  setStudents,
  aulas,
  setAulas,
  tx,
  attAulas = [],
  attRecords = [],
  puedeGestionarCuotas = false,
}: {
  students: Student[];
  setStudents: (n: Student[]) => void;
  aulas: string[];
  setAulas: (n: string[]) => void;
  tx: Transaction[];
  attAulas?: AulaMeta[];
  attRecords?: AttendanceRecord[];
  /**
   * Quién puede ver y tocar las cuotas especiales: solo finanzas y super_admin.
   *
   * Esconder el engranaje NO es una medida de seguridad — quien sepa mirar el
   * código de la página lo encuentra igual. Es discreción: que no aparezca en
   * la pantalla de un celador ni en la de dirección, porque ahí no pinta nada.
   * Lo que de verdad protege el dato son las políticas RLS de la base.
   */
  puedeGestionarCuotas?: boolean;
}) {
  const [filterActividad, setFilterActividad] = useState<
    "Activo" | "Retirado" | "Otra sede" | "Todos"
  >("Activo");
  /** Personas marcadas para unir en una sola ficha. Se guardan por índice. */
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [uniendoAbierto, setUniendoAbierto] = useState(false);
  const [nombreDefinitivo, setNombreDefinitivo] = useState("");
  const [q, setQ] = useState("");
  const [nuevaAula, setNuevaAula] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [aulasOpen, setAulasOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [viewTxStudent, setViewTxStudent] = useState<Student | null>(null);
  const [detectarOpen, setDetectarOpen] = useState(false);
  const [asistOpen, setAsistOpen] = useState(false);
  const [detectados, setDetectados] = useState<{ nombre: string; pagos: number; aula: string }[]>(
    [],
  );

  /**
   * Nombres que aparecen en pagos de cuota (MIEMBROS / PROBAS / CLASE) pero
   * que todavía no existen como alumno. Sirve para poblar la lista a partir
   * de lo que ya se cargó por OCR, sin tener que escribirlos a mano.
   */
  const candidatosDesdeTx = useMemo(() => {
    // Se descarta a quien ya esté en CUALQUIERA de las dos listas: la de
    // solvencias y la de asistencias. Antes solo se miraba la de solvencias,
    // así que alguien que ya pasaba lista aparecía igual como "detectado en
    // pagos" y se podía crear por segunda vez.
    const conocidos: string[] = students.map((s) => s.nombre);
    const aulasActivas = new Set(attAulas.filter((a) => a.activa !== false).map((a) => a.nombre));
    const vistos = new Set<string>();
    for (const r of attRecords) {
      if (!aulasActivas.has(r.aula)) continue;
      const n = normalizeName(r.alumno);
      if (n && !vistos.has(n)) {
        vistos.add(n);
        conocidos.push(r.alumno);
      }
    }

    const conteo = new Map<string, { nombre: string; pagos: number }>();
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      if (!CATEGORIAS_CUOTA.includes(t.categoria)) continue;
      // La descripción del libro diario suele ser el nombre del alumno.
      // Se limpia lo que no es nombre (montos, "C/S abr-2026", etc.).
      const limpio = (t.descripcion || "")
        .replace(/c\/s\s+\S+/gi, "")
        .replace(/[0-9]+([.,][0-9]+)?/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (limpio.length < 5) continue;
      const clave = normalizeName(limpio);
      // mismoNombre en vez de comparar nombre y apellido: esa regla daba por
      // conocida a "Milagro Elena Contreras" porque ya existía "Milagro
      // Elizabeth Contreras Márquez", y se perdía a una de las dos.
      if (conocidos.some((n) => mismoNombre(clave, n))) continue;
      const prev = conteo.get(clave);
      if (prev) prev.pagos++;
      else conteo.set(clave, { nombre: limpio, pagos: 1 });
    }
    return [...conteo.values()].sort((a, b) => b.pagos - a.pagos);
  }, [tx, students, attAulas, attRecords]);

  /**
   * Alumnos que ya están en asistencias, con las aulas donde aparecen.
   *
   * Es la fuente más fiable que hay: los celadores los pasan lista semana a
   * semana, mientras que deducirlos de la descripción de un pago depende de
   * cómo se haya escrito el concepto.
   *
   * Solo se miran las aulas activas: un aula archivada ya no tiene grupo, y
   * traer a su gente volvería a meter en solvencias a quienes se graduaron.
   */
  const desdeAsistencias = useMemo(() => {
    const activas = new Map(attAulas.filter((a) => a.activa !== false).map((a) => [a.nombre, a]));
    const porNombre = new Map<
      string,
      { nombre: string; aulas: Set<string>; primera: string; celador: boolean }
    >();
    // Quiénes pasan lista en cada aula. Hace falta el grupo entero para poder
    // decidir después a quién señala el nombre de celador de la cabecera.
    const rosterPorAula = new Map<string, Set<string>>();

    for (const r of attRecords) {
      if (!activas.has(r.aula)) continue;
      const nombre = r.alumno.trim();
      const clave = normalizeName(nombre);
      if (!clave) continue;
      let e = porNombre.get(clave);
      if (!e) porNombre.set(clave, (e = { nombre, aulas: new Set(), primera: "", celador: false }));
      e.aulas.add(r.aula);

      let roster = rosterPorAula.get(r.aula);
      if (!roster) rosterPorAula.set(r.aula, (roster = new Set()));
      roster.add(clave);

      // La fecha de ingreso se estima con la primera clase en la que consta
      // como asistente o inasistente: el importador crea una fila por cada
      // fecha del año, así que tomar la primera de todas daría enero siempre.
      if ((r.asistencia === "A" || r.asistencia === "I") && (!e.primera || r.fecha < e.primera)) {
        e.primera = r.fecha;
      }
    }

    // El celador se resuelve aula por aula y no alumno por alumno: solo
    // teniendo delante a todo el grupo se puede saber si "Milagro" es una sola
    // persona ahí dentro o hay dos y no se puede elegir.
    for (const [nombreAula, aula] of activas) {
      const roster = rosterPorAula.get(nombreAula);
      if (!roster || !aula.celador?.trim()) continue;
      const clave = celadorDelAula(aula.celador, roster);
      const e = clave ? porNombre.get(clave) : undefined;
      if (e) e.celador = true;
    }
    return porNombre;
  }, [attAulas, attRecords]);

  /**
   * Qué pasaría al traerlos: cuáles son nuevos y a cuáles solo hay que
   * añadirles un aula. Se compara primero por nombre exacto y, si no, por
   * nombre y apellido, para que "Carlos Jimenez" no entre otra vez cuando ya
   * existe "Carlos Angel Jimenez".
   */
  const previaAsistencias = useMemo(() => {
    const exactos = new Map(students.map((s, i) => [normalizeName(s.nombre), i]));

    /**
     * Devuelve a quién corresponde ese nombre entre los ya registrados.
     *
     * Un candidato que encaja con VARIOS existentes no se resuelve solo: se
     * deja como persona nueva y se avisa. Fusionar a dos personas distintas
     * pierde a una de las dos y le mezcla los pagos; tener dos fichas de la
     * misma se ve a simple vista y se une después.
     */
    const buscar = (clave: string): { idx?: number; ambiguo: string[] } => {
      const exacto = exactos.get(clave);
      if (exacto !== undefined) return { idx: exacto, ambiguo: [] };
      const candidatos: number[] = [];
      for (let i = 0; i < students.length; i++) {
        if (mismoNombre(clave, students[i].nombre)) candidatos.push(i);
      }
      if (candidatos.length === 1) return { idx: candidatos[0], ambiguo: [] };
      return { ambiguo: candidatos.map((i) => students[i].nombre) };
    };

    const nuevos: { clave: string; nombre: string; aulas: string[]; ambiguo: string[] }[] = [];
    const unir: { nombre: string; con: string; agrega: string[]; marcaCelador: boolean }[] = [];
    for (const [clave, info] of desdeAsistencias) {
      const { idx, ambiguo } = buscar(clave);
      if (idx === undefined) {
        nuevos.push({ clave, nombre: info.nombre, aulas: [...info.aulas], ambiguo });
        continue;
      }
      const faltan = [...info.aulas].filter((a) => !students[idx].aulas.includes(a));
      const marcaCelador = info.celador && !students[idx].celador;
      if (faltan.length || marcaCelador || normalizeName(students[idx].nombre) !== clave) {
        unir.push({ nombre: info.nombre, con: students[idx].nombre, agrega: faltan, marcaCelador });
      }
    }
    return { nuevos, unir, buscar };
  }, [desdeAsistencias, students]);

  const traerDeAsistencias = () => {
    const next = [...students];
    let creados = 0;
    let actualizados = 0;
    for (const [clave, info] of desdeAsistencias) {
      const { idx } = previaAsistencias.buscar(clave);
      const aulasInfo = [...info.aulas];
      if (idx === undefined) {
        const meta = attAulas.find((a) => a.nombre === aulasInfo[0]);
        next.push({
          nombre: info.nombre,
          aulas: aulasInfo,
          actividad: "Activo",
          condicion: meta?.condicion === "Probacionista" ? "Probacionista" : "Miembro",
          celador: info.celador || undefined,
          fechaIngreso: info.primera || `${meta?.year ?? anioVenezuela()}-01-01`,
        });
        creados++;
      } else {
        const s = next[idx];
        const union = Array.from(new Set([...s.aulas, ...aulasInfo]));
        // La marca de celador también se aplica a quien YA existe. Es la vía
        // para devolvérsela a quien la perdió: al traer los alumnos desde la
        // nube con un rol que no ve esa columna, la marca se borra del
        // navegador y solo las listas de asistencia saben quién la tenía.
        // Solo se pone, nunca se quita: puede haberse marcado a mano.
        const celador = !!s.celador || info.celador;
        if (union.length !== s.aulas.length || celador !== !!s.celador) {
          next[idx] = { ...s, aulas: union, celador: celador || undefined };
          actualizados++;
        }
      }
    }
    setStudents(next);
    setSeleccion([]); // se añaden filas: ver el comentario en onDelete
    setAsistOpen(false);
    toast.success(
      `${creados} integrante(s) creados desde asistencias` +
        (actualizados ? ` · ${actualizados} actualizados` : ""),
    );
  };

  // TODOS los pagos de cuota de cada alumno, no solo el último.
  //
  // Antes aquí solo se guardaba el más reciente por fecha, y la deuda se
  // calculaba a partir de esa fecha. Para saber qué meses están cubiertos hace
  // falta mirarlos todos: los pagos llegan desordenados y uno solo puede
  // saldar varios meses atrasados.
  const pagosByStudent = useMemo(() => {
    const map = new Map<
      string,
      { iso: string; fecha: string; mensualidad: string; monto: number }[]
    >();
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      if (!CATEGORIAS_CUOTA.includes(t.categoria)) continue;
      const iso = fechaToIso(t.fecha);
      if (!iso) continue;
      const desc = normalizeName(t.descripcion);
      for (const s of students) {
        const nn = normalizeName(s.nombre);
        const first = nn.split(" ")[0];
        const last = nn.split(" ").slice(-1)[0];
        if (first && last && desc.includes(first) && desc.includes(last)) {
          const arr = map.get(s.nombre) ?? [];
          arr.push({
            iso,
            fecha: t.fecha,
            mensualidad: t.mensualidad ?? "",
            monto: Number(t.montoUsd) || 0,
          });
          map.set(s.nombre, arr);
        }
      }
    }
    return map;
  }, [tx, students]);

  // Lo que se usa para calcular la deuda: qué meses declara cubrir cada quien.
  const resumenPagos = useMemo(() => {
    const map = new Map<string, PagosDelAlumno>();
    for (const [nombre, pagos] of pagosByStudent) map.set(nombre, resumirPagos(pagos));
    return map;
  }, [pagosByStudent]);

  // El último pago, solo para enseñarlo en pantalla.
  const lastPayByStudent = useMemo(() => {
    const map = new Map<string, { fecha: string; monto: number; mes?: string }>();
    for (const [nombre, pagos] of pagosByStudent) {
      const ultimo = pagos.reduce((a, b) => (b.iso > a.iso ? b : a));
      map.set(nombre, { fecha: ultimo.fecha, monto: ultimo.monto, mes: ultimo.mensualidad });
    }
    return map;
  }, [pagosByStudent]);

  const filteredStudents = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students
      .map((st, idx) => ({ st, idx }))
      .filter(({ st }) => {
        // Quien pertenece a otra sede no cuenta en las cuentas de esta. Se ve
        // en "Todos" y en su propio filtro, pero no entre los activos: si no,
        // engorda la lista de morosos con gente que no debe nada aquí.
        const otraSede = !!st.sede?.trim();
        if (filterActividad === "Otra sede") {
          if (!otraSede) return false;
        } else if (otraSede) {
          if (filterActividad !== "Todos") return false;
        } else if (filterActividad !== "Todos" && (st.actividad ?? "Activo") !== filterActividad) {
          return false;
        }
        if (!s) return true;
        return (
          st.nombre.toLowerCase().includes(s) || st.aulas.some((a) => a.toLowerCase().includes(s))
        );
      });
  }, [students, q, filterActividad]);

  /**
   * "Activos" significa activos, sin más condiciones.
   *
   * Antes, además de estar activo, se exigía tener algún pago registrado. Eso
   * escondía a dos grupos justamente al revés de lo que hace falta aquí:
   *
   *   - Los celadores, que no pagan cuota y por tanto no tienen pagos.
   *   - Cualquiera que todavía no haya pagado NADA — que es precisamente la
   *     persona que una pantalla de solvencias tiene que enseñar.
   *
   * Y no se anunciaba en ningún sitio: el desplegable dice "Activos", nadie
   * puede adivinar que también filtra por pagos. Quien no ha pagado sale con
   * su deuda a la vista, que es la respuesta correcta.
   */
  const visibleStudents = filteredStudents;

  const alternarSeleccion = (idx: number) =>
    setSeleccion((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));

  /**
   * Funde varias fichas en una sola.
   *
   * Es una fusión de verdad, no una tabla de equivalencias: al terminar queda
   * UNA persona y las demás dejan de existir. Se pidió así expresamente —"al
   * unirlos ya quedó, no que me muestres fulano con fulano"—, y tiene sentido:
   * dos fichas de la misma persona no son un problema de presentación, son un
   * error del registro.
   *
   * Se conserva lo más completo de cada una. Un dato vacío nunca pisa a uno
   * lleno: si una ficha tiene teléfono y la otra no, gana la que lo tiene, sin
   * importar cuál se eligiera como nombre definitivo.
   */
  const unirFichas = () => {
    const nombre = nombreDefinitivo.trim();
    if (!nombre || seleccion.length < 2) return;

    const fichas = seleccion.map((i) => students[i]).filter(Boolean);
    const primeroCon = <K extends keyof Student>(k: K): Student[K] | undefined => {
      for (const f of fichas) {
        const v = f[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
      return undefined;
    };

    const fusionada: Student = {
      ...fichas[0],
      nombre,
      aulas: [...new Set(fichas.flatMap((f) => f.aulas))],
      celador: fichas.some((f) => f.celador),
      // Si alguna estaba activa, la persona está activa: dar por retirado a
      // quien sigue viniendo es el error caro de los dos.
      actividad: fichas.some((f) => (f.actividad ?? "Activo") === "Activo") ? "Activo" : "Retirado",
      condicion: primeroCon("condicion"),
      telefono: primeroCon("telefono"),
      fechaIngreso: primeroCon("fechaIngreso"),
      cedula: primeroCon("cedula"),
      correo: primeroCon("correo"),
      direccion: primeroCon("direccion"),
      sede: primeroCon("sede"),
      cuotaOverride: fichas.find((f) => typeof f.cuotaOverride === "number")?.cuotaOverride,
      cuotaOverridesTemporales: fichas.find((f) => f.cuotaOverridesTemporales?.length)
        ?.cuotaOverridesTemporales,
    };

    const aQuitar = new Set(seleccion);
    const next = students.filter((_, i) => !aQuitar.has(i));
    next.push(fusionada);
    setStudents(next);
    setSeleccion([]);
    setUniendoAbierto(false);
    setNombreDefinitivo("");
    toast.success(`${fichas.length} fichas unidas en «${nombre}»`);
  };

  /** Marca a los seleccionados como pertenecientes a otra sede. */
  const marcarOtraSede = () => {
    const sede = prompt("¿De qué sede son?", "Táriba");
    if (sede === null) return;
    const marcados = new Set(seleccion);
    setStudents(students.map((s, i) => (marcados.has(i) ? { ...s, sede: sede.trim() } : s)));
    setSeleccion([]);
    toast.success(
      sede.trim()
        ? `${marcados.size} persona(s) marcadas como de ${sede.trim()}`
        : `${marcados.size} persona(s) devueltas a esta sede`,
    );
  };

  /**
   * Lo que las listas de asistencia saben de cada integrante YA registrado.
   *
   * Sirve de respaldo para dos datos de la ficha que se pierden con facilidad:
   *
   *   - La marca de celador. Al cargar los alumnos desde la nube con un rol que
   *     no ve esa columna (las vistas `students_finanzas` y `students_celador`
   *     no la traen), la marca se borra de este navegador. Quien pasa lista de
   *     un aula es su celador, así que el dato se puede volver a deducir.
   *   - El aula. Borrar un aula desde el diálogo se la quita a todos sus
   *     alumnos, y sin aula caen todos juntos en "Sin aula".
   *
   * Esto es solo para pintar: no guarda nada. Para dejarlo escrito en la ficha
   * está el botón "Traer de Asistencias".
   */
  const respaldoAsistencias = useMemo(() => {
    const m = new Map<number, { celador: boolean; aula?: string }>();
    for (const [clave, info] of desdeAsistencias) {
      const { idx } = previaAsistencias.buscar(clave);
      if (idx === undefined) continue;
      m.set(idx, { celador: info.celador, aula: [...info.aulas][0] });
    }
    return m;
  }, [desdeAsistencias, previaAsistencias]);

  const esCelador = (st: Student, idx: number) =>
    !!st.celador || !!respaldoAsistencias.get(idx)?.celador;

  const ymNow = currentYm();

  /**
   * La deuda de cada persona, calculada una sola vez.
   *
   * Antes se calculaba dentro del render de cada fila, así que se rehacía
   * entera en cada pintado. Además hacía falta tenerla fuera para poder sumarla
   * por aula sin volver a recorrer todo.
   */
  const deudaPorAlumno = useMemo(() => {
    const m = new Map<string, ReturnType<typeof calcularCuotasDebidas>>();
    for (const st of students) {
      m.set(st.nombre, calcularCuotasDebidas(st, resumenPagos.get(st.nombre) ?? null, ymNow));
    }
    return m;
  }, [students, resumenPagos, ymNow]);

  // Agrupar por aula (usa la primera aula del alumno).
  const grouped = useMemo(() => {
    const celador = (i: { st: Student; idx: number }) =>
      !!i.st.celador || !!respaldoAsistencias.get(i.idx)?.celador;
    const g = new Map<string, { st: Student; idx: number }[]>();
    for (const item of visibleStudents) {
      const aula = item.st.aulas[0] || respaldoAsistencias.get(item.idx)?.aula || "Sin aula";
      if (!g.has(aula)) g.set(aula, []);
      g.get(aula)!.push(item);
    }
    // Ordenar cada aula: celador primero, luego alfabético.
    for (const arr of g.values()) {
      arr.sort((a, b) => {
        if (celador(a) !== celador(b)) return celador(a) ? -1 : 1;
        return a.st.nombre.localeCompare(b.st.nombre);
      });
    }
    return Array.from(g.entries()).sort(([, a], [, b]) => a.length - b.length);
  }, [visibleStudents, respaldoAsistencias]);

  /**
   * Deuda acumulada por aula, para el rótulo de la cabecera.
   *
   * Se enseña sin etiqueta y en gris a propósito: esta pantalla se abre delante
   * de quien sea, y una cifra suelta no le dice nada a quien pasa por detrás.
   * Quien tiene que entenderla ya sabe qué es. Mismo criterio que en la ficha
   * del participante, donde la cuota individual no se muestra.
   *
   * Los de "clase por clase" no suman: no tienen cuota mensual, lo suyo se
   * cobra el día que vienen.
   */
  const deudaPorAula = useMemo(() => {
    const m = new Map<string, number>();
    for (const [aula, list] of grouped) {
      let total = 0;
      for (const { st } of list) {
        if (st.condicion === "ClasePorClase") continue;
        total += deudaPorAlumno.get(st.nombre)?.totalUSD ?? 0;
      }
      m.set(aula, total);
    }
    return m;
  }, [grouped, deudaPorAlumno]);

  const deudaTotal = useMemo(
    () => [...deudaPorAula.values()].reduce((s, v) => s + v, 0),
    [deudaPorAula],
  );

  const addAula = () => {
    const n = nuevaAula.trim();
    if (!n) return;
    if (aulas.some((a) => a.toLowerCase() === n.toLowerCase())) {
      toast.error("Ya existe");
      return;
    }
    setAulas([...aulas, n]);
    setNuevaAula("");
    toast.success("Aula creada");
  };
  const removeAula = (a: string) => {
    if (!confirm(`Eliminar aula "${a}"?`)) return;
    setAulas(aulas.filter((x) => x !== a));
    setStudents(students.map((s) => ({ ...s, aulas: s.aulas.filter((x) => x !== a) })));
  };

  const [cuotasOpen, setCuotasOpen] = useState(false);

  const [plantillas] = usePlantillas();

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Miembros y solvencia{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {students.length} participantes
              {deudaTotal > 0 && (
                <span
                  className="ml-2 cursor-help tabular-nums opacity-50"
                  title={`Deuda acumulada de toda la escuela: $${$(deudaTotal)}`}
                >
                  · {$(deudaTotal)}
                </span>
              )}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterActividad}
              onValueChange={(v) => setFilterActividad(v as typeof filterActividad)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activos</SelectItem>
                <SelectItem value="Retirado">Retirados</SelectItem>
                <SelectItem value="Otra sede">Otra sede</SelectItem>
                <SelectItem value="Todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="w-56"
            />
            <Button variant="outline" onClick={() => setAulasOpen(true)}>
              Aulas ({aulas.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("importStudentsExcel")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Importar Excel
            </Button>
            {(previaAsistencias.nuevos.length > 0 || previaAsistencias.unir.length > 0) && (
              <Button variant="outline" onClick={() => setAsistOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Traer de Asistencias
                {previaAsistencias.nuevos.length > 0 && ` (${previaAsistencias.nuevos.length})`}
              </Button>
            )}
            {candidatosDesdeTx.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setDetectados(candidatosDesdeTx.map((c) => ({ ...c, aula: "" })));
                  setDetectarOpen(true);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Detectar desde pagos ({candidatosDesdeTx.length})
              </Button>
            )}
            <input
              type="file"
              id="importStudentsExcel"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const imported = await parseExcelToStudents(file);
                  if (!imported.length) {
                    toast.error("No se encontraron alumnos en el Excel");
                    return;
                  }
                  // Fusiona por nombre: actualiza los que ya existen y agrega los nuevos,
                  // sin perder cuotas ni ajustes hechos en la app.
                  const byKey = new Map(students.map((s) => [normalizeName(s.nombre), s]));
                  let nuevos = 0,
                    actualizados = 0;
                  for (const imp of imported) {
                    const key = normalizeName(imp.nombre);
                    const prev = byKey.get(key);
                    if (prev) {
                      // Solo pisan los campos que traen algo. Un `...imp` a
                      // secas escribe encima también los vacíos, así que
                      // importar un Excel con una columna sin rellenar
                      // borraba cédulas, correos y teléfonos ya cargados.
                      const conValor = Object.fromEntries(
                        Object.entries(imp).filter(([, v]) => v !== undefined && v !== ""),
                      ) as Partial<Student>;
                      byKey.set(key, {
                        ...prev,
                        ...conValor,
                        aulas: Array.from(new Set([...prev.aulas, ...imp.aulas])),
                        cuotaOverride: prev.cuotaOverride,
                        cuotaOverridesTemporales: prev.cuotaOverridesTemporales,
                      });
                      actualizados++;
                    } else {
                      byKey.set(key, imp);
                      nuevos++;
                    }
                  }
                  setStudents(Array.from(byKey.values()));
                  setSeleccion([]); // el orden cambia: ver el comentario en onDelete
                  toast.success(`${nuevos} alumnos nuevos, ${actualizados} actualizados`);
                } catch (err) {
                  toast.error(`Error al leer Excel: ${(err as Error).message}`);
                }
              }}
            />
            {/* Solo el engranaje: ni una cifra en pantalla hasta que se abre.
                Y solo para finanzas y super_admin. */}
            {puedeGestionarCuotas && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCuotasOpen(true)}
                title="Cuotas especiales"
                aria-label="Cuotas especiales"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Agregar
            </Button>
          </div>
        </div>

        {seleccion.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
            <span className="text-xs font-medium">
              {seleccion.length} seleccionada{seleccion.length > 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              {seleccion.map((i) => students[i]?.nombre).join(" · ")}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setSeleccion([])}
              >
                Quitar selección
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={marcarOtraSede}>
                Marcar de otra sede
              </Button>
              <Button
                size="sm"
                className="text-xs"
                disabled={seleccion.length < 2}
                title={
                  seleccion.length < 2 ? "Marca al menos dos fichas de la misma persona" : undefined
                }
                onClick={() => {
                  // Se propone el nombre más largo: entre "Karina" y "Karina
                  // Rodríguez" el completo es casi siempre el bueno.
                  const nombres = seleccion.map((i) => students[i]?.nombre ?? "");
                  setNombreDefinitivo([...nombres].sort((a, b) => b.length - a.length)[0] ?? "");
                  setUniendoAbierto(true);
                }}
              >
                <Users className="mr-1 h-3.5 w-3.5" />
                Unir en una sola ficha
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Un aula por fila hasta 1536px. Dos tablas de seis columnas lado a lado
          no caben en una pantalla de 1280 — de ahí salía el desplazamiento
          horizontal, y forzarlas dejaba la columna del nombre tan estrecha que
          casi todos salían recortados. A pantalla completa el nombre se lee
          entero; en monitores anchos vuelven las dos por fila. */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {grouped.map(([aula, list]) => {
          const isCollapsed = collapsed[aula] ?? false;
          return (
            <Card key={aula} className="p-4">
              <button
                type="button"
                onClick={() => setCollapsed({ ...collapsed, [aula]: !isCollapsed })}
                className="mb-3 flex w-full items-center justify-between text-left"
              >
                <h3 className="text-base font-semibold text-primary">
                  <span className="mr-2 inline-block w-3">{isCollapsed ? "▶" : "▼"}</span>
                  {aula}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {list.length} participantes
                  {deudaPorAula.get(aula) ? (
                    <span
                      className="ml-2 cursor-help tabular-nums opacity-50"
                      title={`Deuda acumulada de ${aula}: $${$(deudaPorAula.get(aula) ?? 0)}`}
                    >
                      · {$(deudaPorAula.get(aula) ?? 0)}
                    </span>
                  ) : null}
                </span>
              </button>
              {!isCollapsed && (
                <table className="w-full table-fixed text-sm">
                  {/* Anchos relativos, no fijos: así la tabla se adapta al
                      ancho de la tarjeta en vez de desbordarla. El nombre no
                      lleva ancho a propósito — se queda con todo lo que sobre
                      y recorta con puntos suspensivos lo que no entre. Solo la
                      columna de botones va en píxeles, porque los iconos no
                      pueden encogerse. */}
                  <colgroup>
                    <col />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: 88 }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b text-center text-muted-foreground text-xs">
                      <th className="px-1.5 py-1.5 font-medium text-left">Integrante</th>
                      <th className="px-1.5 py-1.5 font-medium">Último pago</th>
                      <th className="px-1.5 py-1.5 font-medium">Pagó</th>
                      <th className="px-1.5 py-1.5 font-medium">Abono</th>
                      <th className="px-1.5 py-1.5 font-medium">Estado</th>
                      <th className="px-1.5 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(({ st, idx }) => {
                      const pay = lastPayByStudent.get(st.nombre);
                      const deuda = deudaPorAlumno.get(st.nombre) ?? {
                        meses: 0,
                        totalUSD: 0,
                        detalle: [],
                      };
                      const esPorClase = st.condicion === "ClasePorClase";
                      const sinHistorial = !pay && !esPorClase;
                      const celador = esCelador(st, idx);
                      const monto = esPorClase ? precioClase(ymNow) : deuda.totalUSD;
                      // El concepto es la parte factual —meses, montos, precio
                      // de la clase— y por eso se arma aquí, fuera de las
                      // plantillas editables: nadie puede mandar una cifra
                      // equivocada al retocar el tono del mensaje.
                      const concepto = esPorClase
                        ? `La clase de hoy tiene un valor de $${$(precioClase(ymNow))}.`
                        : deuda.meses === 0
                          ? "Tu cuenta está al día."
                          : `Tienes ${deuda.meses} ${deuda.meses === 1 ? "mensualidad" : "mensualidades"} pendientes, equivalentes a $${$(monto)}.`;
                      const msg = armarMensaje(
                        esPorClase
                          ? plantillas.clase
                          : deuda.meses === 0
                            ? plantillas.alDia
                            : plantillas.deuda,
                        st.nombre,
                        concepto,
                      );
                      const url = whatsappUrl(st.telefono, msg);
                      return (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-1.5 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                className="shrink-0 cursor-pointer"
                                checked={seleccion.includes(idx)}
                                onChange={() => alternarSeleccion(idx)}
                                title={`Marcar a ${st.nombre}`}
                              />
                              <button
                                onClick={() => setViewTxStudent(st)}
                                className={
                                  "min-w-0 truncate text-left underline-offset-2 hover:underline " +
                                  (celador ? "font-bold" : "font-medium")
                                }
                                title={`${st.nombre} — ver sus pagos`}
                              >
                                {st.nombre}
                              </button>
                              {celador && (
                                <span
                                  className="shrink-0 rounded bg-accent px-1 py-px text-[11px] uppercase text-accent-foreground"
                                  title="Celador(a) del aula"
                                >
                                  celador
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className="truncate px-1.5 py-1.5 text-center tabular-nums"
                            title={pay?.fecha ?? ""}
                          >
                            {pay?.fecha ?? "—"}
                          </td>
                          <td className="truncate px-1.5 py-1.5 text-center">
                            {pay?.mes ? formatMes(pay.mes) : "—"}
                          </td>
                          <td className="truncate px-1.5 py-1.5 text-center tabular-nums">
                            {pay ? `$${$(pay.monto)}` : "—"}
                          </td>
                          <td className="truncate px-1.5 py-1.5 text-center">
                            {esPorClase ? (
                              <span className="rounded bg-muted px-1.5 py-px text-xs">
                                Por clase
                              </span>
                            ) : sinHistorial ? (
                              <span className="text-muted-foreground">—</span>
                            ) : deuda.meses === 0 ? (
                              <span className="rounded bg-primary/20 px-1.5 py-px text-xs text-primary">
                                Al día
                              </span>
                            ) : (
                              // cursor-help: sin él nadie descubría que la
                              // insignia lleva el importe detrás.
                              <span
                                className="cursor-help rounded bg-destructive/20 px-1.5 py-px text-xs font-bold text-destructive"
                                title={`${deuda.meses} ${deuda.meses === 1 ? "mes" : "meses"} — $${$(deuda.totalUSD)}`}
                              >
                                {deuda.meses}M
                              </span>
                            )}
                          </td>
                          <td className="px-1.5 py-1.5">
                            <div className="flex items-center gap-0.5">
                              {url ? (
                                <>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => logWhatsApp(st.nombre, msg)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent"
                                    title={`Enviar WhatsApp a ${st.telefono}`}
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                                  </a>
                                  <button
                                    onClick={() => copyAndLog(msg, st.nombre)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                                    title="Copiar mensaje"
                                  >
                                    <ClipboardCopy className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span
                                  className="inline-flex h-6 w-6 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground opacity-30"
                                  title="Agrega teléfono desde editar"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </span>
                              )}
                              <button
                                onClick={() => setEditIdx(idx)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                                title="Modificar integrante"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          );
        })}
      </div>

      {!grouped.length && (
        <Card className="p-8 text-center text-muted-foreground">Sin resultados</Card>
      )}

      <CuotasEspecialesDialog
        open={cuotasOpen && puedeGestionarCuotas}
        onClose={() => setCuotasOpen(false)}
        students={students}
        onSave={(next) => {
          setStudents(next);
          toast.success("Cuotas especiales guardadas");
        }}
      />

      <StudentEditDialog
        open={editIdx !== null}
        // La casilla "Es celador(a)" muestra también lo deducido de las listas
        // de asistencia; si no, la insignia de la tabla y la casilla dirían
        // cosas distintas. Guardar desde aquí deja el dato escrito en la ficha.
        student={
          editIdx != null
            ? { ...students[editIdx], celador: esCelador(students[editIdx], editIdx) }
            : null
        }
        aulas={aulas}
        lastPay={editIdx != null ? (lastPayByStudent.get(students[editIdx].nombre) ?? null) : null}
        pagos={editIdx != null ? (resumenPagos.get(students[editIdx].nombre) ?? null) : null}
        onClose={() => setEditIdx(null)}
        onSave={(next) => {
          if (editIdx == null) return;
          setStudents(students.map((s, i) => (i === editIdx ? next : s)));
          setEditIdx(null);
          toast.success("Guardado");
        }}
        onDelete={() => {
          if (editIdx == null) return;
          if (!confirm(`Eliminar a ${students[editIdx].nombre}?`)) return;
          setStudents(students.filter((_, i) => i !== editIdx));
          // La selección se guarda por posición en el array. Al borrar a
          // alguien, todo lo que venía detrás se desplaza y las marcas pasan a
          // señalar a otras personas: «Unir fichas» fusionaba entonces a quien
          // no era, borrando las originales y sin forma de deshacerlo.
          setSeleccion([]);
          setEditIdx(null);
          toast.success("Eliminado");
        }}
      />
      <StudentEditDialog
        open={addOpen}
        student={null}
        aulas={aulas}
        lastPay={null}
        pagos={null}
        onClose={() => setAddOpen(false)}
        onSave={(next) => {
          if (students.some((s) => s.nombre.toLowerCase() === next.nombre.toLowerCase())) {
            toast.error("Ya existe");
            return;
          }
          setStudents([...students, next]);
          setAddOpen(false);
          toast.success("Agregado");
        }}
      />

      {/* Alumnos detectados en los pagos que aún no existen en la lista */}
      <Dialog open={asistOpen} onOpenChange={setAsistOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Traer integrantes desde Asistencias</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Se toman de las listas que pasan los celadores. Antes de crear a nadie se compara con
            los que ya existen, por nombre completo y también por nombre y apellido, para no
            duplicar a la misma persona escrita de dos formas. Las aulas archivadas quedan fuera. A
            quien ya está en la lista solo se le agregan las aulas que le falten y, si es el celador
            de su aula, se le devuelve esa marca.
          </p>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto">
            {previaAsistencias.nuevos.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">
                  Se van a crear {previaAsistencias.nuevos.length}
                </p>
                <div className="rounded-md border">
                  {previaAsistencias.nuevos.map((n) => (
                    <div key={n.clave} className="border-b px-2 py-1 text-xs last:border-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span>{n.nombre}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {n.aulas.join(", ")}
                        </span>
                      </div>
                      {n.ambiguo.length > 0 && (
                        <div className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                          ⚠ Se parece a {n.ambiguo.map((x) => `«${x}»`).join(" y ")}. Se crea aparte
                          por si acaso; si resulta ser la misma persona, únelas a mano.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {previaAsistencias.unir.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">
                  Ya existen — se actualizan, no se duplican ({previaAsistencias.unir.length})
                </p>
                <div className="rounded-md border">
                  {previaAsistencias.unir.map((u, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-2 border-b px-2 py-1 text-xs last:border-0"
                    >
                      <span>
                        {u.nombre}
                        {normalizeName(u.nombre) !== normalizeName(u.con) && (
                          <span className="text-muted-foreground"> → se une a «{u.con}»</span>
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {[
                          u.agrega.length ? `+ ${u.agrega.join(", ")}` : "",
                          u.marcaCelador ? "se marca como celador" : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "sin cambios"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsistOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={traerDeAsistencias}>
              <Users className="mr-2 h-4 w-4" />
              {previaAsistencias.nuevos.length
                ? `Traer ${previaAsistencias.nuevos.length}`
                : "Aplicar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detectarOpen} onOpenChange={setDetectarOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alumnos detectados en los pagos</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Estos nombres aparecen en pagos de cuota (MIEMBROS, PROBAS o CLASE) pero todavía no
            están en la lista. Revisa el nombre, asígnale un aula y quita los que no correspondan —
            el texto viene del libro diario, así que puede traer errores.
          </p>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {detectados.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded border p-2">
                <Input
                  value={d.nombre}
                  onChange={(e) =>
                    setDetectados((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)),
                    )
                  }
                  className="h-8 flex-1"
                />
                <span
                  className="shrink-0 text-[11px] text-muted-foreground"
                  title="Cantidad de pagos encontrados con este nombre"
                >
                  {d.pagos} pago{d.pagos > 1 ? "s" : ""}
                </span>
                <Select
                  value={d.aula || undefined}
                  onValueChange={(v) =>
                    setDetectados((prev) => prev.map((x, j) => (j === i ? { ...x, aula: v } : x)))
                  }
                >
                  <SelectTrigger className="h-8 w-40 shrink-0">
                    <SelectValue placeholder="Aula…" />
                  </SelectTrigger>
                  <SelectContent>
                    {aulas.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setDetectados((prev) => prev.filter((_, j) => j !== i))}
                  title="Quitar de la lista"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {detectados.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No queda ninguno por agregar.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetectarOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={detectados.length === 0}
              onClick={() => {
                const nuevos: Student[] = detectados
                  .filter((d) => d.nombre.trim())
                  .map((d) => ({
                    nombre: d.nombre.trim(),
                    aulas: d.aula ? [d.aula] : [],
                    condicion: "Miembro",
                    actividad: "Activo",
                  }));
                setStudents([...students, ...nuevos]);
                setDetectarOpen(false);
                toast.success(`${nuevos.length} alumno(s) agregados`);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar {detectados.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aulasOpen} onOpenChange={setAulasOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aulas / Cursos</DialogTitle>
          </DialogHeader>
          <div className="mb-3 flex gap-2">
            <Input
              value={nuevaAula}
              onChange={(e) => setNuevaAula(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAula()}
              placeholder="Nueva aula…"
            />
            <Button onClick={addAula}>
              <Plus className="mr-2 h-4 w-4" /> Aula
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {aulas.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-sm"
              >
                {a}
                <button
                  onClick={() => removeAula(a)}
                  className="rounded-full p-0.5 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </span>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uniendoAbierto} onOpenChange={(v) => !v && setUniendoAbierto(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unir {seleccion.length} fichas en una sola</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {seleccion.map((i) => (
                <span key={i} className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs">
                  {students[i]?.nombre}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Quedará una sola ficha con las aulas de todas y el dato más completo de cada campo: si
              una tiene teléfono y la otra no, se conserva el que existe. Las demás desaparecen.
            </p>
            <div>
              <label className="text-xs text-muted-foreground">Nombre definitivo</label>
              <Input
                value={nombreDefinitivo}
                autoFocus
                onChange={(e) => setNombreDefinitivo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unirFichas()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUniendoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={unirFichas} disabled={!nombreDefinitivo.trim()}>
              Unir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentTxDialog student={viewTxStudent} tx={tx} onClose={() => setViewTxStudent(null)} />
    </div>
  );
}
