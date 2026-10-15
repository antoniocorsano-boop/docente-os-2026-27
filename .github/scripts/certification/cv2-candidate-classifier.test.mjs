import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyCertificationImpact } from './classifier.mjs'

const FULL = [
  'HVA',
  'WCAG_2_2_AA',
  'P6_PERFORMANCE',
  'X4_PLANNER_WRITE',
  'ASVS_5_0',
  'K1_KNOWLEDGE_UPLOAD',
]

test('CV2 candidate workflows are explicit central certification contracts', () => {
  for (const path of [
    '.github/workflows/candidate-qualification.yml',
    '.github/workflows/candidate-database-assurance.yml',
  ]) {
    const receipt = classifyCertificationImpact([path])
    assert.equal(receipt.conservative, false, `${path} must be explicitly classified`)
    assert.equal(receipt.impacts.certification_contract, true)
    for (const gate of FULL) {
      assert.equal(receipt.requiredGates.includes(gate), true, `${path} must require ${gate}`)
    }
    assert.equal(receipt.mergeAuthorized, false)
  }
})
