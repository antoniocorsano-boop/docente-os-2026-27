import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../../../')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

const requiredTokens = (text, tokens, label) => {
  for (const token of tokens) assert.ok(text.includes(token), `${label} missing ${token}`)
}

const ordered = (text, tokens, label) => {
  let previous = -1
  for (const token of tokens) {
    const index = text.indexOf(token)
    assert.ok(index >= 0, `${label} missing ${token}`)
    assert.ok(index > previous, `${label} has ${token} out of order`)
    previous = index
  }
}

test('AGENTS requires CV2 and Runtime Release contracts before significant CI work', () => {
  const agents = read('AGENTS.md')
  requiredTokens(agents, [
    'docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md',
    'docs/architecture/RUNTIME_RELEASE_CONTRACT_V1.md',
    'significant code',
    'CI',
    'qualification',
    'rerun',
  ], 'AGENTS.md')
})

test('canonical CV2 contract persists the DEVELOPMENT CANDIDATE RUNTIME lifecycle', () => {
  const cv2 = read('docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md')
  requiredTokens(cv2, [
    'DEVELOPMENT',
    'CANDIDATE',
    'RUNTIME',
    'ready_for_review',
    'cv2/development-preflight',
    'cv2/candidate-qualification',
    'Draft',
    'Ready',
  ], 'CERTIFICATION_PIPELINE_V2_CANONICAL.md')
})

test('Runtime Release contract binds L0 L1 L2 to lifecycle stages', () => {
  const runtime = read('docs/architecture/RUNTIME_RELEASE_CONTRACT_V1.md')
  requiredTokens(runtime, [
    'DEVELOPMENT',
    'L0',
    'CANDIDATE',
    'L1',
    'RUNTIME',
    'L2',
  ], 'RUNTIME_RELEASE_CONTRACT_V1.md')
})

test('Product CI publishes DEVELOPMENT status, cancels stale PR work and excludes ready_for_review', () => {
  const workflow = read('.github/workflows/product-ci.yml')
  requiredTokens(workflow, [
    'types: [opened, reopened, synchronize]',
    'cancel-in-progress: true',
    "context: 'cv2/development-preflight'",
    'github.event.pull_request.head.sha || github.sha',
  ], 'product-ci.yml')
  assert.equal(workflow.includes('ready_for_review'), false, 'Product CI must not run because a PR became Ready')
})

test('Product CI runs cheap product prerequisites before any full Supabase replay', () => {
  const workflow = read('.github/workflows/product-ci.yml')
  ordered(workflow, [
    'npm ci --no-audit --no-fund',
    'npm run typecheck',
    'npm test',
    'npm run lint',
    'npm run build',
    'Set up Supabase CLI for deep DB replay',
    'Replay complete migration chain on ephemeral Supabase',
  ], 'product-ci.yml')
})

test('shadow heavy workers expose workflow_call without retiring legacy entrypoints', () => {
  const browser = read('.github/workflows/browser-certification-orchestrator.yml')
  const k1 = read('.github/workflows/k1-knowledge-e2e.yml')
  const p7 = read('.github/workflows/p7-db-restore-rehearsal.yml')
  const asvs = read('.github/workflows/asvs50-assurance.yml')

  for (const [label, workflow] of [['browser', browser], ['k1', k1], ['p7', p7], ['asvs', asvs]]) {
    requiredTokens(workflow, ['workflow_call:', 'tested_sha:'], `${label} reusable worker`)
  }
  requiredTokens(browser, ['base_sha:', 'pull_request:'], 'browser shadow worker')
  requiredTokens(k1, ['pull_request:', 'push:', 'workflow_dispatch:'], 'k1 shadow worker')
  requiredTokens(p7, ['pull_request:', 'workflow_dispatch:'], 'p7 shadow worker')
  requiredTokens(asvs, ['pull_request:', 'push:', 'workflow_dispatch:'], 'asvs shadow worker')
})

test('reusable heavy workers bind checkout/status to explicit tested SHA when called', () => {
  const browser = read('.github/workflows/browser-certification-orchestrator.yml')
  const k1 = read('.github/workflows/k1-knowledge-e2e.yml')
  const p7 = read('.github/workflows/p7-db-restore-rehearsal.yml')
  const asvs = read('.github/workflows/asvs50-assurance.yml')
  requiredTokens(browser, ['inputs.tested_sha', 'inputs.base_sha'], 'browser reusable worker')
  for (const [label, workflow] of [['k1', k1], ['p7', p7], ['asvs', asvs]]) {
    requiredTokens(workflow, ['inputs.tested_sha'], `${label} reusable worker`)
  }
})

test('candidate DB assurance is reusable, exact-head and local-only', () => {
  const workflow = read('.github/workflows/candidate-database-assurance.yml')
  requiredTokens(workflow, [
    'workflow_call:',
    'base_sha:',
    'tested_sha:',
    'runtime-release-contract.mjs',
    'supabase db start',
    'supabase db reset --local --no-seed',
    'runtime-release-contract.sql',
    'timetable_import_g1_2_contract.sql',
    'timetable_import_completion_contract.sql',
    'knowledge_bounded_search_contract.sql',
    'inputs.tested_sha',
    'inputs.base_sha',
  ], 'candidate-database-assurance.yml')
  for (const forbidden of ['gnshgapmwyjamhmlikeg', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_ACCESS_TOKEN', 'service_role']) {
    assert.equal(workflow.includes(forbidden), false, `candidate DB assurance must not contain ${forbidden}`)
  }
})
