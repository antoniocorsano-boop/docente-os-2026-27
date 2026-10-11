import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const structuralIngressMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/0096_document_template_structural_ingress_guard.sql',
)

const packageJsonPath = resolve(process.cwd(), 'package.json')

test('document-template ingress rejects string-valued embedded versions before persistence', () => {
  const sql = readFileSync(structuralIngressMigrationPath, 'utf8')

  assert.match(
    sql,
    /jsonb_typeof\(target_schema_json->'version'\)\s+is\s+distinct\s+from\s+'number'/i,
  )
  assert.match(sql, /template version must be a JSON number/i)
})

test('document-template ingress binds embedded kind and version to the locked registry identity', () => {
  const sql = readFileSync(structuralIngressMigrationPath, 'utf8')

  assert.match(sql, /template\.document_kind/i)
  assert.match(sql, /target_schema_json->>'kind'/i)
  assert.match(sql, /expected_current_version\s*\+\s*1/i)
  assert.match(sql, /template schema kind must match template identity/i)
  assert.match(sql, /template schema version must match next registry version/i)
})

test('canonical npm test executes the residual document-template contracts', () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    scripts?: { test?: string }
  }
  const testScript = packageJson.scripts?.test ?? ''

  for (const residualTest of [
    'src/app/documentazione/modelli/template-builder-trusted-review-residual.test.ts',
    'src/core/application/document-template-quality-residual-contract.test.ts',
    'src/core/infrastructure/supabase/document-template-trusted-purity-residual.test.ts',
  ]) {
    assert.match(testScript, new RegExp(residualTest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
