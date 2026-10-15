import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../../../')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

const requiredTokens = (text, tokens, label) => {
  for (const token of tokens) assert.ok(text.includes(token), `${label} missing ${token}`)
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
