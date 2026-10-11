import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const experienceWorkflow = fs.readFileSync(new URL('../../workflows/experience-acceptance.yml', import.meta.url), 'utf8')
const browserWorkflow = fs.readFileSync(new URL('../../workflows/browser-certification-orchestrator.yml', import.meta.url), 'utf8')
const preparer = fs.readFileSync(new URL('./prepare-isolated-hva-runtime.sh', import.meta.url), 'utf8')

function jobBlock(workflow, name, nextName) {
  const start = workflow.indexOf(`  ${name}:`)
  assert.notEqual(start, -1, `${name} job must exist`)
  const end = nextName ? workflow.indexOf(`  ${nextName}:`, start + 1) : workflow.length
  if (nextName) assert.notEqual(end, -1, `${nextName} job must exist after ${name}`)
  return workflow.slice(start, end)
}

function assertIsolatedRuntime(job, label) {
  assert.doesNotMatch(
    job,
    /https:\/\/gnshgapmwyjamhmlikeg\.supabase\.co/,
    `${label} must not inherit the Beta Supabase runtime`,
  )
  assert.match(job, /Set up Supabase CLI for isolated HVA runtime/)
  assert.match(job, /Prepare isolated exact-head Supabase runtime/)
  assert.match(job, /prepare-isolated-hva-runtime\.sh prepare/)
  assert.match(job, /CPRI_TESTED_SHA/)
}

test('shared isolated runtime preparer exports local Supabase authority for subsequent certification steps', () => {
  assert.match(preparer, /echo "NEXT_PUBLIC_SUPABASE_URL=\$api_url"/)
  assert.match(preparer, /echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\$publishable_key"/)
  assert.match(preparer, /echo "CPRI_TESTED_SHA=\$TESTED_SHA"/)
  assert.match(preparer, /}\s*>> "\$GITHUB_ENV"/)
  assert.match(preparer, /bootstrap-isolated-runtime\.mjs/)
})

test('hva-application certifies against an isolated exact-head Supabase runtime, never Beta', () => {
  assertIsolatedRuntime(jobBlock(experienceWorkflow, 'application-acceptance', 'runtime-acceptance'), 'hva-application')
})

test('browser-certification certifies the exact head against the same isolated Supabase runtime', () => {
  assertIsolatedRuntime(jobBlock(browserWorkflow, 'browser-certification'), 'browser-certification')
})
