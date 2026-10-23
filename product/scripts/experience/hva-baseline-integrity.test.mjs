import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  buildHvaBaselineIntegrityReceipt,
  classifyHvaBaselineIntegrity,
} from './hva-baseline-integrity.mjs'

const ACTIVE_ID = '00000000-0000-0000-0000-000000000001'

function runtimeInput(overrides = {}) {
  return {
    fingerprint: 'a'.repeat(64),
    activeTimetableVersionId: ACTIVE_ID,
    baselineErrors: [],
    persistentFixtureIntegrity: { status: 'PASS', errors: [] },
    ...overrides,
  }
}

test('classifies a clean governed baseline as PASS', () => {
  assert.equal(classifyHvaBaselineIntegrity(runtimeInput()), 'PASS')
})

test('classifies semantic baseline drift as FAIL_BASELINE_DRIFT', () => {
  assert.equal(
    classifyHvaBaselineIntegrity(runtimeInput({ baselineErrors: ['missing canonical Calendar event'] })),
    'FAIL_BASELINE_DRIFT',
  )
})

test('classifies persistent B01 provenance drift as FAIL_FIXTURE_DRIFT', () => {
  assert.equal(
    classifyHvaBaselineIntegrity(runtimeInput({
      persistentFixtureIntegrity: { status: 'FAIL', errors: ['source timetable version no longer covers 2026-10-26'] },
    })),
    'FAIL_FIXTURE_DRIFT',
  )
})

test('classifies operational scanner failures as ERROR', () => {
  assert.equal(
    classifyHvaBaselineIntegrity(runtimeInput({ error: new Error('Supabase unavailable') })),
    'ERROR',
  )
})

test('postflight fails closed when the semantic fingerprint changes', () => {
  const preflight = buildHvaBaselineIntegrityReceipt({ phase: 'preflight', ...runtimeInput() })
  const postflight = buildHvaBaselineIntegrityReceipt({
    phase: 'postflight',
    ...runtimeInput({ fingerprint: 'b'.repeat(64) }),
    preflightReceipt: preflight,
  })

  assert.equal(postflight.status, 'FAIL_BASELINE_DRIFT')
  assert.match(postflight.diagnostics.join('\n'), /fingerprint changed/i)
})

test('postflight fails closed when ACTIVE runtime identity changes even if semantics hash the same', () => {
  const preflight = buildHvaBaselineIntegrityReceipt({ phase: 'preflight', ...runtimeInput() })
  const postflight = buildHvaBaselineIntegrityReceipt({
    phase: 'postflight',
    ...runtimeInput({ activeTimetableVersionId: '00000000-0000-0000-0000-000000000002' }),
    preflightReceipt: preflight,
  })

  assert.equal(postflight.status, 'FAIL_BASELINE_DRIFT')
  assert.match(postflight.diagnostics.join('\n'), /ACTIVE timetable identity changed/i)
})

test('postflight without a preflight receipt is ERROR', () => {
  const postflight = buildHvaBaselineIntegrityReceipt({ phase: 'postflight', ...runtimeInput() })
  assert.equal(postflight.status, 'ERROR')
  assert.match(postflight.diagnostics.join('\n'), /preflight receipt is required/i)
})

test('runtime scanner source is read-only and cannot activate or mutate baseline state', async () => {
  const source = await readFile(new URL('../../e2e/support/hva-governed-baseline-runtime.mjs', import.meta.url), 'utf8')
  for (const forbidden of ['.insert(', '.update(', '.delete(', "rpc('activate_timetable_version'", 'rpc("activate_timetable_version"']) {
    assert.equal(source.includes(forbidden), false, `runtime scanner must not contain ${forbidden}`)
  }
})
