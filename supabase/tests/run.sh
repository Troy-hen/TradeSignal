#!/usr/bin/env bash
# Runs every SQL test file in this directory against DATABASE_URL in order,
# stopping on the first failure. Each file is self-contained: it creates
# its own fixtures (prefixed zzz_test_ / ZZZ Test — safe to grep for and
# manually clean up if a run is ever interrupted mid-file), asserts via
# RAISE EXCEPTION on failure, and cleans up after itself on success.
#
# Requires DATABASE_URL to point at the project's Postgres connection
# string (Project Settings -> Database -> Connection string, in Supabase's
# dashboard). Never point this at a production database with real
# customer data — it inserts and deletes real rows in real tables.
#
# Usage: DATABASE_URL="postgresql://...:6543/postgres" ./run.sh

set -euo pipefail
cd "$(dirname "$0")"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. See the comment at the top of this script." >&2
  exit 1
fi

for f in [0-9][0-9][0-9]_*.sql; do
  echo "=== $f ==="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo ""
echo "All SQL tests passed."
echo "AI schema tests (Deno) are separate: deno test _shared/ai/schemas.test.ts"
