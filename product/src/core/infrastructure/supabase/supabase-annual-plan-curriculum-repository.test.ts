import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository.ts'),
  'utf8',
)

test('provisional curriculum intake uses the DB-enforced authenticated RPC, not the Render admin secret', () => {
  assert.match(source, /persist_eco02_provisional_curriculum_adoption/)
  assert.doesNotMatch(source, /createAdminClient/)
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY/)
})

test('legacy generic curriculum persistence RPC remains unavailable to the intake repository', () => {
  assert.doesNotMatch(source, /rpc\('persist_annual_plan_curriculum_adoption'/)
})
