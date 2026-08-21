import type {
  KnowledgeAssetRepository,
  KnowledgeDocumentRepository,
  KnowledgeGenerationRepository,
  KnowledgeIngestionLog,
  KnowledgeLinkRepository,
  KnowledgeReviewRepository,
  KnowledgeSearchPort,
} from '@/core/application/ports/knowledge-base'
import type {
  CapturedAssetInput,
  KnowledgeAsset,
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeGenerationStatus,
  KnowledgeProcessingGeneration,
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
  source_locator: string | null; original_name: string | null; original_text: string | null; mime_type: string | null; byte_size: number | null;
  sha256: string | null; processing_status: string; source_metadata: Json; current_generation_id: string | null; captured_at: string; created_by: string;
  created_at: string; updated_at: string
}): KnowledgeAsset {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    assetKind: row.asset_kind as KnowledgeAsset['assetKind'],
    sourceProvider: row.source_provider as KnowledgeAsset['sourceProvider'],
    sourceLocator: row.source_locator,
    originalName: row.original_name,
    originalText: row.original_text,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    processingStatus: row.processing_status as KnowledgeProcessingStatus,
    sourceMetadata: object(row.source_metadata),
    currentGenerationId: row.current_generation_id,
    capturedAt: row.captured_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function asGeneration(row: {
  id: string; asset_id: string; workspace_id: string; generation_no: number; status: string; processor_label: string | null;
  started_at: string; finished_at: string | null; error_message: string | null; created_at: string
}): KnowledgeProcessingGeneration {
  return {
    id: row.id,
    assetId: row.asset_id,
    workspaceId: row.workspace_id,
    generationNo: row.generation_no,
    status: row.status as KnowledgeGenerationStatus,
    processorLabel: row.processor_label,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}

function asDocument(row: {
  id: string; asset_id: string; generation_id: string; workspace_id: string; title: string | null; document_type: string; language: string;
  normalized_text: string | null; normalized_markdown: string | null; summary: string | null; extracted_data: Json;
  processing_version: string; created_at: string; updated_at: string
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

export class SupabaseKnowledgeRepository implements
  KnowledgeAssetRepository,
  KnowledgeGenerationRepository,
  KnowledgeDocumentRepository,
  KnowledgeSearchPort,
  KnowledgeIngestionLog,
  KnowledgeReviewRepository,
  KnowledgeLinkRepository {
  async capture(input: CapturedAssetInput): Promise<KnowledgeAsset> {
    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) throw new Error('Authenticated user required')

    const { data, error } = await supabase.from('knowledge_assets').insert({
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
      source_metadata: (input.sourceMetadata ?? {}) as Json,
      created_by: userId,
    }).select('*').single()
    if (error) throw new Error(error.message)
    return asAsset(data)
  }

  async setProcessingStatus(assetId: string, status: KnowledgeProcessingStatus): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('knowledge_assets').update({ processing_status: status }).eq('id', assetId)
    if (error) throw new Error(error.message)
  }

  async setCurrentGeneration(assetId: string, generationId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('knowledge_assets').update({ current_generation_id: generationId, processing_status: 'INDEXED' }).eq('id', assetId)
    if (error) throw new Error(error.message)
  }

  async getById(assetId: string): Promise<KnowledgeAsset | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_assets').select('*').eq('id', assetId).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? asAsset(data) : null
  }

  async startGeneration(asset: KnowledgeAsset): Promise<KnowledgeProcessingGeneration> {
    const supabase = await createClient()
    const { data: latest, error: latestError } = await supabase.from('knowledge_processing_generations')
      .select('generation_no').eq('asset_id', asset.id).order('generation_no', { ascending: false }).limit(1).maybeSingle()
    if (latestError) throw new Error(latestError.message)
    const generationNo = (latest?.generation_no ?? 0) + 1
    const { data, error } = await supabase.from('knowledge_processing_generations').insert({
      asset_id: asset.id,
      workspace_id: asset.workspaceId,
      generation_no: generationNo,
      status: 'RUNNING',
    }).select('*').single()
    if (error) throw new Error(error.message)
    return asGeneration(data)
  }

  async succeedGeneration(generationId: string, processorLabel: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('knowledge_processing_generations').update({
      status: 'SUCCEEDED', processor_label: processorLabel, finished_at: new Date().toISOString(), error_message: null,
    }).eq('id', generationId)
    if (error) throw new Error(error.message)
  }

  async failGeneration(generationId: string, errorValue: unknown): Promise<void> {
    const supabase = await createClient()
    const message = errorValue instanceof Error ? errorValue.message : 'Unknown processing error'
    const { error } = await supabase.from('knowledge_processing_generations').update({
      status: 'FAILED', error_message: message, finished_at: new Date().toISOString(),
    }).eq('id', generationId)
    if (error) throw new Error(error.message)
  }

  async listGenerations(assetId: string): Promise<KnowledgeProcessingGeneration[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_processing_generations').select('*').eq('asset_id', assetId).order('generation_no', { ascending: false })
    if (error) throw new Error(error.message)
    return data.map(asGeneration)
  }

  async upsertNormalized(asset: KnowledgeAsset, generationId: string, normalized: NormalizedKnowledge): Promise<KnowledgeDocument> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_documents').upsert({
      asset_id: asset.id,
      generation_id: generationId,
      workspace_id: asset.workspaceId,
      title: normalized.title ?? null,
      document_type: normalized.documentType,
      language: normalized.language ?? 'it',
      normalized_text: normalized.text ?? null,
      normalized_markdown: normalized.markdown ?? null,
      summary: normalized.summary ?? null,
      extracted_data: (normalized.extractedData ?? {}) as Json,
      processing_version: `${normalized.processor}@${normalized.processorVersion}`,
    }, { onConflict: 'asset_id,generation_id' }).select('*').single()
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

    const { data: assets, error: assetError } = await supabase.from('knowledge_assets').select('current_generation_id').eq('workspace_id', workspaceId).not('current_generation_id', 'is', null)
    if (assetError) throw new Error(assetError.message)
    const generationIds = assets.flatMap((asset) => asset.current_generation_id ? [asset.current_generation_id] : [])
    if (!generationIds.length) return []

    const { data: documents, error: documentError } = await supabase.from('knowledge_documents').select('*').in('generation_id', generationIds)
    if (documentError) throw new Error(documentError.message)
    const documentIds = documents.map((document) => document.id)
    if (!documentIds.length) return []

    const { data: units, error } = await supabase.from('knowledge_units').select('*')
      .eq('workspace_id', workspaceId).in('document_id', documentIds)
      .textSearch('search_vector', term, { config: 'italian', type: 'websearch' }).limit(limit)
    if (error) throw new Error(error.message)
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
    const generationIds = assets.flatMap((asset) => asset.current_generation_id ? [asset.current_generation_id] : [])
    const documents = generationIds.length ? await supabase.from('knowledge_documents').select('*').in('generation_id', generationIds) : { data: [], error: null }
    if (documents.error) throw new Error(documents.error.message)
    const byGeneration = new Map((documents.data ?? []).map((document) => [document.generation_id, asDocument(document)]))
    return assets.map((row) => {
      const asset = asAsset(row)
      return { asset, document: asset.currentGenerationId ? byGeneration.get(asset.currentGenerationId) ?? null : null }
    })
  }

  async getBundle(workspaceId: string, assetId: string): Promise<{ asset: KnowledgeAsset; document: KnowledgeDocument | null; units: KnowledgeUnit[]; generations: KnowledgeProcessingGeneration[] } | null> {
    const supabase = await createClient()
    const { data: assetRow, error } = await supabase.from('knowledge_assets').select('*').eq('workspace_id', workspaceId).eq('id', assetId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!assetRow) return null
    const asset = asAsset(assetRow)
    const generations = await this.listGenerations(assetId)
    if (!asset.currentGenerationId) return { asset, document: null, units: [], generations }
    const { data: documentRow, error: documentError } = await supabase.from('knowledge_documents').select('*').eq('asset_id', assetId).eq('generation_id', asset.currentGenerationId).maybeSingle()
    if (documentError) throw new Error(documentError.message)
    if (!documentRow) return { asset, document: null, units: [], generations }
    const { data: units, error: unitError } = await supabase.from('knowledge_units').select('*').eq('document_id', documentRow.id).order('ordinal')
    if (unitError) throw new Error(unitError.message)
    return { asset, document: asDocument(documentRow), units: units.map(asUnit), generations }
  }

  async getUnitContext(unitId: string) {
    const supabase = await createClient()
    const { data: unit, error } = await supabase.from('knowledge_units').select('*').eq('id', unitId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!unit) return null
    const { data: document, error: documentError } = await supabase.from('knowledge_documents').select('*').eq('id', unit.document_id).maybeSingle()
    if (documentError) throw new Error(documentError.message)
    if (!document) return null
    const { data: asset, error: assetError } = await supabase.from('knowledge_assets').select('*').eq('id', document.asset_id).maybeSingle()
    if (assetError) throw new Error(assetError.message)
    if (!asset) return null
    return { unit: asUnit(unit), document: asDocument(document), asset: asAsset(asset) }
  }

  async setUnitValidationStatus(unitId: string, status: KnowledgeValidationStatus): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('knowledge_units').update({ validation_status: status }).eq('id', unitId)
    if (error) throw new Error(error.message)
  }

  async link(input: { workspaceId: string; assetId?: string | null; unitId?: string | null; relationType: string; targetType: string; targetRef: string; metadata?: Record<string, unknown> }): Promise<void> {
    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) throw new Error('Authenticated user required')
    const { error } = await supabase.from('knowledge_links').insert({
      workspace_id: input.workspaceId,
      asset_id: input.assetId ?? null,
      unit_id: input.unitId ?? null,
      relation_type: input.relationType,
      target_type: input.targetType,
      target_ref: input.targetRef,
      metadata: (input.metadata ?? {}) as Json,
      created_by: userId,
    })
    if (error) throw new Error(error.message)
  }

  async findTargetRef(input: { workspaceId: string; unitId: string; relationType: string; targetType: string }): Promise<string | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_links').select('target_ref')
      .eq('workspace_id', input.workspaceId).eq('unit_id', input.unitId)
      .eq('relation_type', input.relationType).eq('target_type', input.targetType).maybeSingle()
    if (error) throw new Error(error.message)
    return data?.target_ref ?? null
  }

  async start(input: { workspaceId: string; assetId: string; stage: 'CAPTURE' | 'TEXT_EXTRACT' | 'NORMALIZE' | 'CLASSIFY' | 'STRUCTURE' | 'CHUNK' | 'ENRICH' | 'INDEX' | 'LINK'; processor: string; processorVersion?: string | null }): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('knowledge_ingestion_runs').insert({
      workspace_id: input.workspaceId, asset_id: input.assetId, stage: input.stage, status: 'RUNNING', processor: input.processor,
      processor_version: input.processorVersion ?? null, started_at: new Date().toISOString(),
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
