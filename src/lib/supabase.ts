import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.vite_supabase_url ?? import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.vite_supabase_anon_key ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
