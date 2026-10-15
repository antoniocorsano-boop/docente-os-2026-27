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
