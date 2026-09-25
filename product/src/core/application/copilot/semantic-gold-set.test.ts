import assert from 'node:assert/strict'
import test from 'node:test'
import { SYNTHETIC_K3C_REFERENCE_GOLD_SET } from './fixtures/semantic-evaluation-reference-set'
import { evaluateKnowledgeSemanticGoldSetReadiness, toKnowledgeSemanticEvalQueries, type KnowledgeSemanticGoldSet } from './semantic-gold-set'

test('K3C gold set: synthetic reference fixture cannot become activation evidence', () => {
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness(SYNTHETIC_K3C_REFERENCE_GOLD_SET)
  assert.equal(readiness.readyForActivationEvidence, false)
  assert.equal(readiness.reasons.includes('QUERY_COUNT_BELOW_MINIMUM'), true)
  assert.equal(readiness.reasons.includes('HUMAN_VERIFICATION_REQUIRED'), true)
})

test('K3C gold set: thirty stratified teacher-verified queries satisfy the structural gate', () => {
  const set = verifiedGoldSet(30)
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness(set)
  const queries = toKnowledgeSemanticEvalQueries(set)
  assert.deepEqual(readiness, { readyForActivationEvidence: true, reasons: [], queryCount: 30, verifiedQueryCount: 30 })
  assert.equal(queries.every((query) => query.humanVerified), true)
})

test('K3C gold set: an unstratified set fails closed', () => {
  const set = verifiedGoldSet(30)
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness({
    ...set,
    queries: set.queries.map((query) => ({ ...query, queryType: 'EXACT' as const, reliability: 'VERIFIED' as const })),
  })
  assert.equal(readiness.readyForActivationEvidence, false)
  assert.equal(readiness.reasons.includes('QUERY_TYPE_COVERAGE_REQUIRED'), true)
  assert.equal(readiness.reasons.includes('RELIABILITY_COVERAGE_REQUIRED'), true)
})

test('K3C gold set: required category, discipline and class strata cannot be blank', () => {
  const set = verifiedGoldSet(30)
  const first = set.queries[0]!
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness({
    ...set,
    queries: [{ ...first, category: ' ', discipline: '', classRef: ' ' }, ...set.queries.slice(1)],
  })
  assert.equal(readiness.readyForActivationEvidence, false)
  assert.equal(readiness.reasons.includes('CATEGORY_REQUIRED'), true)
  assert.equal(readiness.reasons.includes('DISCIPLINE_REQUIRED'), true)
  assert.equal(readiness.reasons.includes('CLASS_REQUIRED'), true)
})

test('K3C gold set: public fixture fails closed if it declares real corpus data', () => {
  const set = { ...verifiedGoldSet(30), publicationClass: 'PUBLIC_SANITIZED_FIXTURE' as const }
  const first = set.queries[0]!
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness({ ...set, queries: [{ ...first, dataClass: 'REAL_CORPUS' }, ...set.queries.slice(1)] })
  assert.equal(readiness.reasons.includes('PUBLIC_FIXTURE_MUST_BE_SANITIZED'), true)
})

function verifiedGoldSet(count: number): KnowledgeSemanticGoldSet {
  return {
    id: 'k3c-it-verified-v1', locale: 'it-IT', version: 1, publicationClass: 'PRIVATE_RUNTIME',
    queries: Array.from({ length: count }, (_, index) => ({
      id: `q-${index + 1}`,
      queryText: `Query didattica ${index + 1}`,
      relevantUnitIds: [`unit-${index + 1}`],
      queryType: index % 2 === 0 ? 'EXACT' : 'CONCEPTUAL',
      category: index % 3 === 0 ? 'LESSON' : 'RESOURCE',
      discipline: index % 2 === 0 ? 'TECNOLOGIA' : 'SCIENZE',
      classRef: index % 2 === 0 ? '2C' : '1A',
      reliability: index % 2 === 0 ? 'VERIFIED' : 'MIXED',
      dataClass: 'SANITIZED_NON_PERSONAL',
      verification: { method: 'HUMAN', reviewerRole: 'TEACHER', verifiedAt: '2026-09-15T12:00:00.000Z' },
    })),
  }
}
