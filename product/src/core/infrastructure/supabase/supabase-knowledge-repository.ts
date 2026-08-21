import type {
  KnowledgeAssetRepository,
  KnowledgeDocumentRepository,
  KnowledgeIngestionLog,
  KnowledgeSearchPort,
} from '@/core/application/ports/knowledge-base'
import type {
  CapturedAssetInput,
  KnowledgeAsset,
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeProcessingStatus,
  KnowledgeUnit,
  KnowledgeUnitType,
  KnowledgeValidationStatus,
  NormalizedKnowledge,
} from '@/core/domain/knowledge'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

function object(value: Json): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asAsset(row: {
  id: string; workspace_id: string; academic_year_id: string | null; asset_kind: string; source_provider: string;
  source_locator: string | null; original_name: string | null; mime_type: string | null; byte_size: number | null;
  sha256: string | null; processing_status: string; source_metadata: Json; captured_at: string; created_by: string;
  created_at: string; updated_at: string
}): KnowledgeAsset {
  const metadata = object(row.source_metadata)
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    assetKind: row.asset_kind as KnowledgeAsset['assetKind'],
    sourceProvider: row.source_provider as KnowledgeAsset['sourceProvider'],
    sourceLocator: row.source_locator,
    originalName: row.original_name,
    originalText: typeof metadata.originalText === 'string' ? metadata.originalText : null,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    processingStatus: row.processing_status as KnowledgeProcessingStatus,
    sourceMetadata: metadata,
    capturedAt: row.captured_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function asDocument(row: {
  id: string; asset_id: string; workspace_id: string; title: string | null; document_type: string; language: string;
  normalized_text: string | null; normalized_markdown: string | null; summary: string | null; extracted_data: Json;
  processing_version: string; created_at: string; updated_at: string
}): KnowledgeDocument {
  return {
    id: row.id,
    assetId: row.asset_id,
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
  id: string; document_id: string; workspace_id: string; ordinal: number; unit_type: string; title: string | null;
  content: string; structured_data: Json; source_page: number | null; start_offset: number | null; end_offset: number | null;
  confidence: number | null; validation_status: string; created_at: string; updated_at: string
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

export class SupabaseKnowledgeRepository implements KnowledgeAssetRepository, KnowledgeDocumentRepository, KnowledgeSearchPort, KnowledgeIngestionLog {
  async capture(input: CapturedAssetInput): Promise<KnowledgeAsset> {
    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) throw new Error('Authenticated user required')

    const metadata = { ...(input.sourceMetadata ?? {}), ...(input.originalText ? { originalText: input.originalText } : {}) }
    const payload = {
      workspace_id: input.workspaceId,
      academic_year_id: input.academicYearId ?? null,
      asset_kind: input.assetKind,
      source_provider: input.sourceProvider,
      source_locator: input.sourceLocator ?? null,
      original_name: input.originalName ?? null,
      original_text: input.originalText ?? null,
      mime_type: input.mimeType ?? null,
      byte_size: input.byteSize ?? null,
      sha256: input.sha256 ?? null,
      source_metadata: metadata as Json,
      created_by: userId,
    }
    const { data, error } = await supabase.from('knowledge_assets').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    return asAsset(data)
  }

  async setProcessingStatus(assetId: string, status: KnowledgeProcessingStatus): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('knowledge_assets').update({ processing_status: status }).eq('id', assetId)
    if (error) throw new Error(error.message)
  }

  async getById(assetId: string): Promise<KnowledgeAsset | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_assets').select('*').eq('id', assetId).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? asAsset(data) : null
  }

  async upsertNormalized(asset: KnowledgeAsset, normalized: NormalizedKnowledge): Promise<KnowledgeDocument> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_documents').upsert({
      asset_id: asset.id,
      workspace_id: asset.workspaceId,
      title: normalized.title ?? null,
      document_type: normalized.documentType,
      language: normalized.language ?? 'it',
      normalized_text: normalized.text ?? null,
      normalized_markdown: normalized.markdown ?? null,
      summary: normalized.summary ?? null,
      extracted_data: (normalized.extractedData ?? {}) as Json,
      processing_version: `${normalized.processor}@${normalized.processorVersion}`,
    }, { onConflict: 'asset_id' }).select('*').single()
    if (error) throw new Error(error.message)
    return asDocument(data)
  }

  async replaceUnits(document: KnowledgeDocument, normalized: NormalizedKnowledge): Promise<KnowledgeUnit[]> {
    if (!normalized.units.length) return []
    const supabase = await createClient()
    const payload = normalized.units.map((unit, ordinal) => ({
      document_id: document.id,
      workspace_id: document.workspaceId,
      ordinal,
      unit_type: unit.type,
      title: unit.title ?? null,
      content: unit.content,
      structured_data: (unit.structuredData ?? {}) as Json,
      source_page: unit.sourcePage ?? null,
      start_offset: unit.startOffset ?? null,
      end_offset: unit.endOffset ?? null,
      confidence: unit.confidence ?? null,
      validation_status: 'AUTO',
    }))
    const { data, error } = await supabase.from('knowledge_units').upsert(payload, { onConflict: 'document_id,ordinal' }).select('*')
    if (error) throw new Error(error.message)
    return data.map(asUnit)
  }

  async search(workspaceId: string, query: string, limit = 20) {
    const supabase = await createClient()
    const term = query.trim()
    if (!term) return []

    const { data: units, error } = await supabase
      .from('knowledge_units')
      .select('*')
      .eq('workspace_id', workspaceId)
      .textSearch('search_vector', term, { config: 'italian', type: 'websearch' })
      .limit(limit)
    if (error) throw new Error(error.message)

    const documentIds = [...new Set(units.map((unit) => unit.document_id))]
    if (!documentIds.length) return []
    const { data: documents, error: documentError } = await supabase
      .from('knowledge_documents').select('*').in('id', documentIds)
    if (documentError) throw new Error(documentError.message)
    const byId = new Map(documents.map((document) => [document.id, asDocument(document)]))

    return units.flatMap((unit, index) => {
      const document = byId.get(unit.document_id)
      return document ? [{ document, unit: asUnit(unit), rank: 1 / (index + 1) }] : []
    })
  }

  async listRecent(workspaceId: string, limit = 20): Promise<Array<{ asset: KnowledgeAsset; document: KnowledgeDocument | null }>> {
    const supabase = await createClient()
    const { data: assets, error } = await supabase.from('knowledge_assets').select('*').eq('workspace_id', workspaceId).order('captured_at', { ascending: false }).limit(limit)
    if (error) throw new Error(error.message)
    const assetIds = assets.map((asset) => asset.id)
    const documents = assetIds.length
      ? await supabase.from('knowledge_documents').select('*').in('asset_id', assetIds)
      : { data: [], error: null }
    if (documents.error) throw new Error(documents.error.message)
    const byAsset = new Map((documents.data ?? []).map((document) => [document.asset_id, asDocument(document)]))
    return assets.map((asset) => ({ asset: asAsset(asset), document: byAsset.get(asset.id) ?? null }))
  }

  async getBundle(workspaceId: string, assetId: string): Promise<{ asset: KnowledgeAsset; document: KnowledgeDocument | null; units: KnowledgeUnit[] } | null> {
    const supabase = await createClient()
    const { data: asset, error } = await supabase.from('knowledge_assets').select('*').eq('workspace_id', workspaceId).eq('id', assetId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!asset) return null
    const { data: document, error: documentError } = await supabase.from('knowledge_documents').select('*').eq('asset_id', assetId).maybeSingle()
    if (documentError) throw new Error(documentError.message)
    if (!document) return { asset: asAsset(asset), document: null, units: [] }
    const { data: units, error: unitError } = await supabase.from('knowledge_units').select('*').eq('document_id', document.id).order('ordinal')
    if (unitError) throw new Error(unitError.message)
    return { asset: asAsset(asset), document: asDocument(document), units: units.map(asUnit) }
  }

  async start(input: { workspaceId: string; assetId: string; stage: 'CAPTURE' | 'TEXT_EXTRACT' | 'NORMALIZE' | 'CLASSIFY' | 'STRUCTURE' | 'CHUNK' | 'ENRICH' | 'INDEX' | 'LINK'; processor: string; processorVersion?: string | null }): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_ingestion_runs').insert({
      workspace_id: input.workspaceId,
      asset_id: input.assetId,
      stage: input.stage,
      status: 'RUNNING',
      processor: input.processor,
      processor_version: input.processorVersion ?? null,
      started_at: new Date().toISOString(),
    }).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  }

  async succeed(runId: string, details: Record<string, unknown> = {}): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('knowledge_ingestion_runs').update({ status: 'SUCCEEDED', details: details as Json, finished_at: new Date().toISOString() }).eq('id', runId)
    if (error) throw new Error(error.message)
  }

  async fail(runId: string, errorValue: unknown): Promise<void> {
    const supabase = await createClient()
    const message = errorValue instanceof Error ? errorValue.message : 'Unknown ingestion error'
    const { error } = await supabase.from('knowledge_ingestion_runs').update({ status: 'FAILED', error_message: message, finished_at: new Date().toISOString() }).eq('id', runId)
    if (error) throw new Error(error.message)
  }
}

export class NativeKnowledgeContentPort {
  async load(asset: KnowledgeAsset) {
    return { text: asset.originalText }
  }
}
