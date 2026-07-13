import { useCallback, useMemo, useState, Fragment, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Download, Settings, Save } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  type AulaMeta,
  type AttendanceRecord,
  generateFechas,
  importFromExcel,
} from "@/lib/attendance-store";

type UserPerms = {
  name: string;
  canAccessExisting: boolean;
  canAccessAsistencias: boolean;
  canAccessDiagnostico: boolean;
  canEditAnyAula: boolean;
  celadorAula?: string;
};

const isoToDisplay = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return d;
};
const isoToShort = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m.slice(2)}`;
};
const monthName = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleString("es", { month: "long" });
};

function nextMark(current: "" | "A" | "I" | "NC"): "" | "A" | "I" | "NC" {
  if (current === "") return "A";
  if (current === "A") return "I";
  if (current === "I") return "NC";
  return "";
}
function nextRef(current: "" | "E" | "NE" | "SE"): "" | "E" | "NE" | "SE" {
  if (current === "") return "E";
  if (current === "E") return "NE";
  if (current === "NE") return "SE";
  return "";
}

export default function AsistenciasTab({
  aulasMeta, setAulasMeta,
  records, setRecords,
  user,
}: {
  aulasMeta: AulaMeta[];
  setAulasMeta: Dispatch<SetStateAction<AulaMeta[]>>;
  records: AttendanceRecord[];
  setRecords: Dispatch<SetStateAction<AttendanceRecord[]>>;
  user: UserPerms;
}) {
  const [importing, setImporting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingAula, setEditingAula] = useState("");
  const [semestre, setSemestre] = useState<1 | 2>(1);

  const allowedAulas = useMemo(() => {
    if (user.canEditAnyAula) return aulasMeta.map((a) => a.nombre);
    if (user.celadorAula) return [user.celadorAula];
    return [];
  }, [user, aulasMeta]);

  const [selectedAula, setSelectedAula] = useState<string>(
    allowedAulas.length > 0 ? allowedAulas[0] : "",
  );

  const handleImport = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const result = await importFromExcel(file);
      setAulasMeta(result.aulas);
      setRecords(result.records);
      localStorage.setItem("sisfia_asist_imported", "1");
      toast.success(`Importadas ${result.aulas.length} aulas, ${result.records.length} registros`);
      if (result.aulas.length > 0) setSelectedAula(result.aulas[0].nombre);
    } catch (err) {
      toast.error("Error al importar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImporting(false);
    }
  }, [setAulasMeta, setRecords]);

  const currentAula = useMemo(
    () => aulasMeta.find((a) => a.nombre === selectedAula),
    [aulasMeta, selectedAula],
  );

  const fechas = useMemo(
    () => currentAula ? generateFechas(currentAula.diaSemana, currentAula.year) : [],
    [currentAula],
  );

  const meses = useMemo(() => {
    const m = new Set<string>();
    for (const f of fechas) m.add(f.slice(0, 7));
    return Array.from(m).sort();
  }, [fechas]);

  const fechasPorMes = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of fechas) {
      const key = f.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return map;
  }, [fechas]);

  const semestreFechas = useMemo(
    () => fechas.filter((f) => {
      const m = parseInt(f.slice(5, 7));
      return semestre === 1 ? m <= 6 : m >= 7;
    }),
    [fechas, semestre],
  );
  const semestreMeses = useMemo(() => {
    const m = new Set<string>();
    for (const f of semestreFechas) m.add(f.slice(0, 7));
    return Array.from(m).sort();
  }, [semestreFechas]);
  const semestreFechasPorMes = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of semestreFechas) {
      const key = f.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return map;
  }, [semestreFechas]);

  const fechasHoy = useMemo(
    () => {
      const h = new Date().toISOString().slice(0, 10);
      return fechas.filter((f) => f <= h);
    },
    [fechas],
  );
  const mesesHoy = useMemo(() => {
    const m = new Set<string>();
    for (const f of fechasHoy) m.add(f.slice(0, 7));
    return Array.from(m).sort();
  }, [fechasHoy]);
  const fechasPorMesHoy = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const f of fechasHoy) {
      const key = f.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return map;
  }, [fechasHoy]);

  const semestreFechasHoy = useMemo(
    () => fechasHoy.filter((f) => {
      const m = parseInt(f.slice(5, 7));
      return semestre === 1 ? m <= 6 : m >= 7;
    }),
    [fechasHoy, semestre],
  );

  const alumnos = useMemo(() => {
    if (!currentAula) return [];
    const names = new Set<string>();
    for (const r of records) if (r.aula === currentAula.nombre) names.add(r.alumno);
    return Array.from(names).sort();
  }, [currentAula, records]);

  const toggleAsistencia = useCallback((alumno: string, fecha: string) => {
    setRecords((prev: AttendanceRecord[]) => {
      const idx = prev.findIndex(
        (r) => r.aula === selectedAula && r.alumno === alumno && r.fecha === fecha && r.reflexion === "",
      );
      if (idx === -1) {
        return [...prev, { aula: selectedAula, alumno, fecha, asistencia: "A" as const, reflexion: "" as const }];
      }
      const cur = prev[idx].asistencia;
      const newVal = nextMark(cur);
      if (newVal === "") {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev.map((r, i) => i === idx ? { ...r, asistencia: newVal } : r);
    });
  }, [selectedAula]);

  const toggleReflexion = useCallback((alumno: string, fecha: string) => {
    setRecords((prev: AttendanceRecord[]) => {
      const idx = prev.findIndex(
        (r) => r.aula === selectedAula && r.alumno === alumno && r.fecha === fecha && r.reflexion !== "",
      );
      if (idx === -1) {
        return [...prev, { aula: selectedAula, alumno, fecha, asistencia: "" as const, reflexion: "E" as const }];
      }
      const cur = prev[idx].reflexion;
      const newVal = nextRef(cur);
      if (newVal === "") {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev.map((r, i) => i === idx ? { ...r, reflexion: newVal } : r);
    });
  }, [selectedAula]);

  const getAsistencia = useCallback((alumno: string, fecha: string): "" | "A" | "I" | "NC" => {
    const r = records.find(
      (rec) => rec.aula === selectedAula && rec.alumno === alumno && rec.fecha === fecha && rec.reflexion === "",
    );
    return r?.asistencia || "";
  }, [records, selectedAula]);

  const getReflexion = useCallback((alumno: string, fecha: string): "" | "E" | "NE" | "SE" => {
    const r = records.find(
      (rec) => rec.aula === selectedAula && rec.alumno === alumno && rec.fecha === fecha && rec.reflexion !== "",
    );
    return r?.reflexion || "";
  }, [records, selectedAula]);

  const openSettings = (aula: string) => { setEditingAula(aula); setSettingsOpen(true); };

  const updateTema = (aulaNombre: string, fecha: string, tema: string) => {
    setAulasMeta((prev: AulaMeta[]) => prev.map((a) => {
      if (a.nombre !== aulaNombre) return a;
      const temas = { ...a.temas };
      if (tema.trim()) temas[fecha] = tema.trim();
      else delete temas[fecha];
      return { ...a, temas };
    }));
  };

  const updateYear = (aulaNombre: string, year: number) => {
    setAulasMeta((prev: AulaMeta[]) => prev.map((a) => a.nombre === aulaNombre ? { ...a, year } : a));
  };

  const updateDiaSemana = (aulaNombre: string, dia: string) => {
    setAulasMeta((prev: AulaMeta[]) => prev.map((a) => a.nombre === aulaNombre ? { ...a, diaSemana: dia } : a));
  };

  const editingAulaMeta = useMemo(
    () => aulasMeta.find((a) => a.nombre === editingAula),
    [aulasMeta, editingAula],
  );
  const editingFechas = useMemo(
    () => editingAulaMeta ? generateFechas(editingAulaMeta.diaSemana, editingAulaMeta.year) : [],
    [editingAulaMeta],
  );

  const resolvedTemas = useMemo(() => {
    const map: Record<string, string> = {};
    let last = "";
    for (const f of editingFechas) {
      const t = editingAulaMeta?.temas[f] || "";
      if (t) last = t;
      map[f] = last;
    }
    return map;
  }, [editingFechas, editingAulaMeta?.temas]);

  const topicNumByFecha = useMemo(() => {
    const map: Record<string, number> = {};
    let count = 0;
    for (const f of fechas) {
      if (currentAula?.temas[f]) count++;
      map[f] = count || 1;
    }
    return map;
  }, [fechas, currentAula?.temas]);

  const exportAnalisis = useCallback(() => {
    if (!currentAula) return;
    const wsData: (string | number)[][] = [["Participante"]];
    for (const m of meses) {
      wsData[0].push(
        monthName(m + "-01"), `%${monthName(m + "-01")}`,
        `R-${monthName(m + "-01")}`, `%R-${monthName(m + "-01")}`,
      );
    }
    const semLabel = semestre === 1 ? "Sem 1" : "Sem 2";
    wsData[0].push(`A ${semLabel}`, `% ${semLabel}`, `R ${semLabel}`, `%R ${semLabel}`);
    wsData[0].push("A General", "% General", "R General", "%R General");

    for (const al of alumnos) {
      const row: (string | number)[] = [al];
      let totalAsist = 0, totalRef = 0;
      let semAsist = 0, semRef = 0;
      for (const m of meses) {
        const fms = fechasPorMesHoy[m] || [];
        let asis = 0;
        for (const f of fms) if (getAsistencia(al, f) === "A") asis++;
        const refs = fms.filter((f) => getReflexion(al, f) === "E").length;
        totalAsist += asis;
        totalRef += refs;
        const mNum = parseInt(m.slice(5, 7));
        if ((semestre === 1 && mNum <= 6) || (semestre === 2 && mNum >= 7)) {
          semAsist += asis;
          semRef += refs;
        }
        row.push(asis, fms.length ? +(asis / fms.length).toFixed(2) : 0, refs, fms.length ? +(refs / fms.length).toFixed(2) : 0);
      }
      const semClases = semestreFechasHoy.length;
      const totalClases = fechasHoy.length;
      row.push(semAsist, semClases ? +(semAsist / semClases).toFixed(2) : 0, semRef, semClases ? +(semRef / semClases).toFixed(2) : 0);
      row.push(totalAsist, totalClases ? +(totalAsist / totalClases).toFixed(2) : 0, totalRef, totalClases ? +(totalRef / totalClases).toFixed(2) : 0);
      wsData.push(row);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Análisis");
    XLSX.writeFile(wb, `ANALISIS_${currentAula.nombre.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Exportado");
  }, [currentAula, fechas, meses, fechasPorMesHoy, alumnos, getAsistencia, getReflexion, semestre, semestreFechasHoy, fechasHoy]);

  if (!aulasMeta.length) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Importar Asistencias</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Importa el archivo &quot;2026 Asistencia Nueva Acropolis.xlsx&quot; para comenzar.
        </p>
        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-secondary p-8 text-center transition hover:bg-accent/20">
          <input type="file" accept=".xlsx,.xls"
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={importing}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }}
          />
          <Upload className="mb-3 h-10 w-10 text-primary" />
          <h3 className="font-semibold">Seleccionar archivo Excel</h3>
          <p className="mt-1 text-xs text-muted-foreground">2026 Asistencia Nueva Acropolis.xlsx</p>
        </label>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedAula} onValueChange={setSelectedAula}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar aula" />
          </SelectTrigger>
          <SelectContent>
            {allowedAulas.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentAula && (
          <span className="text-xs text-muted-foreground">
            {currentAula.diaSemana} · {currentAula.celador} · {currentAula.condicion} · {fechas.length} clases
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => selectedAula && openSettings(selectedAula)}>
            <Settings className="h-4 w-4" />
          </Button>
          <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center">
            <input type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
            <Upload className="mr-1 h-4 w-4" />Reimportar
          </label>
        </div>
      </div>

      {currentAula && (
        <Tabs defaultValue="control">
          <TabsList>
            <TabsTrigger value="control">Control de Asistencia</TabsTrigger>
            <TabsTrigger value="analisis">Análisis por aula</TabsTrigger>
            {user.canAccessDiagnostico && (
              <TabsTrigger value="global">Diagnóstico Global</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="control">
            <Card className="p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">{currentAula.nombre}</h3>
                <div className="flex gap-2">
                  <Button variant={semestre === 1 ? "default" : "outline"} size="sm" onClick={() => setSemestre(1)}>
                    Semestre 1
                  </Button>
                  <Button variant={semestre === 2 ? "default" : "outline"} size="sm" onClick={() => setSemestre(2)}>
                    Semestre 2
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mb-3">
                <span><span className="inline-block w-4 h-4 rounded bg-green-200 text-green-800 text-center text-[10px] leading-4 font-bold mr-1">A</span> Asistió</span>
                <span><span className="inline-block w-4 h-4 rounded bg-red-200 text-red-800 text-center text-[10px] leading-4 font-bold mr-1">I</span> Injustificado</span>
                <span><span className="inline-block w-4 h-4 rounded bg-gray-200 text-gray-600 text-center text-[10px] leading-4 font-bold mr-1">NC</span> No clase</span>
                <span><span className="inline-block w-4 h-4 rounded bg-blue-200 text-blue-800 text-center text-[10px] leading-4 font-bold mr-1">E</span> Enviada</span>
                <span><span className="inline-block w-4 h-4 rounded bg-amber-200 text-amber-800 text-center text-[10px] leading-4 font-bold mr-1">NE</span> No enviada</span>
                <span><span className="inline-block w-4 h-4 rounded bg-gray-200 text-gray-600 text-center text-[10px] leading-4 font-bold mr-1">SE</span> Sin reflexión</span>
              </div>

              {semestreFechas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No hay clases en este semestre.
                </p>
              ) : (
                <table className="w-full text-xs border-collapse border-dashed border-[#bbb] table-fixed" style={{ minWidth: semestreFechas.length * 56 + 280 }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-background z-10 p-1 text-left font-medium w-[280px] border-b border-r border-dashed border-[#bbb]">Participante</th>
                      {semestreMeses.map((m) => {
                        const count = (semestreFechasPorMes[m] || []).length;
                        return (
                          <th key={m} colSpan={count * 2}
                            className="p-1 text-center text-[11px] font-bold bg-muted/30 border-l border-t border-b border-dashed border-[#bbb]">
                            {monthName(m + "-01").charAt(0).toUpperCase() + monthName(m + "-01").slice(1)}
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      <th className="sticky left-0 bg-background z-10 border-b border-r border-dashed border-[#bbb]"></th>
                      {semestreFechas.map((f) => (
                        <Fragment key={f}>
                          <th className="p-0 text-center align-top border-l border-b border-dashed border-[#bbb] w-[28px]">
                            <div className="text-[10px] font-bold text-foreground leading-tight">{isoToDisplay(f)}</div>
                            <div className="text-[10px]">&nbsp;</div>
                            <div className="text-[7px] font-bold text-foreground">A</div>
                          </th>
                          <th className="p-0 text-center align-top border-b border-dashed border-[#bbb] w-[28px]">
                            <div className="text-[10px] font-bold text-foreground leading-tight">#{topicNumByFecha[f]}</div>
                            <div className="text-[10px]">&nbsp;</div>
                            <div className="text-[7px] font-bold text-foreground">R</div>
                          </th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alumnos.map((al) => (
                      <tr key={al} className="hover:bg-muted/20">
                        <td className="sticky left-0 bg-background z-10 p-1 text-xs font-medium truncate max-w-[280px] border-b border-r border-dashed border-[#bbb]" title={al}>
                          {al}
                        </td>
                        {semestreFechas.map((f) => {
                          const asis = getAsistencia(al, f);
                          const ref = getReflexion(al, f);
                          const asisClass = asis === "A" ? "bg-green-100 text-green-800"
                            : asis === "I" ? "bg-red-100 text-red-800"
                            : asis === "NC" ? "bg-gray-200 text-gray-600"
                            : "text-muted-foreground/20";
                          const refClass = ref === "E" ? "bg-blue-100 text-blue-800"
                            : ref === "NE" ? "bg-amber-100 text-amber-800"
                            : ref === "SE" ? "bg-gray-200 text-gray-600"
                            : "text-muted-foreground/20";
                          return (
                            <Fragment key={f}>
                              <td className="p-0 border-l border-b border-dashed border-[#bbb] w-[28px]">
                                <button className={`w-full h-6 text-[9px] font-bold cursor-pointer transition ${asisClass} hover:ring-1 hover:ring-primary/40`}
                                  onClick={() => toggleAsistencia(al, f)}>{asis}</button>
                              </td>
                              <td className="p-0 border-b border-dashed border-[#bbb] w-[28px]">
                                <button className={`w-full h-6 text-[9px] font-bold cursor-pointer transition ${refClass} hover:ring-1 hover:ring-primary/40`}
                                  onClick={() => toggleReflexion(al, f)}>{ref}</button>
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Temas con conteo */}
              {(() => {
                let counter = 0;
                const all: { fecha: string; tema: string; idx: number }[] = [];
                for (const f of fechas) {
                  const t = currentAula?.temas[f];
                  if (t) { counter++; all.push({ fecha: f, tema: t, idx: counter }); }
                }
                if (!all.length) return null;
                return (
                  <div className="mt-4 text-[11px] space-y-0.5">
                    {all.map((r) => {
                      const enviadas = alumnos.filter((al) => getReflexion(al, r.fecha) === "E").length;
                      return (
                        <div key={r.fecha} className="flex items-baseline gap-2">
                          <span className="font-medium text-muted-foreground shrink-0">Tema #{r.idx}</span>
                          <span className="text-foreground truncate">{r.tema}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">({enviadas}/{alumnos.length})</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
          </TabsContent>

          <TabsContent value="analisis">
            <Card className="p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Análisis — {currentAula?.nombre}</h3>
                <Button variant="outline" size="sm" onClick={exportAnalisis}>
                  <Download className="mr-2 h-4 w-4" />Exportar
                </Button>
              </div>

              {fechas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No hay clases configuradas para este año.
                </p>
              ) : (
                <>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="sticky left-0 bg-background z-10 p-1 text-left font-medium min-w-[160px]">Participante</th>
                        {meses.map((m) => (
                          <th key={m} colSpan={4} className="p-1 text-center font-medium text-[10px] border-l">
                            {monthName(m + "-01").charAt(0).toUpperCase() + monthName(m + "-01").slice(1)}
                          </th>
                        ))}
                        <th colSpan={4} className="p-1 text-center font-medium text-[10px] border-l">Total {semestre === 1 ? "Sem 1" : "Sem 2"}</th>
                        <th colSpan={4} className="p-1 text-center font-medium text-[10px] border-l">Total General</th>
                      </tr>
                      <tr className="border-b text-muted-foreground text-[10px]">
                        <th></th>
                        {meses.flatMap(() => ["A", "%", "R", "%"]).map((h, i) => (
                          <th key={i} className="p-1 text-center font-normal border-l">{h}</th>
                        ))}
                        {["A", "%", "R", "%"].map((h, i) => (
                          <th key={`t-${i}`} className="p-1 text-center font-normal border-l">{h}</th>
                        ))}
                        {["A", "%", "R", "%"].map((h, i) => (
                          <th key={`g-${i}`} className="p-1 text-center font-normal border-l">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alumnos.map((al) => {
                        let totalAsist = 0, totalRef = 0;
                        let semAsist = 0, semRef = 0;
                        return (
                          <tr key={al} className="border-b border-muted/30 hover:bg-muted/20">
                            <td className="sticky left-0 bg-background z-10 p-1 text-xs truncate max-w-[160px]" title={al}>{al}</td>
                            {meses.flatMap((m) => {
                              const fms = fechasPorMesHoy[m] || [];
                              let asis = 0;
                              for (const f of fms) if (getAsistencia(al, f) === "A") asis++;
                              const refs = fms.filter((f) => getReflexion(al, f) === "E").length;
                              totalAsist += asis;
                              totalRef += refs;
                              const mNum = parseInt(m.slice(5, 7));
                              if ((semestre === 1 && mNum <= 6) || (semestre === 2 && mNum >= 7)) {
                                semAsist += asis;
                                semRef += refs;
                              }
                              const apct = fms.length ? +(asis / fms.length * 100).toFixed(0) : 0;
                              const rpct = fms.length ? +(refs / fms.length * 100).toFixed(0) : 0;
                              return [
                                <td key={`${m}-a`} className={`p-1 text-center border-l ${asis === 0 ? "text-muted-foreground/20" : ""}`}>{asis}</td>,
                                <td key={`${m}-ap`} className={`p-1 text-center ${apct === 0 ? "text-muted-foreground/20" : ""}`}>{apct}%</td>,
                                <td key={`${m}-r`} className={`p-1 text-center border-l ${refs === 0 ? "text-muted-foreground/20" : ""}`}>{refs}</td>,
                                <td key={`${m}-rp`} className={`p-1 text-center ${rpct === 0 ? "text-muted-foreground/20" : ""}`}>{rpct}%</td>,
                              ];
                            })}
                            {/* Total del semestre */}
                            <td className={`p-1 text-center font-bold border-l ${semAsist === 0 ? "text-muted-foreground/20" : ""}`}>{semAsist}</td>
                            <td className={`p-1 text-center font-bold ${semAsist === 0 || semestreFechasHoy.length === 0 ? "text-muted-foreground/20" : (semAsist / semestreFechasHoy.length) < 0.5 ? "text-destructive" : (semAsist / semestreFechasHoy.length) < 0.75 ? "" : "text-green-600"}`}>
                              {semestreFechasHoy.length ? +(semAsist / semestreFechasHoy.length * 100).toFixed(0) : 0}%
                            </td>
                            <td className={`p-1 text-center font-bold border-l ${semRef === 0 ? "text-muted-foreground/20" : ""}`}>{semRef}</td>
                            <td className={`p-1 text-center font-bold ${semRef === 0 || semestreFechasHoy.length === 0 ? "text-muted-foreground/20" : (semRef / semestreFechasHoy.length) < 0.5 ? "text-destructive" : (semRef / semestreFechasHoy.length) < 0.75 ? "" : "text-green-600"}`}>
                              {semestreFechasHoy.length ? +(semRef / semestreFechasHoy.length * 100).toFixed(0) : 0}%
                            </td>
                            {/* Total general */}
                            <td className={`p-1 text-center font-bold border-l ${totalAsist === 0 ? "text-muted-foreground/20" : ""}`}>{totalAsist}</td>
                            <td className={`p-1 text-center font-bold ${totalAsist === 0 || fechasHoy.length === 0 ? "text-muted-foreground/20" : (totalAsist / fechasHoy.length) < 0.5 ? "text-destructive" : (totalAsist / fechasHoy.length) < 0.75 ? "" : "text-green-600"}`}>
                              {fechasHoy.length ? +(totalAsist / fechasHoy.length * 100).toFixed(0) : 0}%
                            </td>
                            <td className={`p-1 text-center font-bold border-l ${totalRef === 0 ? "text-muted-foreground/20" : ""}`}>{totalRef}</td>
                            <td className={`p-1 text-center font-bold ${totalRef === 0 || fechasHoy.length === 0 ? "text-muted-foreground/20" : (totalRef / fechasHoy.length) < 0.5 ? "text-destructive" : (totalRef / fechasHoy.length) < 0.75 ? "" : "text-green-600"}`}>
                              {fechasHoy.length ? +(totalRef / fechasHoy.length * 100).toFixed(0) : 0}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Totales: <span className="text-destructive font-bold">rojo</span> &lt; 50%, <span className="text-green-600 font-bold">verde</span> &ge; 75%
                  </p>
                </>
              )}
            </Card>
          </TabsContent>

          {user.canAccessDiagnostico && (
            <TabsContent value="global">
              <Card className="p-4">
                <h3 className="font-bold text-sm mb-3">Diagnóstico Global</h3>
                <DiagnosticoGlobal
                  aulasMeta={aulasMeta}
                  records={records}
                />
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración — {editingAulaMeta?.nombre}</DialogTitle>
          </DialogHeader>
          {editingAulaMeta && (
    <div className="space-y-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Celador</label>
                  <p className="font-medium">{editingAulaMeta.celador}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Condición</label>
                  <p className="font-medium">{editingAulaMeta.condicion}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Día de la semana</label>
                  <Select value={editingAulaMeta.diaSemana}
                    onValueChange={(v) => updateDiaSemana(editingAulaMeta.nombre, v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Año</label>
                  <Input type="number" value={editingAulaMeta.year}
                    onChange={(e) => updateYear(editingAulaMeta.nombre, parseInt(e.target.value) || 2026)} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">
                    Temas de las clases ({editingFechas.length} sesiones)
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    &nbsp;
                  </span>
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {editingFechas.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{isoToShort(f)}</span>
                      <Input
                        value={resolvedTemas[f]}
                        onChange={(e) => updateTema(editingAulaMeta.nombre, f, e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <strong>Nota:</strong> Al cambiar el día o el año se regeneran las fechas. Las marcas previas se conservan si las fechas siguen existiendo.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>
              <Save className="mr-2 h-4 w-4" />Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiagnosticoGlobal({
  aulasMeta, records,
}: {
  aulasMeta: AulaMeta[];
  records: AttendanceRecord[];
}) {
  const today = typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "2026-12-31";
  const cards = useMemo(() => {
    return aulasMeta.map((aula) => {
      const todas = generateFechas(aula.diaSemana, aula.year);
      const fechas = todas.filter((f) => f <= today);
      const nombres = new Set<string>();
      for (const r of records) if (r.aula === aula.nombre) nombres.add(r.alumno);
      const alumnos = Array.from(nombres).sort();
      const totalClases = fechas.length;
      let totalAsist = 0, totalRef = 0;
      for (const al of alumnos) {
        for (const f of fechas) {
          for (const r of records) {
            if (r.aula !== aula.nombre || r.alumno !== al || r.fecha !== f) continue;
            if (r.asistencia === "A") totalAsist++;
            if (r.reflexion === "E") totalRef++;
          }
        }
      }
      const totalPosible = alumnos.length * totalClases;
      const pctAsist = totalPosible ? +(totalAsist / totalPosible * 100).toFixed(1) : 0;
      const pctRef = totalPosible ? +(totalRef / totalPosible * 100).toFixed(1) : 0;
      let bestA = { nombre: "", val: 0 };
      let bestR = { nombre: "", val: 0 };
      for (const al of alumnos) {
        let ca = 0, cr = 0;
        for (const f of fechas) {
          for (const r of records) {
            if (r.aula !== aula.nombre || r.alumno !== al || r.fecha !== f) continue;
            if (r.asistencia === "A") ca++;
            if (r.reflexion === "E") cr++;
          }
        }
        if (ca > bestA.val) bestA = { nombre: al, val: ca };
        if (cr > bestR.val) bestR = { nombre: al, val: cr };
      }
      const planificadas = todas.length;
      return { nombre: aula.nombre, alumnos: alumnos.length, totalClases, planificadas, totalAsist, totalRef, pctAsist, pctRef, bestA, bestR };
    });
  }, [aulasMeta, records, today]);

  return (
    <div className="space-y-4">
      {cards.map((c) => {
        return (
          <div key={c.nombre} className="grid grid-cols-5 gap-1.5 text-[10px]">
            <div className="rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 p-1.5 text-center flex flex-col justify-center">
              <div className="text-[9px] text-slate-600 font-medium leading-tight">Aula</div>
              <div className="text-[11px] font-bold text-slate-800 leading-tight break-words">{c.nombre}</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-1.5 text-center">
              <div className="text-[9px] text-blue-600 font-medium">Participantes</div>
              <div className="text-sm font-bold text-blue-700">{c.alumnos}</div>
              <div className="text-[8px] text-blue-500/70">{c.totalClases}/{c.planificadas} clases</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-1.5 text-center">
              <div className="text-[9px] text-green-600 font-medium">Asistencia</div>
              <div className="text-sm font-bold text-green-700">{c.pctAsist}%</div>
              <div className="text-[8px] text-green-500/70">{c.totalAsist}/{c.alumnos * c.totalClases}</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 p-1.5 text-center">
              <div className="text-[9px] text-indigo-600 font-medium">Reflexiones</div>
              <div className="text-sm font-bold text-indigo-700">{c.pctRef}%</div>
              <div className="text-[8px] text-indigo-500/70">{c.totalRef}/{c.alumnos * c.totalClases}</div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-1.5 text-center flex flex-col justify-center">
              <div className="text-[9px] text-purple-600 font-medium">Destacados</div>
              <div className="text-[9px] font-bold text-purple-700 leading-tight truncate" title={`Asistencia: ${c.bestA.nombre} (${c.bestA.val}/${c.totalClases})`}>A: {c.bestA.nombre}</div>
              <div className="text-[9px] font-bold text-purple-700 leading-tight truncate" title={`Reflexiones: ${c.bestR.nombre} (${c.bestR.val}/${c.totalClases})`}>R: {c.bestR.nombre}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
