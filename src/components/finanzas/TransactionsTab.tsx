import { useEffect, useMemo, useState } from "react";
import {
  useTransactions,
  type Student,
  type Transaction,
} from "@/lib/lists-store";
import {
  calcularCuotasDebidas,
  cuotaMensualUSD,
  currentYm,
  precioClase,
} from "@/lib/fees-logic";
import { exportTransactionsExcel } from "@/lib/excel-export";
import { parseExcelToTransactions } from "@/lib/excel-import";
import { TransactionEditDialog } from "@/components/finanzas/TransactionEditDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Download, Upload, Settings, Pencil, Save, X,
  MessageCircle, ClipboardCopy,
} from "lucide-react";
import { toast } from "sonner";

// ------------------------- Helpers -------------------------

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
          <li
            key={i}
            className="flex items-center gap-1 rounded-md border bg-card px-2 py-1"
          >
            <Input
              value={c}
              onChange={(e) =>
                setItems(items.map((x, j) => (j === i ? e.target.value : x)))
              }
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
  const lastYm = lastPay
    ? (fechaToIso(lastPay.fecha) || "").slice(0, 7)
    : null;
  const deuda = calcularCuotasDebidas(draft, lastYm, ymNow, lastPay?.monto);
  const esPorClase = draft.condicion === "ClasePorClase";
  const precioClaseActual = precioClase(ymNow);

  const placeholderExamples = [
    "$20.00",
    "$15.00",
    "$13.50",
    "$0.00",
    "$25.00",
  ];
  const placeholder =
    placeholderExamples[draft.nombre.length % placeholderExamples.length];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {student ? "Modificar integrante" : "Nuevo integrante"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nombre</label>
            <Input
              value={draft.nombre}
              onChange={(e) =>
                setDraft({ ...draft, nombre: e.target.value })
              }
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
              <label className="text-xs text-muted-foreground">
                Condición
              </label>
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
                  <SelectItem value="Probacionista">
                    Probacionista
                  </SelectItem>
                  <SelectItem value="ClasePorClase">
                    Clase por clase
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Actividad
              </label>
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
              onChange={(e) =>
                setDraft({ ...draft, celador: e.target.checked })
              }
            />
            <label htmlFor="celador" className="text-sm">
              Es celador(a)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Tarifa mensual USD
              </label>
              <Input
                type="number"
                step="0.01"
                value={draft.tarifaMensual ?? ""}
                placeholder={placeholder}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tarifaMensual: Number(e.target.value) || undefined,
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Cuota mensual
              </label>
              <p className="text-sm font-medium">${cuotaAplicada.toFixed(2)}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Teléfono (WhatsApp)
            </label>
            <Input
              value={draft.telefono ?? ""}
              placeholder="+58 4XX-XXXXXXX"
              onChange={(e) =>
                setDraft({ ...draft, telefono: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Fecha de ingreso
            </label>
            <Input
              type="date"
              value={draft.fechaIngreso ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, fechaIngreso: e.target.value })
              }
            />
          </div>
          {esPorClase && (
            <div>
              <label className="text-xs text-muted-foreground">
                Precio por clase
              </label>
              <p className="text-sm font-medium">
                ${precioClaseActual.toFixed(2)}
              </p>
            </div>
          )}
          {deuda > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Deuda: ${deuda.toFixed(2)} USD ({deuda} cuotas)
            </div>
          )}
        </div>
        <DialogFooter>
          {student && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              className="mr-auto"
            >
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
  const [searchQ, setSearchQ] = useState("");
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
  const [filterBanco, setFilterBanco] = useState<string>("");

  const filtered = useMemo(() => {
    const sq = searchQ.trim().toLowerCase();
    return tx.list.filter((r) => {
      const iso = fechaToIso(r.fecha);
      if (!iso) return true;
      if (from && iso < from) return false;
      if (to && iso > to) return false;
      if (sq) {
        const descOk = r.descripcion?.toLowerCase().includes(sq);
        const catOk = r.categoria?.toLowerCase().includes(sq);
        const nameOk = findStudentInDesc(r.descripcion, students)
          ?.nombre.toLowerCase()
          .includes(sq);
        if (!descOk && !catOk && !nameOk) return false;
      }
      if (filterTipo && r.tipo !== filterTipo) return false;
      if (filterMoneda && r.moneda !== filterMoneda) return false;
      if (filterCategoria && r.categoria !== filterCategoria) return false;
      if (
        filterBanco === "__sin_banco__" &&
        (r.banco || "") !== ""
      )
        return false;
      if (
        filterBanco &&
        filterBanco !== "__sin_banco__" &&
        filterBanco !== "__todos__" &&
        r.banco !== filterBanco
      )
        return false;
      return true;
    });
  }, [
    tx.list,
    from,
    to,
    searchQ,
    students,
    filterTipo,
    filterMoneda,
    filterBanco,
    filterCategoria,
  ]);

  const anyFilterActive = !!(
    from ||
    to ||
    searchQ.trim() ||
    filterTipo ||
    filterMoneda ||
    filterCategoria ||
    filterBanco
  );

  const exportExcel = () => {
    if (!filtered.length) {
      toast.error("No hay transacciones en el rango");
      return;
    }
    exportTransactionsExcel(filtered);
    toast.success("Excel descargado");
  };

  const eliminarRango = () => {
    if (!filtered.length) {
      toast.error("Nada que eliminar en el rango");
      return;
    }
    const label =
      from || to
        ? `entre ${from || "inicio"} y ${to || "hoy"}`
        : "TODAS las transacciones";
    if (!confirm(`¿Eliminar ${filtered.length} transacciones ${label}?`))
      return;
    const idsRemove = new Set(filtered.map((r) => r.id));
    tx.removeMany(idsRemove);
    toast.success(`${idsRemove.size} eliminadas`);
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Transacciones acumuladas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const empty: Transaction = {
                fecha: "",
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
            <Plus className="mr-1 h-4 w-4" /> Fila
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
                tx.append(mapped);
                toast.success(`${mapped.length} transacciones importadas`);
              } catch (err) {
                toast.error(`Error al leer Excel: ${(err as Error).message}`);
              }
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              document.getElementById("importExcel")?.click()
            }
          >
            <Upload className="mr-1 h-4 w-4" /> Importar Excel
          </Button>
          <Input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar en descripción…"
            className="w-48"
          />
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
              setSearchQ("");
            }}
          >
            Limpiar filtro
          </Button>
          <Button onClick={exportExcel}>
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="ghost" onClick={eliminarRango}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar rango
          </Button>
          <button
            onClick={() => setCatOpen(true)}
            className="rounded-full p-2 hover:bg-accent"
            title="Categorías"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Mostrando {filtered.length} de {tx.list.length}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">Fecha</th>
              <th className="p-2 font-medium">
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
              <th className="p-2 font-medium">
                <input
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  placeholder="Categoría…"
                  className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
                />
              </th>
              <th className="p-2 font-medium">Descripción</th>
              <th className="p-2 font-medium">Mens.</th>
              <th className="p-2 font-medium">
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
              <th className="p-2 font-medium">
                <Select
                  value={filterBanco || undefined}
                  onValueChange={(v) => setFilterBanco(v)}
                >
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
                    <SelectItem value="__sin_banco__">
                      (sin banco)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="p-2 font-medium">Monto</th>
              <th className="p-2 font-medium">Tasa</th>
              <th className="p-2 font-medium">USD</th>
              <th className="p-2 font-medium"></th>
              <th className="p-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-2">{r.fecha}</td>
                <td className="p-2 text-xs">{r.tipo}</td>
                <td className="p-2 text-xs">{r.categoria}</td>
                <td className="p-2">{r.descripcion}</td>
                <td className="p-2 text-xs">{r.mensualidad}</td>
                <td className="p-2 text-xs">{r.moneda}</td>
                <td className="p-2 text-xs text-muted-foreground">
                  {r.banco || "—"}
                </td>
                <td className="p-2 text-right tabular-nums">
                  {isNaN(Number(r.monto))
                    ? r.monto
                    : $(Number(r.monto))}
                </td>
                <td className="p-2 text-right tabular-nums text-xs">
                  {r.tasa}
                </td>
                <td className="p-2 text-right tabular-nums font-medium">
                  ${$(Number(r.montoUsd) || 0)}
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => tx.duplicateAfter(r.id)}
                      title="Duplicar fila debajo"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => tx.remove(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
                <td className="p-2">
                  {(() => {
                    const s = findStudentInDesc(r.descripcion, students);
                    if (!s)
                      return (
                        <span
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground"
                          title="No se encontró alumno en la descripción"
                        >
                          <MessageCircle className="h-4 w-4 opacity-30" />
                        </span>
                      );
                    if (!s.telefono)
                      return (
                        <button
                          onClick={() => setEditTxStudent(s)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          title="Agregar teléfono"
                        >
                          <MessageCircle className="h-4 w-4 opacity-50" />
                        </button>
                      );
                    const moneda =
                      r.moneda === "Bolívares"
                        ? "Bs"
                        : r.moneda === "Pesos"
                          ? "COP"
                          : "USD";
                    const concepto = r.mensualidad
                      ? `mensualidad de ${r.mensualidad}`
                      : r.descripcion || `pago`;
                    const msg = `¡Hola, ${s.nombre.split(" ")[0]}! Te confirmamos la recepción de tu pago por un monto de $${$(Number(r.montoUsd) || 0)} (${r.monto} ${moneda}) correspondiente a: ${concepto}. Tu cuenta se encuentra al día. ¡Gracias por formar parte de nuestra escuela!`;
                    const url = whatsappUrl(s.telefono, msg);
                    return url ? (
                      <>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => logWhatsApp(s.nombre, msg)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                          title={`Enviar WhatsApp a ${s.nombre}`}
                        >
                          <MessageCircle className="h-4 w-4 text-primary" />
                        </a>
                        <button
                          onClick={() => copyAndLog(msg, s.nombre)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          title="Copiar mensaje"
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null;
                  })()}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={12}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sin transacciones
                </td>
              </tr>
            )}
            {anyFilterActive && filtered.length > 1 && (
              <tr className="border-t-2 font-semibold bg-accent/20">
                <td className="p-2 text-xs" colSpan={7}>
                  Total ({filtered.length} filas)
                </td>
                <td className="p-2 text-right tabular-nums">
                  ${$(filtered.reduce((s, r) => s + (Number(r.monto) || 0), 0))}
                </td>
                <td className="p-2" />
                <td className="p-2 text-right tabular-nums">
                  ${$(filtered.reduce((s, r) => s + (Number(r.montoUsd) || 0), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
            <DialogTitle>Categorías</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="ing">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ing">Ingresos</TabsTrigger>
              <TabsTrigger value="gas">Gastos</TabsTrigger>
              <TabsTrigger value="bn">Bancos</TabsTrigger>
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
          setStudents(
            students.map((s) => (s.nombre === next.nombre ? next : s)),
          );
          setEditTxStudent(null);
          toast.success("Guardado");
        }}
      />
    </Card>
  );
}
