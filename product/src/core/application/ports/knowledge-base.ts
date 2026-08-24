import type {
  CapturedAssetInput,
  KnowledgeAsset,
  KnowledgeAssetContextInput,
  KnowledgeDocument,
  KnowledgeProcessingGeneration,
  KnowledgeUnit,
  NormalizedKnowledge,
  TransformableAsset,
} from '@/core/domain/knowledge'

export interface KnowledgeAssetRepository {
  capture(input: CapturedAssetInput): Promise<KnowledgeAsset>
  setProcessingStatus(assetId: string, status: KnowledgeAsset['processingStatus']): Promise<void>
  setCurrentGeneration(assetId: string, generationId: string): Promise<void>
  getById(assetId: string): Promise<KnowledgeAsset | null>
  findBySource(workspaceId: string, sourceProvider: KnowledgeAsset['sourceProvider'], sourceLocator: string): Promise<KnowledgeAsset | null>
  updateContext(assetId: string, input: KnowledgeAssetContextInput): Promise<void>
}

export interface KnowledgeGenerationRepository {
  startGeneration(asset: KnowledgeAsset): Promise<KnowledgeProcessingGeneration>
  succeedGeneration(generationId: string, processorLabel: string): Promise<void>
  failGeneration(generationId: string, error: unknown): Promise<void>
  listGenerations(assetId: string): Promise<KnowledgeProcessingGeneration[]>
}

export interface KnowledgeDocumentRepository {
  upsertNormalized(asset: KnowledgeAsset, generationId: string, normalized: NormalizedKnowledge): Promise<KnowledgeDocument>
  replaceUnits(document: KnowledgeDocument, normalized: NormalizedKnowledge): Promise<KnowledgeUnit[]>
}

export interface KnowledgeSearchPort {
  search(workspaceId: string, query: string, limit?: number): Promise<Array<{
    document: KnowledgeDocument
    unit?: KnowledgeUnit | null
    rank: number
  }>>
}

export interface AssetContentPort {
  load(asset: KnowledgeAsset): Promise<{ text?: string | null; bytes?: Uint8Array | null }>
}

export interface AssetTransformerPort {
  supports(asset: KnowledgeAsset): boolean
  transform(input: TransformableAsset): Promise<NormalizedKnowledge>
}

export type VisualExtractionPage = {
  page: number
  text: string
  description: string | null
  confidence: number | null
}

export class VisualExtractionUnavailableError extends Error {
  constructor(message = 'Visual extraction is unavailable') {
    super(message)
    this.name = 'VisualExtractionUnavailableError'
  }
}

export interface VisualExtractionPort {
  extract(input: {
    bytes: Uint8Array
    mimeType: string
    filename: string
    pageNumbers?: number[]
  }): Promise<{
    pages: VisualExtractionPage[]
    processor: string
    processorVersion: string
  }>
}

export interface PdfNativeTextExtractionPort {
  extract(bytes: Uint8Array): Promise<{
    totalPages: number
    pages: string[]
    processor: string
    processorVersion: string
  }>
}

export interface KnowledgeEnrichmentPort {
  enrich(input: NormalizedKnowledge): Promise<NormalizedKnowledge>
}

export interface KnowledgeReviewRepository {
  getUnitContext(unitId: string): Promise<{
    unit: KnowledgeUnit
    document: KnowledgeDocument
    asset: KnowledgeAsset
  } | null>
  setUnitValidationStatus(unitId: string, status: KnowledgeUnit['validationStatus']): Promise<void>
}

export interface KnowledgeLinkRepository {
  link(input: {
    workspaceId: string
    assetId?: string | null
    unitId?: string | null
    relationType: string
    targetType: string
    targetRef: string
    metadata?: Record<string, unknown>
  }): Promise<void>
  findTargetRef(input: {
    workspaceId: string
    unitId: string
    relationType: string
    targetType: string
  }): Promise<string | null>
}

export interface KnowledgeIngestionLog {
  start(input: {
    workspaceId: string
    assetId: string
    stage: 'CAPTURE' | 'TEXT_EXTRACT' | 'NORMALIZE' | 'CLASSIFY' | 'STRUCTURE' | 'CHUNK' | 'ENRICH' | 'INDEX' | 'LINK'
    processor: string
    processorVersion?: string | null
  }): Promise<string>
  succeed(runId: string, details?: Record<string, unknown>): Promise<void>
  fail(runId: string, error: unknown): Promise<void>
}