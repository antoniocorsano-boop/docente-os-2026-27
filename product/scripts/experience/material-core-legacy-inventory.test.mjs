import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyLegacyPreparedMaterial } from './material-core-legacy-inventory.mjs'

const digest = {
  algorithm: 'SHA-256',
  canonicalization: 'docente-os.material-content.v1',
  value: 'a'.repeat(64),
}

function legacy(overrides = {}) {
  return {
    approvalState: 'APPROVED',
    canonicalBinding: 'ALIGNED',
    canonicalBlockId: 'B01',
    projectionRef: 'projection-1',
    assetId: 'asset-1',
    generationId: 'generation-1',
    contentDigest: digest,
    explicitTeacherAcceptance: true,
    sourceLocator: 'https://example.invalid/material',
    ...overrides,
  }
}

test('PENDING_HUMAN without canonical accepted extension is prepared only', () => {
  assert.equal(
    classifyLegacyPreparedMaterial(legacy({
      approvalState: 'PENDING_HUMAN',
      explicitTeacherAcceptance: false,
      contentDigest: null,
    })),
    'PREPARED_ONLY',
  )
})

test('APPROVED with exact digest, lesson context and acceptance evidence is reconcilable', () => {
  assert.equal(classifyLegacyPreparedMaterial(legacy()), 'RECONCILABLE')
})

test('APPROVED with generation and asset id but no digest requires revalidation', () => {
  assert.equal(
    classifyLegacyPreparedMaterial(legacy({ contentDigest: null })),
    'REVALIDATION_REQUIRED',
  )
})

test('APPROVED backed only by a mutable provider URL requires revalidation', () => {
  assert.equal(
    classifyLegacyPreparedMaterial(legacy({
      assetId: null,
      generationId: null,
      contentDigest: null,
      sourceLocator: 'https://www.canva.com/design/mutable',
    })),
    'REVALIDATION_REQUIRED',
  )
})

test('APPROVED without block or projection context requires revalidation', () => {
  assert.equal(
    classifyLegacyPreparedMaterial(legacy({ canonicalBlockId: null, projectionRef: null })),
    'REVALIDATION_REQUIRED',
  )
})

test('PRE_CANONICAL_DIAGNOSTIC without lesson association remains prepared only', () => {
  assert.equal(
    classifyLegacyPreparedMaterial(legacy({
      canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
      canonicalBlockId: null,
      projectionRef: null,
      approvalState: 'PENDING_HUMAN',
      explicitTeacherAcceptance: false,
      contentDigest: null,
    })),
    'PREPARED_ONLY',
  )
})

test('invalid or unknown legacy metadata is blocked for automatic reconciliation', () => {
  assert.equal(
    classifyLegacyPreparedMaterial({ approvalState: 'MYSTERY' }),
    'BLOCKED_FOR_AUTOMATIC_RECONCILIATION',
  )
})
