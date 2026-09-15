export type KnowledgeEmbeddingProfileStatus = 'EVALUATION' | 'ACTIVE' | 'RETIRED'
export type KnowledgeEmbeddingDistanceMetric = 'COSINE'
export type KnowledgeEmbeddingLanguageScope = 'ITALIAN' | 'MULTILINGUAL'

export type KnowledgeEmbeddingProfile = {
  id: string
  provider: string
  model: string
  modelRevision: string
  dimensions: number
  distanceMetric: KnowledgeEmbeddingDistanceMetric
  languageScope: KnowledgeEmbeddingLanguageScope
  policyRef: string
  status: KnowledgeEmbeddingProfileStatus
}

export type KnowledgeSemanticCoverage = {
  currentUnits: number
  embeddedCurrentUnits: number
}

export type KnowledgeSemanticRuntime = {
  configuredProfileId: string | null
  providerPolicyAllowed: boolean
}

export type KnowledgeSemanticReadinessReason =
  | 'PROFILE_MISSING'
  | 'PROFILE_NOT_ACTIVE'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_PROFILE_MISMATCH'
  | 'PROVIDER_POLICY_BLOCKED'
  | 'CURRENT_CORPUS_EMPTY'
  | 'CURRENT_CORPUS_INCOMPLETE'

export type KnowledgeSemanticReadiness = {
  available: boolean
  coverageRatio: number
  reasons: KnowledgeSemanticReadinessReason[]
}

export interface KnowledgeEmbeddingProviderPort {
  embedQuery(input: {
    profile: KnowledgeEmbeddingProfile
    text: string
  }): Promise<readonly number[]>
}

export const KNOWLEDGE_SEMANTIC_INDEX_STRATEGY = 'EXACT_COSINE' as const
export const MAX_KNOWLEDGE_EMBEDDING_DIMENSIONS = 4096

export function evaluateKnowledgeSemanticReadiness(input: {
  profile: KnowledgeEmbeddingProfile | null
  runtime: KnowledgeSemanticRuntime
  coverage: KnowledgeSemanticCoverage
}): KnowledgeSemanticReadiness {
  const reasons: KnowledgeSemanticReadinessReason[] = []
  const profile = input.profile

  if (!profile) reasons.push('PROFILE_MISSING')
  else if (profile.status !== 'ACTIVE') reasons.push('PROFILE_NOT_ACTIVE')

  if (!input.runtime.configuredProfileId) reasons.push('PROVIDER_NOT_CONFIGURED')
  else if (profile && input.runtime.configuredProfileId !== profile.id) {
    reasons.push('PROVIDER_PROFILE_MISMATCH')
  }

  if (!input.runtime.providerPolicyAllowed) reasons.push('PROVIDER_POLICY_BLOCKED')

  const currentUnits = safeCount(input.coverage.currentUnits)
  const embeddedCurrentUnits = Math.min(safeCount(input.coverage.embeddedCurrentUnits), currentUnits)
  const coverageRatio = currentUnits === 0 ? 0 : embeddedCurrentUnits / currentUnits

  if (currentUnits === 0) reasons.push('CURRENT_CORPUS_EMPTY')
  else if (embeddedCurrentUnits !== currentUnits) reasons.push('CURRENT_CORPUS_INCOMPLETE')

  return {
    available: reasons.length === 0,
    coverageRatio: Number(coverageRatio.toFixed(6)),
    reasons,
  }
}

export function validateKnowledgeEmbeddingProfile(profile: KnowledgeEmbeddingProfile): string[] {
  const problems: string[] = []

  if (!profile.id.trim()) problems.push('profile id is required')
  if (!profile.provider.trim()) problems.push('provider is required')
  if (!profile.model.trim()) problems.push('model is required')
  if (!profile.modelRevision.trim()) problems.push('model revision is required')
  if (!profile.policyRef.trim()) problems.push('policy reference is required')
  if (!Number.isInteger(profile.dimensions)
    || profile.dimensions < 1
    || profile.dimensions > MAX_KNOWLEDGE_EMBEDDING_DIMENSIONS) {
    problems.push(`dimensions must be an integer between 1 and ${MAX_KNOWLEDGE_EMBEDDING_DIMENSIONS}`)
  }
  if (profile.distanceMetric !== 'COSINE') problems.push('only cosine distance is canonical')
  if (profile.languageScope !== 'ITALIAN' && profile.languageScope !== 'MULTILINGUAL') {
    problems.push('profile must support Italian')
  }

  return problems
}

export function validateKnowledgeEmbeddingVector(
  profile: KnowledgeEmbeddingProfile,
  vector: readonly number[],
): string[] {
  const problems = validateKnowledgeEmbeddingProfile(profile)
  if (vector.length !== profile.dimensions) {
    problems.push(`embedding dimensions mismatch: expected ${profile.dimensions}, received ${vector.length}`)
  }
  if (vector.some((value) => !Number.isFinite(value))) {
    problems.push('embedding contains a non-finite value')
  }
  return problems
}

function safeCount(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}
