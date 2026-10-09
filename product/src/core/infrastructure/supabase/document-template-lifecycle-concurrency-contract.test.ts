import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const activationSerializationMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/0092_document_template_activation_serialization.sql',
)

function readActivationSql() {
  return readFileSync(activationSerializationMigrationPath, 'utf8')
}

test('template activation serializes the workspace-kind family before displaced lookup', () => {
  const sql = readActivationSql()
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
  const sql = readActivationSql()
  const lockMarker = "'institutional-base-activation:'"
  const displacedLookup = 'select base.id, base.status into displaced_id, displaced_status'
  const lockIndex = sql.indexOf(lockMarker)
  const lookupIndex = sql.indexOf(displacedLookup)

  assert.ok(lockIndex >= 0, 'expected a transaction-scoped institutional base lock')
  assert.ok(lookupIndex >= 0, 'expected displaced institutional base lookup')
  assert.ok(lockIndex < lookupIndex, 'institutional base lock must be acquired before displaced lookup')
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock\s*\(/i)
})

test('serialized activation advances the runtime schema contract at migration 0092', () => {
  const sql = readActivationSql()
  assert.match(sql, /values \(92, '0092_document_template_activation_serialization'\)/i)
  assert.match(sql, /advance_runtime_schema_contract\('0092_document_template_activation_serialization'\)/i)
})
