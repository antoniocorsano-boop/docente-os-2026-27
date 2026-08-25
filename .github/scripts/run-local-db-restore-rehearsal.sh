#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGPASSWORD:=postgres}"
export PGHOST PGPORT PGUSER PGPASSWORD

DB_NAME="docente_restore_rehearsal"
BACKUP_FILE="${RUNNER_TEMP:-/tmp}/docente-os-restore-rehearsal.dump"
MIGRATIONS_DIR="product/supabase/migrations"
COMPAT_FILE=".github/fixtures/local-supabase-compat.sql"

admin_psql() {
  psql -v ON_ERROR_STOP=1 -d postgres "$@"
}

db_psql() {
  psql -v ON_ERROR_STOP=1 -d "$DB_NAME" "$@"
}

wait_for_postgres() {
  for _ in $(seq 1 30); do
    if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "PostgreSQL did not become ready" >&2
  return 1
}

reset_database() {
  admin_psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null
  admin_psql -c "DROP DATABASE IF EXISTS $DB_NAME;" >/dev/null
  admin_psql -c "CREATE DATABASE $DB_NAME;" >/dev/null
}

schema_fingerprint() {
  db_psql -Atc "
    SELECT md5(string_agg(x, E'\\n' ORDER BY x))
    FROM (
      SELECT format('table:%s.%s', schemaname, tablename) AS x
      FROM pg_tables
      WHERE schemaname IN ('public','auth','storage')
      UNION ALL
      SELECT format('column:%s.%s.%s:%s:%s', table_schema, table_name, column_name, data_type, is_nullable)
      FROM information_schema.columns
      WHERE table_schema IN ('public','auth','storage')
      UNION ALL
      SELECT format('constraint:%s:%s:%s', conrelid::regclass::text, conname, contype) AS x
      FROM pg_constraint
      WHERE connamespace IN ('public'::regnamespace, 'auth'::regnamespace, 'storage'::regnamespace)
      UNION ALL
      SELECT format('policy:%s.%s:%s:%s', schemaname, tablename, policyname, cmd) AS x
      FROM pg_policies
      WHERE schemaname IN ('public','storage')
    ) s;"
}

assert_scalar() {
  local sql="$1"
  local expected="$2"
  local label="$3"
  local actual
  actual="$(db_psql -Atc "$sql")"
  if [[ "$actual" != "$expected" ]]; then
    echo "ASSERTION FAILED [$label]: expected '$expected', got '$actual'" >&2
    exit 1
  fi
  echo "PASS [$label] = $actual"
}

wait_for_postgres
reset_database

echo "==> Preparing minimal local Supabase compatibility catalog"
db_psql -f "$COMPAT_FILE" >/dev/null

echo "==> Applying canonical migrations"
migration_count=0
while IFS= read -r migration; do
  echo "    $(basename "$migration")"
  db_psql -f "$migration" >/dev/null
  migration_count=$((migration_count + 1))
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ "$migration_count" -ne 36 ]]; then
  echo "Expected 36 canonical migrations, applied $migration_count" >&2
  exit 1
fi

echo "==> Seeding synthetic-only rehearsal data"
db_psql <<'SQL' >/dev/null
INSERT INTO auth.users(id, email)
VALUES ('10000000-0000-0000-0000-000000000001', 'restore-rehearsal@example.invalid');

INSERT INTO public.profiles(user_id, display_name)
VALUES ('10000000-0000-0000-0000-000000000001', 'Synthetic Restore User');

INSERT INTO public.workspaces(id, kind, name, owner_user_id)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'PERSONAL',
  'Synthetic Restore Workspace',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.workspace_memberships(workspace_id, user_id, role)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'OWNER'
);

INSERT INTO public.academic_years(id, workspace_id, label, starts_on, ends_on, is_active)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '2099/2100',
  DATE '2099-09-01',
  DATE '2100-08-31',
  true
);

INSERT INTO public.planner_tasks(
  id, workspace_id, academic_year_id, title, notes, status, priority,
  planned_for, source_kind, source_ref, created_by
)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Synthetic restore sentinel',
  'No real user data',
  'OPEN',
  'NORMAL',
  DATE '2099-09-02',
  'SYSTEM',
  'restore-rehearsal',
  '10000000-0000-0000-0000-000000000001'
);
SQL

assert_scalar "SELECT count(*) FROM auth.users WHERE email = 'restore-rehearsal@example.invalid';" "1" "synthetic auth user before backup"
assert_scalar "SELECT count(*) FROM public.workspaces WHERE id = '20000000-0000-0000-0000-000000000001';" "1" "workspace before backup"
assert_scalar "SELECT count(*) FROM public.planner_tasks WHERE id = '40000000-0000-0000-0000-000000000001';" "1" "planner sentinel before backup"
assert_scalar "SELECT count(*) FROM storage.buckets WHERE id = 'knowledge-assets' AND public = false;" "1" "private knowledge bucket before backup"

fingerprint_before="$(schema_fingerprint)"
if [[ -z "$fingerprint_before" ]]; then
  echo "Schema fingerprint before backup is empty" >&2
  exit 1
fi

echo "==> Creating logical backup"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DB_NAME" --file="$BACKUP_FILE"
test -s "$BACKUP_FILE"

backup_bytes="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
echo "Backup bytes: $backup_bytes"

echo "==> Simulating total database loss"
reset_database
assert_scalar "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces';" "0" "database destroyed"

echo "==> Restoring backup into fresh database"
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$DB_NAME" "$BACKUP_FILE"

fingerprint_after="$(schema_fingerprint)"
if [[ "$fingerprint_after" != "$fingerprint_before" ]]; then
  echo "Schema fingerprint mismatch after restore" >&2
  echo "before=$fingerprint_before" >&2
  echo "after=$fingerprint_after" >&2
  exit 1
fi

echo "PASS [schema fingerprint] = $fingerprint_after"

assert_scalar "SELECT count(*) FROM auth.users WHERE id = '10000000-0000-0000-0000-000000000001' AND email = 'restore-rehearsal@example.invalid';" "1" "synthetic auth row restored"
assert_scalar "SELECT count(*) FROM public.workspaces WHERE id = '20000000-0000-0000-0000-000000000001' AND name = 'Synthetic Restore Workspace';" "1" "workspace restored"
assert_scalar "SELECT count(*) FROM public.workspace_memberships WHERE workspace_id = '20000000-0000-0000-0000-000000000001' AND role = 'OWNER';" "1" "membership restored"
assert_scalar "SELECT count(*) FROM public.academic_years WHERE id = '30000000-0000-0000-0000-000000000001' AND is_active = true;" "1" "academic year restored"
assert_scalar "SELECT count(*) FROM public.planner_tasks WHERE id = '40000000-0000-0000-0000-000000000001' AND title = 'Synthetic restore sentinel';" "1" "planner sentinel restored"
assert_scalar "SELECT count(*) FROM storage.buckets WHERE id = 'knowledge-assets' AND public = false;" "1" "storage catalog restored"
assert_scalar "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;" "$(db_psql -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;")" "RLS catalog readable after restore"

cat <<EOF
{
  "result": "PASS",
  "scope": "POSTGRES_DB_LOGICAL_RESTORE",
  "environment": "EPHEMERAL_GITHUB_ACTIONS_POSTGRES",
  "canonicalMigrationsApplied": $migration_count,
  "syntheticDataOnly": true,
  "backupBytes": $backup_bytes,
  "schemaFingerprint": "$fingerprint_after",
  "supabaseAuthServiceProven": false,
  "supabaseStorageObjectRecoveryProven": false,
  "productionTouched": false,
  "betaTouched": false
}
EOF
