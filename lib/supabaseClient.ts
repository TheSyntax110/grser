import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _configured: boolean | null = null;

function resolveEnv() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return { url, key };
}

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const { url, key } = resolveEnv();
  if (!url || !key) {
    throw new Error("Supabase yapılandırması eksik — SUPABASE_URL ve anahtar gerekli.");
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export const isSupabaseConfigured = (): boolean => {
  if (_configured === null) {
    const { url, key } = resolveEnv();
    _configured = Boolean(url && key);
  }
  return _configured;
};
