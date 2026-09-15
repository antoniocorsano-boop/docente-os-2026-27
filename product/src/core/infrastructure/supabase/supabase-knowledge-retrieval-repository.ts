import {
  buildKnowledgeRetrievalResponse,
  type KnowledgeRetrievalPort,
  type KnowledgeRetrievalQuery,
  type KnowledgeRetrievalRawHit,
  type KnowledgeRetrievalResponse,
} from '@/core/application/copilot/knowledge-retrieval'
import type {
  KnowledgeContentCategory,
  KnowledgeReliability,
  KnowledgeSourceProvider,
} from '@/core/domain/knowledge'
import { createClient } from '@/lib/supabase/server'

const MAX_ASSET_SCOPE = 500
const MAX_CANDIDATES = 100

export class SupabaseKnowledgeRetrievalRepository implements KnowledgeRetrievalPort {
  async searchRelevant(input: KnowledgeRetrievalQuery): Promise<KnowledgeRetrievalResponse> {
    const term = input.query.trim()
    if (!term) {
      return buildKnowledgeRetrievalResponse({
        query: input,
        fullTextHits: [],
        semanticAvailable: false,
      })
    }

    const supabase = await createClient()
    const filters = input.filters ?? {}

    let assetRequest = supabase
      .from('knowledge_assets')
      .select('id, workspace_id, academic_year_id, current_generation_id, content_category, disciplines, class_labels, reliability, captured_at, source_provider, source_locator')
      .eq('workspace_id', input.workspaceId)
      .eq('processing_status', 'INDEXED')
      .not('current_generation_id', 'is', null)

    if (filters.academicYearId) assetRequest = assetRequest.eq('academic_year_id', filters.academicYearId)
    if (filters.category) assetRequest = assetRequest.eq('content_category', filters.category)
    if (filters.discipline) assetRequest = assetRequest.contains('disciplines', [filters.discipline])
    if (filters.classLabel) assetRequest = assetRequest.contains('class_labels', [filters.classLabel])
    if (filters.allowedReliability?.length) assetRequest = assetRequest.in('reliability', filters.allowedReliability)

    const { data: assetRows, error: assetError } = await assetRequest
      .order('captured_at', { ascending: false })
      .limit(MAX_ASSET_SCOPE)
    if (assetError) throw new Error(assetError.message)

    const assets = assetRows.filter((asset) => Boolean(asset.current_generation_id))
    if (!assets.length) {
      return buildKnowledgeRetrievalResponse({ query: input, fullTextHits: [], semanticAvailable: false })
    }

    const generationIds = assets.map((asset) => asset.current_generation_id!)
    const { data: documentRows, error: documentError } = await supabase
      .from('knowledge_documents')
      .select('id, asset_id, generation_id, workspace_id, title')
      .eq('workspace_id', input.workspaceId)
      .in('generation_id', generationIds)
    if (documentError) throw new Error(documentError.message)
    if (!documentRows.length) {
      return buildKnowledgeRetrievalResponse({ query: input, fullTextHits: [], semanticAvailable: false })
    }

    const documentIds = documentRows.map((document) => document.id)
    const candidateLimit = Math.min(
      MAX_CANDIDATES,
      Math.max(20, Math.max(1, input.limit ?? 10) * 5),
    )
    const { data: unitRows, error: unitError } = await supabase
      .from('knowledge_units')
      .select('id, document_id, workspace_id, title, content, source_page, validation_status')
      .eq('workspace_id', input.workspaceId)
      .in('document_id', documentIds)
      .neq('validation_status', 'REJECTED')
      .textSearch('search_vector', term, { config: 'italian', type: 'websearch' })
      .limit(candidateLimit)
    if (unitError) throw new Error(unitError.message)

    const assetByGeneration = new Map(
      assets.map((asset) => [asset.current_generation_id!, asset]),
    )
    const documentById = new Map(documentRows.map((document) => [document.id, document]))

    const candidates = unitRows.flatMap((unit) => {
      const document = documentById.get(unit.document_id)
      if (!document) return []
      const asset = assetByGeneration.get(document.generation_id)
      if (!asset || asset.id !== document.asset_id) return []

      return [{
        resultId: unit.id,
        unit,
        document,
        asset,
        lexicalScore: lexicalScore(term, unit.title ?? document.title, unit.content),
      }]
    })
      .sort((a, b) => b.lexicalScore - a.lexicalScore || a.resultId.localeCompare(b.resultId))

    const fullTextHits: KnowledgeRetrievalRawHit[] = candidates.map((candidate, index) => ({
      resultId: candidate.resultId,
      channel: 'FULL_TEXT',
      channelRank: index + 1,
      workspaceId: candidate.asset.workspace_id,
      academicYearId: candidate.asset.academic_year_id,
      assetId: candidate.asset.id,
      documentId: candidate.document.id,
      unitId: candidate.unit.id,
      currentGenerationId: candidate.asset.current_generation_id,
      generationId: candidate.document.generation_id,
      title: candidate.unit.title ?? candidate.document.title,
      content: candidate.unit.content,
      contentCategory: candidate.asset.content_category as KnowledgeContentCategory,
      disciplines: candidate.asset.disciplines,
      classLabels: candidate.asset.class_labels,
      reliability: candidate.asset.reliability as KnowledgeReliability,
      capturedAt: candidate.asset.captured_at,
      sourceProvider: candidate.asset.source_provider as KnowledgeSourceProvider,
      sourceLocator: candidate.asset.source_locator,
      sourcePage: candidate.unit.source_page,
    }))

    return buildKnowledgeRetrievalResponse({
      query: input,
      fullTextHits,
      semanticAvailable: false,
    })
  }
}

function lexicalScore(query: string, title: string | null, content: string) {
  const normalizedQuery = normalize(query)
  const normalizedTitle = normalize(title ?? '')
  const normalizedContent = normalize(content)
  const terms = [...new Set(normalizedQuery.split(/\s+/).filter((term) => term.length > 1))]

  let score = 0
  if (normalizedQuery && normalizedTitle.includes(normalizedQuery)) score += 8
  if (normalizedQuery && normalizedContent.includes(normalizedQuery)) score += 4
  for (const term of terms) {
    if (normalizedTitle.includes(term)) score += 2
    if (normalizedContent.includes(term)) score += 1
  }
  return score
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('it-IT')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
