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

export interface AssetTransformerPort {
  supports(asset: KnowledgeAsset): boolean
  transform(input: TransformableAsset): Promise<NormalizedKnowledge>
}

export interface KnowledgeEnrichmentPort {
  enrich(input: NormalizedKnowledge): Promise<NormalizedKnowledge>
}
