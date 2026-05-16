// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No authorization header" }, 401);

  // Caller-context client — RLS active under the caller's JWT.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

  // Admin-only by default. Change the role check (or remove it) to suit your function.
  const { data: isAdmin } = await caller.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  // Admin client — service role, bypasses RLS. Use for privileged ops only.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    // TODO: implement your action(s) using `admin`.
    // Example:
    //   const { data, error } = await admin.from("things").select();
    //   if (error) throw error;
    //   return json({ ok: true, data });
    return json({ ok: true, caller: userData.user.id, received: body });
  } catch (e) {
    console.error("[_template]", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
