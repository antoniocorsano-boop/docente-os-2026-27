import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/0095_document_template_trusted_purity.sql')

test('trusted purity migration hardens both institutional base and family streams', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(sql, /values\s*\(95,\s*'0095_document_template_trusted_purity'\)/i)
  assert.match(sql, /compute_institutional_base_quality_review_v0093/i)
  assert.match(sql, /document_template_external_purity_findings/i)
  assert.match(sql, /institutional_base_external_purity_findings/i)
  assert.match(sql, /DERIVED\|TEACHER_INPUT\|STATIC/i)
  assert.match(sql, /PUBLIC_INSTITUTIONAL\|PROFESSIONAL_CONTEXT\|AGGREGATE_CLASS_DATA/i)
  assert.match(sql, /document_template_versions/i)
  assert.match(sql, /institutional_base_versions/i)
  assert.match(sql, /advance_runtime_schema_contract\('0095_document_template_trusted_purity'\)/i)
})
