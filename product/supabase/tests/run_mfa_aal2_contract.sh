#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BOOTSTRAP="$ROOT_DIR/supabase/tests/mfa_aal2_ci_bootstrap.sql"
MIGRATION="$ROOT_DIR/supabase/migrations/0051_mfa_aal2_enforcement.sql"
USER_ID="00000000-0000-0000-0000-000000000001"
WORKSPACE_ID="00000000-0000-0000-0000-000000000100"
AAL1="{\"sub\":\"$USER_ID\",\"aal\":\"aal1\"}"
AAL2="{\"sub\":\"$USER_ID\",\"aal\":\"aal2\"}"

psql_cmd() {
  psql -X "$DB_URL" -v ON_ERROR_STOP=1 "$@"
}

role_query() {
  local claims="$1"
  local sql="$2"
  psql_cmd -Atqc "set role authenticated; select set_config('request.jwt.claims', '$claims', false); $sql" | tail -n 1
}

expect_eq() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $label (expected '$expected', got '$actual')" >&2
    exit 1
  fi
  echo "PASS: $label"
}

expect_role_failure() {
  local claims="$1"
  local sql="$2"
  local label="$3"
  local log
  log="$(mktemp)"
  if psql_cmd -qc "set role authenticated; select set_config('request.jwt.claims', '$claims', false); $sql" >"$log" 2>&1; then
    echo "FAIL: $label unexpectedly succeeded" >&2
    cat "$log" >&2
    rm -f "$log"
    exit 1
  fi
  echo "PASS: $label"
  rm -f "$log"
}

echo "== Bootstrap isolated Supabase-like schema =="
psql_cmd -f "$BOOTSTRAP"

echo "== Apply repository migration 0051 =="
psql_cmd -f "$MIGRATION"

echo "== JWT guard =="
expect_eq "$(role_query '{}' "select private.current_session_is_aal2();")" "f" "missing AAL fails closed"
expect_eq "$(role_query "$AAL1" "select private.current_session_is_aal2();")" "f" "aal1 fails closed"
expect_eq "$(role_query "$AAL2" "select private.current_session_is_aal2();")" "t" "aal2 is accepted"

echo "== Workspace membership guard =="
expect_eq "$(role_query "$AAL1" "select private.is_workspace_member('$WORKSPACE_ID'::uuid);")" "f" "aal1 cannot use workspace membership"
expect_eq "$(role_query "$AAL2" "select private.is_workspace_member('$WORKSPACE_ID'::uuid);")" "t" "aal2 preserves workspace membership"

echo "== Restrictive public-table RLS =="
expect_eq "$(role_query "$AAL1" "select count(*) from public.probe_data;")" "0" "aal1 cannot read application rows"
expect_eq "$(role_query "$AAL2" "select count(*) from public.probe_data;")" "1" "aal2 can read rows allowed by existing policy"
expect_role_failure "$AAL1" "insert into public.probe_data(workspace_id, note) values ('$WORKSPACE_ID', 'aal1-write');" "aal1 insert is denied by restrictive RLS"
psql_cmd -qc "set role authenticated; select set_config('request.jwt.claims', '$AAL2', false); insert into public.probe_data(workspace_id, note) values ('$WORKSPACE_ID', 'aal2-write');"
expect_eq "$(psql_cmd -Atqc "select count(*) from public.probe_data where note = 'aal2-write';")" "1" "aal2 insert succeeds"

echo "== SECURITY DEFINER boundaries =="
expect_role_failure "$AAL1" "select public.bootstrap_personal_workspace('Blocked bootstrap');" "aal1 bootstrap RPC is denied"
psql_cmd -qc "set role authenticated; select set_config('request.jwt.claims', '$AAL2', false); select public.bootstrap_personal_workspace('Allowed bootstrap');"
expect_eq "$(psql_cmd -Atqc "select count(*) from public.user_workspace_preferences where user_id = '$USER_ID'::uuid;")" "1" "aal2 bootstrap can initialize preference state"
expect_eq "$(role_query "$AAL1" "select public.probe_guarded_rpc('$WORKSPACE_ID'::uuid);")" "f" "aal1 guarded SECURITY DEFINER RPC is denied"
expect_eq "$(psql_cmd -Atqc "select count(*) from public.rpc_probe_log;")" "0" "aal1 guarded RPC writes nothing"
expect_eq "$(role_query "$AAL2" "select public.probe_guarded_rpc('$WORKSPACE_ID'::uuid);")" "t" "aal2 guarded SECURITY DEFINER RPC succeeds"
expect_eq "$(psql_cmd -Atqc "select count(*) from public.rpc_probe_log;")" "1" "aal2 guarded RPC records exactly one write"

echo "== Storage RLS =="
expect_eq "$(role_query "$AAL1" "select count(*) from storage.objects;")" "0" "aal1 cannot read Storage objects"
expect_eq "$(role_query "$AAL2" "select count(*) from storage.objects;")" "1" "aal2 can read Storage object allowed by existing policy"
expect_role_failure "$AAL1" "insert into storage.objects(bucket_id, name, owner_id) values ('knowledge-assets', '$WORKSPACE_ID/aal1.pdf', '$USER_ID');" "aal1 Storage insert is denied"
psql_cmd -qc "set role authenticated; select set_config('request.jwt.claims', '$AAL2', false); insert into storage.objects(bucket_id, name, owner_id) values ('knowledge-assets', '$WORKSPACE_ID/aal2.pdf', '$USER_ID');"
expect_eq "$(psql_cmd -Atqc "select count(*) from storage.objects where name = '$WORKSPACE_ID/aal2.pdf';")" "1" "aal2 Storage insert succeeds"

echo "== Future-table ratchet =="
psql_cmd -qc "create table public.future_probe(id bigint generated always as identity primary key, note text not null); create policy future_probe_permissive on public.future_probe for all to authenticated using (true) with check (true); grant select, insert on public.future_probe to authenticated; grant usage, select on sequence public.future_probe_id_seq to authenticated; insert into public.future_probe(note) values ('seed');"
expect_eq "$(psql_cmd -Atqc "select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relname='future_probe';")" "t" "future public table gets RLS automatically"
expect_eq "$(psql_cmd -Atqc "select count(*) from pg_policies where schemaname='public' and tablename='future_probe' and policyname='mfa_aal2_required' and permissive='RESTRICTIVE';")" "1" "future public table gets restrictive MFA policy"
expect_eq "$(role_query "$AAL1" "select count(*) from public.future_probe;")" "0" "future table denies aal1"
expect_eq "$(role_query "$AAL2" "select count(*) from public.future_probe;")" "1" "future table allows aal2 through existing policy"

echo "MFA_AAL2_DATA_PLANE_CONTRACT_PASS"
