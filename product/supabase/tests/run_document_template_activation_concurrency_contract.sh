#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo 'DATABASE_URL or db url argument is required' >&2
  exit 1
fi

OWNER_ID='00000000-0000-4000-8000-000000000941'
WORKSPACE_ID='00000000-0000-4000-8000-000000000950'
CLAIMS="{\"sub\":\"$OWNER_ID\",\"aal\":\"aal2\"}"

psql_cmd() {
  psql -X "$DB_URL" -v ON_ERROR_STOP=1 "$@"
}

family_a=''
family_b=''
base_a=''
base_b=''
tmp_dir="$(mktemp -d)"

cleanup() {
  psql_cmd -qc "delete from public.workspaces where id = '$WORKSPACE_ID'::uuid; delete from auth.users where id = '$OWNER_ID'::uuid;" >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

psql_cmd <<'SQL'
insert into auth.users(id, email)
values ('00000000-0000-4000-8000-000000000941', 'doc-tpl-concurrency@example.invalid')
on conflict (id) do nothing;

insert into public.workspaces(id, kind, name, owner_user_id)
values (
  '00000000-0000-4000-8000-000000000950',
  'PERSONAL',
  'DOC-TPL concurrency fixture',
  '00000000-0000-4000-8000-000000000941'
);

insert into public.workspace_memberships(workspace_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000950',
  '00000000-0000-4000-8000-000000000941',
  'OWNER'
);

set role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000941","aal":"aal2"}',
  false
);

create or replace function pg_temp.family_schema(target_version integer)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'kind', 'FINAL_REPORT',
    'name', 'Relazione finale del docente',
    'version', target_version,
    'sourceRevisionRefs', '[]'::jsonb,
    'sections', jsonb_build_array(jsonb_build_object(
      'key', 'IDENTITY',
      'label', 'Intestazione',
      'purpose', 'Identificare il documento professionale',
      'required', true,
      'repeatable', false,
      'renderRole', 'KEY_VALUE',
      'fields', jsonb_build_array(jsonb_build_object(
        'key', 'class.label',
        'label', 'Classe',
        'type', 'TEXT_SHORT',
        'required', true,
        'cardinality', 'ONE',
        'valuePolicy', 'TEACHER_INPUT',
        'privacyClass', 'PROFESSIONAL_CONTEXT'
      ))
    ))
  );
$$;

create or replace function pg_temp.base_profile(target_version integer)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'version', target_version,
    'identityProfile', jsonb_build_object(
      'institutionName', 'I.C. Calvario-Covotta – don Lorenzo Milani',
      'logoAssetRef', null
    ),
    'headerProfile', jsonb_build_object('lines', jsonb_build_array('Istituto Comprensivo')),
    'footerProfile', jsonb_build_object('lines', '[]'::jsonb),
    'typographyProfile', jsonb_build_object(
      'bodyFontFamily', 'Arial', 'headingFontFamily', 'Arial',
      'baseFontSizePt', 11, 'lineHeight', 1.3
    ),
    'pageGeometryProfile', jsonb_build_object(
      'format', 'A4', 'orientation', 'PORTRAIT',
      'marginTopMm', 18, 'marginRightMm', 18, 'marginBottomMm', 18, 'marginLeftMm', 18
    ),
    'commonTableProfile', jsonb_build_object(
      'headerWeight', 'BOLD', 'cellPaddingMm', 2, 'repeatHeader', true
    ),
    'signatureProfile', jsonb_build_object(
      'showLocation', true, 'showDate', true, 'label', 'Il docente'
    ),
    'accessibilityProfile', jsonb_build_object(
      'minimumFontSizePt', 10, 'highContrast', true, 'tableHeadersRequired', true
    ),
    'sourceRevisionRefs', '[]'::jsonb
  );
$$;

select public.create_document_template(
  '00000000-0000-4000-8000-000000000950'::uuid,
  'FINAL_REPORT',
  'Concurrency family A'
) as family_a \gset
select public.create_document_template(
  '00000000-0000-4000-8000-000000000950'::uuid,
  'FINAL_REPORT',
  'Concurrency family B'
) as family_b \gset

select public.save_document_template_version(:'family_a'::uuid, 0, pg_temp.family_schema(1), '{}'::uuid[]);
select public.record_document_template_quality_review(:'family_a'::uuid, 1, 'PASS', '[]'::jsonb, 'Concurrency family A');
select public.save_document_template_version(:'family_b'::uuid, 0, pg_temp.family_schema(1), '{}'::uuid[]);
select public.record_document_template_quality_review(:'family_b'::uuid, 1, 'PASS', '[]'::jsonb, 'Concurrency family B');
select public.activate_document_template_version(:'family_a'::uuid, 1, true);

select public.create_institutional_base(
  '00000000-0000-4000-8000-000000000950'::uuid,
  'Concurrency base A'
) as base_a \gset
select public.create_institutional_base(
  '00000000-0000-4000-8000-000000000950'::uuid,
  'Concurrency base B'
) as base_b \gset

select public.save_institutional_base_version(:'base_a'::uuid, 0, pg_temp.base_profile(1), '{}'::uuid[]);
select public.record_institutional_base_quality_review(:'base_a'::uuid, 1, 'PASS', '[]'::jsonb, 'Concurrency base A');
select public.save_institutional_base_version(:'base_b'::uuid, 0, pg_temp.base_profile(1), '{}'::uuid[]);
select public.record_institutional_base_quality_review(:'base_b'::uuid, 1, 'PASS', '[]'::jsonb, 'Concurrency base B');
select public.activate_institutional_base_version(:'base_a'::uuid, 1, true);

reset role;
SQL

family_a="$(psql_cmd -Atqc "select id from public.document_templates where workspace_id='$WORKSPACE_ID'::uuid and name='Concurrency family A'")"
family_b="$(psql_cmd -Atqc "select id from public.document_templates where workspace_id='$WORKSPACE_ID'::uuid and name='Concurrency family B'")"
base_a="$(psql_cmd -Atqc "select id from public.institutional_bases where workspace_id='$WORKSPACE_ID'::uuid and name='Concurrency base A'")"
base_b="$(psql_cmd -Atqc "select id from public.institutional_bases where workspace_id='$WORKSPACE_ID'::uuid and name='Concurrency base B'")"

for id in "$family_a" "$family_b" "$base_a" "$base_b"; do
  if [[ -z "$id" ]]; then
    echo 'Failed to resolve concurrency fixture identity' >&2
    exit 1
  fi
done

wait_for_granted_advisory() {
  local app="$1"
  for _ in $(seq 1 80); do
    if [[ "$(psql_cmd -Atqc "select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='$app' and l.locktype='advisory' and l.granted")" != "0" ]]; then
      return 0
    fi
    sleep 0.1
  done
  echo "Timed out waiting for advisory lock holder: $app" >&2
  return 1
}

wait_for_advisory_waiter() {
  local app="$1"
  for _ in $(seq 1 80); do
    if [[ "$(psql_cmd -Atqc "select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='$app' and l.locktype='advisory' and not l.granted")" != "0" ]]; then
      return 0
    fi
    sleep 0.1
  done
  echo "Timed out waiting for activation session on advisory lock: $app" >&2
  return 1
}

release_blocker() {
  local app="$1"
  psql_cmd -Atqc "select pg_terminate_backend(pid) from pg_stat_activity where application_name='$app'" >/dev/null || true
}

check_activation_logs() {
  local preferred_log="$1"
  local other_log="$2"
  local preferred_status="$3"
  local other_status="$4"
  local label="$5"

  if grep -qi 'deadlock detected' "$preferred_log" "$other_log"; then
    echo "FAIL: $label produced a database deadlock" >&2
    cat "$preferred_log" "$other_log" >&2
    exit 1
  fi
  if [[ "$preferred_status" -ne 0 ]]; then
    echo "FAIL: preferred replacement activation failed for $label" >&2
    cat "$preferred_log" >&2
    exit 1
  fi
  if [[ "$other_status" -ne 0 ]] && ! grep -q 'cannot mutate RETIRED identity' "$other_log"; then
    echo "FAIL: competing activation failed for an unexpected reason in $label" >&2
    cat "$other_log" >&2
    exit 1
  fi
  echo "PASS: $label serialized without deadlock"
}

run_family_concurrency() {
  local blocker_app='doc-tpl-family-blocker'
  local preferred_app='doc-tpl-family-b'
  local other_app='doc-tpl-family-a'
  local blocker_log="$tmp_dir/family-blocker.log"
  local preferred_log="$tmp_dir/family-b.log"
  local other_log="$tmp_dir/family-a.log"

  PGAPPNAME="$blocker_app" psql -X "$DB_URL" -v ON_ERROR_STOP=1 -qc \
    "select pg_advisory_lock(pg_catalog.hashtextextended('document-template-activation:$WORKSPACE_ID:FINAL_REPORT',0)); select pg_sleep(60);" \
    >"$blocker_log" 2>&1 &
  local blocker_pid=$!
  wait_for_granted_advisory "$blocker_app"

  PGAPPNAME="$preferred_app" psql -X "$DB_URL" -v ON_ERROR_STOP=1 -qc \
    "set role authenticated; select set_config('request.jwt.claims','$CLAIMS',false); select public.activate_document_template_version('$family_b'::uuid,1,true);" \
    >"$preferred_log" 2>&1 &
  local preferred_pid=$!
  wait_for_advisory_waiter "$preferred_app"

  PGAPPNAME="$other_app" psql -X "$DB_URL" -v ON_ERROR_STOP=1 -qc \
    "set role authenticated; select set_config('request.jwt.claims','$CLAIMS',false); select public.activate_document_template_version('$family_a'::uuid,1,true);" \
    >"$other_log" 2>&1 &
  local other_pid=$!
  wait_for_advisory_waiter "$other_app"

  release_blocker "$blocker_app"
  wait "$blocker_pid" >/dev/null 2>&1 || true

  set +e
  wait "$preferred_pid"; local preferred_status=$?
  wait "$other_pid"; local other_status=$?
  set -e
  check_activation_logs "$preferred_log" "$other_log" "$preferred_status" "$other_status" 'family activation'
}

run_base_concurrency() {
  local blocker_app='doc-tpl-base-blocker'
  local preferred_app='doc-tpl-base-b'
  local other_app='doc-tpl-base-a'
  local blocker_log="$tmp_dir/base-blocker.log"
  local preferred_log="$tmp_dir/base-b.log"
  local other_log="$tmp_dir/base-a.log"

  PGAPPNAME="$blocker_app" psql -X "$DB_URL" -v ON_ERROR_STOP=1 -qc \
    "select pg_advisory_lock(pg_catalog.hashtextextended('institutional-base-activation:$WORKSPACE_ID',0)); select pg_sleep(60);" \
    >"$blocker_log" 2>&1 &
  local blocker_pid=$!
  wait_for_granted_advisory "$blocker_app"

  PGAPPNAME="$preferred_app" psql -X "$DB_URL" -v ON_ERROR_STOP=1 -qc \
    "set role authenticated; select set_config('request.jwt.claims','$CLAIMS',false); select public.activate_institutional_base_version('$base_b'::uuid,1,true);" \
    >"$preferred_log" 2>&1 &
  local preferred_pid=$!
  wait_for_advisory_waiter "$preferred_app"

  PGAPPNAME="$other_app" psql -X "$DB_URL" -v ON_ERROR_STOP=1 -qc \
    "set role authenticated; select set_config('request.jwt.claims','$CLAIMS',false); select public.activate_institutional_base_version('$base_a'::uuid,1,true);" \
    >"$other_log" 2>&1 &
  local other_pid=$!
  wait_for_advisory_waiter "$other_app"

  release_blocker "$blocker_app"
  wait "$blocker_pid" >/dev/null 2>&1 || true

  set +e
  wait "$preferred_pid"; local preferred_status=$?
  wait "$other_pid"; local other_status=$?
  set -e
  check_activation_logs "$preferred_log" "$other_log" "$preferred_status" "$other_status" 'institutional base activation'
}

run_family_concurrency

if [[ "$(psql_cmd -Atqc "select count(*) from public.document_templates where workspace_id='$WORKSPACE_ID'::uuid and document_kind='FINAL_REPORT' and status='ACTIVE'")" != '1' ]]; then
  echo 'FAIL: family activation did not converge to exactly one ACTIVE identity' >&2
  exit 1
fi
if [[ "$(psql_cmd -Atqc "select status || ':' || coalesce(active_version_no::text,'NULL') from public.document_templates where id='$family_b'::uuid")" != 'ACTIVE:1' ]]; then
  echo 'FAIL: preferred family identity is not ACTIVE on exact version 1' >&2
  exit 1
fi
if [[ "$(psql_cmd -Atqc "select status || ':' || coalesce(active_version_no::text,'NULL') from public.document_templates where id='$family_a'::uuid")" != 'RETIRED:NULL' ]]; then
  echo 'FAIL: displaced family identity is not terminal RETIRED with cleared pointer' >&2
  exit 1
fi
if [[ "$(psql_cmd -Atqc "select count(*) from public.document_template_lifecycle_decisions where template_id='$family_a'::uuid and action='RETIRED_BY_REPLACEMENT'")" == '0' ]]; then
  echo 'FAIL: displaced family replacement evidence missing' >&2
  exit 1
fi
echo 'PASS: family activation converged to one ACTIVE identity with replacement evidence'

run_base_concurrency

if [[ "$(psql_cmd -Atqc "select count(*) from public.institutional_bases where workspace_id='$WORKSPACE_ID'::uuid and status='ACTIVE'")" != '1' ]]; then
  echo 'FAIL: institutional base activation did not converge to exactly one ACTIVE identity' >&2
  exit 1
fi
if [[ "$(psql_cmd -Atqc "select status || ':' || coalesce(active_version_no::text,'NULL') from public.institutional_bases where id='$base_b'::uuid")" != 'ACTIVE:1' ]]; then
  echo 'FAIL: preferred institutional base is not ACTIVE on exact version 1' >&2
  exit 1
fi
if [[ "$(psql_cmd -Atqc "select status || ':' || coalesce(active_version_no::text,'NULL') from public.institutional_bases where id='$base_a'::uuid")" != 'RETIRED:NULL' ]]; then
  echo 'FAIL: displaced institutional base is not terminal RETIRED with cleared pointer' >&2
  exit 1
fi
if [[ "$(psql_cmd -Atqc "select count(*) from public.institutional_base_lifecycle_decisions where base_id='$base_a'::uuid and action='RETIRED_BY_REPLACEMENT'")" == '0' ]]; then
  echo 'FAIL: displaced institutional base replacement evidence missing' >&2
  exit 1
fi
echo 'PASS: institutional base activation converged to one ACTIVE identity with replacement evidence'

echo 'DOC_TPL_ACTIVATION_CONCURRENCY_CONTRACT_PASS'
