#!/usr/bin/env bash
# P7-DB-SYN-01: synthetic-only PostgreSQL -> age -> optional R2 -> restore.
# Deliberately incapable of accepting a real Supabase connection or dump.
set -euo pipefail
umask 077

MODE="$(printf '%s' "$1")"
if [[ "$MODE" != "local" && "$MODE" != "r2" ]]; then
  echo "P7_REHEARSAL_ERROR: permitted modes are local or r2" >&2
  exit 2
fi

# Defensive invariants: this test can ONLY connect to the disposable CI service.
test "$P7_SYNTHETIC_ONLY" = "yes"
test "$PGHOST" = "127.0.0.1"
test "$PGPORT" = "5432"
test "$PGUSER" = "postgres"
test "$PGDATABASE" = "postgres"
test "$PGPASSWORD" = "postgres"

TMP_DIR="$(mktemp -d "$RUNNER_TEMP/p7-db-synthetic.XXXXXXXX")"
R2_UPLOADED=0
R2_KEY=""
# cleanup: preserve the exit status, remove the private temporary directory,
# and attempt to delete any synthetic R2 object still present after failure.
cleanup() {
  status="$?"
  trap - EXIT
  if [[ "$R2_UPLOADED" == "1" ]]; then
    if ! aws s3 rm "s3://$R2_BACKUP_BUCKET/$R2_KEY" --endpoint-url "$R2_ENDPOINT" --only-show-errors >/dev/null; then
      echo "P7_REHEARSAL_ERROR: synthetic R2 cleanup failed" >&2
      status=1
    fi
  fi
  rm -rf "$TMP_DIR"
  exit "$status"
}
trap cleanup EXIT

SOURCE_DB="p7_synthetic_source"
RESTORED_DB="p7_synthetic_restored"
createdb "$SOURCE_DB"
psql -X -v ON_ERROR_STOP=1 -d "$SOURCE_DB" >/dev/null <<'SQL'
create table public.p7_backup_fixture (
  row_id integer primary key,
  marker text not null
);
insert into public.p7_backup_fixture(row_id, marker) values
  (1, 'P7_SYNTHETIC_DATABASE_ROW_ALPHA'),
  (2, 'P7_SYNTHETIC_DATABASE_ROW_BETA');
SQL

# The plaintext archive is stored ONLY in the runner's private temporary dir.
# Real Supabase backup/credentials are not part of this rehearsal.
pg_dump --format=custom --no-owner --no-acl --schema=public \
  --file="$TMP_DIR/synthetic.dump" "$SOURCE_DB"
pg_restore --list "$TMP_DIR/synthetic.dump" >/dev/null

age-keygen -o "$TMP_DIR/synthetic.identity" >/dev/null 2>&1
RECIPIENT="$(age-keygen -y "$TMP_DIR/synthetic.identity")"
age -r "$RECIPIENT" -o "$TMP_DIR/synthetic.dump.age" "$TMP_DIR/synthetic.dump"
test -s "$TMP_DIR/synthetic.dump.age"

# Ciphertext must not expose the known synthetic payload.
if grep -a -q 'P7_SYNTHETIC_DATABASE_ROW_ALPHA' "$TMP_DIR/synthetic.dump.age"; then
  echo "P7_REHEARSAL_ERROR: plaintext marker found in ciphertext" >&2
  exit 1
fi

if [[ "$MODE" == "r2" ]]; then
  test "$GITHUB_EVENT_NAME" = "push"
  test "$GITHUB_REF" = "refs/heads/develop"
  [[ "$GITHUB_RUN_ID" =~ ^[0-9]+$ ]]
  [[ "$R2_ENDPOINT" == https://* ]]
  test -n "$R2_BACKUP_BUCKET"
  test "$R2_BACKUP_BUCKET" = "docente-os-backup-eu"
  test -n "$AWS_ACCESS_KEY_ID"
  test -n "$AWS_SECRET_ACCESS_KEY"

  # Never touch the locked production/ prefix or upload unencrypted files.
  R2_KEY="rehearsal/p7-db-synthetic/$GITHUB_RUN_ID/snapshot.dump.age"
  R2_UPLOADED=1
  aws s3 cp "$TMP_DIR/synthetic.dump.age" "s3://$R2_BACKUP_BUCKET/$R2_KEY" \
    --endpoint-url "$R2_ENDPOINT" --only-show-errors
  aws s3api head-object --bucket "$R2_BACKUP_BUCKET" --key "$R2_KEY" \
    --endpoint-url "$R2_ENDPOINT" >/dev/null
  aws s3 cp "s3://$R2_BACKUP_BUCKET/$R2_KEY" "$TMP_DIR/verified.age" \
    --endpoint-url "$R2_ENDPOINT" --only-show-errors
else
  cp "$TMP_DIR/synthetic.dump.age" "$TMP_DIR/verified.age"
fi

# Verify transport preserved the exact encrypted bytes, then decrypt locally.
cmp "$TMP_DIR/synthetic.dump.age" "$TMP_DIR/verified.age"
age -d -i "$TMP_DIR/synthetic.identity" -o "$TMP_DIR/verified.dump" "$TMP_DIR/verified.age"
cmp "$TMP_DIR/synthetic.dump" "$TMP_DIR/verified.dump"

# Decryption with a different private key MUST fail.
age-keygen -o "$TMP_DIR/wrong.identity" >/dev/null 2>&1
if age -d -i "$TMP_DIR/wrong.identity" -o "$TMP_DIR/wrong.dump" \
  "$TMP_DIR/verified.age" >/dev/null 2>&1; then
  echo "P7_REHEARSAL_ERROR: ciphertext accepted an unrelated private key" >&2
  exit 1
fi

# Restore to a different, freshly created PostgreSQL database.
createdb "$RESTORED_DB"
pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl \
  -d "$RESTORED_DB" "$TMP_DIR/verified.dump"

RESTORED_MARKERS="$(psql -X -At -v ON_ERROR_STOP=1 -d "$RESTORED_DB" \
  -c "select string_agg(row_id || ':' || marker, ',' order by row_id) from public.p7_backup_fixture")"
test "$RESTORED_MARKERS" = "1:P7_SYNTHETIC_DATABASE_ROW_ALPHA,2:P7_SYNTHETIC_DATABASE_ROW_BETA"

# Cleanup is part of the acceptance contract. Never publish a PASS receipt
# until the synthetic ciphertext was successfully deleted from off-site R2.
# Keep the EXIT trap armed for all failure paths.
R2_CLEANUP_RESULT="NOT_APPLICABLE"
if [[ "$R2_UPLOADED" == "1" ]]; then
  if ! aws s3 rm "s3://$R2_BACKUP_BUCKET/$R2_KEY" \
    --endpoint-url "$R2_ENDPOINT" --only-show-errors >/dev/null; then
    echo "P7_REHEARSAL_ERROR: synthetic R2 cleanup failed before PASS receipt" >&2
    exit 1
  fi
  R2_UPLOADED=0
  R2_CLEANUP_RESULT="VERIFIED"
fi

CIPHER_SHA256="$(sha256sum "$TMP_DIR/verified.age" | cut -d ' ' -f1)"
echo "P7_DB_SYNTHETIC_BACKUP_RESTORE_PASS mode=$MODE cipher_sha256=$CIPHER_SHA256"
if [[ -n "$GITHUB_STEP_SUMMARY" ]]; then
  {
    echo "## P7 — Database backup rehearsal (synthetic only)"
    echo
    echo "- Result: **PASS**"
    echo "- Mode: **$MODE**"
    echo "- Source: **disposable local PostgreSQL with 2 synthetic rows**"
    echo "- Encryption: **age, ephemeral recipient generated inside the job**"
    echo "- Transport: **$MODE**"
    echo "- Restore: **fresh local PostgreSQL database, exact row IDs and markers verified**"
    echo "- Wrong-key decryption: **rejected**"
    echo "- R2 synthetic cleanup: **$R2_CLEANUP_RESULT**"
    echo "- Ciphertext SHA-256: \`$CIPHER_SHA256\`"
    echo "- Real Supabase access / user records: **NONE**"
    echo "- Authorization for live database backup: **NOT GRANTED**"
  } >> "$GITHUB_STEP_SUMMARY"
fi
