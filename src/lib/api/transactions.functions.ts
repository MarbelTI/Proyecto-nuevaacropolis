import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canManageFinanzas, canReadFinanzas, getSessionUser } from "./auth-guard";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import { registrarActividad } from "./activity-log";

const TransactionSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  mes: z.string(),
  tipo: z.string(),
  categoria: z.string(),
  descripcion: z.string(),
  mensualidad: z.string(),
  moneda: z.string(),
  monto: z.number(),
  tasa: z.number().nullable(),
  montoUsd: z.number(),
  banco: z.string(),
});

const BcvRateSchema = z.object({
  isoDate: z.string(),
  rate: z.number(),
  rateEuro: z.number().optional(),
  source: z.string().optional(),
});

// El access_token del usuario autenticado se valida en el servidor (JWT firmado
// por Supabase). Las operaciones usan la anon key + la sesión del usuario, por lo
// que las políticas RLS son las que autorizan/deniegan el acceso — nunca se usa
// la service_role key aquí.
const accessTokenField = z.string().optional();

export type ServerTransaction = z.infer<typeof TransactionSchema>;
export type ServerBcvRate = z.infer<typeof BcvRateSchema>;

export const syncTransactionsToSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      transactions: z.array(TransactionSchema),
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canManageFinanzas(session.role)) {
      return { ok: false, error: "No autorizado" };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = SUPABASE_URL;
    const supabaseAnonKey = SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return { ok: false, error: "Supabase not configured" };
    }
    // Cliente con la sesión del usuario → RLS aplica (finanzas RW, director R).
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    const mapped = data.transactions.map((t) => ({
      id: t.id,
      fecha: t.fecha,
      mes: t.mes,
      tipo: t.tipo,
      categoria: t.categoria,
      descripcion: t.descripcion,
      mensualidad: t.mensualidad,
      moneda: t.moneda,
      monto: t.monto,
      tasa: t.tasa,
      monto_usd: t.montoUsd,
      banco: t.banco,
    }));

    const { error } = await supabase.from("transactions").upsert(mapped, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

    if (error) return { ok: false, error: error.message };
    await registrarActividad(supabase, session, "transacciones:subir", `${mapped.length} filas`);
    return { ok: true, count: mapped.length };
  });

export const syncBcvRatesToSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      rates: z.array(BcvRateSchema),
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canManageFinanzas(session.role)) {
      return { ok: false, error: "No autorizado" };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = SUPABASE_URL;
    const supabaseAnonKey = SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return { ok: false, error: "Supabase not configured" };
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    const mapped = data.rates.map((r) => ({
      iso_date: r.isoDate,
      rate: r.rate,
      rate_euro: r.rateEuro ?? null,
      source: r.source ?? "",
    }));

    const { error } = await supabase.from("bcv_rates").upsert(mapped, {
      onConflict: "iso_date",
      ignoreDuplicates: false,
    });

    if (error) return { ok: false, error: error.message };
    await registrarActividad(supabase, session, "tasas_bcv:subir", `${mapped.length} filas`);
    return { ok: true, count: mapped.length };
  });

export const loadTransactionsFromSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canReadFinanzas(session.role)) {
      return { ok: false, error: "No autorizado", data: [] };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = SUPABASE_URL;
    const supabaseAnonKey = SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return { ok: false, error: "Supabase not configured", data: [] };
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    // PostgREST devuelve como mucho 1000 filas por petición. Sin paginar, a
    // partir de la transacción 1001 el resto se quedaba fuera en silencio, y
    // encima con ok:true, así que nadie se enteraba de que faltaba media
    // contabilidad.
    //
    // Se ordena por `id` (clave primaria, estable) y no por `fecha`: esa
    // columna es texto dd/mm/yyyy, así que ordenarla alfabéticamente ordena
    // por día del mes (01/12/2025 antes que 02/01/2025). El orden cronológico
    // lo pone el cliente al guardar.
    const PAGINA = 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todas: any[] = [];
    for (let desde = 0; ; desde += PAGINA) {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("*")
        .order("id", { ascending: true })
        .range(desde, desde + PAGINA - 1);

      if (error) return { ok: false, error: error.message, data: [] };
      todas.push(...(rows ?? []));
      if (!rows || rows.length < PAGINA) break;
    }
    return { ok: true, data: todas };
  });

export const loadBcvRatesFromSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session) {
      return { ok: false, error: "No autorizado", data: {} };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = SUPABASE_URL;
    const supabaseAnonKey = SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return { ok: false, error: "Supabase not configured", data: {} };
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    // Igual que en transacciones: sin paginar, el corte de 1000 filas de
    // PostgREST deja fuera las tasas más recientes (el orden es ascendente),
    // y bcvRateFor acabaría convirtiendo bolívares con la tasa de hace años.
    // Son ~365 filas al año, así que el problema aparece solo con el tiempo.
    const PAGINA = 1000;
    const rates: Record<string, { dolar?: number; euro?: number }> = {};
    for (let desde = 0; ; desde += PAGINA) {
      const { data: rows, error } = await supabase
        .from("bcv_rates")
        .select("*")
        .order("iso_date", { ascending: true })
        .range(desde, desde + PAGINA - 1);

      if (error) return { ok: false, error: error.message, data: {} };
      for (const r of rows ?? []) {
        const entry: { dolar?: number; euro?: number } = {};
        if (r.rate != null) entry.dolar = r.rate;
        if (r.rate_euro != null) entry.euro = r.rate_euro;
        rates[r.iso_date] = entry;
      }
      if (!rows || rows.length < PAGINA) break;
    }
    return { ok: true, data: rates };
  });

// ---------------- Papelera de transacciones (solo super_admin la ve) ----------------

const PapeleraAccion = z.enum(["fila", "sobrantes", "rango"]);

// `TransactionSchema` no incluye `revisar` a propósito (ver
// add-transaction-review-flag/tasks.md, 6.1b): agregarlo ahí rompería la
// subida normal si la migración de esa columna aún no corrió. Aquí sí hace
// falta guardar la nota si la tenía, así que se extiende solo para este
// input, sin tocar el esquema compartido.
const TransactionConRevisar = TransactionSchema.extend({
  revisar: z.string().optional(),
});

/**
 * Guarda una copia de la transacción eliminada en la papelera compartida.
 *
 * Se llama justo después de que la fila ya se quitó de la lista local — el
 * borrado en pantalla nunca espera por esto. Si falla (sin internet, sesión
 * vencida), la persona se entera por el toast del cliente; no hay reintento
 * automático, para no complicar un flujo que hoy tolera trabajar offline.
 */
export const moverTransaccionAPapelera = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      transaction: TransactionConRevisar,
      accion: PapeleraAccion,
      accessToken: accessTokenField,
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || !canManageFinanzas(session.role)) {
      return { ok: false, error: "No autorizado" };
    }
    const { createClient } = await import("@supabase/supabase-js");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { ok: false, error: "Supabase not configured" };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    const t = data.transaction;
    const { error } = await supabase.from("transactions_papelera").insert({
      transaction_id: t.id,
      fecha: t.fecha,
      mes: t.mes,
      tipo: t.tipo,
      categoria: t.categoria,
      descripcion: t.descripcion,
      mensualidad: t.mensualidad,
      moneda: t.moneda,
      monto: t.monto,
      tasa: t.tasa,
      monto_usd: t.montoUsd,
      banco: t.banco,
      revisar: t.revisar ?? "",
      accion: data.accion,
      eliminado_por: session.userId,
      eliminado_por_email: session.email,
    });

    if (error) return { ok: false, error: error.message };
    await registrarActividad(supabase, session, "papelera:mover", `1 fila (${data.accion})`);
    return { ok: true };
  });

const PapeleraRow = z.object({
  id: z.string(),
  transaction_id: z.string(),
  fecha: z.string(),
  mes: z.string(),
  tipo: z.string(),
  categoria: z.string(),
  descripcion: z.string(),
  mensualidad: z.string(),
  moneda: z.string(),
  monto: z.number(),
  tasa: z.number().nullable(),
  monto_usd: z.number(),
  banco: z.string(),
  revisar: z.string(),
  accion: z.string(),
  eliminado_por_email: z.string(),
  eliminado_en: z.string(),
});
export type PapeleraRow = z.infer<typeof PapeleraRow>;

/** Lista la papelera (y de paso purga lo que lleve más de 30 días). Solo super_admin. */
export const listarPapelera = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: accessTokenField }))
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || session.role !== "super_admin") {
      return { ok: false, error: "No autorizado", data: [] as PapeleraRow[] };
    }
    const { createClient } = await import("@supabase/supabase-js");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { ok: false, error: "Supabase not configured", data: [] as PapeleraRow[] };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    // Purga diferida: no hay cron en este proyecto, así que se limpia lo
    // vencido cada vez que alguien abre la papelera, antes de mostrarla.
    await supabase
      .from("transactions_papelera")
      .delete()
      .lt("eliminado_en", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: rows, error } = await supabase
      .from("transactions_papelera")
      .select("*")
      .order("eliminado_en", { ascending: false });

    if (error) return { ok: false, error: error.message, data: [] as PapeleraRow[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (rows ?? []).map((r: any) => ({
      id: r.id,
      transaction_id: r.transaction_id,
      fecha: r.fecha,
      mes: r.mes,
      tipo: r.tipo,
      categoria: r.categoria,
      descripcion: r.descripcion,
      mensualidad: r.mensualidad,
      moneda: r.moneda,
      monto: Number(r.monto),
      tasa: r.tasa != null ? Number(r.tasa) : null,
      monto_usd: Number(r.monto_usd),
      banco: r.banco,
      revisar: r.revisar,
      accion: r.accion,
      eliminado_por_email: r.eliminado_por_email,
      eliminado_en: r.eliminado_en,
    }));
    return { ok: true, data: mapped };
  });

/** Restaura una fila de la papelera: la borra de ahí y la devuelve completa al que llamó. */
export const restaurarDePapelera = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), accessToken: accessTokenField }))
  .handler(async ({ data }) => {
    const session = await getSessionUser(data.accessToken);
    if (!session || session.role !== "super_admin") {
      return { ok: false, error: "No autorizado" };
    }
    const { createClient } = await import("@supabase/supabase-js");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { ok: false, error: "Supabase not configured" };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    const { data: row, error: errSelect } = await supabase
      .from("transactions_papelera")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (errSelect) return { ok: false, error: errSelect.message };
    if (!row) return { ok: false, error: "Esa fila ya no está en la papelera" };

    const { error: errDelete } = await supabase
      .from("transactions_papelera")
      .delete()
      .eq("id", data.id);
    if (errDelete) return { ok: false, error: errDelete.message };

    await registrarActividad(supabase, session, "papelera:restaurar", "1 fila");

    const transaction: ServerTransaction = {
      id: row.transaction_id,
      fecha: row.fecha,
      mes: row.mes,
      tipo: row.tipo,
      categoria: row.categoria,
      descripcion: row.descripcion,
      mensualidad: row.mensualidad,
      moneda: row.moneda,
      monto: Number(row.monto),
      tasa: row.tasa != null ? Number(row.tasa) : null,
      montoUsd: Number(row.monto_usd),
      banco: row.banco,
    };
    return { ok: true, transaction, revisar: row.revisar as string };
  });
