#!/usr/bin/env bash
# P7-DB-REAL-READINESS-01: PostgreSQL 17 synthetic encrypted-stream rehearsal.
# This script MUST NEVER read a real Supabase database or receive production credentials.
set -euo pipefail
umask 077

: "$RUNNER_TEMP"
test "$GITHUB_EVENT_NAME" = "pull_request"
test "$GITHUB_BASE_REF" = "main"
test "$P7_READINESS_SYNTHETIC_ONLY" = "yes"

# Explicitly refuse credentials or activation flags in the untrusted PR job.
for variable in P7_REAL_DATABASE_URL P7_REAL_PGPASSWORD P7_REAL_AGE_RECIPIENT \
  P7_REAL_BACKUP_APPROVED AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if printenv "$variable" >/dev/null 2>&1; then
    echo "P7_PG17_READINESS_BLOCKED: unexpected real export credential" >&2
    exit 1
  fi
done

test "$PGHOST" = "127.0.0.1"
test "$PGPORT" = "5432"
test "$PGUSER" = "postgres"
test "$PGPASSWORD" = "synthetic-only-password"
test "$PGDATABASE" = "postgres"

temp_dir="$(mktemp -d "$RUNNER_TEMP/p7-pg17-readiness.XXXXXXXX")"
cleanup() {
  status="$?"
  trap - EXIT
  rm -rf "$temp_dir"
  exit "$status"
}
trap cleanup EXIT

# PostgreSQL 17 client container talks only to the ephemeral CI service.
pg17() {
  docker run -i --rm --network host \
    -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE \
    postgres:17.6 "$@"
}

pg17 pg_dump --version | grep -F "17.6"
pg17 pg_restore --version | grep -F "17.6"

source_db="p7_pg17_synthetic_source"
restore_db="p7_pg17_synthetic_restore"
pg17 createdb "$source_db"
pg17 psql -X -v ON_ERROR_STOP=1 -d "$source_db" >/dev/null <<'SQL'
create table public.p7_pg17_backup_fixture (
  row_id integer primary key,
  marker text not null
);
insert into public.p7_pg17_backup_fixture(row_id, marker) values
  (1, 'P7_PG17_SYNTHETIC_ALPHA'),
  (2, 'P7_PG17_SYNTHETIC_BETA');
SQL

# Stream the custom-format archive directly into authenticated encryption.
# NO unencrypted backup file is ever created in the runner filesystem.
age-keygen -o "$temp_dir/ephemeral.identity" >/dev/null 2>&1
recipient="$(age-keygen -y "$temp_dir/ephemeral.identity")"
pg17 pg_dump --format=custom --no-owner --no-acl --schema=public \
  -d "$source_db" |
  age -r "$recipient" -o "$temp_dir/synthetic.dump.age"

test -s "$temp_dir/synthetic.dump.age"
if grep -a -q 'P7_PG17_SYNTHETIC_ALPHA' "$temp_dir/synthetic.dump.age"; then
  echo "P7_PG17_READINESS_BLOCKED: plaintext marker in ciphertext" >&2
  exit 1
fi

age-keygen -o "$temp_dir/unrelated.identity" >/dev/null 2>&1
if age -d -i "$temp_dir/unrelated.identity" "$temp_dir/synthetic.dump.age" >/dev/null 2>&1; then
  echo "P7_PG17_READINESS_BLOCKED: unrelated private key accepted" >&2
  exit 1
fi

pg17 createdb "$restore_db"
# Pipe decrypted data into pg_restore without a plaintext output file.
age -d -i "$temp_dir/ephemeral.identity" "$temp_dir/synthetic.dump.age" |
  pg17 pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl \
    -d "$restore_db"

restored="$(pg17 psql -X -At -v ON_ERROR_STOP=1 -d "$restore_db" \
  -c "select string_agg(row_id || ':' || marker, ',' order by row_id) from public.p7_pg17_backup_fixture")"
test "$restored" = "1:P7_PG17_SYNTHETIC_ALPHA,2:P7_PG17_SYNTHETIC_BETA"

cipher_sha256="$(sha256sum "$temp_dir/synthetic.dump.age" | cut -d ' ' -f1)"
echo "P7_PG17_SYNTHETIC_STREAM_RESTORE_PASS cipher_sha256=$cipher_sha256"
if [[ -n "$GITHUB_STEP_SUMMARY" ]]; then
  {
    echo "## P7 — PostgreSQL 17 synthetic stream-encryption readiness"
    echo
    echo "- PostgreSQL dump/restore client: **17.6**"
    echo "- Source and restore target: **two isolated synthetic databases**"
    echo "- Encrypted-stream dump/restore: **PASS**"
    echo "- Wrong private key: **rejected**"
    echo "- Unencrypted dump written to runner filesystem: **NO**"
    echo "- R2 or real Supabase accessed: **NO**"
    echo "- Ciphertext SHA-256 (synthetic only): \`$cipher_sha256\`"
    echo "- Real database export authorization: **NOT GRANTED**"
  } >> "$GITHUB_STEP_SUMMARY"
fi
