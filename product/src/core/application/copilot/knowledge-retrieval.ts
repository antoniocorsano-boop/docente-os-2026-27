import type {
  KnowledgeContentCategory,
  KnowledgeReliability,
  KnowledgeSourceProvider,
} from '@/core/domain/knowledge'

export type KnowledgeRetrievalChannel = 'FULL_TEXT' | 'SEMANTIC'

export type KnowledgeRetrievalFilters = {
  academicYearId?: string
  category?: KnowledgeContentCategory
  discipline?: string
  classLabel?: string
  allowedReliability?: KnowledgeReliability[]
}

export type KnowledgeRetrievalQuery = {
  workspaceId: string
  query: string
  limit?: number
  filters?: KnowledgeRetrievalFilters
}

export type KnowledgeRetrievalRawHit = {
  resultId: string
  channel: KnowledgeRetrievalChannel
  channelRank: number
  workspaceId: string
  academicYearId: string | null
  assetId: string
  documentId: string
  unitId: string
  currentGenerationId: string | null
  generationId: string
  title: string | null
  content: string
  contentCategory: KnowledgeContentCategory
  disciplines: string[]
  classLabels: string[]
  reliability: KnowledgeReliability
  capturedAt: string
  sourceProvider: KnowledgeSourceProvider
  sourceLocator: string | null
  sourcePage: number | null
}

export type KnowledgeRetrievalProvenance = {
  assetId: string
  assetRef: string
  currentGenerationId: string
  sourceProvider: KnowledgeSourceProvider
  sourceLocator: string | null
  capturedAt: string
  reliability: KnowledgeReliability
}

export type KnowledgeRetrievalResult = {
  resultId: string
  assetId: string
  documentId: string
  unitId: string
  generationId: string
  title: string | null
  excerpt: string
  sourcePage: number | null
  academicYearId: string | null
  contentCategory: KnowledgeContentCategory
  disciplines: string[]
  classLabels: string[]
  reliability: KnowledgeReliability
  score: number
  channels: KnowledgeRetrievalChannel[]
  provenance: KnowledgeRetrievalProvenance
}

export type KnowledgeRetrievalResponse = {
  query: string
  filters: KnowledgeRetrievalFilters
  semanticAvailable: boolean
  channelsUsed: KnowledgeRetrievalChannel[]
  results: KnowledgeRetrievalResult[]
}

export interface KnowledgeRetrievalPort {
  searchRelevant(input: KnowledgeRetrievalQuery): Promise<KnowledgeRetrievalResponse>
}

const RRF_K = 60
const MAX_RESULTS = 20

export function buildKnowledgeRetrievalResponse(input: {
  query: KnowledgeRetrievalQuery
  fullTextHits: readonly KnowledgeRetrievalRawHit[]
  semanticHits?: readonly KnowledgeRetrievalRawHit[]
  semanticAvailable?: boolean
}): KnowledgeRetrievalResponse {
  const query = input.query.query.trim()
  const filters = normalizeFilters(input.query.filters)
  const limit = normalizeLimit(input.query.limit)
  const semanticAvailable = input.semanticAvailable === true

  if (!query) {
    return { query, filters, semanticAvailable, channelsUsed: [], results: [] }
  }

  const lexical = eligibleHits(input.fullTextHits, input.query.workspaceId, filters, 'FULL_TEXT')
  const semantic = semanticAvailable
    ? eligibleHits(input.semanticHits ?? [], input.query.workspaceId, filters, 'SEMANTIC')
    : []

  const fused = new Map<string, {
    hit: KnowledgeRetrievalRawHit
    score: number
    channels: Set<KnowledgeRetrievalChannel>
  }>()

  for (const hit of [...lexical, ...semantic]) {
    const contribution = reciprocalRank(hit.channelRank) + reliabilityBoost(hit.reliability)
    const current = fused.get(hit.resultId)
    if (!current) {
      fused.set(hit.resultId, {
        hit,
        score: contribution,
        channels: new Set([hit.channel]),
      })
      continue
    }
    current.score += contribution
    current.channels.add(hit.channel)
    if (compareRawHitAuthority(hit, current.hit) < 0) current.hit = hit
  }

  const results = [...fused.values()]
    .map(({ hit, score, channels }) => toResult(hit, score, channels))
    .sort(compareResults)
    .slice(0, limit)

  const channelsUsed: KnowledgeRetrievalChannel[] = []
  if (lexical.length) channelsUsed.push('FULL_TEXT')
  if (semantic.length) channelsUsed.push('SEMANTIC')

  return { query, filters, semanticAvailable, channelsUsed, results }
}

export function isKnowledgeRetrievalHitEligible(
  hit: KnowledgeRetrievalRawHit,
  workspaceId: string,
  filters: KnowledgeRetrievalFilters = {},
): boolean {
  if (hit.workspaceId !== workspaceId) return false
  if (!hit.currentGenerationId || hit.generationId !== hit.currentGenerationId) return false

  const normalized = normalizeFilters(filters)
  if (normalized.academicYearId && hit.academicYearId !== normalized.academicYearId) return false
  if (normalized.category && hit.contentCategory !== normalized.category) return false
  if (normalized.discipline && !includesNormalized(hit.disciplines, normalized.discipline)) return false
  if (normalized.classLabel && !includesNormalized(hit.classLabels, normalized.classLabel)) return false
  if (normalized.allowedReliability?.length
    && !normalized.allowedReliability.includes(hit.reliability)) return false

  return true
}

function eligibleHits(
  hits: readonly KnowledgeRetrievalRawHit[],
  workspaceId: string,
  filters: KnowledgeRetrievalFilters,
  channel: KnowledgeRetrievalChannel,
) {
  return hits
    .filter((hit) => hit.channel === channel && isKnowledgeRetrievalHitEligible(hit, workspaceId, filters))
    .sort((a, b) => a.channelRank - b.channelRank || a.resultId.localeCompare(b.resultId))
}

function toResult(
  hit: KnowledgeRetrievalRawHit,
  score: number,
  channels: Set<KnowledgeRetrievalChannel>,
): KnowledgeRetrievalResult {
  return {
    resultId: hit.resultId,
    assetId: hit.assetId,
    documentId: hit.documentId,
    unitId: hit.unitId,
    generationId: hit.generationId,
    title: hit.title,
    excerpt: boundedExcerpt(hit.content),
    sourcePage: hit.sourcePage,
    academicYearId: hit.academicYearId,
    contentCategory: hit.contentCategory,
    disciplines: [...hit.disciplines],
    classLabels: [...hit.classLabels],
    reliability: hit.reliability,
    score: Number(score.toFixed(8)),
    channels: [...channels].sort(compareChannels),
    provenance: {
      assetId: hit.assetId,
      assetRef: `/knowledge/${encodeURIComponent(hit.assetId)}`,
      currentGenerationId: hit.currentGenerationId!,
      sourceProvider: hit.sourceProvider,
      sourceLocator: hit.sourceLocator,
      capturedAt: hit.capturedAt,
      reliability: hit.reliability,
    },
  }
}

function compareResults(a: KnowledgeRetrievalResult, b: KnowledgeRetrievalResult) {
  if (a.score !== b.score) return b.score - a.score
  const authority = reliabilityRank(a.reliability) - reliabilityRank(b.reliability)
  if (authority !== 0) return authority
  const freshness = Date.parse(b.provenance.capturedAt) - Date.parse(a.provenance.capturedAt)
  if (Number.isFinite(freshness) && freshness !== 0) return freshness
  return a.resultId.localeCompare(b.resultId)
}

function compareRawHitAuthority(a: KnowledgeRetrievalRawHit, b: KnowledgeRetrievalRawHit) {
  const authority = reliabilityRank(a.reliability) - reliabilityRank(b.reliability)
  if (authority !== 0) return authority
  return a.channelRank - b.channelRank
}

function reliabilityRank(value: KnowledgeReliability) {
  if (value === 'VERIFIED') return 0
  if (value === 'AUTO') return 1
  return 2
}

function reliabilityBoost(value: KnowledgeReliability) {
  if (value === 'VERIFIED') return 0.003
  if (value === 'AUTO') return 0.001
  return 0
}

function reciprocalRank(rank: number) {
  const safeRank = Number.isFinite(rank) ? Math.max(1, Math.round(rank)) : Number.MAX_SAFE_INTEGER
  return 1 / (RRF_K + safeRank)
}

function boundedExcerpt(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length <= 700 ? clean : `${clean.slice(0, 697).trimEnd()}…`
}

function normalizeFilters(filters: KnowledgeRetrievalFilters | undefined): KnowledgeRetrievalFilters {
  if (!filters) return {}
  const allowedReliability = filters.allowedReliability
    ? [...new Set(filters.allowedReliability)]
    : undefined
  return {
    ...(filters.academicYearId?.trim() ? { academicYearId: filters.academicYearId.trim() } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.discipline?.trim() ? { discipline: filters.discipline.trim() } : {}),
    ...(filters.classLabel?.trim() ? { classLabel: filters.classLabel.trim() } : {}),
    ...(allowedReliability?.length ? { allowedReliability } : {}),
  }
}

function includesNormalized(values: readonly string[], expected: string) {
  const needle = normalizeLabel(expected)
  return values.some((value) => normalizeLabel(value) === needle)
}

function normalizeLabel(value: string) {
  return value.trim().toLocaleLowerCase('it-IT')
}

function normalizeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 10
  return Math.min(MAX_RESULTS, Math.max(1, Math.round(value!)))
}

function compareChannels(a: KnowledgeRetrievalChannel, b: KnowledgeRetrievalChannel) {
  const order: Record<KnowledgeRetrievalChannel, number> = { FULL_TEXT: 0, SEMANTIC: 1 }
  return order[a] - order[b]
}
