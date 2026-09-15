import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canSendEmbeddingPayloadToExternalProvider,
  evaluateKnowledgeSemanticActivationGate,
  evaluateKnowledgeSemanticRun,
  type KnowledgeSemanticEvalMetrics,
} from './semantic-evaluation'

test('K3C: computes retrieval quality and operational metrics deterministically', () => {
  const metrics = evaluateKnowledgeSemanticRun({
    queries: [
      {
        id: 'q1',
        relevantUnitIds: ['u1', 'u2'],
        reliability: 'VERIFIED',
        humanVerified: true,
        dataClass: 'SANITIZED_NON_PERSONAL',
      },
      {
        id: 'q2',
        relevantUnitIds: ['u4'],
        reliability: 'AUTO',
        humanVerified: true,
        dataClass: 'SANITIZED_NON_PERSONAL',
      },
    ],
    observations: [
      {
        queryId: 'q1',
        rankedUnitIds: ['u1', 'x', 'u2'],
        latencyMs: 120,
        workspaceLeakageCount: 0,
        staleGenerationLeakageCount: 0,
        filterViolationCount: 0,
      },
      {
        queryId: 'q2',
        rankedUnitIds: ['x', 'u4'],
        latencyMs: 180,
        workspaceLeakageCount: 0,
        staleGenerationLeakageCount: 0,
        filterViolationCount: 0,
      },
    ],
  })

  assert.equal(metrics.queryCount, 2)
  assert.equal(metrics.humanVerifiedQueryCount, 2)
  assert.equal(metrics.recallAt5, 1)
  assert.equal(metrics.mrrAt10, 0.75)
  assert.equal(metrics.verifiedRecallAt5, 1)
  assert.equal(metrics.p50LatencyMs, 120)
  assert.equal(metrics.p95LatencyMs, 180)
  assert.equal(metrics.workspaceLeakageCount, 0)
  assert.equal(metrics.staleGenerationLeakageCount, 0)
  assert.equal(metrics.filterViolationCount, 0)
  assert.equal(metrics.ndcgAt10 > 0.8, true)
})

test('K3C: missing observations and empty relevance sets are rejected', () => {
  assert.throws(
    () => evaluateKnowledgeSemanticRun({
      queries: [{
        id: 'q1',
        relevantUnitIds: ['u1'],
        reliability: 'VERIFIED',
        humanVerified: true,
        dataClass: 'SANITIZED_NON_PERSONAL',
      }],
      observations: [],
    }),
    /missing semantic eval observation/,
  )

  assert.throws(
    () => evaluateKnowledgeSemanticRun({
      queries: [{
        id: 'q1',
        relevantUnitIds: [],
        reliability: 'VERIFIED',
        humanVerified: true,
        dataClass: 'SANITIZED_NON_PERSONAL',
      }],
      observations: [{
        queryId: 'q1',
        rankedUnitIds: [],
        latencyMs: 1,
        workspaceLeakageCount: 0,
        staleGenerationLeakageCount: 0,
        filterViolationCount: 0,
      }],
    }),
    /has no relevant units/,
  )
})

test('K3C: external payload transfer is fail-closed for real corpus', () => {
  assert.equal(canSendEmbeddingPayloadToExternalProvider({
    dataClass: 'SANITIZED_NON_PERSONAL',
    providerPolicyStatus: 'PASS',
    realCorpusTransferApproved: false,
  }), true)

  assert.equal(canSendEmbeddingPayloadToExternalProvider({
    dataClass: 'REAL_CORPUS',
    providerPolicyStatus: 'PASS',
    realCorpusTransferApproved: false,
  }), false)

  assert.equal(canSendEmbeddingPayloadToExternalProvider({
    dataClass: 'REAL_CORPUS',
    providerPolicyStatus: 'PASS',
    realCorpusTransferApproved: true,
  }), true)

  assert.equal(canSendEmbeddingPayloadToExternalProvider({
    dataClass: 'SANITIZED_NON_PERSONAL',
    providerPolicyStatus: 'PENDING',
    realCorpusTransferApproved: true,
  }), false)
})

const baseline: KnowledgeSemanticEvalMetrics = {
  queryCount: 30,
  humanVerifiedQueryCount: 30,
  recallAt5: 0.7,
  mrrAt10: 0.72,
  ndcgAt10: 0.68,
  verifiedRecallAt5: 0.9,
  p50LatencyMs: 80,
  p95LatencyMs: 150,
  workspaceLeakageCount: 0,
  staleGenerationLeakageCount: 0,
  filterViolationCount: 0,
}

test('K3C: activation passes only after measurable quality gain, full coverage and policy pass', () => {
  const hybrid: KnowledgeSemanticEvalMetrics = {
    ...baseline,
    recallAt5: 0.76,
    ndcgAt10: 0.72,
    verifiedRecallAt5: 0.89,
    p95LatencyMs: 320,
  }

  const gate = evaluateKnowledgeSemanticActivationGate({
    providerPolicyStatus: 'PASS',
    currentCorpusCoverageRatio: 1,
    baseline,
    hybrid,
  })

  assert.equal(gate.allowed, true)
  assert.deepEqual(gate.reasons, [])
  assert.equal(gate.recallAt5Gain, 0.06)
  assert.equal(gate.ndcgAt10Gain, 0.04)
  assert.equal(gate.verifiedRecallAt5Regression, 0.01)
})

test('K3C: activation fails closed on privacy, coverage, quality, latency or leakage', () => {
  const hybrid: KnowledgeSemanticEvalMetrics = {
    ...baseline,
    queryCount: 29,
    humanVerifiedQueryCount: 28,
    recallAt5: 0.72,
    ndcgAt10: 0.69,
    verifiedRecallAt5: 0.85,
    p95LatencyMs: 700,
    workspaceLeakageCount: 1,
    staleGenerationLeakageCount: 1,
    filterViolationCount: 1,
  }

  const gate = evaluateKnowledgeSemanticActivationGate({
    providerPolicyStatus: 'PENDING',
    currentCorpusCoverageRatio: 0.99,
    baseline,
    hybrid,
  })

  assert.equal(gate.allowed, false)
  assert.deepEqual(gate.reasons, [
    'PROVIDER_POLICY_NOT_PASS',
    'CURRENT_CORPUS_COVERAGE_INCOMPLETE',
    'INSUFFICIENT_HUMAN_VERIFIED_QUERIES',
    'RECALL_GAIN_BELOW_THRESHOLD',
    'NDCG_GAIN_BELOW_THRESHOLD',
    'VERIFIED_RECALL_REGRESSION',
    'P95_LATENCY_ABOVE_THRESHOLD',
    'WORKSPACE_LEAKAGE',
    'STALE_GENERATION_LEAKAGE',
    'FILTER_VIOLATION',
  ])
})
