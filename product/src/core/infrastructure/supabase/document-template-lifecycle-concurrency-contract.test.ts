import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const lifecycleFixMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/0090_document_template_lifecycle_contract_fixes.sql',
)

function readLifecycleSql() {
  return readFileSync(lifecycleFixMigrationPath, 'utf8')
}

test('template activation serializes the workspace-kind family before displaced lookup', () => {
  const sql = readLifecycleSql()
  const lockMarker = "'document-template-activation:'"
  const displacedLookup = 'select template.id, template.status into displaced_id, displaced_status'
  const lockIndex = sql.indexOf(lockMarker)
  const lookupIndex = sql.indexOf(displacedLookup)

  assert.ok(lockIndex >= 0, 'expected a transaction-scoped template family lock')
  assert.ok(lookupIndex >= 0, 'expected displaced template lookup')
  assert.ok(lockIndex < lookupIndex, 'template family lock must be acquired before displaced lookup')
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock\s*\(/i)
  assert.match(sql, /workspace::text\s*\|\|\s*':'\s*\|\|\s*kind/i)
})

test('institutional base activation serializes the workspace before displaced lookup', () => {
  const sql = readLifecycleSql()
  const lockMarker = "'institutional-base-activation:'"
  const displacedLookup = 'select base.id, base.status into displaced_id, displaced_status'
  const lockIndex = sql.indexOf(lockMarker)
  const lookupIndex = sql.indexOf(displacedLookup)

  assert.ok(lockIndex >= 0, 'expected a transaction-scoped institutional base lock')
  assert.ok(lookupIndex >= 0, 'expected displaced institutional base lookup')
  assert.ok(lockIndex < lookupIndex, 'institutional base lock must be acquired before displaced lookup')
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock\s*\(/i)
})
