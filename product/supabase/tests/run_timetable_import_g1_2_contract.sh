#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST="$ROOT_DIR/supabase/tests/timetable_import_g1_2_contract.sql"

psql -X "$DB_URL" -v ON_ERROR_STOP=1 -f "$TEST"
