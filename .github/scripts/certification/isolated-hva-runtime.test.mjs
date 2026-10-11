import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const experienceWorkflow = fs.readFileSync(new URL('../../workflows/experience-acceptance.yml', import.meta.url), 'utf8')
const browserWorkflow = fs.readFileSync(new URL('../../workflows/browser-certification-orchestrator.yml', import.meta.url), 'utf8')

function jobBlock(workflow, name, nextName) {
  const start = workflow.indexOf(`  ${name}:`)
  assert.notEqual(start, -1, `${name} job must exist`)
  const end = nextName ? workflow.indexOf(`  ${nextName}:`, start + 1) : workflow.length
  assert.notEqual(end, -1, `${nextName} job must exist after ${name}`)
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
  assert.match(job, /NEXT_PUBLIC_SUPABASE_URL=.*GITHUB_ENV/)
  assert.match(job, /CPRI_TESTED_SHA/)
}

test('hva-application certifies against an isolated exact-head Supabase runtime, never Beta', () => {
  assertIsolatedRuntime(jobBlock(experienceWorkflow, 'application-acceptance', 'runtime-acceptance'), 'hva-application')
})

test('browser-certification certifies the exact head against the same isolated Supabase runtime', () => {
  assertIsolatedRuntime(jobBlock(browserWorkflow, 'browser-certification', 'enforce-browser-certification'), 'browser-certification')
})
