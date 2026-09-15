export type KnowledgeEvalDataClass = 'SANITIZED_NON_PERSONAL' | 'REAL_CORPUS'
export type KnowledgeProviderPolicyStatus = 'PASS' | 'PENDING' | 'BLOCKED'
export type KnowledgeEvalReliability = 'VERIFIED' | 'AUTO' | 'MIXED'

export type KnowledgeSemanticEvalQuery = {
  id: string
  relevantUnitIds: readonly string[]
  reliability: KnowledgeEvalReliability
  humanVerified: boolean
  dataClass: KnowledgeEvalDataClass
}

export type KnowledgeSemanticEvalObservation = {
  queryId: string
  rankedUnitIds: readonly string[]
  latencyMs: number
  workspaceLeakageCount: number
  staleGenerationLeakageCount: number
  filterViolationCount: number
}

export type KnowledgeSemanticEvalMetrics = {
  evaluationSetId: string
  queryCount: number
  humanVerifiedQueryCount: number
  verifiedQueryCount: number
  recallAt5: number
  mrrAt10: number
  ndcgAt10: number
  verifiedRecallAt5: number | null
  p50LatencyMs: number
  p95LatencyMs: number
  workspaceLeakageCount: number
  staleGenerationLeakageCount: number
  filterViolationCount: number
}

export type KnowledgeSemanticActivationThresholds = {
  minimumQueryCount: number
  minimumRecallAt5Gain: number
  minimumNdcgAt10Gain: number
  maximumVerifiedRecallAt5Regression: number
  maximumP95LatencyMs: number
}

export type KnowledgeSemanticActivationGateInput = {
  providerPolicyStatus: KnowledgeProviderPolicyStatus
  currentCorpusCoverageRatio: number
  baseline: KnowledgeSemanticEvalMetrics
  hybrid: KnowledgeSemanticEvalMetrics
  thresholds?: Partial<KnowledgeSemanticActivationThresholds>
}

export type KnowledgeSemanticActivationGateReason =
  | 'PROVIDER_POLICY_NOT_PASS'
  | 'CURRENT_CORPUS_COVERAGE_INCOMPLETE'
  | 'EVAL_SET_MISMATCH'
  | 'INSUFFICIENT_HUMAN_VERIFIED_QUERIES'
  | 'VERIFIED_QUERY_COVERAGE_MISSING'
  | 'RECALL_GAIN_BELOW_THRESHOLD'
  | 'NDCG_GAIN_BELOW_THRESHOLD'
  | 'VERIFIED_RECALL_REGRESSION'
  | 'P95_LATENCY_ABOVE_THRESHOLD'
  | 'WORKSPACE_LEAKAGE'
  | 'STALE_GENERATION_LEAKAGE'
  | 'FILTER_VIOLATION'

export type KnowledgeSemanticActivationGate = {
  allowed: boolean
  reasons: KnowledgeSemanticActivationGateReason[]
  recallAt5Gain: number
  ndcgAt10Gain: number
  verifiedRecallAt5Regression: number | null
  thresholds: KnowledgeSemanticActivationThresholds
}

export const DEFAULT_KNOWLEDGE_SEMANTIC_ACTIVATION_THRESHOLDS: KnowledgeSemanticActivationThresholds = {
  minimumQueryCount: 30,
  minimumRecallAt5Gain: 0.05,
  minimumNdcgAt10Gain: 0.03,
  maximumVerifiedRecallAt5Regression: 0.02,
  maximumP95LatencyMs: 500,
}

export function canSendEmbeddingPayloadToExternalProvider(input: {
  dataClass: KnowledgeEvalDataClass
  providerPolicyStatus: KnowledgeProviderPolicyStatus
  realCorpusTransferApproved: boolean
}) {
  if (input.providerPolicyStatus !== 'PASS') return false
  if (input.dataClass === 'SANITIZED_NON_PERSONAL') return true
  return input.realCorpusTransferApproved
}

export function evaluateKnowledgeSemanticRun(input: {
  evaluationSetId: string
  queries: readonly KnowledgeSemanticEvalQuery[]
  observations: readonly KnowledgeSemanticEvalObservation[]
}): KnowledgeSemanticEvalMetrics {
  const evaluationSetId = input.evaluationSetId.trim()
  if (!evaluationSetId) throw new Error('semantic eval set id is required')

  const queryIds = new Set<string>()
  for (const query of input.queries) {
    if (!query.id.trim()) throw new Error('semantic eval query id is required')
    if (queryIds.has(query.id)) throw new Error(`duplicate semantic eval query ${query.id}`)
    queryIds.add(query.id)
  }

  const observationByQueryId = new Map<string, KnowledgeSemanticEvalObservation>()
  for (const observation of input.observations) {
    if (observationByQueryId.has(observation.queryId)) {
      throw new Error(`duplicate semantic eval observation for query ${observation.queryId}`)
    }
    if (!queryIds.has(observation.queryId)) {
      throw new Error(`semantic eval observation references unknown query ${observation.queryId}`)
    }
    observationByQueryId.set(observation.queryId, observation)
  }

  const rows = input.queries.map((query) => {
    const observation = observationByQueryId.get(query.id)
    if (!observation) throw new Error(`missing semantic eval observation for query ${query.id}`)
    if (query.relevantUnitIds.length === 0) throw new Error(`semantic eval query ${query.id} has no relevant units`)

    const relevant = new Set(query.relevantUnitIds)
    return {
      query,
      observation,
      recallAt5: recallAtK(observation.rankedUnitIds, relevant, 5),
      mrrAt10: reciprocalRankAtK(observation.rankedUnitIds, relevant, 10),
      ndcgAt10: ndcgAtK(observation.rankedUnitIds, relevant, 10),
    }
  })

  const verifiedRows = rows.filter((row) => row.query.reliability === 'VERIFIED')
  const latencies = rows.map((row) => safeNonNegative(row.observation.latencyMs)).sort((a, b) => a - b)

  return {
    evaluationSetId,
    queryCount: rows.length,
    humanVerifiedQueryCount: rows.filter((row) => row.query.humanVerified).length,
    verifiedQueryCount: verifiedRows.length,
    recallAt5: round(metricMean(rows.map((row) => row.recallAt5))),
    mrrAt10: round(metricMean(rows.map((row) => row.mrrAt10))),
    ndcgAt10: round(metricMean(rows.map((row) => row.ndcgAt10))),
    verifiedRecallAt5: verifiedRows.length === 0
      ? null
      : round(metricMean(verifiedRows.map((row) => row.recallAt5))),
    p50LatencyMs: round(percentile(latencies, 0.5), 3),
    p95LatencyMs: round(percentile(latencies, 0.95), 3),
    workspaceLeakageCount: rows.reduce((sum, row) => sum + safeCount(row.observation.workspaceLeakageCount), 0),
    staleGenerationLeakageCount: rows.reduce((sum, row) => sum + safeCount(row.observation.staleGenerationLeakageCount), 0),
    filterViolationCount: rows.reduce((sum, row) => sum + safeCount(row.observation.filterViolationCount), 0),
  }
}

export function evaluateKnowledgeSemanticActivationGate(
  input: KnowledgeSemanticActivationGateInput,
): KnowledgeSemanticActivationGate {
  const thresholds = {
    ...DEFAULT_KNOWLEDGE_SEMANTIC_ACTIVATION_THRESHOLDS,
    ...input.thresholds,
  }
  const reasons: KnowledgeSemanticActivationGateReason[] = []
  const recallAt5Gain = round(input.hybrid.recallAt5 - input.baseline.recallAt5)
  const ndcgAt10Gain = round(input.hybrid.ndcgAt10 - input.baseline.ndcgAt10)
  const verifiedRecallAt5Regression = input.baseline.verifiedRecallAt5 === null || input.hybrid.verifiedRecallAt5 === null
    ? null
    : round(input.baseline.verifiedRecallAt5 - input.hybrid.verifiedRecallAt5)

  if (input.providerPolicyStatus !== 'PASS') reasons.push('PROVIDER_POLICY_NOT_PASS')
  if (
    !Number.isFinite(input.currentCorpusCoverageRatio)
    || Math.abs(input.currentCorpusCoverageRatio - 1) > 1e-9
  ) {
    reasons.push('CURRENT_CORPUS_COVERAGE_INCOMPLETE')
  }
  if (
    !input.baseline.evaluationSetId
    || input.baseline.evaluationSetId !== input.hybrid.evaluationSetId
    || input.baseline.queryCount !== input.hybrid.queryCount
  ) {
    reasons.push('EVAL_SET_MISMATCH')
  }
  if (
    input.baseline.queryCount < thresholds.minimumQueryCount
    || input.hybrid.queryCount < thresholds.minimumQueryCount
    || input.baseline.humanVerifiedQueryCount !== input.baseline.queryCount
    || input.hybrid.humanVerifiedQueryCount !== input.hybrid.queryCount
  ) {
    reasons.push('INSUFFICIENT_HUMAN_VERIFIED_QUERIES')
  }
  if (
    input.baseline.verifiedQueryCount <= 0
    || input.hybrid.verifiedQueryCount <= 0
    || input.baseline.verifiedQueryCount !== input.hybrid.verifiedQueryCount
    || input.baseline.verifiedRecallAt5 === null
    || input.hybrid.verifiedRecallAt5 === null
  ) {
    reasons.push('VERIFIED_QUERY_COVERAGE_MISSING')
  }
  if (recallAt5Gain < thresholds.minimumRecallAt5Gain) reasons.push('RECALL_GAIN_BELOW_THRESHOLD')
  if (ndcgAt10Gain < thresholds.minimumNdcgAt10Gain) reasons.push('NDCG_GAIN_BELOW_THRESHOLD')
  if (
    verifiedRecallAt5Regression !== null
    && verifiedRecallAt5Regression > thresholds.maximumVerifiedRecallAt5Regression
  ) {
    reasons.push('VERIFIED_RECALL_REGRESSION')
  }
  if (input.hybrid.p95LatencyMs > thresholds.maximumP95LatencyMs) reasons.push('P95_LATENCY_ABOVE_THRESHOLD')
  if (input.hybrid.workspaceLeakageCount > 0) reasons.push('WORKSPACE_LEAKAGE')
  if (input.hybrid.staleGenerationLeakageCount > 0) reasons.push('STALE_GENERATION_LEAKAGE')
  if (input.hybrid.filterViolationCount > 0) reasons.push('FILTER_VIOLATION')

  return {
    allowed: reasons.length === 0,
    reasons,
    recallAt5Gain,
    ndcgAt10Gain,
    verifiedRecallAt5Regression,
    thresholds,
  }
}

function recallAtK(rankedUnitIds: readonly string[], relevant: ReadonlySet<string>, k: number) {
  const found = new Set(rankedUnitIds.slice(0, k).filter((unitId) => relevant.has(unitId)))
  return found.size / relevant.size
}

function reciprocalRankAtK(rankedUnitIds: readonly string[], relevant: ReadonlySet<string>, k: number) {
  const index = rankedUnitIds.slice(0, k).findIndex((unitId) => relevant.has(unitId))
  return index === -1 ? 0 : 1 / (index + 1)
}

function ndcgAtK(rankedUnitIds: readonly string[], relevant: ReadonlySet<string>, k: number) {
  const dcg = rankedUnitIds.slice(0, k).reduce((sum, unitId, index) => {
    if (!relevant.has(unitId)) return sum
    return sum + 1 / Math.log2(index + 2)
  }, 0)
  const idealCount = Math.min(k, relevant.size)
  const ideal = Array.from({ length: idealCount }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, value) => sum + value, 0)
  return ideal === 0 ? 0 : dcg / ideal
}

function metricMean(values: readonly number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function percentile(sorted: readonly number[], quantile: number) {
  if (sorted.length === 0) return 0
  const q = Math.min(1, Math.max(0, quantile))
  const index = Math.ceil(q * sorted.length) - 1
  return sorted[Math.max(0, index)] ?? 0
}

function safeNonNegative(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

function safeCount(value: number) {
  return Math.floor(safeNonNegative(value))
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
