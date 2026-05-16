# supabase/AGENTS.md

Backend conventions for the Supabase part of this project. Pair this with the top-level `CLAUDE.md`.

## Two client entry points

Pick the right one — the wrong choice leaks your service-role key into the browser bundle.

- **`src/integrations/supabase/client.ts`** — browser-safe. Uses the publishable (anon) key. Subject to RLS. Import everywhere by default:
  ```ts
  import { supabase } from "@/integrations/supabase/client";
  ```
  The client is lazy via a `Proxy` so a missing env var doesn't crash at import time.

- **`src/integrations/supabase/admin.server.ts`** — service-role. Bypasses RLS. **Server-side only.** The `.server.ts` suffix is the marker; never import it from a `.tsx` component or any module that ends up in the browser bundle.

## Edge functions

Live in `supabase/functions/<name>/index.ts`. Deno runtime.

Use the pattern in `supabase/functions/_template/index.ts`:

1. Respond to `OPTIONS` preflight with CORS headers (`_shared/cors.ts`).
2. Read `Authorization` header → build a **caller-context** client with the **anon** key, passing through the JWT.
3. Verify the caller: `supabase.auth.getUser()` → 401 if no session.
4. Optionally gate access via `has_role(uid, 'admin')` RPC → 403 if not allowed.
5. Build a separate **admin** client with the service-role key for privileged ops.
6. Respond with `{ ok: true, ... }` or `{ error: "message" }` + status.

Never reuse the same client for caller-auth and admin ops — keep them separate.

Deploy: `supabase functions deploy <name>`.

## Migrations

One SQL file per change in `supabase/migrations/<UTC-timestamp>_<name>.sql`. Create with:

```
supabase --workdir /app migration new <name>
```

Rules:

- **RLS is mandatory on every new `public` table.** `alter table public.<t> enable row level security;` then add policies per action.
- Use the `has_role(_user_id, _role)` SECURITY DEFINER function to gate admin policies — it avoids the RLS recursion you'd hit by querying `user_roles` directly inside a policy.
- Auth-side triggers (like `on_auth_user_created`) belong in migrations, not in app code.
- Destructive operations (drop table, truncate, db reset) need explicit user approval.

Apply locally: `supabase --workdir /app db push`. If Management API auth fails, fall back to running the SQL via `psql` against the pooler URL.

## RLS policies — non-negotiable rules

Read these before writing **any** policy. The Supabase Security Advisor will flag violations and they will block deploys.

- **One policy per action.** Write `for select`, `for insert`, `for update`, `for delete` separately. Never `for all using (true)`. Never `for select using (true)` on a table that holds per-user data.
- **Owner convention.** Per-user tables have `user_id uuid not null references auth.users(id) on delete cascade`. Policies key off `auth.uid() = user_id`. On `profiles`, the row IS the user, so use `auth.uid() = id`.
- **`with check` on INSERT/UPDATE.** Without it, an authenticated user can update their row to point at someone else.
- **Admin policies use `public.has_role(auth.uid(), 'admin')`.** Never query `user_roles` directly inside a policy — that recurses.
- **Public-read tables** (catalog, public posts) can use `for select using (true)`, but only when truly nothing per-user lives there. Add a SQL comment explaining why so it's reviewable.

## Storage policies — pick one pattern per bucket, don't mix

Buckets fall into two buckets (sorry). Pick the right pattern; mixing them is how the "overly permissive" advisor warnings happen.

### 1. Public assets (logos, hero images, marketing media)

Mark the bucket itself public — that's the entire read story:

```sql
update storage.buckets set public = true where id = '<bucket>';
```

Files are then reachable via the public CDN URL. **Do not** add a `for select using (true)` policy on `storage.objects`. That policy exposes the list of files (object metadata) to anonymous clients, which is what the Supabase advisor flags as "Clients can list all files in this bucket". The public-flag alone gives you anonymous reads via direct URL without exposing the listing.

For uploads to a public bucket, write a narrow INSERT policy:

```sql
create policy "auth_upload_<bucket>" on storage.objects
  for insert with check (
    bucket_id = '<bucket>'
    and auth.role() = 'authenticated'
  );
```

Add `and public.has_role(auth.uid(), 'admin')` if only admins should upload.

### 2. Private / per-user (user uploads, avatars, attachments)

Bucket stays private (`public = false`). Use the path convention `<auth.uid()>/<rest>` so the first folder segment is the owner:

```sql
create policy "users_read_own" on storage.objects
  for select using (
    bucket_id = '<bucket>'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_insert_own" on storage.objects
  for insert with check (
    bucket_id = '<bucket>'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_update_own" on storage.objects
  for update using (
    bucket_id = '<bucket>'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_delete_own" on storage.objects
  for delete using (
    bucket_id = '<bucket>'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

Serve via signed URLs (`supabase.storage.from('<bucket>').createSignedUrl(path, ttl)`) — never public URLs from a private bucket.

### Always

- Scope every storage policy with `bucket_id = '<bucket>'`. Never write a policy that runs across all buckets.
- If the Security Advisor flags an "overly permissive" policy after your migration, fix the migration. Don't dismiss the warning.

## Generated types

After a schema change:

```
supabase --workdir /app gen types typescript --linked > src/integrations/supabase/types.ts
```

Don't hand-edit `types.ts`.

## Local seed users

`scripts/seed-users.sh` creates dev users via the Auth admin API and promotes one to `admin`. Re-run after `supabase db reset` (which wipes `auth.users`).
