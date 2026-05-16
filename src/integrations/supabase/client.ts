import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(): { url: string; anonKey: string } | null {
  const env =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const url =
    env.VITE_SUPABASE_URL ??
    env.NEXT_PUBLIC_SUPABASE_URL ??
    env.NUXT_PUBLIC_SUPABASE_URL ??
    env.PUBLIC_SUPABASE_URL;
  const anonKey =
    env.VITE_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.NUXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;
  const env = readEnv();
  if (!env) {
    throw new Error(
      "Supabase env vars are not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env (or the framework prefix that matches your project).",
    );
  }
  cached = createClient(env.url, env.anonKey);
  return cached;
}

// Lazy Proxy: initialization is deferred to first use, so a missing env var at
// build time doesn't crash imports — it only throws when the client is actually
// touched at runtime.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
