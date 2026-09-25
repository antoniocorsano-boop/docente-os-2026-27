import type {
  KnowledgeEvalDataClass,
  KnowledgeEvalReliability,
  KnowledgeSemanticEvalQuery,
} from './semantic-evaluation'

export type KnowledgeGoldSetVerification = {
  method: 'HUMAN'
  reviewerRole: 'TEACHER'
  verifiedAt: string
}

export type KnowledgeGoldSetQueryType = 'EXACT' | 'CONCEPTUAL'

export type KnowledgeSemanticGoldSetQuery = {
  id: string
  queryText: string
  relevantUnitIds: readonly string[]
  queryType: KnowledgeGoldSetQueryType
  category: string
  discipline: string
  classRef: string
  reliability: KnowledgeEvalReliability
  dataClass: KnowledgeEvalDataClass
  verification: KnowledgeGoldSetVerification | null
}

export type KnowledgeSemanticGoldSet = {
  id: string
  locale: 'it-IT'
  version: number
  publicationClass: 'PRIVATE_RUNTIME' | 'PUBLIC_SANITIZED_FIXTURE'
  queries: readonly KnowledgeSemanticGoldSetQuery[]
}

export type KnowledgeSemanticGoldSetReadinessReason =
  | 'SET_ID_REQUIRED'
  | 'VERSION_INVALID'
  | 'QUERY_COUNT_BELOW_MINIMUM'
  | 'DUPLICATE_QUERY_ID'
  | 'QUERY_TEXT_REQUIRED'
  | 'RELEVANCE_REQUIRED'
  | 'DUPLICATE_RELEVANT_UNIT_ID'
  | 'QUERY_TYPE_COVERAGE_REQUIRED'
  | 'CATEGORY_REQUIRED'
  | 'DISCIPLINE_REQUIRED'
  | 'CLASS_REQUIRED'
  | 'RELIABILITY_COVERAGE_REQUIRED'
  | 'HUMAN_VERIFICATION_REQUIRED'
  | 'HUMAN_VERIFICATION_TIMESTAMP_INVALID'
  | 'PUBLIC_FIXTURE_MUST_BE_SANITIZED'

export type KnowledgeSemanticGoldSetReadiness = {
  readyForActivationEvidence: boolean
  reasons: KnowledgeSemanticGoldSetReadinessReason[]
  queryCount: number
  verifiedQueryCount: number
}

export const MINIMUM_K3C_GOLD_SET_QUERY_COUNT = 30

export function evaluateKnowledgeSemanticGoldSetReadiness(
  set: KnowledgeSemanticGoldSet,
): KnowledgeSemanticGoldSetReadiness {
  const reasons = new Set<KnowledgeSemanticGoldSetReadinessReason>()
  const ids = new Set<string>()
  const queryTypes = new Set<KnowledgeGoldSetQueryType>()
  const reliabilities = new Set<KnowledgeEvalReliability>()
  let verifiedQueryCount = 0

  if (!set.id.trim()) reasons.add('SET_ID_REQUIRED')
  if (!Number.isInteger(set.version) || set.version < 1) reasons.add('VERSION_INVALID')
  if (set.queries.length < MINIMUM_K3C_GOLD_SET_QUERY_COUNT) reasons.add('QUERY_COUNT_BELOW_MINIMUM')

  for (const query of set.queries) {
    const queryId = query.id.trim()
    if (!queryId || ids.has(queryId)) reasons.add('DUPLICATE_QUERY_ID')
    ids.add(queryId)

    if (!query.queryText.trim()) reasons.add('QUERY_TEXT_REQUIRED')
    if (query.relevantUnitIds.length === 0) reasons.add('RELEVANCE_REQUIRED')
    queryTypes.add(query.queryType)
    reliabilities.add(query.reliability)
    if (!query.category.trim()) reasons.add('CATEGORY_REQUIRED')
    if (!query.discipline.trim()) reasons.add('DISCIPLINE_REQUIRED')
    if (!query.classRef.trim()) reasons.add('CLASS_REQUIRED')

    const relevantIds = query.relevantUnitIds.map((unitId) => unitId.trim())
    if (relevantIds.some((unitId) => !unitId)) reasons.add('RELEVANCE_REQUIRED')
    if (new Set(relevantIds).size !== relevantIds.length) reasons.add('DUPLICATE_RELEVANT_UNIT_ID')

    if (query.verification?.method === 'HUMAN' && query.verification.reviewerRole === 'TEACHER') {
      const verifiedAt = Date.parse(query.verification.verifiedAt)
      if (Number.isFinite(verifiedAt)) verifiedQueryCount += 1
      else reasons.add('HUMAN_VERIFICATION_TIMESTAMP_INVALID')
    } else {
      reasons.add('HUMAN_VERIFICATION_REQUIRED')
    }

    if (
      set.publicationClass === 'PUBLIC_SANITIZED_FIXTURE'
      && query.dataClass !== 'SANITIZED_NON_PERSONAL'
    ) {
      reasons.add('PUBLIC_FIXTURE_MUST_BE_SANITIZED')
    }
  }

  if (!queryTypes.has('EXACT') || !queryTypes.has('CONCEPTUAL')) {
    reasons.add('QUERY_TYPE_COVERAGE_REQUIRED')
  }
  if (reliabilities.size < 2) reasons.add('RELIABILITY_COVERAGE_REQUIRED')

  return {
    readyForActivationEvidence: reasons.size === 0 && verifiedQueryCount === set.queries.length,
    reasons: [...reasons],
    queryCount: set.queries.length,
    verifiedQueryCount,
  }
}

export function toKnowledgeSemanticEvalQueries(
  set: KnowledgeSemanticGoldSet,
): KnowledgeSemanticEvalQuery[] {
  return set.queries.map((query) => ({
    id: query.id,
    relevantUnitIds: [...query.relevantUnitIds],
    reliability: query.reliability,
    humanVerified: query.verification?.method === 'HUMAN'
      && query.verification.reviewerRole === 'TEACHER'
      && Number.isFinite(Date.parse(query.verification.verifiedAt)),
    dataClass: query.dataClass,
  }))
}
