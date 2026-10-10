import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const structuralIngressMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/0096_document_template_structural_ingress_guard.sql',
)

test('document-template ingress rejects string-valued embedded versions before persistence', () => {
  const sql = readFileSync(structuralIngressMigrationPath, 'utf8')

  assert.match(
    sql,
    /jsonb_typeof\(target_schema_json->'version'\)\s+is\s+distinct\s+from\s+'number'/i,
  )
  assert.match(sql, /template version must be a JSON number/i)
})
