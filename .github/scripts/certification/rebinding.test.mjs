import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCertificationRebinding } from './rebinding.mjs'

test('rebinding is eligible only when every equivalence proof is true', () => {
  const receipt = evaluateCertificationRebinding({
    sourceSha: 'source',
    targetSha: 'target',
    productTreeEquivalent: true,
    lockfileEquivalent: true,
    migrationSetEquivalent: true,
    certificationContractEquivalent: true,
    sourceCertificationComplete: true,
  })
  assert.equal(receipt.decision, 'ELIGIBLE')
  assert.equal(receipt.promotionAuthorized, false)
  assert.equal(receipt.requiresRuntimeSmokeBeforePromotion, true)
})

test('rebinding blocks when any equivalence proof fails', () => {
  const receipt = evaluateCertificationRebinding({
    sourceSha: 'source',
    targetSha: 'target',
    productTreeEquivalent: true,
    lockfileEquivalent: true,
    migrationSetEquivalent: false,
    certificationContractEquivalent: true,
    sourceCertificationComplete: true,
  })
  assert.equal(receipt.decision, 'BLOCKED')
  assert.deepEqual(receipt.failed, ['migrationSetEquivalent'])
})

test('rebinding blocks incomplete evidence rather than guessing', () => {
  const receipt = evaluateCertificationRebinding({ sourceSha: 'source', targetSha: 'target' })
  assert.equal(receipt.decision, 'BLOCKED')
  assert.equal(receipt.missing.includes('productTreeEquivalent'), true)
  assert.equal(receipt.persistentEffect, 'NONE')
})

test('rebinding rejects identical source and target SHA', () => {
  const receipt = evaluateCertificationRebinding({
    sourceSha: 'same',
    targetSha: 'same',
    productTreeEquivalent: true,
    lockfileEquivalent: true,
    migrationSetEquivalent: true,
    certificationContractEquivalent: true,
    sourceCertificationComplete: true,
  })
  assert.equal(receipt.decision, 'BLOCKED')
})
