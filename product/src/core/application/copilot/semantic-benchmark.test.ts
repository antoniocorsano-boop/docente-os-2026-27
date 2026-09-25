import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SYNTHETIC_K3C_REFERENCE_GOLD_SET,
  SYNTHETIC_K3C_REFERENCE_RUNS,
} from './fixtures/semantic-evaluation-reference-set'
import { buildKnowledgeSemanticBenchmarkReceipt } from './semantic-benchmark'
import type { KnowledgeSemanticGoldSet } from './semantic-gold-set'

test('K3C benchmark: synthetic evaluator fixture produces metrics but cannot authorize activation', () => {
  const receipt = buildKnowledgeSemanticBenchmarkReceipt({
    goldSet: SYNTHETIC_K3C_REFERENCE_GOLD_SET,
    runs: SYNTHETIC_K3C_REFERENCE_RUNS,
    providerPolicyStatus: 'PASS',
    currentCorpusCoverageRatio: 1,
  })
  assert.equal(receipt.goldSetReadyForActivationEvidence, false)
  assert.ok(receipt.channels.FULL_TEXT)
  assert.ok(receipt.channels.SEMANTIC)
  assert.ok(receipt.channels.HYBRID)
  assert.ok(receipt.activationGate)
  assert.equal(receipt.activationGate.allowed, false)
  assert.equal(receipt.activationGate.reasons.includes('GOLD_SET_NOT_READY'), true)
})

test('K3C benchmark: activation requires FULL_TEXT, SEMANTIC and HYBRID on the same gold set', () => {
  const goldSet = verifiedGoldSet(30)
  const fullTextObservations = observations(goldSet, false)
  const semanticObservations = observations(goldSet, true)
  const hybridObservations = observations(goldSet, true)

  const incomplete = buildKnowledgeSemanticBenchmarkReceipt({
    goldSet,
    runs: [
      { channel: 'FULL_TEXT', implementationRef: 'k3a:full-text:develop', observations: fullTextObservations },
      { channel: 'HYBRID', implementationRef: 'k3c:hybrid:candidate-1', observations: hybridObservations },
    ],
    providerPolicyStatus: 'PASS',
    currentCorpusCoverageRatio: 1,
  })
  assert.equal(incomplete.activationGate, null)

  const receipt = buildKnowledgeSemanticBenchmarkReceipt({
    goldSet,
    runs: [
      { channel: 'FULL_TEXT', implementationRef: 'k3a:full-text:develop', observations: fullTextObservations },
      { channel: 'SEMANTIC', implementationRef: 'k3c:semantic:candidate-1', observations: semanticObservations },
      { channel: 'HYBRID', implementationRef: 'k3c:hybrid:candidate-1', observations: hybridObservations },
    ],
    providerPolicyStatus: 'PASS',
    currentCorpusCoverageRatio: 1,
  })
  assert.equal(receipt.goldSetReadyForActivationEvidence, true)
  assert.ok(receipt.activationGate)
  assert.equal(receipt.activationGate.allowed, true)
})

test('K3C benchmark: duplicate channel or missing implementation identity is rejected', () => {
  assert.throws(() => buildKnowledgeSemanticBenchmarkReceipt({
    goldSet: SYNTHETIC_K3C_REFERENCE_GOLD_SET,
    runs: [SYNTHETIC_K3C_REFERENCE_RUNS[0]!, SYNTHETIC_K3C_REFERENCE_RUNS[0]!],
    providerPolicyStatus: 'PASS',
    currentCorpusCoverageRatio: 1,
  }), /duplicate benchmark channel FULL_TEXT/)

  assert.throws(() => buildKnowledgeSemanticBenchmarkReceipt({
    goldSet: SYNTHETIC_K3C_REFERENCE_GOLD_SET,
    runs: [{ channel: 'FULL_TEXT', implementationRef: ' ', observations: SYNTHETIC_K3C_REFERENCE_RUNS[0]!.observations }],
    providerPolicyStatus: 'PASS',
    currentCorpusCoverageRatio: 1,
  }), /benchmark implementation ref is required for FULL_TEXT/)
})

function observations(goldSet: KnowledgeSemanticGoldSet, perfect: boolean) {
  return goldSet.queries.map((query, index) => ({
    queryId: query.id,
    rankedUnitIds: perfect || index < 15
      ? [query.relevantUnitIds[0] as string]
      : ['noise-1', 'noise-2', 'noise-3', 'noise-4', 'noise-5', query.relevantUnitIds[0] as string],
    latencyMs: 100 + index,
    workspaceLeakageCount: 0,
    staleGenerationLeakageCount: 0,
    filterViolationCount: 0,
  }))
}

function verifiedGoldSet(count: number): KnowledgeSemanticGoldSet {
  return {
    id: 'k3c-it-verified-v1', locale: 'it-IT', version: 1, publicationClass: 'PRIVATE_RUNTIME',
    queries: Array.from({ length: count }, (_, index) => ({
      id: `q-${index + 1}`,
      queryText: `Query italiana validata ${index + 1}`,
      relevantUnitIds: [`unit-${index + 1}`],
      queryType: index % 2 === 0 ? 'EXACT' : 'CONCEPTUAL',
      category: index % 3 === 0 ? 'LESSON' : 'RESOURCE',
      discipline: index % 2 === 0 ? 'TECNOLOGIA' : 'SCIENZE',
      classRef: index % 2 === 0 ? '2C' : '1A',
      reliability: index % 2 === 0 ? 'VERIFIED' : 'MIXED',
      dataClass: 'REAL_CORPUS',
      verification: { method: 'HUMAN', reviewerRole: 'TEACHER', verifiedAt: '2026-09-15T12:00:00.000Z' },
    })),
  }
}
