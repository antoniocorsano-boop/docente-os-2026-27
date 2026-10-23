import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { classifyHvaBaselineRuntime, compareHvaBaselinePostflight, runHvaBaselineIntegrityPhase } from './hva-baseline-integrity.mjs'

function runtime(overrides = {}) {
  return {
    fingerprint: 'fingerprint-v1',
    runtimeIds: { activeVersionId: 'active-v1' },
    baselineErrors: [],
    persistentFixtureIntegrity: 'PASS',
    persistentFixtureDiagnostics: [],
    ...overrides,
  }
}

test('classifies PASS, baseline drift, fixture drift and runtime error distinctly', () => {
  assert.equal(classifyHvaBaselineRuntime(runtime()).status, 'PASS')
  assert.equal(classifyHvaBaselineRuntime(runtime({ baselineErrors: ['missing lesson'] })).status, 'FAIL_BASELINE_DRIFT')
  assert.equal(classifyHvaBaselineRuntime(runtime({ persistentFixtureIntegrity: 'FAIL_FIXTURE_DRIFT', persistentFixtureDiagnostics: ['legacy drift'] })).status, 'FAIL_FIXTURE_DRIFT')
  assert.equal(classifyHvaBaselineRuntime(null, new Error('auth unavailable')).status, 'ERROR')
})

test('postflight fails on fingerprint or ACTIVE identity drift', () => {
  const preflight = { status: 'PASS', fingerprint: 'fingerprint-v1', runtimeIds: { activeVersionId: 'active-v1' } }
  assert.equal(compareHvaBaselinePostflight(preflight, runtime()).status, 'PASS')
  assert.match(compareHvaBaselinePostflight(preflight, runtime({ fingerprint: 'changed' })).diagnostics.join('\n'), /fingerprint changed/i)
  assert.match(compareHvaBaselinePostflight(preflight, runtime({ runtimeIds: { activeVersionId: 'active-v2' } })).diagnostics.join('\n'), /ACTIVE timetable identity changed/i)
})

test('postflight fails closed when preflight receipt is missing', () => {
  assert.equal(compareHvaBaselinePostflight(null, runtime()).status, 'ERROR')
})

test('preflight and postflight write inspectable receipts', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hva-baseline-'))
  const pre = await runHvaBaselineIntegrityPhase('preflight', { outputDir, runtimeReader: async () => runtime() })
  assert.equal(pre.status, 'PASS')
  const post = await runHvaBaselineIntegrityPhase('postflight', { outputDir, runtimeReader: async () => runtime() })
  assert.equal(post.status, 'PASS')
  const saved = JSON.parse(await fs.readFile(path.join(outputDir, 'baseline', 'postflight.json'), 'utf8'))
  assert.equal(saved.fingerprint, 'fingerprint-v1')
})

test('runtime scanner is read-only by source guard', async () => {
  const source = await fs.readFile(new URL('../../e2e/support/hva-governed-baseline-runtime.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /\.(?:insert|update|delete)\s*\(/)
  assert.doesNotMatch(source, /activate_timetable_version/)
})
