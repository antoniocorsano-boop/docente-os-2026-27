import test from 'node:test'
import assert from 'node:assert/strict'
import { decideGateExecution } from './gate-decision.mjs'

const baseReceipt = {
  schema: 'certification-impact.v1',
  orchestrationAuthorized: true,
  advisoryOnly: false,
  mergeAuthorized: false,
  conservative: false,
  requiredGates: ['HVA', 'WCAG_2_2_AA'],
  baseSha: 'base123',
  testedSha: 'head456',
}

function decide(overrides = {}, gate = 'HVA') {
  return decideGateExecution({
    receipt: { ...baseReceipt, ...overrides },
    gate,
    expectedBaseSha: 'base123',
    expectedTestedSha: 'head456',
  })
}

test('explicitly required gate runs', () => {
  const result = decide()
  assert.equal(result.decision, 'RUN')
  assert.equal(result.run, true)
  assert.equal(result.failClosed, false)
})

test('explicitly non-required gate skips', () => {
  const result = decide({}, 'P6_PERFORMANCE')
  assert.equal(result.decision, 'SKIP')
  assert.equal(result.run, false)
  assert.equal(result.failClosed, false)
})

test('missing receipt runs fail-closed', () => {
  const result = decideGateExecution({
    receipt: null,
    gate: 'HVA',
    expectedBaseSha: 'base123',
    expectedTestedSha: 'head456',
  })
  assert.equal(result.run, true)
  assert.equal(result.failClosed, true)
})

test('advisory receipt cannot skip a gate', () => {
  const result = decide({ orchestrationAuthorized: false, advisoryOnly: true }, 'P6_PERFORMANCE')
  assert.equal(result.run, true)
  assert.equal(result.failClosed, true)
})

test('base SHA mismatch runs fail-closed', () => {
  const result = decide({ baseSha: 'wrong' }, 'P6_PERFORMANCE')
  assert.equal(result.run, true)
  assert.equal(result.failClosed, true)
})

test('tested SHA mismatch runs fail-closed', () => {
  const result = decide({ testedSha: 'wrong' }, 'P6_PERFORMANCE')
  assert.equal(result.run, true)
  assert.equal(result.failClosed, true)
})

test('conservative receipt runs every gate', () => {
  const result = decide({ conservative: true, requiredGates: [] }, 'X4_PLANNER_WRITE')
  assert.equal(result.run, true)
  assert.equal(result.failClosed, true)
})

test('invalid requiredGates runs fail-closed', () => {
  const result = decide({ requiredGates: null }, 'WCAG_2_2_AA')
  assert.equal(result.run, true)
  assert.equal(result.failClosed, true)
})

test('gate decision can never authorize merge', () => {
  assert.equal(decide().mergeAuthorized, false)
  assert.equal(decide({}, 'P6_PERFORMANCE').mergeAuthorized, false)
})
