import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflow = fs.readFileSync(new URL('../../workflows/experience-acceptance.yml', import.meta.url), 'utf8')

function jobBlock(name, nextName) {
  const start = workflow.indexOf(`  ${name}:`)
  assert.notEqual(start, -1, `${name} job must exist`)
  const end = nextName ? workflow.indexOf(`  ${nextName}:`, start + 1) : workflow.length
  assert.notEqual(end, -1, `${nextName} job must exist after ${name}`)
  return workflow.slice(start, end)
}

test('hva-application certifies against an isolated exact-head Supabase runtime, never Beta', () => {
  const application = jobBlock('application-acceptance', 'runtime-acceptance')

  assert.doesNotMatch(
    application,
    /https:\/\/gnshgapmwyjamhmlikeg\.supabase\.co/,
    'hva-application must not inherit the Beta Supabase runtime',
  )
  assert.match(application, /Set up Supabase CLI for isolated HVA runtime/)
  assert.match(application, /Prepare isolated exact-head Supabase runtime/)
  assert.match(application, /NEXT_PUBLIC_SUPABASE_URL=.*GITHUB_ENV/)
  assert.match(application, /CPRI_TESTED_SHA/)
})
