import {
  evaluateKnowledgeSemanticActivationGate,
  evaluateKnowledgeSemanticRun,
  type KnowledgeProviderPolicyStatus,
  type KnowledgeSemanticActivationGate,
  type KnowledgeSemanticEvalMetrics,
  type KnowledgeSemanticEvalObservation,
} from './semantic-evaluation'
import {
  evaluateKnowledgeSemanticGoldSetReadiness,
  toKnowledgeSemanticEvalQueries,
  type KnowledgeSemanticGoldSet,
  type KnowledgeSemanticGoldSetReadinessReason,
} from './semantic-gold-set'

export type KnowledgeRetrievalBenchmarkChannel = 'FULL_TEXT' | 'SEMANTIC' | 'HYBRID'

export type KnowledgeRetrievalBenchmarkRun = {
  channel: KnowledgeRetrievalBenchmarkChannel
  implementationRef: string
  observations: readonly KnowledgeSemanticEvalObservation[]
}

export type KnowledgeSemanticBenchmarkReceipt = {
  evaluationSetId: string
  goldSetVersion: number
  goldSetReadyForActivationEvidence: boolean
  goldSetReadinessReasons: KnowledgeSemanticGoldSetReadinessReason[]
  providerPolicyStatus: KnowledgeProviderPolicyStatus
  currentCorpusCoverageRatio: number
  implementationRefs: Partial<Record<KnowledgeRetrievalBenchmarkChannel, string>>
  channels: Partial<Record<KnowledgeRetrievalBenchmarkChannel, KnowledgeSemanticEvalMetrics>>
  activationGate: KnowledgeSemanticActivationGate | null
}

export function buildKnowledgeSemanticBenchmarkReceipt(input: {
  goldSet: KnowledgeSemanticGoldSet
  runs: readonly KnowledgeRetrievalBenchmarkRun[]
  providerPolicyStatus: KnowledgeProviderPolicyStatus
  currentCorpusCoverageRatio: number
}): KnowledgeSemanticBenchmarkReceipt {
  const readiness = evaluateKnowledgeSemanticGoldSetReadiness(input.goldSet)
  const evalQueries = toKnowledgeSemanticEvalQueries(input.goldSet)
  const channels: Partial<Record<KnowledgeRetrievalBenchmarkChannel, KnowledgeSemanticEvalMetrics>> = {}
  const implementationRefs: Partial<Record<KnowledgeRetrievalBenchmarkChannel, string>> = {}
  const seen = new Set<KnowledgeRetrievalBenchmarkChannel>()

  for (const run of input.runs) {
    if (seen.has(run.channel)) throw new Error(`duplicate benchmark channel ${run.channel}`)
    if (!run.implementationRef.trim()) throw new Error(`benchmark implementation ref is required for ${run.channel}`)
    seen.add(run.channel)
    implementationRefs[run.channel] = run.implementationRef.trim()
    channels[run.channel] = evaluateKnowledgeSemanticRun({
      evaluationSetId: input.goldSet.id,
      queries: evalQueries,
      observations: run.observations,
    })
  }

  const baseline = channels.FULL_TEXT
  const semantic = channels.SEMANTIC
  const hybrid = channels.HYBRID
  const activationGate = baseline && semantic && hybrid
    ? evaluateKnowledgeSemanticActivationGate({
        providerPolicyStatus: input.providerPolicyStatus,
        currentCorpusCoverageRatio: input.currentCorpusCoverageRatio,
        baseline,
        hybrid,
      })
    : null

  const common = {
    evaluationSetId: input.goldSet.id,
    goldSetVersion: input.goldSet.version,
    goldSetReadyForActivationEvidence: readiness.readyForActivationEvidence,
    goldSetReadinessReasons: readiness.reasons,
    providerPolicyStatus: input.providerPolicyStatus,
    currentCorpusCoverageRatio: input.currentCorpusCoverageRatio,
    implementationRefs,
    channels,
  }

  if (activationGate && !readiness.readyForActivationEvidence) {
    return {
      ...common,
      activationGate: {
        ...activationGate,
        allowed: false,
        reasons: activationGate.reasons.includes('GOLD_SET_NOT_READY')
          ? activationGate.reasons
          : [...activationGate.reasons, 'GOLD_SET_NOT_READY'],
      },
    }
  }

  return {
    ...common,
    activationGate,
  }
}
