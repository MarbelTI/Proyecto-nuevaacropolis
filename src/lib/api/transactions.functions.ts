import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canManageFinanzas, canReadFinanzas, getSessionUser } from "./auth-guard";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

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
      source: r.source ?? "",
    }));

    const { error } = await supabase.from("bcv_rates").upsert(mapped, {
      onConflict: "iso_date",
      ignoreDuplicates: false,
    });

    if (error) return { ok: false, error: error.message };
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

    const { data: rows, error } = await supabase
      .from("transactions")
      .select("*")
      .order("fecha", { ascending: true });

    if (error) return { ok: false, error: error.message, data: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { ok: true, data: rows as any[] };
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

    const { data: rows, error } = await supabase
      .from("bcv_rates")
      .select("*")
      .order("iso_date", { ascending: true });

    if (error) return { ok: false, error: error.message, data: {} };
    const rates: Record<string, number> = {};
    for (const r of rows) rates[r.iso_date] = r.rate;
    return { ok: true, data: rates };
  });
