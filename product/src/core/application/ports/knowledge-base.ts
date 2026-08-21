import type {
  CapturedAssetInput,
  KnowledgeAsset,
  KnowledgeDocument,
  KnowledgeUnit,
  NormalizedKnowledge,
  TransformableAsset,
} from '@/core/domain/knowledge'

export interface KnowledgeAssetRepository {
  capture(input: CapturedAssetInput): Promise<KnowledgeAsset>
  setProcessingStatus(assetId: string, status: KnowledgeAsset['processingStatus']): Promise<void>
  getById(assetId: string): Promise<KnowledgeAsset | null>
}

export interface KnowledgeDocumentRepository {
  upsertNormalized(asset: KnowledgeAsset, normalized: NormalizedKnowledge): Promise<KnowledgeDocument>
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

export interface KnowledgeEnrichmentPort {
  enrich(input: NormalizedKnowledge): Promise<NormalizedKnowledge>
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
