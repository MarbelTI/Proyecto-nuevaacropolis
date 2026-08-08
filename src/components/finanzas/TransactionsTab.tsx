import { useEffect, useMemo, useState } from "react";
import {
  firmaTransaccion,
  useTransactions,
  type Student,
  type Transaction,
} from "@/lib/lists-store";
import {
  calcularCuotasDebidas,
  cuotaMensualUSD,
  currentYm,
  formatTasa,
  precioClase,
  redondearTasa,
} from "@/lib/fees-logic";
import { exportTransactionsExcel } from "@/lib/excel-export";
import { parseExcelToTransactions, rellenarTasasFaltantes } from "@/lib/excel-import";
import {
  armarMensaje,
  usePlantillas,
  PLANTILLAS_POR_DEFECTO,
  type Plantillas,
} from "@/lib/mensajes-store";
import { TransactionEditDialog } from "@/components/finanzas/TransactionEditDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Settings,
  Pencil,
  Save,
  X,
  MessageCircle,
  ClipboardCopy,
  MoreHorizontal,
  ListChecks,
  Lock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

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

const MESES_NOMBRE = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function mesLabel(ym: string): string {
  const [yy, mm] = ym.split("-");
  const name = MESES_NOMBRE[Number(mm) - 1] ?? mm;
  return `${name[0].toUpperCase()}${name.slice(1)} ${yy}`;
}

function formatMes(mes: string): string {
  if (/^[a-z]{3}-\d{2}$/i.test(mes)) return mes.toLowerCase();
  const m = mes.match(/^(\d{1,2}|[a-z]{3,9})[-\s]\s*(\d{4})$/i);
  if (m) {
    const abr = MES_MAP[m[1].toLowerCase()] ?? m[1].slice(0, 3).toLowerCase();
    return `${abr}-${m[2].slice(2)}`;
  }
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
  let yy = m[3] ?? String(new Date().getFullYear());
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm}-${dd}`;
}

const $ = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Compara ignorando mayúsculas y tildes: "bcion" encuentra "Bolívares Ción". */
function contiene(texto: string | undefined, busqueda: string): boolean {
  return normalizeName(texto ?? "").includes(normalizeName(busqueda));
}

function findStudentInDesc(desc: string, students: Student[]): Student | null {
  const n = normalizeName(desc);
  for (const s of students) {
    const sn = normalizeName(s.nombre);
    if (n.includes(sn)) return s;
  }
  return null;
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

// ---------------- Editor simple de listas ----------------

function SimpleListEditor({
  items,
  setItems,
  placeholder,
}: {
  items: string[];
  setItems: (n: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      toast.error("Ya existe");
      return;
    }
    setItems([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={placeholder}
        />
        <Button onClick={add}>
          <Plus className="mr-2 h-4 w-4" /> Agregar
        </Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1 rounded-md border bg-card px-2 py-1">
            <Input
              value={c}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
              className="h-8 border-0 shadow-none focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Editor de mensajes de WhatsApp ----------------

/** Nombre inventado para la vista previa: así se ve qué reemplaza a {nombre}. */
const NOMBRE_EJEMPLO = "María Pérez";

/**
 * Una entrada por plantilla. El `conceptoEjemplo` es solo decorado de la vista
 * previa —el concepto real lo arma el sistema con los datos de cada persona—,
 * pero está redactado igual que el de verdad para que lo que se ve en pantalla
 * sea lo que va a salir en el WhatsApp.
 */
const MENSAJES_META: {
  clave: keyof Plantillas;
  titulo: string;
  cuando: string;
  conceptoEjemplo: string;
}[] = [
  {
    clave: "pago",
    titulo: "Pago recibido",
    cuando: "Se envía desde la tabla de transacciones al confirmar un pago.",
    conceptoEjemplo: "Monto: $12.00 (480.00 Bs). Concepto: mensualidad de abr-2026.",
  },
  {
    clave: "deuda",
    titulo: "Mensualidades pendientes",
    cuando: "Se envía desde Solvencias a quien tiene meses sin pagar.",
    conceptoEjemplo: "Tienes 2 mensualidades pendientes, equivalentes a $24.00.",
  },
  {
    clave: "alDia",
    titulo: "Cuenta al día",
    cuando: "Se envía desde Solvencias a quien no debe nada.",
    conceptoEjemplo: "Tu cuenta está al día.",
  },
  {
    clave: "clase",
    titulo: "Recordatorio de clase",
    cuando: "Se envía a quienes pagan clase por clase.",
    conceptoEjemplo: "La clase de hoy tiene un valor de $5.00.",
  },
];

function BloquePlantilla({
  meta,
  plantillas,
  setPlantillas,
}: {
  meta: (typeof MENSAJES_META)[number];
  plantillas: Plantillas;
  setPlantillas: (n: Plantillas) => void;
}) {
  const { clave, titulo, cuando, conceptoEjemplo } = meta;
  const plantilla = plantillas[clave];
  const porDefecto = PLANTILLAS_POR_DEFECTO[clave];
  const esPorDefecto =
    plantilla.saludo === porDefecto.saludo && plantilla.cierre === porDefecto.cierre;

  const editar = (campo: "saludo" | "cierre", valor: string) =>
    setPlantillas({ ...plantillas, [clave]: { ...plantilla, [campo]: valor } });

  // La vista previa se pinta por partes para poder resaltar el concepto; el
  // resultado es el mismo que devuelve armarMensaje.
  const primerNombre = NOMBRE_EJEMPLO.split(" ")[0];
  const conNombre = (t: string) => t.replace(/\{nombre\}/g, primerNombre).trim();

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">{titulo}</h4>
          <p className="text-xs text-muted-foreground">{cuando}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={esPorDefecto}
          onClick={() => {
            setPlantillas({ ...plantillas, [clave]: { ...porDefecto } });
            toast.success(`"${titulo}" restaurado al texto original`);
          }}
          title="Vuelve al texto que trae el sistema"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Saludo (va antes)</label>
          <Textarea
            value={plantilla.saludo}
            onChange={(e) => editar("saludo", e.target.value)}
            rows={3}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cierre (va después)</label>
          <Textarea
            value={plantilla.cierre}
            onChange={(e) => editar("cierre", e.target.value)}
            rows={3}
            className="mt-1 text-sm"
          />
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Vista previa (ejemplo con {NOMBRE_EJEMPLO})
        </p>
        <p className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed">
          {conNombre(plantilla.saludo)}{" "}
          <span
            className="rounded bg-amber-200/70 px-1 py-0.5 dark:bg-amber-900/50"
            title="Esta parte la escribe el sistema con los datos reales. No se puede editar."
          >
            <Lock className="mr-1 inline h-3 w-3 align-[-1px] opacity-70" />
            {conceptoEjemplo}
          </span>{" "}
          {conNombre(plantilla.cierre)}
        </p>
      </div>
    </div>
  );
}

function EditorMensajes({
  plantillas,
  setPlantillas,
}: {
  plantillas: Plantillas;
  setPlantillas: (n: Plantillas) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="text-sm font-medium text-foreground">
          Cada mensaje se arma en tres partes: saludo + concepto + cierre.
        </p>
        <p className="mt-1.5">
          El <strong className="text-foreground">saludo</strong> y el{" "}
          <strong className="text-foreground">cierre</strong> los escribes tú: ahí está el tono.
          Donde pongas <code className="rounded bg-background px-1 py-0.5">{"{nombre}"}</code>{" "}
          aparecerá el primer nombre de la persona.
        </p>
        <p className="mt-1.5">
          El trozo del medio —el{" "}
          <span className="rounded bg-amber-200/70 px-1 py-0.5 text-foreground dark:bg-amber-900/50">
            <Lock className="mr-1 inline h-3 w-3 align-[-1px] opacity-70" />
            concepto
          </span>
          — lo escribe el sistema con los datos reales de cada persona: cuánto pagó, cuántos meses
          debe, de qué mes. <strong className="text-foreground">No se puede editar</strong>, y es a
          propósito: si se dejara escribir a mano, bastaría un descuido para mandarle a alguien una
          cifra que no es la suya, o para borrarla y dejar el mensaje sin decir nada.
        </p>
        <p className="mt-1.5">Los cambios se guardan solos en este navegador.</p>
      </div>

      {MENSAJES_META.map((meta) => (
        <BloquePlantilla
          key={meta.clave}
          meta={meta}
          plantillas={plantillas}
          setPlantillas={setPlantillas}
        />
      ))}
    </div>
  );
}

// ---------------- StudentEditDialog ----------------

function StudentEditDialog({
  open,
  student,
  aulas,
  lastPay,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  student: Student | null;
  aulas: string[];
  lastPay: { fecha: string; monto: number } | null;
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
  const lastYm = lastPay ? (fechaToIso(lastPay.fecha) || "").slice(0, 7) : null;
  const deuda = calcularCuotasDebidas(draft, lastYm, ymNow, lastPay?.monto);
  const esPorClase = draft.condicion === "ClasePorClase";
  const precioClaseActual = precioClase(ymNow);

  const placeholderExamples = ["$20.00", "$15.00", "$13.50", "$0.00", "$25.00"];
  const placeholder = placeholderExamples[draft.nombre.length % placeholderExamples.length];

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
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    condicion: v as Student["condicion"],
                  })
                }
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
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    actividad: v as Student["actividad"],
                  })
                }
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
              <label className="text-xs text-muted-foreground">Tarifa mensual USD</label>
              <Input
                type="number"
                step="0.01"
                value={draft.cuotaOverride ?? ""}
                placeholder={placeholder}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    cuotaOverride: Number(e.target.value) || undefined,
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cuota mensual</label>
              <p className="text-sm font-medium">${cuotaAplicada.toFixed(2)}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Teléfono (WhatsApp)</label>
            <Input
              value={draft.telefono ?? ""}
              placeholder="+58 4XX-XXXXXXX"
              onChange={(e) => setDraft({ ...draft, telefono: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fecha de ingreso</label>
            <Input
              type="date"
              value={draft.fechaIngreso ?? ""}
              onChange={(e) => setDraft({ ...draft, fechaIngreso: e.target.value })}
            />
          </div>
          {esPorClase && (
            <div>
              <label className="text-xs text-muted-foreground">Precio por clase</label>
              <p className="text-sm font-medium">${precioClaseActual.toFixed(2)}</p>
            </div>
          )}
          {deuda.totalUSD > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Deuda: ${deuda.totalUSD.toFixed(2)} USD ({deuda.meses} cuotas)
            </div>
          )}
        </div>
        <DialogFooter>
          {student && onDelete && (
            <Button variant="destructive" onClick={onDelete} className="mr-auto">
              <Trash2 className="mr-1 h-4 w-4" /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!draft.nombre.trim()) {
                toast.error("Nombre requerido");
                return;
              }
              onSave(draft);
            }}
          >
            <Save className="mr-1 h-4 w-4" /> Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Transacciones ----------------

export function TransactionsTab({
  tx,
  ingresos,
  gastos,
  bancos,
  bcvRates,
  bcvSources,
  students,
  aulas,
  setStudents,
  setIngresos,
  setGastos,
  setBancos,
}: {
  tx: ReturnType<typeof useTransactions>;
  ingresos: string[];
  gastos: string[];
  bancos: string[];
  setIngresos: (n: string[]) => void;
  setGastos: (n: string[]) => void;
  setBancos: (n: string[]) => void;
  bcvRates: Record<string, number>;
  bcvSources: Record<string, string>;
  students: Student[];
  aulas: string[];
  setStudents: (n: Student[]) => void;
}) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [studentTx, setStudentTx] = useState<{
    name: string;
    tx: Transaction[];
  } | null>(null);
  const [editTxStudent, setEditTxStudent] = useState<Student | null>(null);
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterMoneda, setFilterMoneda] = useState<string>("");
  const [filterCategoria, setFilterCategoria] = useState<string>("");
  const [filterDescripcion, setFilterDescripcion] = useState<string>("");
  const [filterBanco, setFilterBanco] = useState<string>("");
  const [filterMes, setFilterMes] = useState<string>("");
  const [plantillas, setPlantillas] = usePlantillas();

  /**
   * Movimientos repetidos: los que coinciden en TODOS sus campos con otro.
   * Se marcan todas las filas del grupo (no solo la segunda) para poder ver
   * el par completo y decidir cuál borrar.
   */
  const idsDuplicados = useMemo(() => {
    const porFirma = new Map<string, string[]>();
    for (const t of tx.list) {
      const firma = firmaTransaccion(t);
      const ids = porFirma.get(firma);
      if (ids) ids.push(t.id);
      else porFirma.set(firma, [t.id]);
    }
    const dup = new Set<string>();
    for (const ids of porFirma.values()) {
      if (ids.length > 1) for (const id of ids) dup.add(id);
    }
    return dup;
  }, [tx.list]);

  /** Cuántas filas sobran realmente (una de cada grupo es la buena). */
  const sobrantesDuplicados = useMemo(() => {
    const porFirma = new Map<string, number>();
    for (const t of tx.list) {
      const firma = firmaTransaccion(t);
      porFirma.set(firma, (porFirma.get(firma) ?? 0) + 1);
    }
    let sobran = 0;
    for (const n of porFirma.values()) if (n > 1) sobran += n - 1;
    return sobran;
  }, [tx.list]);

  /** Movimientos en Bs/Pesos que aún no tienen tasa de cambio asignada. */
  const sinTasaCount = useMemo(
    () =>
      tx.list.filter(
        (t) =>
          (t.moneda === "Bolívares" || t.moneda === "Pesos") &&
          !(t.tasa != null && Number(t.tasa) > 0),
      ).length,
    [tx.list],
  );

  const catBuscada = filterCategoria.trim();
  const descBuscada = filterDescripcion.trim();

  const filtered = useMemo(() => {
    const pasa = tx.list.filter((r) => {
      const iso = fechaToIso(r.fecha);
      // Una fecha ilegible no debe desaparecer al filtrar por texto: solo se
      // salta los filtros que dependen de la fecha.
      if (iso) {
        if (from && iso < from) return false;
        if (to && iso > to) return false;
        if (filterMes && iso.slice(0, 7) !== filterMes) return false;
      }
      if (filterTipo && r.tipo !== filterTipo) return false;
      if (filterMoneda && r.moneda !== filterMoneda) return false;
      // Coincidencia parcial, no exacta: escribir "alq" debe encontrar
      // "Alquiler del local" mientras se teclea.
      if (catBuscada && !contiene(r.categoria, catBuscada)) return false;
      if (descBuscada && !contiene(r.descripcion, descBuscada)) return false;
      if (filterBanco === "__sin_banco__" && (r.banco || "") !== "") return false;
      if (
        filterBanco &&
        filterBanco !== "__sin_banco__" &&
        filterBanco !== "__todos__" &&
        r.banco !== filterBanco
      )
        return false;
      return true;
    });

    // Siempre de la más antigua a la más reciente. Las fechas se guardan como
    // texto dd/mm/aaaa, que ordenado tal cual pone el 02/01 antes del 15/12;
    // por eso se compara la versión ISO. Las fechas ilegibles van al final
    // para que salten a la vista y se puedan corregir.
    return pasa
      .map((r, i) => ({ r, iso: fechaToIso(r.fecha), i }))
      .sort((a, b) => {
        if (a.iso !== b.iso) {
          if (!a.iso) return 1;
          if (!b.iso) return -1;
          return a.iso < b.iso ? -1 : 1;
        }
        return a.i - b.i; // mismo día: se respeta el orden de carga
      })
      .map((x) => x.r);
  }, [
    tx.list,
    from,
    to,
    filterTipo,
    filterMoneda,
    filterBanco,
    catBuscada,
    descBuscada,
    filterMes,
  ]);

  const anyFilterActive = !!(
    from ||
    to ||
    filterTipo ||
    filterMoneda ||
    catBuscada ||
    descBuscada ||
    filterBanco ||
    filterMes
  );

  const limpiarFiltros = () => {
    setFrom("");
    setTo("");
    setFilterTipo("");
    setFilterMoneda("");
    setFilterCategoria("");
    setFilterDescripcion("");
    setFilterBanco("");
    setFilterMes("");
  };

  const mesOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of tx.list) {
      const iso = fechaToIso(r.fecha);
      if (iso) set.add(iso.slice(0, 7));
    }
    return [...set].sort().reverse();
  }, [tx.list]);

  /** Categorías realmente presentes en los movimientos, para sugerirlas. */
  const categoriaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of tx.list) if (r.categoria?.trim()) set.add(r.categoria.trim());
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [tx.list]);

  const exportExcel = () => {
    if (!filtered.length) {
      toast.error("No hay transacciones en el rango");
      return;
    }
    exportTransactionsExcel(filtered);
    toast.success("Excel descargado");
  };

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDialog, setBatchDialog] = useState(false);
  const [batchField, setBatchField] = useState<string>("");
  const [batchValue, setBatchValue] = useState<string>("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBatchEdit = async () => {
    if (!batchField || !batchValue) return;
    let count = 0;
    for (const t of tx.list) {
      if (!selectedIds.has(t.id)) continue;
      const next = { ...t };
      if (batchField === "fecha") next.fecha = batchValue;
      else if (batchField === "tipo") next.tipo = batchValue as "Ingreso" | "Gasto";
      else if (batchField === "categoria") next.categoria = batchValue;
      else if (batchField === "moneda")
        next.moneda = batchValue as "USD" | "Bolívares" | "Pesos" | "";
      else if (batchField === "tasa")
        next.tasa = batchValue ? redondearTasa(Number(batchValue)) : null;
      else if (batchField === "banco") next.banco = batchValue;
      else if (batchField === "mes") next.mes = batchValue;
      else if (batchField === "descripcion") next.descripcion = batchValue;
      else if (batchField === "mensualidad") next.mensualidad = batchValue;
      if (batchField === "moneda" || batchField === "tasa") {
        const { calcularMontoUsd } = await import("@/lib/fees-logic");
        next.montoUsd = calcularMontoUsd(next.moneda, next.monto, next.tasa);
      }
      tx.replace(t.id, next);
      count++;
    }
    toast.success(`${count} transacciones actualizadas`);
    setSelectedIds(new Set());
    setBatchDialog(false);
    setBatchField("");
    setBatchValue("");
  };

  const eliminarRango = () => {
    if (!filtered.length) {
      toast.error("Nada que eliminar en el rango");
      return;
    }
    // Sin ningún filtro puesto, "lo filtrado" es absolutamente todo: el aviso
    // tiene que decirlo con todas sus letras antes de borrar.
    const label = anyFilterActive
      ? "que estás viendo ahora (las que pasan los filtros activos)"
      : "TODAS las transacciones, porque no hay ningún filtro puesto";
    if (!confirm(`¿Eliminar ${filtered.length} transacciones ${label}?`)) return;
    const idsRemove = new Set(filtered.map((r) => r.id));
    tx.removeMany(idsRemove);
    toast.success(`${idsRemove.size} eliminadas`);
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Histórico de transacciones</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              function hoy(): string {
                const d = new Date();
                return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
              }
              const empty: Transaction = {
                fecha: hoy(),
                mes: "",
                id: "__new__",
                tipo: "Ingreso",
                categoria: "",
                descripcion: "",
                mensualidad: "",
                moneda: "USD",
                monto: 0,
                tasa: null,
                montoUsd: 0,
                banco: "",
              };
              setEditing(empty);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Nuevo registro
          </Button>
          <input
            type="file"
            id="importExcel"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const mapped = await parseExcelToTransactions(file);
                if (!mapped.length) {
                  toast.error("Excel vacío o formato no reconocido");
                  return;
                }
                // Completa la tasa de los movimientos en Bs/Pesos que vengan
                // sin ella, usando el histórico de tasas BCV ya cargado.
                const r = rellenarTasasFaltantes(mapped, bcvRates);
                tx.append(r.rows);
                toast.success(`${r.rows.length} transacciones importadas`);
                const completadas = r.bsExactas + r.bsAproximadas + r.pesos;
                if (completadas > 0) {
                  toast.info(
                    `Se completó la tasa de ${completadas} movimiento(s): ` +
                      `${r.bsExactas} con la tasa BCV exacta del día` +
                      (r.bsAproximadas ? `, ${r.bsAproximadas} con la más cercana` : "") +
                      (r.pesos ? `, ${r.pesos} en pesos con la tasa por defecto` : ""),
                    { duration: 9000 },
                  );
                }
                if (r.bsSinTasa > 0) {
                  toast.warning(
                    `${r.bsSinTasa} movimiento(s) en bolívares quedaron sin tasa porque no hay ninguna registrada para esas fechas. Cárgalas en la pestaña Tasas BCV y vuelve a importar, o complétalas a mano.`,
                    { duration: 12000 },
                  );
                }
              } catch (err) {
                toast.error(`Error al leer Excel: ${(err as Error).message}`);
              }
              e.target.value = "";
            }}
          />
          {idsDuplicados.size > 0 && (
            <span className="inline-flex items-center gap-2 rounded-md border border-pink-300 bg-pink-100 px-2 py-1 text-xs dark:border-pink-900 dark:bg-pink-950/40">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-pink-400" />
              {idsDuplicados.size} fila(s) repetidas · sobran {sobrantesDuplicados}
              <button
                className="underline hover:no-underline"
                onClick={() => {
                  if (
                    !confirm(
                      `Se van a eliminar ${sobrantesDuplicados} fila(s) repetidas, dejando una sola de cada grupo.\n\nSolo se borran movimientos idénticos en TODOS sus campos.\n\n¿Continuar?`,
                    )
                  )
                    return;
                  const vistas = new Set<string>();
                  const aBorrar = new Set<string>();
                  for (const t of tx.list) {
                    const firma = firmaTransaccion(t);
                    if (vistas.has(firma)) aBorrar.add(t.id);
                    else vistas.add(firma);
                  }
                  tx.removeMany(aBorrar);
                  toast.success(`${aBorrar.size} fila(s) repetidas eliminadas`);
                }}
              >
                Eliminar sobrantes
              </button>
            </span>
          )}
          {sinTasaCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  !confirm(
                    `Se va a completar la tasa de ${sinTasaCount} movimiento(s) que están en bolívares o pesos sin tasa, usando la tasa BCV de su fecha (o la más cercana), y se recalculará su monto en dólares.\n\nLos movimientos que ya tienen tasa NO se tocan.\n\n¿Continuar?`,
                  )
                )
                  return;
                const r = rellenarTasasFaltantes(tx.list, bcvRates);
                tx.replaceAll(r.rows);
                const ok = r.bsExactas + r.bsAproximadas + r.pesos;
                toast.success(
                  `Se completaron ${ok} movimiento(s): ${r.bsExactas} con la tasa exacta del día` +
                    (r.bsAproximadas ? `, ${r.bsAproximadas} con la más cercana` : "") +
                    (r.pesos ? `, ${r.pesos} en pesos` : ""),
                  { duration: 9000 },
                );
                if (r.bsSinTasa > 0) {
                  toast.warning(
                    `${r.bsSinTasa} movimiento(s) en bolívares siguen sin tasa: no hay ninguna registrada para esas fechas. Cárgalas en la pestaña Tasas BCV.`,
                    { duration: 12000 },
                  );
                }
              }}
            >
              Completar tasas ({sinTasaCount})
            </Button>
          )}
          <label className="text-xs text-muted-foreground">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
          />
          <Button variant="outline" size="sm" onClick={limpiarFiltros} disabled={!anyFilterActive}>
            Limpiar filtros
          </Button>

          {/* El modo selección ya no tiene botón propio en la barra, así que
              necesita un aviso visible mientras está encendido. */}
          {selectMode && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium">
              <ListChecks className="h-3.5 w-3.5" /> Selección activa
            </span>
          )}

          {/* Las acciones ocasionales viven aquí dentro: dejarlas todas a la
              vista llenaba la barra de once controles y ponía "Eliminar
              rango" —que borra cientos de filas de un clic— pegado a los de
              uso diario. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2" title="Más acciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={exportExcel}>
                <Download className="mr-2 h-4 w-4" /> Exportar a Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById("importExcel")?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Importar Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectMode(!selectMode);
                  if (selectMode) setSelectedIds(new Set());
                }}
              >
                <ListChecks className="mr-2 h-4 w-4" />
                {selectMode ? "Salir de selección" : "Seleccionar filas"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCatOpen(true)}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={eliminarRango}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar lo filtrado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Mostrando {filtered.length} de {tx.list.length}
      </p>

      {/* El encabezado queda fijo y solo se desplazan las filas: con cientos de
          movimientos, perder de vista los títulos y los filtros al bajar hacía
          muy difícil saber qué columna se está mirando. */}
      <div className="max-h-[65vh] overflow-auto rounded-md border">
        {/* whitespace-nowrap en todas las celdas: con el menú lateral la tabla
            perdió ancho y los textos largos partían las filas en dos líneas.
            La descripción se recorta con "…" en vez de envolver. */}
        <table className="w-full text-xs [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead className="sticky top-0 z-20 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-0.5 px-2 font-medium">
                <select
                  value={filterMes}
                  onChange={(e) => setFilterMes(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none"
                >
                  <option value="">Mes</option>
                  {mesOptions.map((ym) => (
                    <option key={ym} value={ym}>
                      {mesLabel(ym)}
                    </option>
                  ))}
                </select>
              </th>
              <th className="py-0.5 px-2 font-medium">
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none"
                >
                  <option value="">Tipo</option>
                  <option value="Ingreso">Ingreso</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </th>
              <th className="py-0.5 px-2 font-medium">
                <input
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  placeholder="Categoría…"
                  list="lista-categorias"
                  className="w-full min-w-[110px] bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
                />
                {/* Sugiere las categorías que existen, pero deja escribir
                    libremente para buscar por trozos de texto. */}
                <datalist id="lista-categorias">
                  {categoriaOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </th>
              <th className="py-0.5 px-2 font-medium">
                <input
                  value={filterDescripcion}
                  onChange={(e) => setFilterDescripcion(e.target.value)}
                  placeholder="Descripción…"
                  className="w-full min-w-[140px] bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
                />
              </th>
              <th className="py-0.5 px-2 font-medium">Mens.</th>
              <th className="py-0.5 px-2 font-medium">
                <select
                  value={filterMoneda}
                  onChange={(e) => setFilterMoneda(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none"
                >
                  <option value="">Moneda</option>
                  <option value="USD">USD</option>
                  <option value="Bolívares">Bolívares</option>
                  <option value="Pesos">Pesos</option>
                </select>
              </th>
              <th className="py-0.5 px-2 font-medium">
                <Select value={filterBanco || undefined} onValueChange={(v) => setFilterBanco(v)}>
                  <SelectTrigger className="h-auto border-0 p-0 shadow-none text-xs font-medium text-muted-foreground">
                    <SelectValue placeholder="Banco…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    {bancos.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                    <SelectItem value="__sin_banco__">(sin banco)</SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="py-0.5 px-2 font-medium">Monto</th>
              <th className="py-0.5 px-2 font-medium">Tasa</th>
              <th className="py-0.5 px-2 font-medium">USD</th>
              <th className="py-0.5 px-2 font-medium"></th>
              <th className="py-0.5 px-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isSelected = selectMode && selectedIds.has(r.id);
              const esDup = idsDuplicados.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={`border-b last:border-0 cursor-default ${
                    isSelected
                      ? "bg-primary/10 ring-1 ring-inset ring-primary"
                      : esDup
                        ? "bg-pink-100 dark:bg-pink-950/40"
                        : selectMode
                          ? "hover:bg-accent/40"
                          : ""
                  }`}
                  title={esDup ? "Repetida: hay otro movimiento con los mismos datos" : undefined}
                  onClick={() => selectMode && toggleSelect(r.id)}
                >
                  <td className="px-2 py-0.5">{r.fecha}</td>
                  <td className="px-2 py-0.5">{r.tipo}</td>
                  <td className="max-w-[130px] truncate px-2 py-0.5" title={r.categoria}>
                    {r.categoria}
                  </td>
                  <td className="max-w-[220px] truncate px-2 py-0.5" title={r.descripcion}>
                    {r.descripcion}
                  </td>
                  <td className="px-2 py-0.5">{r.mensualidad ? formatMes(r.mensualidad) : ""}</td>
                  <td className="px-2 py-0.5">{r.moneda}</td>
                  <td
                    className="max-w-[110px] truncate px-2 py-0.5 text-muted-foreground"
                    title={r.banco || ""}
                  >
                    {r.banco || "—"}
                  </td>
                  <td className="px-2 py-0.5 text-right tabular-nums">
                    {isNaN(Number(r.monto)) ? r.monto : $(Number(r.monto))}
                  </td>
                  <td className="px-2 py-0.5 text-right tabular-nums">{formatTasa(r.tasa)}</td>
                  <td className="px-2 py-0.5 text-right font-medium tabular-nums">
                    ${$(Number(r.montoUsd) || 0)}
                  </td>
                  <td className="px-1 py-0.5">
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => tx.duplicateAfter(r.id)}
                        title="Duplicar fila debajo"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditing(r)}
                        title="Modificar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => tx.remove(r.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                  <td className="py-0.5 px-2">
                    {(() => {
                      const s = findStudentInDesc(r.descripcion, students);
                      if (!s)
                        return (
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground"
                            title="No se encontró alumno en la descripción"
                          >
                            <MessageCircle className="h-3.5 w-3.5 opacity-30" />
                          </span>
                        );
                      if (!s.telefono)
                        return (
                          <button
                            onClick={() => setEditTxStudent(s)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                            title="Agregar teléfono"
                          >
                            <MessageCircle className="h-3.5 w-3.5 opacity-50" />
                          </button>
                        );
                      const moneda =
                        r.moneda === "Bolívares" ? "Bs" : r.moneda === "Pesos" ? "COP" : "USD";
                      const detalle = r.mensualidad
                        ? `mensualidad de ${r.mensualidad}`
                        : r.descripcion || `pago`;
                      // El concepto es la parte factual y por eso se arma aquí,
                      // fuera de las plantillas editables: las cifras salen del
                      // movimiento registrado y nadie puede tocarlas por error.
                      const concepto = `Monto: $${$(Number(r.montoUsd) || 0)} (${r.monto} ${moneda}). Concepto: ${detalle}.`;
                      const msg = armarMensaje(plantillas.pago, s.nombre, concepto);
                      const url = whatsappUrl(s.telefono, msg);
                      return url ? (
                        <>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => logWhatsApp(s.nombre, msg)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent"
                            title={`Enviar WhatsApp a ${s.nombre}`}
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-primary" />
                          </a>
                          <button
                            onClick={() => copyAndLog(msg, s.nombre)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                            title="Copiar mensaje"
                          >
                            <ClipboardCopy className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null;
                    })()}
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={12} className="py-8 text-center text-muted-foreground">
                  Sin transacciones
                </td>
              </tr>
            )}
            {anyFilterActive && filtered.length > 1 && (
              <>
                {(() => {
                  const porMoneda: Record<string, { count: number; total: number; usd: number }> =
                    {};
                  for (const r of filtered) {
                    const mon = r.moneda || "USD";
                    const cur = porMoneda[mon] ?? { count: 0, total: 0, usd: 0 };
                    cur.count++;
                    cur.total += Number(r.monto) || 0;
                    cur.usd += Number(r.montoUsd) || 0;
                    porMoneda[mon] = cur;
                  }
                  const monedas = Object.entries(porMoneda);
                  const totalUsd = filtered.reduce((s, r) => s + (Number(r.montoUsd) || 0), 0);
                  return (
                    <>
                      {monedas.map(([mon, cur]) => (
                        <tr key={mon} className="border-t-2 font-semibold bg-accent/20">
                          <td className="py-0.5 px-2 text-xs" colSpan={7}>
                            Total {mon} ({cur.count} filas)
                          </td>
                          <td className="py-0.5 px-2 text-right tabular-nums">${$(cur.total)}</td>
                          <td className="py-0.5 px-2" />
                          <td className="py-0.5 px-2 text-right tabular-nums">${$(cur.usd)}</td>
                          <td colSpan={2} />
                        </tr>
                      ))}
                      <tr className="font-semibold bg-accent/10">
                        <td className="py-0.5 px-2 text-xs" colSpan={7}>
                          Total en USD ({filtered.length} filas)
                        </td>
                        <td className="py-0.5 px-2" />
                        <td className="py-0.5 px-2" />
                        <td className="py-0.5 px-2 text-right tabular-nums">${$(totalUsd)}</td>
                        <td colSpan={2} />
                      </tr>
                    </>
                  );
                })()}
              </>
            )}
            {!anyFilterActive &&
              filtered.length > 0 &&
              (() => {
                const porMoneda: Record<string, { count: number; total: number; usd: number }> = {};
                let totalUsd = 0;
                for (const r of filtered) {
                  const mon = r.moneda || "USD";
                  const cur = porMoneda[mon] ?? { count: 0, total: 0, usd: 0 };
                  cur.count++;
                  cur.total += Number(r.monto) || 0;
                  cur.usd += Number(r.montoUsd) || 0;
                  porMoneda[mon] = cur;
                  totalUsd += Number(r.montoUsd) || 0;
                }
                const monedas = Object.entries(porMoneda);
                return (
                  <>
                    {monedas.map(([mon, cur]) => (
                      <tr key={mon} className="border-t-2 font-semibold bg-accent/20">
                        <td className="py-0.5 px-2 text-xs" colSpan={7}>
                          Total {mon} ({cur.count} filas)
                        </td>
                        <td className="py-0.5 px-2 text-right tabular-nums">${$(cur.total)}</td>
                        <td className="py-0.5 px-2" />
                        <td className="py-0.5 px-2 text-right tabular-nums">${$(cur.usd)}</td>
                        <td colSpan={2} />
                      </tr>
                    ))}
                    <tr className="font-semibold bg-accent/10">
                      <td className="py-0.5 px-2 text-xs" colSpan={7}>
                        Total en USD ({filtered.length} filas)
                      </td>
                      <td className="py-0.5 px-2" />
                      <td className="py-0.5 px-2" />
                      <td className="py-0.5 px-2 text-right tabular-nums">${$(totalUsd)}</td>
                      <td colSpan={2} />
                    </tr>
                  </>
                );
              })()}
          </tbody>
        </table>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border bg-accent/20 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} seleccionadas</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Deseleccionar
            </Button>
            <Button size="sm" onClick={() => setBatchDialog(true)}>
              Editar seleccionadas
            </Button>
          </div>
        </div>
      )}

      <Dialog open={batchDialog} onOpenChange={setBatchDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edición masiva</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            {selectedIds.size} transacciones seleccionadas. Elegí qué campo modificar y el nuevo
            valor.
          </p>
          <div className="space-y-3">
            <Select
              value={batchField}
              onValueChange={(v) => {
                setBatchField(v);
                setBatchValue("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Campo a modificar…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="categoria">Categoría</SelectItem>
                <SelectItem value="fecha">Fecha</SelectItem>
                <SelectItem value="tipo">Tipo (Ingreso/Gasto)</SelectItem>
                <SelectItem value="moneda">Moneda</SelectItem>
                <SelectItem value="tasa">Tasa de cambio</SelectItem>
                <SelectItem value="banco">Banco/Cuenta</SelectItem>
                <SelectItem value="mes">Mes</SelectItem>
                <SelectItem value="descripcion">Descripción</SelectItem>
                <SelectItem value="mensualidad">Mensualidad</SelectItem>
              </SelectContent>
            </Select>

            {batchField === "categoria" && (
              <Select value={batchValue} onValueChange={setBatchValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría…" />
                </SelectTrigger>
                <SelectContent>
                  {[...ingresos, ...gastos].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {batchField === "tipo" && (
              <Select value={batchValue} onValueChange={setBatchValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ingreso">Ingreso</SelectItem>
                  <SelectItem value="Gasto">Gasto</SelectItem>
                </SelectContent>
              </Select>
            )}
            {batchField === "moneda" && (
              <Select value={batchValue} onValueChange={setBatchValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="Bolívares">Bolívares</SelectItem>
                  <SelectItem value="Pesos">Pesos</SelectItem>
                </SelectContent>
              </Select>
            )}
            {batchField === "fecha" && (
              <input
                type="text"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                placeholder="dd/mm/aaaa"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            )}
            {batchField === "tasa" && (
              <input
                type="number"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                placeholder="Ej: 90.50"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            )}
            {batchField === "banco" && (
              <input
                type="text"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                placeholder="Nombre del banco…"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            )}
            {batchField === "mes" && (
              <input
                type="text"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                placeholder="Ej: Abril"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            )}
            {batchField === "descripcion" && (
              <input
                type="text"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                placeholder="Nueva descripción…"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            )}
            {batchField === "mensualidad" && (
              <input
                type="text"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                placeholder="Ej: jul-2026"
                className="w-full rounded border bg-background px-3 py-2 text-sm"
              />
            )}
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setBatchDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={applyBatchEdit} disabled={!batchField || !batchValue}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionEditDialog
        editing={editing}
        onClose={() => setEditing(null)}
        ingresos={ingresos}
        gastos={gastos}
        bancos={bancos}
        bcvRates={bcvRates}
        bcvSources={bcvSources}
        onSave={(next) => {
          if (next.id === "__new__") {
            const { id, ...rest } = next;
            tx.append([rest]);
            setEditing(null);
            toast.success("Transacción creada");
          } else {
            tx.replace(next.id, next);
            setEditing(null);
            toast.success("Transacción actualizada");
          }
        }}
      />

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="ing">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="ing">Ingresos</TabsTrigger>
              <TabsTrigger value="gas">Gastos</TabsTrigger>
              <TabsTrigger value="bn">Bancos</TabsTrigger>
              <TabsTrigger value="msg">Mensajes</TabsTrigger>
            </TabsList>
            <TabsContent value="ing" className="mt-4">
              <SimpleListEditor
                items={ingresos}
                setItems={setIngresos}
                placeholder="Nueva categoría de ingreso…"
              />
            </TabsContent>
            <TabsContent value="gas" className="mt-4">
              <SimpleListEditor
                items={gastos}
                setItems={setGastos}
                placeholder="Nueva categoría de gasto…"
              />
            </TabsContent>
            <TabsContent value="bn" className="mt-4">
              <SimpleListEditor
                items={bancos}
                setItems={setBancos}
                placeholder="Nuevo banco/cuenta…"
              />
            </TabsContent>
            <TabsContent value="msg" className="mt-4">
              <EditorMensajes plantillas={plantillas} setPlantillas={setPlantillas} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <StudentEditDialog
        open={editTxStudent !== null}
        student={editTxStudent}
        aulas={aulas}
        lastPay={null}
        onClose={() => setEditTxStudent(null)}
        onSave={(next) => {
          setStudents(students.map((s) => (s.nombre === next.nombre ? next : s)));
          setEditTxStudent(null);
          toast.success("Guardado");
        }}
      />
    </Card>
  );
}
