import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export type ServerTransaction = z.infer<typeof TransactionSchema>;
export type ServerBcvRate = z.infer<typeof BcvRateSchema>;

export const syncTransactionsToSupabase = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      transactions: z.array(TransactionSchema),
    }),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      return { ok: false, error: "Supabase not configured" };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    }),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      return { ok: false, error: "Supabase not configured" };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

export const loadTransactionsFromSupabase = createServerFn({ method: "POST" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, error: "Supabase not configured", data: [] };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("fecha", { ascending: true });

  if (error) return { ok: false, error: error.message, data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ok: true, data: data as any[] };
});

export const loadBcvRatesFromSupabase = createServerFn({ method: "POST" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, error: "Supabase not configured", data: {} };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("bcv_rates")
    .select("*")
    .order("iso_date", { ascending: true });

  if (error) return { ok: false, error: error.message, data: {} };
  const rates: Record<string, number> = {};
  for (const r of data) rates[r.iso_date] = r.rate;
  return { ok: true, data: rates };
});
