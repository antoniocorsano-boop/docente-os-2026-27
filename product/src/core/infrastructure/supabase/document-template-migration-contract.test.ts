import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/0087_document_template_registry.sql')

test('document template registry migration enforces governed persistence', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(sql, /enable row level security/i)
  assert.match(sql, /revoke insert, update, delete/i)
  assert.match(sql, /activate_document_template_version/i)
  assert.match(sql, /Human Review|quality_review/i)
  assert.match(sql, /document_template_versions/i)
  assert.match(sql, /source_asset_id uuid/i)
  assert.match(sql, /active_version_no/i)
  assert.match(sql, /runtime_schema_required_migrations/i)
  assert.match(sql, /advance_runtime_schema_contract\('0087_document_template_registry'\)/i)
})
