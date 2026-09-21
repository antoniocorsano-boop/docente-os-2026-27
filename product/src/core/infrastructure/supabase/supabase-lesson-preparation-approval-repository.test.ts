import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/core/infrastructure/supabase/supabase-lesson-preparation-approval-repository.ts'),
  'utf8',
)

test('lesson approval persists through the DB-enforced authenticated RPC', () => {
  assert.match(source, /persist_eco02_lesson_preparation_receipt/)
  assert.doesNotMatch(source, /createAdminClient/)
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY/)
})

test('lesson approval does not insert canonical receipts directly from application code', () => {
  assert.doesNotMatch(source, /from\('lesson_preparation_receipts'\)\.insert/)
})
