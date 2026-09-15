import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyCertificationImpact } from './classifier.mjs'

test('UI-only change requests HVA and WCAG but not Planner write', () => {
  const receipt = classifyCertificationImpact([
    'product/src/components/app-shell/materials-quick-action.tsx',
  ])
  assert.equal(receipt.impacts.ui, true)
  assert.equal(receipt.impacts.accessibility, true)
  assert.equal(receipt.impacts.planner_write, false)
  assert.equal(receipt.requiredGates.includes('HVA'), true)
  assert.equal(receipt.requiredGates.includes('WCAG_2_2_AA'), true)
  assert.equal(receipt.requiredGates.includes('X4_PLANNER_WRITE'), false)
  assert.equal(receipt.conservative, false)
})

test('Planner write change requests X4 and ASVS', () => {
  const receipt = classifyCertificationImpact([
    'product/src/core/application/assistant-write-contract.ts',
  ])
  assert.equal(receipt.impacts.planner_write, true)
  assert.equal(receipt.impacts.security, true)
  assert.equal(receipt.requiredGates.includes('X4_PLANNER_WRITE'), true)
  assert.equal(receipt.requiredGates.includes('ASVS_5_0'), true)
})

test('migration is security-sensitive and runtime-impacting', () => {
  const receipt = classifyCertificationImpact([
    'product/supabase/migrations/9999_example.sql',
  ])
  assert.equal(receipt.impacts.security, true)
  assert.equal(receipt.requiredGates.includes('ASVS_5_0'), true)
})

test('ordinary docs are inert', () => {
  const receipt = classifyCertificationImpact(['docs/notes/example.md'])
  assert.equal(receipt.conservative, false)
  assert.deepEqual(receipt.requiredGates, [])
  assert.equal(Object.values(receipt.impacts).some(Boolean), false)
})

test('certification workflow change invalidates certification contract equivalence', () => {
  const receipt = classifyCertificationImpact([
    '.github/workflows/experience-acceptance.yml',
  ])
  assert.equal(receipt.impacts.certification_contract, true)
})

test('unknown relevant file fails closed to full certification', () => {
  const receipt = classifyCertificationImpact([
    'product/unknown/new-runtime-format.xyz',
  ])
  assert.equal(receipt.conservative, true)
  assert.deepEqual(receipt.unknownRelevantFiles, ['product/unknown/new-runtime-format.xyz'])
  for (const gate of ['HVA', 'WCAG_2_2_AA', 'P6_PERFORMANCE', 'X4_PLANNER_WRITE', 'ASVS_5_0']) {
    assert.equal(receipt.requiredGates.includes(gate), true)
  }
  assert.equal(receipt.mergeAuthorized, false)
})
