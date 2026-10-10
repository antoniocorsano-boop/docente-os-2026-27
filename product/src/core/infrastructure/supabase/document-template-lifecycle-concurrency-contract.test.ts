import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const activationSerializationMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/0092_document_template_activation_serialization.sql',
)
const institutionalBaseQualityHardeningMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/0093_institutional_base_quality_hardening.sql',
)

function readActivationSql() {
  return readFileSync(activationSerializationMigrationPath, 'utf8')
}

test('template activation serializes the workspace-kind family before any target or displaced row lock', () => {
  const sql = readActivationSql()
  const lockMarker = "'document-template-activation:'"
  const targetLookup = 'select template.workspace_id, template.status, template.document_kind'
  const displacedLookup = 'select template.id, template.status into displaced_id, displaced_status'
  const lockIndex = sql.indexOf(lockMarker)
  const targetLookupIndex = sql.indexOf(targetLookup)
  const displacedLookupIndex = sql.indexOf(displacedLookup)

  assert.ok(lockIndex >= 0, 'expected a transaction-scoped template family lock')
  assert.ok(targetLookupIndex >= 0, 'expected target template lookup')
  assert.ok(displacedLookupIndex >= 0, 'expected displaced template lookup')
  assert.ok(lockIndex < targetLookupIndex, 'template family lock must be acquired before target row lock')
  assert.ok(lockIndex < displacedLookupIndex, 'template family lock must be acquired before displaced lookup')
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock\s*\(/i)
  assert.match(sql, /lock_workspace::text\s*\|\|\s*':'\s*\|\|\s*lock_kind/i)
})

test('institutional base activation serializes the workspace before any target or displaced row lock', () => {
  const sql = readActivationSql()
  const lockMarker = "'institutional-base-activation:'"
  const targetLookup = 'select base.workspace_id, base.status into workspace, current_status'
  const displacedLookup = 'select base.id, base.status into displaced_id, displaced_status'
  const lockIndex = sql.indexOf(lockMarker)
  const targetLookupIndex = sql.indexOf(targetLookup)
  const displacedLookupIndex = sql.indexOf(displacedLookup)

  assert.ok(lockIndex >= 0, 'expected a transaction-scoped institutional base lock')
  assert.ok(targetLookupIndex >= 0, 'expected target institutional base lookup')
  assert.ok(displacedLookupIndex >= 0, 'expected displaced institutional base lookup')
  assert.ok(lockIndex < targetLookupIndex, 'institutional base lock must be acquired before target row lock')
  assert.ok(lockIndex < displacedLookupIndex, 'institutional base lock must be acquired before displaced lookup')
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock\s*\(/i)
})

test('trusted institutional base quality review validates the full typed profile before PASS', () => {
  assert.equal(
    existsSync(institutionalBaseQualityHardeningMigrationPath),
    true,
    'expected additive migration 0093 for trusted institutional-base quality hardening',
  )

  const sql = readFileSync(institutionalBaseQualityHardeningMigrationPath, 'utf8')
  for (const code of [
    'INVALID_IDENTITY_PROFILE',
    'INVALID_HEADER_PROFILE',
    'INVALID_FOOTER_PROFILE',
    'INVALID_TYPOGRAPHY_PROFILE',
    'INVALID_PAGE_GEOMETRY_PROFILE',
    'INVALID_COMMON_TABLE_PROFILE',
    'INVALID_SIGNATURE_PROFILE',
    'INVALID_ACCESSIBILITY_PROFILE',
  ]) {
    assert.match(sql, new RegExp(code))
  }
  assert.match(sql, /jsonb_typeof\([^\n]+\)\s+is\s+distinct\s+from\s+'boolean'/i)
  assert.match(sql, /jsonb_typeof\([^\n]+\)\s+is\s+distinct\s+from\s+'number'/i)
  assert.match(sql, /create or replace function private\.compute_institutional_base_quality_review/i)
  assert.match(sql, /advance_runtime_schema_contract\('0093_institutional_base_quality_hardening'\)/i)
})

test('serialized activation advances the runtime schema contract at migration 0092', () => {
  const sql = readActivationSql()
  assert.match(sql, /values \(92, '0092_document_template_activation_serialization'\)/i)
  assert.match(sql, /advance_runtime_schema_contract\('0092_document_template_activation_serialization'\)/i)
})
