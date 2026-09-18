import assert from 'node:assert/strict'
import test from 'node:test'
import { SYNTHETIC_K3C_REFERENCE_GOLD_SET } from './fixtures/semantic-evaluation-reference-set'
import {
  evaluateKnowledgeSemanticGoldSetReadiness,
  toKnowledgeSemanticEvalQueries,
  type KnowledgeSemanticGoldSet,
} from './semantic-gold-set'

test('K3C gold set: synthetic reference fixture cannot become activation evidence', () => {
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness(SYNTHETIC_K3C_REFERENCE_GOLD_SET)

  assert.equal(readiness.readyForActivationEvidence, false)
  assert.equal(readiness.queryCount, 6)
  assert.equal(readiness.verifiedQueryCount, 0)
  assert.equal(readiness.reasons.includes('QUERY_COUNT_BELOW_MINIMUM'), true)
  assert.equal(readiness.reasons.includes('HUMAN_VERIFICATION_REQUIRED'), true)
})

test('K3C gold set: thirty sanitized teacher-verified queries satisfy the structural gate', () => {
  const set = verifiedGoldSet(30)
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness(set)
  const queries = toKnowledgeSemanticEvalQueries(set)

  assert.deepEqual(readiness, {
    readyForActivationEvidence: true,
    reasons: [],
    queryCount: 30,
    verifiedQueryCount: 30,
  })
  assert.equal(queries.every((query) => query.humanVerified), true)
  assert.equal(queries.every((query) => query.dataClass === 'SANITIZED_NON_PERSONAL'), true)
})

test('K3C gold set: public fixture fails closed if it declares real corpus data', () => {
  const set = verifiedGoldSet(30)
  const first = set.queries[0]
  assert.ok(first)

  const readiness = evaluateKnowledgeSemanticGoldSetReadiness({
    ...set,
    queries: [
      { ...first, dataClass: 'REAL_CORPUS' },
      ...set.queries.slice(1),
    ],
  })

  assert.equal(readiness.readyForActivationEvidence, false)
  assert.equal(readiness.reasons.includes('PUBLIC_FIXTURE_MUST_BE_SANITIZED'), true)
})

test('K3C gold set: malformed relevance and verification timestamps are rejected', () => {
  const set = verifiedGoldSet(30)
  const first = set.queries[0]
  assert.ok(first)

  const readiness = evaluateKnowledgeSemanticGoldSetReadiness({
    ...set,
    queries: [
      {
        ...first,
        relevantUnitIds: ['unit-1', 'unit-1'],
        verification: {
          method: 'HUMAN',
          reviewerRole: 'TEACHER',
          verifiedAt: 'not-a-date',
        },
      },
      ...set.queries.slice(1),
    ],
  })

  assert.equal(readiness.readyForActivationEvidence, false)
  assert.equal(readiness.reasons.includes('DUPLICATE_RELEVANT_UNIT_ID'), true)
  assert.equal(readiness.reasons.includes('HUMAN_VERIFICATION_TIMESTAMP_INVALID'), true)
})

function verifiedGoldSet(count: number): KnowledgeSemanticGoldSet {
  return {
    id: 'k3c-it-verified-v1',
    locale: 'it-IT',
    version: 1,
    publicationClass: 'PUBLIC_SANITIZED_FIXTURE',
    queries: Array.from({ length: count }, (_, index) => ({
      id: `q-${index + 1}`,
      queryText: `Query didattica sintetica ${index + 1}`,
      relevantUnitIds: [`unit-${index + 1}`],
      reliability: index < 10 ? 'VERIFIED' : 'AUTO',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: {
        method: 'HUMAN',
        reviewerRole: 'TEACHER',
        verifiedAt: '2026-09-15T12:00:00.000Z',
      },
    })),
  }
}
