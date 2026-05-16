#!/usr/bin/env bash
# Seed local dev users via the Supabase Auth admin API.
# Reads URL + service-role key from `supabase status` — local stack only.
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found — install it first (brew install supabase)" >&2
  exit 1
fi

STATUS="$(supabase status --output env 2>/dev/null || true)"
if [[ -z "$STATUS" ]]; then
  echo "supabase status failed — is the local stack running? Try: supabase start" >&2
  exit 1
fi
eval "$STATUS"

URL="${API_URL:-http://127.0.0.1:54321}"
SERVICE_KEY="${SERVICE_ROLE_KEY:?missing SERVICE_ROLE_KEY in supabase status output}"

create_user() {
  local email="$1" pwd="$2"
  curl -sS -X POST "$URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pwd\",\"email_confirm\":true}" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id") or d.get("msg") or d)'
}

promote_to_admin() {
  local email="$1"
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c \
    "update public.user_roles
        set role = 'admin'
      where user_id = (select id from auth.users where email = '$email');"
}

echo "Creating admin@dev.local ..."
create_user "admin@dev.local" "admin123"
echo "Creating user@dev.local ..."
create_user "user@dev.local" "user123"

echo "Promoting admin@dev.local to admin role ..."
promote_to_admin "admin@dev.local"

echo "Done. Login with admin@dev.local / admin123 or user@dev.local / user123."
