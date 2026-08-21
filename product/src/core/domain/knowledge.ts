export type KnowledgeAssetKind = 'FILE' | 'EMAIL' | 'EVENT' | 'NOTE' | 'WEB' | 'GENERATED'
export type KnowledgeSourceProvider = 'UPLOAD' | 'DRIVE' | 'GMAIL' | 'CALENDAR' | 'MANUAL' | 'SYSTEM'
export type KnowledgeProcessingStatus = 'CAPTURED' | 'NORMALIZED' | 'INDEXED' | 'FAILED'
export type KnowledgeDocumentType = 'CIRCULAR' | 'TEMPLATE' | 'ATTESTATION' | 'TEACHING' | 'COMMUNICATION' | 'GENERAL'
export type KnowledgeUnitType = 'CHUNK' | 'ENTITY' | 'DATE' | 'DEADLINE' | 'ACTION' | 'PERSON' | 'CLASS' | 'TOPIC' | 'RULE'
export type KnowledgeValidationStatus = 'AUTO' | 'REVIEWED' | 'REJECTED'

export type KnowledgeAsset = {
  id: string
  workspaceId: string
  academicYearId: string | null
  assetKind: KnowledgeAssetKind
  sourceProvider: KnowledgeSourceProvider
  sourceLocator: string | null
  originalName: string | null
  mimeType: string | null
  byteSize: number | null
  sha256: string | null
  processingStatus: KnowledgeProcessingStatus
  sourceMetadata: Record<string, unknown>
  capturedAt: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type KnowledgeDocument = {
  id: string
  assetId: string
  workspaceId: string
  title: string | null
  documentType: KnowledgeDocumentType
  language: string
  normalizedText: string | null
  normalizedMarkdown: string | null
  summary: string | null
  extractedData: Record<string, unknown>
  processingVersion: string
  createdAt: string
  updatedAt: string
}

export type KnowledgeUnit = {
  id: string
  documentId: string
  workspaceId: string
  ordinal: number
  unitType: KnowledgeUnitType
  title: string | null
  content: string
  structuredData: Record<string, unknown>
  sourcePage: number | null
  startOffset: number | null
  endOffset: number | null
  confidence: number | null
  validationStatus: KnowledgeValidationStatus
  createdAt: string
  updatedAt: string
}

export type CapturedAssetInput = {
  workspaceId: string
  academicYearId?: string | null
  assetKind: KnowledgeAssetKind
  sourceProvider: KnowledgeSourceProvider
  sourceLocator?: string | null
  originalName?: string | null
  mimeType?: string | null
  byteSize?: number | null
  sha256?: string | null
  sourceMetadata?: Record<string, unknown>
}

export type TransformableAsset = {
  asset: KnowledgeAsset
  text?: string | null
  bytes?: Uint8Array | null
}

export type NormalizedKnowledge = {
  title?: string | null
  documentType: KnowledgeDocumentType
  language?: string
  text?: string | null
  markdown?: string | null
  summary?: string | null
  extractedData?: Record<string, unknown>
  units: Array<{
    type: KnowledgeUnitType
    title?: string | null
    content: string
    structuredData?: Record<string, unknown>
    sourcePage?: number | null
    startOffset?: number | null
    endOffset?: number | null
    confidence?: number | null
  }>
  processor: string
  processorVersion: string
}
