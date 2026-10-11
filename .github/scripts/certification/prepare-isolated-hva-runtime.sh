#!/usr/bin/env bash
set -euo pipefail

mode="${1:-prepare}"
repo_root="$(git rev-parse --show-toplevel)"

if [ "$mode" = 'stop' ]; then
  if [ -n "${ISOLATED_SUPABASE_DIR:-}" ] && [ -d "$ISOLATED_SUPABASE_DIR" ]; then
    cd "$ISOLATED_SUPABASE_DIR"
    supabase stop --no-backup >/dev/null 2>&1 || true
  fi
  exit 0
fi

if [ "$mode" != 'prepare' ]; then
  echo "Unsupported isolated runtime mode: $mode" >&2
  exit 2
fi

: "${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_ENV:?GITHUB_ENV is required}"
: "${TESTED_SHA:?TESTED_SHA is required}"

work="$RUNNER_TEMP/docente-os-isolated-hva-${GITHUB_RUN_ID:-local}"
rm -rf "$work"
mkdir -p "$work"
cd "$work"
supabase init
rm -rf supabase/migrations
mkdir -p supabase/migrations

# The repository intentionally contains historical duplicate numeric prefixes.
# Local certification preserves canonical lexical SQL order while assigning
# synthetic unique versions exactly as Product CI's deep replay does.
i=1
while IFS= read -r src; do
  version="$(printf '%014d' "$i")"
  stem="$(basename "$src" .sql)"
  cp "$src" "supabase/migrations/${version}_${stem}.sql"
  i=$((i + 1))
done < <(find "$repo_root/product/supabase/migrations" -maxdepth 1 -type f -name '*.sql' | sort)

supabase start
supabase db reset --local --no-seed

status_env="$(supabase status -o env)"
eval "$status_env"
api_url="${API_URL:?Supabase local API_URL unavailable}"
publishable_key="${PUBLISHABLE_KEY:-${ANON_KEY:-}}"
service_role_key="${SERVICE_ROLE_KEY:-${SECRET_KEY:-}}"
test -n "$publishable_key"
test -n "$service_role_key"

export NEXT_PUBLIC_SUPABASE_URL="$api_url"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$publishable_key"
export ISOLATED_SUPABASE_SERVICE_ROLE_KEY="$service_role_key"

{
  echo "ISOLATED_SUPABASE_DIR=$work"
  echo "NEXT_PUBLIC_SUPABASE_URL=$api_url"
  echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$publishable_key"
  echo "CPRI_TESTED_SHA=$TESTED_SHA"
} >> "$GITHUB_ENV"

cd "$repo_root/product"
node scripts/experience/bootstrap-isolated-runtime.mjs

echo "Isolated exact-head Supabase runtime prepared for $TESTED_SHA"
