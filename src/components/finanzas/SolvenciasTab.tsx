import { useMemo, useState } from "react";
import {
  useEditableStudents,
  useBcvRates,
  useTransactions,
  useEditableAulas,
  type Student,
  type Transaction,
} from "@/lib/lists-store";
import type { AulaMeta } from "@/lib/attendance-store";
import {
  calcularCuotasDebidas,
  cuotaMensualUSD,
  currentYm,
  precioClase,
} from "@/lib/fees-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, MessageCircle, ClipboardCopy,
  Settings, Pencil, Save, X,
} from "lucide-react";
import { toast } from "sonner";

// ------------------------- Constants -------------------------

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const $ = (n: number) => n.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});

// ------------------------- Helpers -------------------------

function fechaToIso(fecha: string): string | null {
  const m = fecha.trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!m) return null;
  const dd = m[1].padStart(2,"0"); const mm = m[2].padStart(2,"0");
  let yy = m[3] ?? String(new Date().getFullYear()); if (yy.length===2) yy = "20"+yy;
  return `${yy}-${mm}-${dd}`;
}

function normalizeName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
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
  navigator.clipboard.writeText(msg).then(() => {
    logWhatsApp(alumno, msg);
    toast.success(`Mensaje copiado para ${alumno}`);
  }).catch(() => toast.error("No se pudo copiar"));
}

function findStudentInDesc(desc: string, students: Student[]): Student | null {
  const n = normalizeName(desc);
  for (const s of students) {
    const sn = normalizeName(s.nombre);
    if (n.includes(sn)) return s;
  }
  return null;
}

// ------------------------- Sub-Dialogs -------------------------

function StudentTxDialog({ student, tx, onClose }: { student: Student | null; tx: Transaction[]; onClose: () => void }) {
  const [tab, setTab] = useState<"todo"|"ingresos"|"egresos">("todo");
  const filtered = useMemo(() => {
    if (!student) return [];
    return tx.filter((r) => {
      const found = findStudentInDesc(r.descripcion, [student]);
      return found !== null;
    });
  }, [tx, student]);
  const rows = tab === "todo" ? filtered : filtered.filter((r) => r.tipo === (tab==="ingresos"?"Ingreso":"Gasto"));
  const totalUsd = rows.reduce((s, r) => s + (Number(r.montoUsd) || 0), 0);
  return (
    <Dialog open={!!student} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student?.nombre ?? ""}</DialogTitle>
          <p className="text-xs text-muted-foreground">{filtered.length} transacciones</p>
        </DialogHeader>
        <div className="mb-3 flex gap-2">
          {(["todo","ingresos","egresos"] as const).map((t) => (
            <button key={t} onClick={()=>setTab(t)}
              className={"rounded-full px-3 py-1 text-xs " + (tab===t ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {t==="todo"?"Todas":t==="ingresos"?"Solo ingresos":"Solo egresos"}
            </button>
          ))}
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground text-xs">
                <th className="p-1">Fecha</th>
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
                  <td className="p-1 text-xs">{r.categoria}</td>
                  <td className="p-1 text-xs max-w-48 truncate" title={r.descripcion}>{r.descripcion}</td>
                  <td className="p-1 text-right text-xs tabular-nums">{isNaN(Number(r.monto)) ? r.monto : $(Number(r.monto))} {r.moneda==="Bolívares"?"Bs":r.moneda==="Pesos"?"$COP":"$"}</td>
                  <td className="p-1 text-right text-xs tabular-nums">${$(Number(r.montoUsd)||0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t pt-2 text-right text-sm font-semibold">Total USD: ${$(totalUsd)}</div>
      </DialogContent>
    </Dialog>
  );
}

function StudentEditDialog({
  open, student, aulas, lastPay, onClose, onSave, onDelete,
}: {
  open: boolean; student: Student | null; aulas: string[];
  lastPay: { fecha: string; monto: number } | null;
  onClose: () => void; onSave: (s: Student) => void; onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<Student>({ nombre:"", aulas:[], actividad:"Activo", fechaIngreso:"2026-01-01" });
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setDraft(student ?? { nombre:"", aulas:[], actividad:"Activo", condicion:"Miembro", fechaIngreso:"2026-01-01" });
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);

  const toggle = (a: string) => setDraft((d) =>
    d.aulas.includes(a) ? { ...d, aulas: d.aulas.filter((x)=>x!==a) } : { ...d, aulas: [...d.aulas, a] });

  const ymNow = currentYm();
  const cuotaAplicada = cuotaMensualUSD(draft, ymNow);
  const lastYm = lastPay ? (fechaToIso(lastPay.fecha) || "").slice(0,7) : null;
  const deuda = calcularCuotasDebidas(draft, lastYm, ymNow, lastPay?.monto);
  const esPorClase = draft.condicion === "ClasePorClase";
  const precioClaseActual = precioClase(ymNow);

  const placeholderExamples = ["$20.00", "$15.00", "$13.50", "$0.00", "$25.00"];
  const placeholder = placeholderExamples[(draft.nombre.length) % placeholderExamples.length];

  return (
    <Dialog open={open} onOpenChange={(v)=> !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{student ? "Modificar integrante" : "Nuevo integrante"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nombre</label>
            <Input value={draft.nombre} onChange={(e)=>setDraft({ ...draft, nombre:e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Aulas</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {aulas.map((a) => (
                <button key={a} type="button" onClick={()=>toggle(a)}
                  className={"rounded-full border px-2.5 py-1 text-xs " +
                    (draft.aulas.includes(a) ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Condición</label>
              <Select value={draft.condicion ?? "Miembro"} onValueChange={(v)=>setDraft({ ...draft, condicion: v as Student["condicion"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Miembro">Miembro</SelectItem>
                  <SelectItem value="Probacionista">Probacionista</SelectItem>
                  <SelectItem value="ClasePorClase">Clase por clase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Actividad</label>
              <Select value={draft.actividad ?? "Activo"} onValueChange={(v)=>setDraft({ ...draft, actividad: v as Student["actividad"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Retirado">Retirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="celador" type="checkbox" checked={!!draft.celador}
              onChange={(e)=>setDraft({ ...draft, celador: e.target.checked })} />
            <label htmlFor="celador" className="text-sm">Es celador(a)</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Cuota mensual (USD)</label>
              <Input type="number" step="0.01" value={draft.cuotaOverride ?? ""}
                placeholder={`ejemplo: ${placeholder}`}
                onChange={(e)=>setDraft({ ...draft, cuotaOverride: e.target.value==="" ? undefined : Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Teléfono (WhatsApp)</label>
              <Input value={draft.telefono ?? ""} placeholder="04141234567"
                onChange={(e)=>setDraft({ ...draft, telefono: e.target.value || undefined })} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Fecha de ingreso</label>
            <Input type="date" value={draft.fechaIngreso ?? "2026-01-01"}
              onChange={(e)=>setDraft({ ...draft, fechaIngreso: e.target.value || undefined })} />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
            {esPorClase ? (
              <>
                <div>Modalidad: <span className="font-semibold">Pago por clase</span></div>
                <div>Precio referencial por clase ({MESES_ES[Number(ymNow.slice(5,7))-1]} {ymNow.slice(0,4)}): <span className="font-semibold">${$(precioClaseActual)}</span></div>
              </>
            ) : (
              <>
                <div>Cuota aplicada este mes: <span className="font-semibold">${$(cuotaAplicada)}</span></div>
                <div>Meses debidos: <span className="font-semibold">{deuda.meses}</span></div>
                <div>Deuda total: <span className="font-semibold">${$(deuda.totalUSD)}</span></div>
              </>
            )}
            {lastPay && <div>Último pago: {lastPay.fecha} (${$(lastPay.monto)})</div>}
          </div>
        </div>
        <DialogFooter>
          {onDelete && <Button variant="ghost" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4 text-destructive" /> Eliminar</Button>}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={()=>onSave(draft)} disabled={!draft.nombre.trim()}><Save className="mr-2 h-4 w-4" /> Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------- SolvenciasTab -------------------------

export default function SolvenciasTab({
  students, setStudents, aulas, setAulas, tx,
}: {
  students: Student[]; setStudents: (n: Student[]) => void;
  aulas: string[]; setAulas: (n: string[]) => void;
  tx: Transaction[];
}) {
  const [filterActividad, setFilterActividad] = useState<"Activo"|"Retirado"|"Todos">("Activo");
  const [q, setQ] = useState("");
  const [nuevaAula, setNuevaAula] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [aulasOpen, setAulasOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [viewTxStudent, setViewTxStudent] = useState<Student | null>(null);

  // último pago por alumno
  const lastPayByStudent = useMemo(() => {
    const map = new Map<string, { fecha: string; monto: number; mes?: string }>();
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      if (!["MIEMBROS","PROBAS","CLASE"].includes(t.categoria)) continue;
      const iso = fechaToIso(t.fecha); if (!iso) continue;
      const desc = normalizeName(t.descripcion);
      for (const s of students) {
        const nn = normalizeName(s.nombre);
        const first = nn.split(" ")[0]; const last = nn.split(" ").slice(-1)[0];
        if (first && last && desc.includes(first) && desc.includes(last)) {
          const prev = map.get(s.nombre);
          if (!prev || iso > (fechaToIso(prev.fecha)||"")) {
            map.set(s.nombre, { fecha: t.fecha, monto: Number(t.montoUsd) || 0, mes: t.mensualidad });
          }
        }
      }
    }
    return map;
  }, [tx, students]);

  const filteredStudents = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students
      .map((st, idx) => ({ st, idx }))
      .filter(({ st }) => {
        if (filterActividad !== "Todos" && (st.actividad ?? "Activo") !== filterActividad) return false;
        if (!s) return true;
        return st.nombre.toLowerCase().includes(s) || st.aulas.some((a)=>a.toLowerCase().includes(s));
      });
  }, [students, q, filterActividad]);

  const visibleStudents = useMemo(() => {
    // Con filtro "Todos" se ven todos; en otro caso solo los que ya tienen pagos
    if (filterActividad === "Todos" || filterActividad === "Retirado") return filteredStudents;
    return filteredStudents.filter(({ st }) => {
      if (st.condicion === "ClasePorClase") return true;
      return lastPayByStudent.has(st.nombre);
    });
  }, [filteredStudents, lastPayByStudent, filterActividad]);

  // Agrupar por aula (usa la primera aula del alumno).
  const grouped = useMemo(() => {
    const g = new Map<string, { st: Student; idx: number }[]>();
    for (const item of visibleStudents) {
      const aula = item.st.aulas[0] || "Sin aula";
      if (!g.has(aula)) g.set(aula, []);
      g.get(aula)!.push(item);
    }
    // Ordenar cada aula: celador primero, luego alfabético.
    for (const arr of g.values()) {
      arr.sort((a,b) => {
        if (!!a.st.celador !== !!b.st.celador) return a.st.celador ? -1 : 1;
        return a.st.nombre.localeCompare(b.st.nombre);
      });
    }
    return Array.from(g.entries()).sort(([,a],[,b]) => a.length - b.length);
  }, [visibleStudents]);

  const addAula = () => {
    const n = nuevaAula.trim(); if (!n) return;
    if (aulas.some((a)=>a.toLowerCase()===n.toLowerCase())) { toast.error("Ya existe"); return; }
    setAulas([...aulas, n]); setNuevaAula(""); toast.success("Aula creada");
  };
  const removeAula = (a: string) => {
    if (!confirm(`Eliminar aula "${a}"?`)) return;
    setAulas(aulas.filter((x)=>x!==a));
    setStudents(students.map((s) => ({ ...s, aulas: s.aulas.filter((x)=>x!==a) })));
  };

  const ymNow = currentYm();
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcDisp, setCalcDisp] = useState("0");
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const calcInput = (v: string) => setCalcDisp(d => d === "0" ? v : d + v);
  const calcOpPress = (op: string) => { setCalcPrev(Number(calcDisp)); setCalcOp(op); setCalcDisp("0"); };
  const calcEq = () => { if (calcOp && calcPrev !== null) { const r = calcOp === "+" ? calcPrev+Number(calcDisp) : calcOp === "-" ? calcPrev-Number(calcDisp) : calcOp === "*" ? calcPrev*Number(calcDisp) : calcPrev/Number(calcDisp); setCalcDisp(String(r)); setCalcOp(null); setCalcPrev(null); } };
  const calcClear = () => { setCalcDisp("0"); setCalcOp(null); setCalcPrev(null); };

  // Ancho uniforme de columnas entre todas las aulas (referencia: nombre más largo)
  const colWidths = useMemo(() => {
    let maxNombre = 0, maxFecha = 0, maxAbono = 0, maxMes = 0;
    for (const s of students) {
      const extras = s.celador ? 100 : 0; // espacio extra para badge "celador"
      maxNombre = Math.max(maxNombre, s.nombre.length * 8 + extras);
    }
    for (const t of tx) {
      if (t.tipo !== "Ingreso") continue;
      maxFecha = Math.max(maxFecha, t.fecha.length * 7.5);
      maxAbono = Math.max(maxAbono, String(t.montoUsd || "").length * 8);
      maxMes = Math.max(maxMes, t.mensualidad.length * 7.5);
    }
    return { nombre: 290, fecha: Math.max(maxFecha, 100), abono: Math.max(maxAbono, 70), mes: 70 };
  }, [students, tx]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Miembros y solvencia <span className="ml-2 text-sm font-normal text-muted-foreground">{students.length} participantes</span></h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterActividad} onValueChange={(v)=>setFilterActividad(v as typeof filterActividad)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activos</SelectItem>
                <SelectItem value="Retirado">Retirados</SelectItem>
                <SelectItem value="Todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar…" className="w-56" />
            <Button variant="outline" onClick={()=>setAulasOpen(true)}>Aulas ({aulas.length})</Button>
            <Button onClick={()=>setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Agregar</Button>
          </div>
        </div>
      </Card>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <span className="text-xs text-muted-foreground">{list.length} participantes</span>
          </button>
          {!isCollapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: colWidths.nombre }} />
                <col style={{ width: colWidths.fecha }} />
                <col style={{ width: colWidths.mes }} />
                <col style={{ width: colWidths.abono }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
              </colgroup>
              <thead>
                <tr className="border-b text-center text-muted-foreground text-xs">
                  <th className="p-2 font-medium text-left">Integrante</th>
                  <th className="p-2 font-medium">Último pago</th>
                  <th className="p-2 font-medium">Pagó</th>
                  <th className="p-2 font-medium">Abono</th>
                  <th className="p-2 font-medium">Estado</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ st, idx }) => {
                  const pay = lastPayByStudent.get(st.nombre);
                  const lastYm = pay ? (fechaToIso(pay.fecha) || "").slice(0,7) : null;
                  const deuda = calcularCuotasDebidas(st, lastYm, ymNow, pay?.monto);
                  const esPorClase = st.condicion === "ClasePorClase";
                  // Sin abonos aún → dejar estado en blanco hasta el primer pago.
                  const sinHistorial = !pay && !esPorClase;
                  return (
                    <tr key={idx} className="border-b last:border-0">
                      <td className={"p-2 " + (st.celador ? "font-bold" : "font-medium")}>
                        <button onClick={()=>setViewTxStudent(st)} className="text-left underline-offset-2 hover:underline" title="Ver pagos del integrante">
                          {st.nombre}
                        </button>
                        {st.celador && <span className="ml-2 rounded bg-accent px-1.5 py-px text-[10px] uppercase text-accent-foreground">celador</span>}
                      </td>
                      <td className="p-2 text-xs text-center">{pay?.fecha ?? "—"}</td>
                      <td className="p-2 text-xs text-center">{pay?.mes ? pay.mes.replace("2026","26") : "—"}</td>
                      <td className="p-2 text-center text-xs tabular-nums">{pay ? `$${$(pay.monto)}` : "—"}</td>
                      <td className="p-2 text-xs">
                        {esPorClase
                          ? <span className="rounded bg-muted px-2 py-px">Por clase</span>
                          : sinHistorial
                            ? <span className="text-muted-foreground">—</span>
                            : deuda.meses === 0
                              ? <span className="rounded bg-primary/20 px-2 py-px text-primary">Al día</span>
                              : <span className="rounded bg-destructive/20 px-2 py-px text-destructive text-xs font-bold">
                                  {deuda.meses}M
                                </span>}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {(() => {
                            const cuota = cuotaMensualUSD(st, ymNow);
                            const monto = esPorClase ? precioClase(ymNow) : deuda.totalUSD;
                            const msg = esPorClase
                              ? `Hola ${st.nombre.split(" ")[0]}, te recordamos que la clase de hoy en Nueva Acrópolis tiene un valor de $${$(precioClase(ymNow))}. ¡Te esperamos!`
                              : deuda.meses === 0
                                ? `¡Hola, ${st.nombre.split(" ")[0]}! Te confirmamos que tu cuenta se encuentra al día. Gracias por tu puntualidad y compromiso con Nueva Acrópolis. ¡Un abrazo!`
                                : `Hola ${st.nombre.split(" ")[0]}, junto con saludarte, te informamos que registramos un saldo pendiente en tu cuenta de ${deuda.meses} ${deuda.meses===1?"mensualidad":"mensualidades"} equivalentes a $${$(monto)}. Para mantener activo tu acceso a la escuela y no interrumpir tu aprendizaje, te agradecemos coordinar el pago a la brevedad. Quedamos atentos a cualquier duda o al envío de tu comprobante.`;
                            const url = whatsappUrl(st.telefono, msg);
                            return url ? (<>
                              <a href={url} target="_blank" rel="noopener noreferrer" onClick={()=>logWhatsApp(st.nombre, msg)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                                title={`Enviar WhatsApp a ${st.telefono}`}>
                                <MessageCircle className="h-4 w-4 text-primary" />
                              </a>
                              <button onClick={()=>copyAndLog(msg, st.nombre)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                                title="Copiar mensaje">
                                <ClipboardCopy className="h-3.5 w-3.5" />
                              </button>
                            </>) : (
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground opacity-30 cursor-not-allowed" title="Agrega teléfono desde editar">
                                <MessageCircle className="h-4 w-4" />
                              </span>
                            );
                          })()}
                          <Button variant="ghost" size="icon" onClick={()=>setEditIdx(idx)}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </Card>
        );
      })}
      </div>

      {!grouped.length && (
        <Card className="p-8 text-center text-muted-foreground">Sin resultados</Card>
      )}

      <StudentEditDialog
        open={editIdx !== null}
        student={editIdx != null ? students[editIdx] : null}
        aulas={aulas}
        lastPay={editIdx != null ? lastPayByStudent.get(students[editIdx].nombre) ?? null : null}
        onClose={()=>setEditIdx(null)}
        onSave={(next) => {
          if (editIdx == null) return;
          setStudents(students.map((s,i)=> i===editIdx ? next : s));
          setEditIdx(null); toast.success("Guardado");
        }}
        onDelete={() => {
          if (editIdx == null) return;
          if (!confirm(`Eliminar a ${students[editIdx].nombre}?`)) return;
          setStudents(students.filter((_,i)=> i!==editIdx));
          setEditIdx(null); toast.success("Eliminado");
        }}
      />
      <StudentEditDialog
        open={addOpen} student={null} aulas={aulas} lastPay={null}
        onClose={()=>setAddOpen(false)}
        onSave={(next) => {
          if (students.some((s)=> s.nombre.toLowerCase()===next.nombre.toLowerCase())) {
            toast.error("Ya existe"); return;
          }
          setStudents([...students, next]);
          setAddOpen(false); toast.success("Agregado");
        }}
      />

      <Dialog open={aulasOpen} onOpenChange={setAulasOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aulas / Cursos</DialogTitle></DialogHeader>
          <div className="mb-3 flex gap-2">
            <Input value={nuevaAula} onChange={(e)=>setNuevaAula(e.target.value)}
              onKeyDown={(e)=> e.key==="Enter" && addAula()} placeholder="Nueva aula…" />
            <Button onClick={addAula}><Plus className="mr-2 h-4 w-4" /> Aula</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {aulas.map((a) => (
              <span key={a} className="flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-sm">
                {a}
                <button onClick={()=>removeAula(a)} className="rounded-full p-0.5 hover:bg-destructive/20">
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </span>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <StudentTxDialog student={viewTxStudent} tx={tx} onClose={()=>setViewTxStudent(null)} />
    </div>
  );
}
