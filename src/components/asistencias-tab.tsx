import {
  useCallback,
  useMemo,
  useState,
  Fragment,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Download, Plus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  type AulaMeta,
  type AttendanceRecord,
  type ReflexionMeta,
  type ReflexionAsistencia,
  generateFechas,
  importFromExcel,
  useReflexionesMeta,
  useReflexionAsistencia,
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
const MES_CORTO = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
/** "2026-01-13" → "13-ene". El mes en letra evita confundir día con mes. */
const isoToDiaMes = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}-${MES_CORTO[Number(m) - 1] ?? m}`;
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
/**
 * El importador guarda el título como "Reflexión 3: SETH - NEFTIS". La tabla
 * muestra el número y el tema en columnas separadas, así que aquí se separa.
 * Devuelve cadena vacía cuando el tema todavía no tiene nombre.
 */
function temaDeTitulo(titulo: string): string {
  const conTema = titulo.match(/^\s*Reflexi[óo]n\s+\d+\s*:\s*(.+)$/i);
  if (conTema) return conTema[1].trim();
  if (/^\s*Reflexi[óo]n\s+\d+\s*$/i.test(titulo)) return "";
  return titulo.trim();
}

function nextRef(current: "" | "E" | "NE" | "SE"): "" | "E" | "NE" | "SE" {
  if (current === "") return "E";
  if (current === "E") return "NE";
  if (current === "NE") return "SE";
  return "";
}

export default function AsistenciasTab({
  aulasMeta,
  setAulasMeta,
  records,
  setRecords,
  user,
}: {
  aulasMeta: AulaMeta[];
  setAulasMeta: Dispatch<SetStateAction<AulaMeta[]>>;
  records: AttendanceRecord[];
  setRecords: Dispatch<SetStateAction<AttendanceRecord[]>>;
  user: UserPerms;
}) {
  const [importing, setImporting] = useState(false);
  const [semestre, setSemestre] = useState<1 | 2>(1);

  const [reflexionesMeta, setReflexionesMeta] = useReflexionesMeta();
  const [reflexionAsistencia, setReflexionAsistencia] = useReflexionAsistencia();
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [refTitulo, setRefTitulo] = useState("");
  const [refFecha, setRefFecha] = useState(new Date().toISOString().slice(0, 10));
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  // Edición del tema dentro de la propia tabla, sin abrir diálogo.
  const [inlineRefId, setInlineRefId] = useState<string | null>(null);
  const [inlineRefVal, setInlineRefVal] = useState("");

  const allowedAulas = useMemo(() => {
    if (user.canEditAnyAula) return aulasMeta.map((a) => a.nombre);
    if (user.celadorAula) return [user.celadorAula];
    return [];
  }, [user, aulasMeta]);

  const [selectedAula, setSelectedAula] = useState<string>(
    allowedAulas.length > 0 ? allowedAulas[0] : "",
  );

  const handleImport = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const result = await importFromExcel(file);
        setAulasMeta(result.aulas);
        setRecords(result.records);
        setReflexionesMeta(result.reflexionesMeta);
        setReflexionAsistencia(result.reflexionAsistencia);
        localStorage.setItem("sisfia_asist_imported", "1");
        toast.success(
          `Importadas ${result.aulas.length} aulas, ${result.records.length} registros, ${result.reflexionesMeta.length} reflexiones`,
        );
        if (result.aulas.length > 0) setSelectedAula(result.aulas[0].nombre);
      } catch (err) {
        toast.error("Error al importar: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setImporting(false);
      }
    },
    [setAulasMeta, setRecords, setReflexionesMeta, setReflexionAsistencia],
  );

  const currentAula = useMemo(
    () => aulasMeta.find((a) => a.nombre === selectedAula),
    [aulasMeta, selectedAula],
  );

  const fechas = useMemo(
    () => (currentAula ? generateFechas(currentAula.diaSemana, currentAula.year) : []),
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
    () =>
      fechas.filter((f) => {
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

  const fechasHoy = useMemo(() => {
    const h = new Date().toISOString().slice(0, 10);
    return fechas.filter((f) => f <= h);
  }, [fechas]);
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
    () =>
      fechasHoy.filter((f) => {
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

  const aulaReflexiones = useMemo(
    () =>
      reflexionesMeta
        .filter((r) => r.aula === selectedAula)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [reflexionesMeta, selectedAula],
  );

  /**
   * Reflexiones del aula agrupadas por mes, solo hasta hoy.
   *
   * El análisis contaba las reflexiones con getReflexion(alumno, fecha), que
   * lee records[].reflexion — un campo que el importador de Excel deja
   * siempre vacío, porque las entregas las guarda en reflexionAsistencia.
   * Resultado: las reflexiones se cargaban y se veían en su pestaña, pero en
   * el análisis por aula todas las columnas "R" salían en cero.
   *
   * Además el porcentaje se dividía entre el número de CLASES del mes. Las
   * reflexiones son por tema (17 al año, no 52), así que aunque se hubieran
   * contado bien el porcentaje nunca habría podido pasar de ~33%.
   */
  const reflexionesHoy = useMemo(() => {
    const h = new Date().toISOString().slice(0, 10);
    return aulaReflexiones.filter((r) => !r.fecha || r.fecha <= h);
  }, [aulaReflexiones]);

  const reflexionesPorMes = useMemo(() => {
    const map: Record<string, ReflexionMeta[]> = {};
    for (const r of reflexionesHoy) {
      if (!r.fecha) continue;
      const key = r.fecha.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [reflexionesHoy]);

  /**
   * Reflexiones del semestre que se está viendo.
   *
   * La cuadrícula mostraba SIEMPRE las 17 reflexiones del año, también al
   * pasar al segundo semestre: quedaban columnas de temas de enero junto a
   * clases de agosto, todas llenas, y no se entendía a qué correspondían.
   * Se dividen igual que las clases: enero-junio y julio-diciembre.
   */
  const semestreReflexiones = useMemo(
    () =>
      aulaReflexiones.filter((r) => {
        if (!r.fecha) return true;
        const m = parseInt(r.fecha.slice(5, 7));
        return semestre === 1 ? m <= 6 : m >= 7;
      }),
    [aulaReflexiones, semestre],
  );

  /**
   * Numeración por TEMA, no por reflexión.
   *
   * Un tema puede tener más de una reflexión (dos semanas, dos entregas). Si
   * se numeran de corrido, el mismo tema aparece como "#12" y "#13" y parece
   * que fueran dos temas distintos. Aquí cada reflexión sabe a qué número de
   * tema pertenece y si es la 1ª o la 2ª de ese tema.
   */
  const infoPorReflexion = useMemo(() => {
    const porTema = new Map<string, ReflexionMeta[]>();
    for (const r of aulaReflexiones) {
      const clave = r.temaFecha || r.fecha || r.id;
      const arr = porTema.get(clave);
      if (arr) arr.push(r);
      else porTema.set(clave, [r]);
    }
    const map: Record<string, { tema: number; orden: number; total: number }> = {};
    let n = 0;
    for (const arr of porTema.values()) {
      n++;
      arr.forEach((r, i) => {
        map[r.id] = { tema: n, orden: i + 1, total: arr.length };
      });
    }
    return map;
  }, [aulaReflexiones]);

  /** Añade otra reflexión al mismo tema (el caso de "este tema llevó dos"). */
  const agregarReflexionAlTema = useCallback(
    (ref: ReflexionMeta) => {
      setReflexionesMeta((prev) => {
        const idx = prev.findIndex((r) => r.id === ref.id);
        const nueva: ReflexionMeta = {
          id: `${ref.id}_x${Date.now().toString(36)}`,
          aula: ref.aula,
          year: ref.year,
          titulo: ref.titulo,
          fecha: ref.fecha,
          temaFecha: ref.temaFecha ?? ref.fecha,
        };
        const next = [...prev];
        next.splice(idx === -1 ? prev.length : idx + 1, 0, nueva);
        return next;
      });
      toast.success("Se agregó otra reflexión a este tema");
    },
    [setReflexionesMeta],
  );

  /** Quita una reflexión y, con ella, las entregas que tuviera registradas. */
  const eliminarReflexion = useCallback(
    (ref: ReflexionMeta) => {
      const entregas = reflexionAsistencia.filter((r) => r.reflexionId === ref.id).length;
      if (
        !confirm(
          `¿Eliminar esta reflexión del tema?` +
            (entregas > 0 ? `\n\nSe borran también ${entregas} entrega(s) ya registradas.` : ""),
        )
      )
        return;
      setReflexionesMeta((prev) => prev.filter((r) => r.id !== ref.id));
      setReflexionAsistencia((prev) => prev.filter((r) => r.reflexionId !== ref.id));
      toast.success("Reflexión eliminada");
    },
    [reflexionAsistencia, setReflexionesMeta, setReflexionAsistencia],
  );

  const reflectionGroups = useMemo(() => {
    const groups: { isGroup: boolean; refs: typeof semestreReflexiones; title: string }[] = [];
    let i = 0;
    while (i < semestreReflexiones.length) {
      const ref = semestreReflexiones[i];
      if (ref.temaFecha) {
        const group = [ref];
        i++;
        while (
          i < semestreReflexiones.length &&
          semestreReflexiones[i].temaFecha === ref.temaFecha
        ) {
          group.push(semestreReflexiones[i]);
          i++;
        }
        const temaTitle = currentAula?.temas[ref.temaFecha] || ref.titulo;
        groups.push({ isGroup: group.length > 1, refs: group, title: temaTitle });
      } else {
        groups.push({ isGroup: false, refs: [ref], title: ref.titulo });
        i++;
      }
    }
    return groups;
  }, [semestreReflexiones, currentAula?.temas]);

  const toggleAsistencia = useCallback(
    (alumno: string, fecha: string) => {
      // Se lee de records y no de getAsistencia porque ese helper se define
      // más abajo: usarlo aquí lo metería en el array de dependencias, que sí
      // se evalúa durante el render, y reventaría por acceso anticipado.
      const marcaDe = (a: string, f: string) =>
        records.find(
          (r) => r.aula === selectedAula && r.alumno === a && r.fecha === f && r.reflexion === "",
        )?.asistencia || "";

      const actual = marcaDe(alumno, fecha);
      const siguiente = nextMark(actual);

      // "No clase" es una propiedad del DÍA, no de cada alumno: si no hubo
      // clase, no la hubo para nadie. Marcarla en una celda la aplica a toda
      // la columna y quitarla la quita de toda la columna. Antes el celador
      // tenía que dar tres clics por alumno para registrar un feriado.
      if (siguiente === "NC" || actual === "NC") {
        const poner = siguiente === "NC";
        if (poner) {
          const conMarca = alumnos.filter((a) => {
            const m = marcaDe(a, fecha);
            return m === "A" || m === "I";
          }).length;
          if (
            conMarca > 0 &&
            !confirm(
              `Se va a marcar "no hubo clase" el ${isoToDiaMes(fecha)} para toda el aula.\n\n` +
                `Eso borra ${conMarca} marca(s) de asistencia ya registradas de ese día.\n\n¿Continuar?`,
            )
          )
            return;
        }
        setRecords((prev: AttendanceRecord[]) => {
          const otros = prev.filter(
            (r) => !(r.aula === selectedAula && r.fecha === fecha && r.reflexion === ""),
          );
          if (!poner) return otros;
          return [
            ...otros,
            ...alumnos.map((a) => ({
              aula: selectedAula,
              alumno: a,
              fecha,
              asistencia: "NC" as const,
              reflexion: "" as const,
            })),
          ];
        });
        return;
      }

      setRecords((prev: AttendanceRecord[]) => {
        const idx = prev.findIndex(
          (r) =>
            r.aula === selectedAula &&
            r.alumno === alumno &&
            r.fecha === fecha &&
            r.reflexion === "",
        );
        if (idx === -1) {
          return [
            ...prev,
            { aula: selectedAula, alumno, fecha, asistencia: "A" as const, reflexion: "" as const },
          ];
        }
        if (siguiente === "") {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev.map((r, i) => (i === idx ? { ...r, asistencia: siguiente } : r));
      });
    },
    [selectedAula, alumnos, records, setRecords],
  );

  const toggleReflexion = useCallback(
    (alumno: string, fecha: string) => {
      setRecords((prev: AttendanceRecord[]) => {
        const idx = prev.findIndex(
          (r) =>
            r.aula === selectedAula &&
            r.alumno === alumno &&
            r.fecha === fecha &&
            r.reflexion !== "",
        );
        if (idx === -1) {
          return [
            ...prev,
            { aula: selectedAula, alumno, fecha, asistencia: "" as const, reflexion: "E" as const },
          ];
        }
        const cur = prev[idx].reflexion;
        const newVal = nextRef(cur);
        if (newVal === "") {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev.map((r, i) => (i === idx ? { ...r, reflexion: newVal } : r));
      });
    },
    [selectedAula],
  );

  const getAsistencia = useCallback(
    (alumno: string, fecha: string): "" | "A" | "I" | "NC" => {
      const r = records.find(
        (rec) =>
          rec.aula === selectedAula &&
          rec.alumno === alumno &&
          rec.fecha === fecha &&
          rec.reflexion === "",
      );
      return r?.asistencia || "";
    },
    [records, selectedAula],
  );

  const getReflexion = useCallback(
    (alumno: string, fecha: string): "" | "E" | "NE" | "SE" => {
      const r = records.find(
        (rec) =>
          rec.aula === selectedAula &&
          rec.alumno === alumno &&
          rec.fecha === fecha &&
          rec.reflexion !== "",
      );
      return r?.reflexion || "";
    },
    [records, selectedAula],
  );

  function nextRefEstado(current: "" | "E" | "NE"): "" | "E" | "NE" {
    if (current === "") return "E";
    if (current === "E") return "NE";
    return "";
  }

  const getRefEstado = useCallback(
    (alumno: string, reflexionId: string): "" | "E" | "NE" => {
      const r = reflexionAsistencia.find(
        (rec) =>
          rec.aula === selectedAula && rec.alumno === alumno && rec.reflexionId === reflexionId,
      );
      return r?.estado || "";
    },
    [reflexionAsistencia, selectedAula],
  );

  const toggleRefEstado = useCallback(
    (alumno: string, reflexionId: string) => {
      setReflexionAsistencia((prev) => {
        const idx = prev.findIndex(
          (r) => r.aula === selectedAula && r.alumno === alumno && r.reflexionId === reflexionId,
        );
        const cur = idx === -1 ? "" : prev[idx].estado;
        const newVal = nextRefEstado(cur);
        if (newVal === "") {
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        if (idx === -1) {
          return [
            ...prev,
            { aula: selectedAula, alumno, reflexionId, estado: newVal as "E" | "NE" },
          ];
        }
        return prev.map((r, i) => (i === idx ? { ...r, estado: newVal } : r));
      });
    },
    [selectedAula],
  );

  const saveReflexion = useCallback(() => {
    if (!refTitulo.trim()) {
      toast.error("Escribe un título");
      return;
    }
    if (editingRefId) {
      setReflexionesMeta((prev) =>
        prev.map((r) =>
          r.id === editingRefId ? { ...r, titulo: refTitulo.trim(), fecha: refFecha } : r,
        ),
      );
      toast.success("Reflexión actualizada");
    } else {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setReflexionesMeta((prev) => [
        ...prev,
        {
          id,
          aula: selectedAula,
          year: currentAula?.year ?? 2026,
          titulo: refTitulo.trim(),
          fecha: refFecha,
        },
      ]);
      toast.success("Reflexión agregada");
    }
    setRefTitulo("");
    setRefFecha(new Date().toISOString().slice(0, 10));
    setEditingRefId(null);
    setRefDialogOpen(false);
  }, [refTitulo, refFecha, editingRefId, selectedAula, currentAula]);

  const openRefDialog = useCallback((ref?: ReflexionMeta) => {
    if (ref) {
      setRefTitulo(ref.titulo);
      setRefFecha(ref.fecha);
      setEditingRefId(ref.id);
    } else {
      setRefTitulo("");
      setRefFecha(new Date().toISOString().slice(0, 10));
      setEditingRefId(null);
    }
    setRefDialogOpen(true);
  }, []);

  const updateTema = (aulaNombre: string, fecha: string, tema: string) => {
    setAulasMeta((prev: AulaMeta[]) =>
      prev.map((a) => {
        if (a.nombre !== aulaNombre) return a;
        const temas = { ...a.temas };
        if (tema.trim()) temas[fecha] = tema.trim();
        else delete temas[fecha];
        return { ...a, temas };
      }),
    );
  };

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
        monthName(m + "-01"),
        `%${monthName(m + "-01")}`,
        `R-${monthName(m + "-01")}`,
        `%R-${monthName(m + "-01")}`,
      );
    }
    wsData[0].push("A General", "% General", "R General", "%R General");

    for (const al of alumnos) {
      const row: (string | number)[] = [al];
      let totalAsist = 0,
        totalRef = 0;
      for (const m of meses) {
        const fms = fechasPorMesHoy[m] || [];
        let asis = 0;
        for (const f of fms) if (getAsistencia(al, f) === "A") asis++;
        const rms = reflexionesPorMes[m] || [];
        const refs = rms.filter((r) => getRefEstado(al, r.id) === "E").length;
        totalAsist += asis;
        totalRef += refs;
        row.push(
          asis,
          fms.length ? +(asis / fms.length).toFixed(2) : 0,
          refs,
          rms.length ? +(refs / rms.length).toFixed(2) : 0,
        );
      }
      const totalClases = fechasHoy.length;
      const totalReflexiones = reflexionesHoy.length;
      row.push(
        totalAsist,
        totalClases ? +(totalAsist / totalClases).toFixed(2) : 0,
        totalRef,
        totalReflexiones ? +(totalRef / totalReflexiones).toFixed(2) : 0,
      );
      wsData.push(row);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "Análisis");
    XLSX.writeFile(wb, `ANALISIS_${currentAula.nombre.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Exportado");
  }, [
    currentAula,
    fechas,
    meses,
    fechasPorMesHoy,
    alumnos,
    getAsistencia,
    getRefEstado,
    reflexionesPorMes,
    reflexionesHoy,
    semestre,
    semestreFechasHoy,
    fechasHoy,
  ]);

  if (!aulasMeta.length) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Importar Asistencias</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Importa el archivo &quot;2026 Asistencia Nueva Acropolis.xlsx&quot; para comenzar.
        </p>
        <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-secondary p-8 text-center transition hover:bg-accent/20">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
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
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentAula && (
          <span className="text-xs text-muted-foreground">
            {currentAula.diaSemana} · {currentAula.celador} · {currentAula.condicion} ·{" "}
            {fechas.length} clases
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openRefDialog()}>
            <Plus className="mr-1 h-4 w-4" />
            Reflexión
          </Button>
          <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
            <Upload className="mr-1 h-4 w-4" />
            Reimportar
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
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-bold">{currentAula.nombre}</h3>
                <div className="flex gap-1">
                  <Button
                    variant={semestre === 1 ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setSemestre(1)}
                  >
                    Semestre 1
                  </Button>
                  <Button
                    variant={semestre === 2 ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setSemestre(2)}
                  >
                    Semestre 2
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {semestre === 1 ? "enero a junio" : "julio a diciembre"} · {semestreFechas.length}{" "}
                  clases · {semestreReflexiones.length} reflexiones
                </span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mb-3">
                <span>
                  <span className="inline-block w-4 h-4 rounded bg-green-200 text-green-800 text-center text-[10px] leading-4 font-bold mr-1">
                    A
                  </span>{" "}
                  Asistente
                </span>
                <span>
                  <span className="inline-block w-4 h-4 rounded bg-red-200 text-red-800 text-center text-[10px] leading-4 font-bold mr-1">
                    I
                  </span>{" "}
                  Inasistente
                </span>
                <span>
                  <span className="inline-block w-4 h-4 rounded bg-gray-200 text-gray-600 text-center text-[10px] leading-4 font-bold mr-1">
                    NC
                  </span>{" "}
                  No clase
                </span>
                <span>
                  <span className="inline-block w-4 h-4 rounded bg-orange-200 text-orange-900 text-center text-[10px] leading-4 font-bold mr-1">
                    E
                  </span>{" "}
                  Entregada
                </span>
                <span>
                  <span className="inline-block w-4 h-4 rounded bg-gray-200 text-gray-600 text-center text-[9px] leading-4 font-bold mr-1">
                    NE
                  </span>{" "}
                  No entregada
                </span>
              </div>

              {semestreFechas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No hay clases en este semestre.
                </p>
              ) : (
                <table
                  className="w-full text-xs border-collapse border-dashed border-[#bbb] table-fixed"
                  style={{
                    minWidth: semestreFechas.length * 30 + 160 + semestreReflexiones.length * 30,
                  }}
                >
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-background z-10 p-1 text-left font-medium w-[160px] border-b border-r border-dashed border-[#bbb]">
                        Participante
                      </th>
                      {semestreMeses.map((m) => {
                        const count = (semestreFechasPorMes[m] || []).length;
                        return (
                          <th
                            key={m}
                            colSpan={count}
                            className="p-1 text-center text-[11px] font-bold bg-muted/30 border-l border-t border-b border-dashed border-[#bbb]"
                          >
                            {monthName(m + "-01")
                              .charAt(0)
                              .toUpperCase() + monthName(m + "-01").slice(1)}
                          </th>
                        );
                      })}
                      {semestreReflexiones.length > 0 && (
                        <th
                          colSpan={semestreReflexiones.length}
                          className="p-1 text-center text-[11px] font-bold bg-muted/30 border-l border-t border-b border-dashed border-[#bbb]"
                        >
                          Reflexiones
                        </th>
                      )}
                    </tr>
                    <tr>
                      <th className="sticky left-0 bg-background z-10 border-b border-r border-dashed border-[#bbb]"></th>
                      {semestreFechas.map((f, col) => {
                        const iniciaMes =
                          col > 0 && f.slice(0, 7) !== semestreFechas[col - 1].slice(0, 7);
                        return (
                          <th
                            key={f}
                            className={`p-0 text-center align-top border-b border-dashed border-[#bbb] w-[30px] ${
                              iniciaMes
                                ? "border-l-2 border-l-muted-foreground/40"
                                : "border-l border-dashed"
                            }`}
                          >
                            <div className="text-[10px] font-bold text-foreground leading-tight">
                              {isoToDisplay(f)}
                            </div>
                            <div className="text-[8px] text-muted-foreground leading-tight">
                              #{topicNumByFecha[f]}
                            </div>
                          </th>
                        );
                      })}
                      {reflectionGroups.map((g) => {
                        if (g.isGroup) {
                          return (
                            <th
                              key={g.refs[0].id}
                              colSpan={g.refs.length}
                              className="p-0 text-center align-top border-l border-b border-dashed border-[#bbb] relative group"
                            >
                              <div className="text-[9px] font-bold text-foreground leading-tight">
                                {g.title}
                              </div>
                              <div className="text-[7px] text-muted-foreground leading-tight">
                                {isoToDisplay(g.refs[0].fecha)}
                              </div>
                              <button
                                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                                onClick={() => openRefDialog(g.refs[0])}
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                            </th>
                          );
                        }
                        return (
                          <th
                            key={g.refs[0].id}
                            className="p-0 text-center align-top border-l border-b border-dashed border-[#bbb] w-[30px] relative group"
                            title={`${g.title} — ${g.refs[0].fecha}`}
                          >
                            <div className="text-[9px] font-bold text-foreground leading-tight">
                              {isoToDisplay(g.refs[0].fecha)}
                            </div>
                            <div className="text-[7px] text-muted-foreground leading-tight truncate max-w-[30px]">
                              {g.title}
                            </div>
                            <button
                              className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                              onClick={() => openRefDialog(g.refs[0])}
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                    {reflectionGroups.some((g) => g.isGroup) && (
                      <tr>
                        <th className="sticky left-0 bg-background z-10 border-b border-r border-dashed border-[#bbb]"></th>
                        {semestreFechas.map((f) => (
                          <th key={f} className="border-b border-dashed border-[#bbb]"></th>
                        ))}
                        {reflectionGroups.map((g) => {
                          if (g.isGroup) {
                            return g.refs.map((ref, ri) => (
                              <th
                                key={ref.id}
                                className="p-0 text-center border-l border-b border-dashed border-[#bbb] w-[30px]"
                              >
                                <div className="text-[8px] text-muted-foreground font-medium">
                                  R{ri + 1}
                                </div>
                              </th>
                            ));
                          }
                          return (
                            <th
                              key={g.refs[0].id}
                              className="border-b border-dashed border-[#bbb]"
                            ></th>
                          );
                        })}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {alumnos.map((al, fila) => (
                      // Rayado alternado: con medio centenar de columnas de 30px
                      // el ojo se perdía de fila al recorrerlas de izquierda a
                      // derecha.
                      <tr
                        key={al}
                        className={`hover:bg-primary/5 ${fila % 2 === 1 ? "bg-muted/20" : ""}`}
                      >
                        {/* La columna fija tiene que ser OPACA: con un gris
                            translúcido las fechas se veían por debajo al
                            desplazar a la derecha. El color se mezcla contra el
                            fondo para que coincida con el rayado de la fila, y
                            si el navegador no soporta color-mix se queda el
                            fondo sólido, que tampoco deja ver nada detrás. */}
                        <td
                          className="sticky left-0 z-10 w-[160px] max-w-[160px] truncate border-b border-r border-dashed border-[#bbb] bg-background px-1.5 py-1 text-[11px] font-medium"
                          style={
                            fila % 2 === 1
                              ? {
                                  backgroundColor:
                                    "color-mix(in srgb, hsl(var(--muted)) 20%, hsl(var(--background)))",
                                }
                              : undefined
                          }
                          title={al}
                        >
                          {al}
                        </td>
                        {semestreFechas.map((f, col) => {
                          const asis = getAsistencia(al, f);
                          const asisClass =
                            asis === "A"
                              ? "bg-green-100 text-green-800"
                              : asis === "I"
                                ? "bg-red-100 text-red-800"
                                : asis === "NC"
                                  ? "bg-gray-200 text-gray-600"
                                  : "text-muted-foreground/20";
                          // Línea más marcada donde empieza cada mes, para
                          // ubicarse sin tener que subir a leer el encabezado.
                          const iniciaMes =
                            col > 0 && f.slice(0, 7) !== semestreFechas[col - 1].slice(0, 7);
                          return (
                            <td
                              key={f}
                              className={`p-0 border-b border-dashed border-[#bbb] w-[30px] ${
                                iniciaMes
                                  ? "border-l-2 border-l-muted-foreground/40"
                                  : "border-l border-dashed"
                              }`}
                            >
                              <button
                                className={`w-full h-7 text-[10px] font-bold cursor-pointer transition ${asisClass} hover:ring-1 hover:ring-inset hover:ring-primary/50`}
                                onClick={() => toggleAsistencia(al, f)}
                              >
                                {asis}
                              </button>
                            </td>
                          );
                        })}
                        {semestreReflexiones.map((ref) => {
                          const est = getRefEstado(al, ref.id);
                          // Naranja para la entregada y el mismo gris de "no
                          // clase" para la no entregada: así la vista de un
                          // aula se lee por lo que resalta, no por lo que hay.
                          const estClass =
                            est === "E"
                              ? "bg-orange-100 text-orange-900"
                              : est === "NE"
                                ? "bg-gray-200 text-gray-600"
                                : "text-muted-foreground/20";
                          return (
                            <td
                              key={ref.id}
                              className="p-0 border-l border-b border-dashed border-[#bbb] w-[30px]"
                            >
                              <button
                                className={`w-full h-7 text-[10px] font-bold cursor-pointer transition ${estClass} hover:ring-1 hover:ring-inset hover:ring-primary/50`}
                                onClick={() => toggleRefEstado(al, ref.id)}
                              >
                                {est}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Temas y reflexiones — un solo bloque, en rejilla.
                  Antes esto eran DOS listas con la misma información: una tira
                  de temas separados por barras y, debajo, las reflexiones una
                  por línea. Cada tema tiene exactamente una reflexión, así que
                  van juntos, cuatro por fila, y el tema se edita en su tarjeta. */}
              {semestreReflexiones.length > 0 &&
                (() => {
                  const totalPosible = semestreReflexiones.length * alumnos.length;
                  const totalEntregadas = alumnos.reduce(
                    (sum, al) =>
                      sum +
                      semestreReflexiones.filter((r) => getRefEstado(al, r.id) === "E").length,
                    0,
                  );
                  const pctTotal = totalPosible
                    ? Math.round((totalEntregadas / totalPosible) * 100)
                    : 0;
                  const guardarTema = (ref: ReflexionMeta, numero: number) => {
                    const limpio = inlineRefVal.trim();
                    const nuevoTitulo = limpio
                      ? `Reflexión ${numero}: ${limpio}`
                      : `Reflexión ${numero}`;
                    // El nombre pertenece al TEMA, así que se aplica a todas
                    // sus reflexiones: renombrar la 1ª y que la 2ª siguiera
                    // diciendo otra cosa era justo la inconsistencia que había.
                    const clave = ref.temaFecha || ref.fecha || ref.id;
                    setReflexionesMeta((prev) =>
                      prev.map((r) =>
                        r.aula === ref.aula && (r.temaFecha || r.fecha || r.id) === clave
                          ? { ...r, titulo: nuevoTitulo }
                          : r,
                      ),
                    );
                    // El tema del aula se mantiene en sincronía: la tabla de
                    // asistencia lo muestra sobre la columna de esa clase.
                    if (ref.temaFecha && currentAula)
                      updateTema(currentAula.nombre, ref.temaFecha, limpio);
                    setInlineRefId(null);
                  };
                  return (
                    <div className="mt-4">
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
                        <span className="font-bold">Temas y reflexiones</span>
                        <span className="text-muted-foreground">
                          {semestreReflexiones.length} temas · {alumnos.length} alumnos ·{" "}
                          <span className="tabular-nums">
                            {totalEntregadas}/{totalPosible}
                          </span>{" "}
                          entregas ({pctTotal}%)
                        </span>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {semestreReflexiones.map((ref) => {
                          // El número es el del TEMA dentro del año, no la
                          // posición de la reflexión: dos reflexiones del mismo
                          // tema comparten número y se distinguen con 1ª / 2ª.
                          const info = infoPorReflexion[ref.id] ?? { tema: 1, orden: 1, total: 1 };
                          const numero = info.tema;
                          const tema = temaDeTitulo(ref.titulo);
                          const entregadas = alumnos.filter(
                            (al) => getRefEstado(al, ref.id) === "E",
                          ).length;
                          const completo = alumnos.length > 0 && entregadas === alumnos.length;
                          const asistieron = ref.fecha
                            ? alumnos.filter((al) => getAsistencia(al, ref.fecha) === "A").length
                            : 0;
                          return (
                            <div
                              key={ref.id}
                              className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-[11px] hover:border-indigo-300"
                            >
                              <span className="shrink-0 font-semibold text-muted-foreground">
                                #{numero}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {ref.fecha ? isoToDiaMes(ref.fecha) : "—"}
                              </span>
                              {inlineRefId === ref.id ? (
                                <input
                                  autoFocus
                                  className="min-w-0 flex-1 rounded border border-indigo-300 bg-indigo-50 px-1 py-0 text-[11px]"
                                  value={inlineRefVal}
                                  onChange={(e) => setInlineRefVal(e.target.value)}
                                  onBlur={() => guardarTema(ref, numero)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") guardarTema(ref, numero);
                                    if (e.key === "Escape") setInlineRefId(null);
                                  }}
                                />
                              ) : (
                                <span className="min-w-0 flex-1 truncate" title={tema || undefined}>
                                  {tema || (
                                    <span className="italic text-muted-foreground/50">
                                      sin título
                                    </span>
                                  )}
                                </span>
                              )}
                              {/* a: cuántos asistieron ese día · r: cuántos
                                  entregaron · p: qué parte del tema es, cuando
                                  el tema se dio en más de una clase. */}
                              <span
                                className={`shrink-0 tabular-nums text-[10px] ${
                                  asistieron === 0
                                    ? "text-muted-foreground/40"
                                    : "text-muted-foreground"
                                }`}
                                title={`Asistieron ${asistieron} de ${alumnos.length}`}
                              >
                                a:{asistieron}/{alumnos.length}
                              </span>
                              <span
                                className={`shrink-0 tabular-nums text-[10px] ${
                                  entregadas === 0
                                    ? "text-muted-foreground/40"
                                    : completo
                                      ? "font-medium text-green-600"
                                      : "text-muted-foreground"
                                }`}
                                title={`Entregaron ${entregadas} de ${alumnos.length}`}
                              >
                                r:{entregadas}/{alumnos.length}
                              </span>
                              {info.total > 1 && (
                                <span
                                  className="shrink-0 tabular-nums text-[10px] font-medium text-indigo-600"
                                  title={`Parte ${info.orden} de ${info.total} de este tema`}
                                >
                                  p:{info.orden}/{info.total}
                                </span>
                              )}
                              <button
                                className="shrink-0 text-muted-foreground hover:text-indigo-600"
                                title="Cambiar el nombre del tema"
                                onClick={() => {
                                  setInlineRefId(ref.id);
                                  setInlineRefVal(tema);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                className="shrink-0 text-muted-foreground hover:text-indigo-600"
                                title="Este tema llevó otra reflexión"
                                onClick={() => agregarReflexionAlTema(ref)}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                title="Quitar esta reflexión"
                                onClick={() => eliminarReflexion(ref)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
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
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
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
                        <th className="sticky left-0 bg-background z-10 p-1 text-left font-medium min-w-[160px]">
                          Participante
                        </th>
                        {meses.map((m) => (
                          <th
                            key={m}
                            colSpan={4}
                            className="p-1 text-center font-medium text-[10px] border-l"
                          >
                            {monthName(m + "-01")
                              .charAt(0)
                              .toUpperCase() + monthName(m + "-01").slice(1)}
                          </th>
                        ))}
                        <th
                          colSpan={4}
                          className="p-1 text-center font-medium text-[10px] border-l"
                        >
                          Total General
                        </th>
                      </tr>
                      <tr className="border-b text-muted-foreground text-[10px]">
                        <th></th>
                        {meses
                          .flatMap(() => ["A", "%", "R", "%"])
                          .map((h, i) => (
                            <th key={i} className="p-1 text-center font-normal border-l">
                              {h}
                            </th>
                          ))}
                        {["A", "%", "R", "%"].map((h, i) => (
                          <th key={`g-${i}`} className="p-1 text-center font-normal border-l">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alumnos.map((al) => {
                        let totalAsist = 0,
                          totalRef = 0;
                        return (
                          <tr key={al} className="border-b border-muted/30 hover:bg-muted/20">
                            <td
                              className="sticky left-0 bg-background z-10 p-1 text-xs truncate max-w-[160px]"
                              title={al}
                            >
                              {al}
                            </td>
                            {meses.flatMap((m) => {
                              const fms = fechasPorMesHoy[m] || [];
                              let asis = 0;
                              for (const f of fms) if (getAsistencia(al, f) === "A") asis++;
                              const rms = reflexionesPorMes[m] || [];
                              const refs = rms.filter((r) => getRefEstado(al, r.id) === "E").length;
                              totalAsist += asis;
                              totalRef += refs;
                              const apct = fms.length ? +((asis / fms.length) * 100).toFixed(0) : 0;
                              const rpct = rms.length ? +((refs / rms.length) * 100).toFixed(0) : 0;
                              return [
                                <td
                                  key={`${m}-a`}
                                  className={`p-1 text-center border-l ${asis === 0 ? "text-muted-foreground/20" : ""}`}
                                >
                                  {asis}
                                </td>,
                                <td
                                  key={`${m}-ap`}
                                  className={`p-1 text-center ${apct === 0 ? "text-muted-foreground/20" : ""}`}
                                >
                                  {apct}%
                                </td>,
                                <td
                                  key={`${m}-r`}
                                  className={`p-1 text-center border-l ${refs === 0 ? "text-muted-foreground/20" : ""}`}
                                >
                                  {refs}
                                </td>,
                                <td
                                  key={`${m}-rp`}
                                  className={`p-1 text-center ${rpct === 0 ? "text-muted-foreground/20" : ""}`}
                                >
                                  {rpct}%
                                </td>,
                              ];
                            })}
                            {/* Total general */}
                            <td
                              className={`p-1 text-center font-bold border-l ${totalAsist === 0 ? "text-muted-foreground/20" : ""}`}
                            >
                              {totalAsist}
                            </td>
                            <td
                              className={`p-1 text-center font-bold ${totalAsist === 0 || fechasHoy.length === 0 ? "text-muted-foreground/20" : totalAsist / fechasHoy.length < 0.5 ? "text-destructive" : totalAsist / fechasHoy.length < 0.75 ? "" : "text-green-600"}`}
                            >
                              {fechasHoy.length
                                ? +((totalAsist / fechasHoy.length) * 100).toFixed(0)
                                : 0}
                              %
                            </td>
                            <td
                              className={`p-1 text-center font-bold border-l ${totalRef === 0 ? "text-muted-foreground/20" : ""}`}
                            >
                              {totalRef}
                            </td>
                            <td
                              className={`p-1 text-center font-bold ${totalRef === 0 || reflexionesHoy.length === 0 ? "text-muted-foreground/20" : totalRef / reflexionesHoy.length < 0.5 ? "text-destructive" : totalRef / reflexionesHoy.length < 0.75 ? "" : "text-green-600"}`}
                            >
                              {reflexionesHoy.length
                                ? +((totalRef / reflexionesHoy.length) * 100).toFixed(0)
                                : 0}
                              %
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Totales: <span className="text-destructive font-bold">rojo</span> &lt; 50%,{" "}
                    <span className="text-green-600 font-bold">verde</span> &ge; 75%
                  </p>
                </>
              )}
            </Card>
          </TabsContent>

          {user.canAccessDiagnostico && (
            <TabsContent value="global">
              <Card className="p-4">
                <h3 className="font-bold text-sm mb-3">Diagnóstico Global</h3>
                <DiagnosticoGlobal aulasMeta={aulasMeta} records={records} />
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      <Dialog
        open={refDialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setEditingRefId(null);
            setRefTitulo("");
            setRefFecha(new Date().toISOString().slice(0, 10));
          }
          setRefDialogOpen(v);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingRefId ? "Editar reflexión" : "Nueva reflexión"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Título</label>
              <Input
                value={refTitulo}
                onChange={(e) => setRefTitulo(e.target.value)}
                placeholder="Ej: La virtud de la justicia"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Fecha</label>
              <Input type="date" value={refFecha} onChange={(e) => setRefFecha(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingRefId(null);
                setRefTitulo("");
                setRefFecha(new Date().toISOString().slice(0, 10));
                setRefDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveReflexion}>
              <Plus className="mr-1 h-4 w-4" />
              {editingRefId ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiagnosticoGlobal({
  aulasMeta,
  records,
}: {
  aulasMeta: AulaMeta[];
  records: AttendanceRecord[];
}) {
  const today =
    typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "2026-12-31";
  const cards = useMemo(() => {
    return aulasMeta.map((aula) => {
      const todas = generateFechas(aula.diaSemana, aula.year);
      const fechas = todas.filter((f) => f <= today);
      const nombres = new Set<string>();
      for (const r of records) if (r.aula === aula.nombre) nombres.add(r.alumno);
      const alumnos = Array.from(nombres).sort();
      const totalClases = fechas.length;
      let totalAsist = 0,
        totalRef = 0;
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
      const pctAsist = totalPosible ? +((totalAsist / totalPosible) * 100).toFixed(1) : 0;
      const pctRef = totalPosible ? +((totalRef / totalPosible) * 100).toFixed(1) : 0;
      let bestA = { nombre: "", val: 0 };
      let bestR = { nombre: "", val: 0 };
      for (const al of alumnos) {
        let ca = 0,
          cr = 0;
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
      return {
        nombre: aula.nombre,
        alumnos: alumnos.length,
        totalClases,
        planificadas,
        totalAsist,
        totalRef,
        pctAsist,
        pctRef,
        bestA,
        bestR,
      };
    });
  }, [aulasMeta, records, today]);

  return (
    <div className="space-y-4">
      {cards.map((c) => {
        return (
          <div key={c.nombre} className="grid grid-cols-5 gap-1.5 text-[10px]">
            <div className="rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 p-1.5 text-center flex flex-col justify-center">
              <div className="text-[9px] text-slate-600 font-medium leading-tight">Aula</div>
              <div className="text-[11px] font-bold text-slate-800 leading-tight break-words">
                {c.nombre}
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-1.5 text-center">
              <div className="text-[9px] text-blue-600 font-medium">Participantes</div>
              <div className="text-sm font-bold text-blue-700">{c.alumnos}</div>
              <div className="text-[8px] text-blue-500/70">
                {c.totalClases}/{c.planificadas} clases
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-1.5 text-center">
              <div className="text-[9px] text-green-600 font-medium">Asistencia</div>
              <div className="text-sm font-bold text-green-700">{c.pctAsist}%</div>
              <div className="text-[8px] text-green-500/70">
                {c.totalAsist}/{c.alumnos * c.totalClases}
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 p-1.5 text-center">
              <div className="text-[9px] text-indigo-600 font-medium">Reflexiones</div>
              <div className="text-sm font-bold text-indigo-700">{c.pctRef}%</div>
              <div className="text-[8px] text-indigo-500/70">
                {c.totalRef}/{c.alumnos * c.totalClases}
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-1.5 text-center flex flex-col justify-center">
              <div className="text-[9px] text-purple-600 font-medium">Destacados</div>
              <div
                className="text-[9px] font-bold text-purple-700 leading-tight truncate"
                title={`Asistencia: ${c.bestA.nombre} (${c.bestA.val}/${c.totalClases})`}
              >
                A: {c.bestA.nombre}
              </div>
              <div
                className="text-[9px] font-bold text-purple-700 leading-tight truncate"
                title={`Reflexiones: ${c.bestR.nombre} (${c.bestR.val}/${c.totalClases})`}
              >
                R: {c.bestR.nombre}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
