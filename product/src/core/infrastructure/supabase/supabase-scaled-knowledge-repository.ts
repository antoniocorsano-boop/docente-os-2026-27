import type {
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeUnit,
  KnowledgeUnitType,
  KnowledgeValidationStatus,
} from '@/core/domain/knowledge'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { SupabaseKnowledgeRepository } from './supabase-knowledge-repository'

type SearchMatchRow = {
  unit_id: string
  document_id: string
  rank: number
}

type SearchRpcClient = {
  rpc: (
    name: 'search_current_knowledge_units',
    args: { p_workspace_id: string; p_query: string; p_limit: number },
  ) => Promise<{ data: SearchMatchRow[] | null; error: { message: string } | null }>
}

function object(value: Json): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asDocument(row: {
  id: string
  asset_id: string
  generation_id: string
  workspace_id: string
  title: string | null
  document_type: string
  language: string
  normalized_text: string | null
  normalized_markdown: string | null
  summary: string | null
  extracted_data: Json
  processing_version: string
  created_at: string
  updated_at: string
}): KnowledgeDocument {
  return {
    id: row.id,
    assetId: row.asset_id,
    generationId: row.generation_id,
    workspaceId: row.workspace_id,
    title: row.title,
    documentType: row.document_type as KnowledgeDocumentType,
    language: row.language,
    normalizedText: row.normalized_text,
    normalizedMarkdown: row.normalized_markdown,
    summary: row.summary,
    extractedData: object(row.extracted_data),
    processingVersion: row.processing_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function asUnit(row: {
  id: string
  document_id: string
  workspace_id: string
  ordinal: number
  unit_type: string
  title: string | null
  content: string
  structured_data: Json
  source_page: number | null
  start_offset: number | null
  end_offset: number | null
  confidence: number | null
  validation_status: string
  created_at: string
  updated_at: string
}): KnowledgeUnit {
  return {
    id: row.id,
    documentId: row.document_id,
    workspaceId: row.workspace_id,
    ordinal: row.ordinal,
    unitType: row.unit_type as KnowledgeUnitType,
    title: row.title,
    content: row.content,
    structuredData: object(row.structured_data),
    sourcePage: row.source_page,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    confidence: row.confidence,
    validationStatus: row.validation_status as KnowledgeValidationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseScaledKnowledgeRepository extends SupabaseKnowledgeRepository {
  override async search(workspaceId: string, query: string, limit = 20) {
    const term = query.trim()
    if (!term) return []

    const boundedLimit = Math.max(1, Math.min(limit, 50))
    const supabase = await createClient()
    const { data: matches, error } = await (supabase as unknown as SearchRpcClient).rpc(
      'search_current_knowledge_units',
      {
        p_workspace_id: workspaceId,
        p_query: term,
        p_limit: boundedLimit,
      },
    )
    if (error) throw new Error(error.message)
    if (!matches?.length) return []

    const unitIds = matches.map((match) => match.unit_id)
    const documentIds = [...new Set(matches.map((match) => match.document_id))]
    const [unitsResult, documentsResult] = await Promise.all([
      supabase.from('knowledge_units').select('*').in('id', unitIds),
      supabase.from('knowledge_documents').select('*').in('id', documentIds),
    ])
    if (unitsResult.error) throw new Error(unitsResult.error.message)
    if (documentsResult.error) throw new Error(documentsResult.error.message)

    const unitsById = new Map((unitsResult.data ?? []).map((row) => [row.id, asUnit(row)]))
    const documentsById = new Map((documentsResult.data ?? []).map((row) => [row.id, asDocument(row)]))

    return matches.flatMap((match) => {
      const unit = unitsById.get(match.unit_id)
      const document = documentsById.get(match.document_id)
      return unit && document ? [{ unit, document, rank: match.rank }] : []
    })
  }
}
