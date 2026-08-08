function readEnv(name: string): string {
  return (
    (process.env[name] as string | undefined) ?? (import.meta.env[name] as string | undefined) ?? ""
  );
}

export const SUPABASE_URL = readEnv("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY = readEnv("VITE_SUPABASE_ANON_KEY");
