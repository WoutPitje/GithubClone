// SERVER-ONLY. Do NOT import this module from any file that ends up in the
// browser bundle. The `.server.ts` suffix is the convention; Next.js, Nuxt
// server routes, edge functions, and scripts are fine — React components are
// not. This client uses the service-role key and bypasses RLS.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the server environment to use the admin client.",
    );
  }
  cached = createClient(url, serviceKey, { auth: { persistSession: false } });
  return cached;
}
