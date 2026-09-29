import type {
  KnowledgeGenerationStatus,
  KnowledgeSourceProvider,
  NormalizedKnowledge,
  TransformableAsset,
} from '@/core/domain/knowledge'

export const CANONICAL_DOCUMENT_SCHEMA = 'docenteos.canonical-document/1' as const

export type IngressSourceProvider = KnowledgeSourceProvider | 'SHARE_TARGET'
export type IngressPayloadRef = 'LOCAL' | 'TEMP_STORAGE' | 'EXTERNAL_REFERENCE'
export type IngressRetentionClass = 'TRANSIENT' | 'EXTERNAL_REFERENCE' | 'ARCHIVE_REQUIRED'

export type IngressArtifact = {
  intakeId: string
  sourceProvider: IngressSourceProvider
  originalName: string | null
  declaredMime: string | null
  detectedMime: string | null
  byteSize: number | null
  sha256: string | null
  sourceLocator: string | null
  payloadRef: IngressPayloadRef
  retentionClass: IngressRetentionClass
}

export type CanonicalDocumentQuality = {
  extractionMethods: string[]
  completeness: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN'
  uncertainPages: number[]
  requiresReview: boolean
}

export type CanonicalDocumentEnvelope = {
  schema: typeof CANONICAL_DOCUMENT_SCHEMA
  artifact: IngressArtifact
  normalized: NormalizedKnowledge
  quality: CanonicalDocumentQuality
}

export type IngressDispositionContext = {
  retentionClass: IngressRetentionClass
  generationId: string
  generationStatus: KnowledgeGenerationStatus
  currentGenerationId: string | null
  provenancePersisted: boolean
  canonicalDocumentPersisted: boolean
  requiredUnitsPersisted: boolean
}

export function canDisposeIngressPayload(input: IngressDispositionContext) {
  return input.retentionClass === 'TRANSIENT'
    && input.generationStatus === 'SUCCEEDED'
    && input.currentGenerationId === input.generationId
    && input.provenancePersisted
    && input.canonicalDocumentPersisted
    && input.requiredUnitsPersisted
}

export function ingressArtifactFromTransformableAsset(
  input: TransformableAsset,
  options: {
    intakeId: string
    sourceProvider?: IngressSourceProvider
    detectedMime?: string | null
    payloadRef?: IngressPayloadRef
    retentionClass?: IngressRetentionClass
  },
): IngressArtifact {
  return {
    intakeId: options.intakeId,
    sourceProvider: options.sourceProvider ?? input.asset.sourceProvider,
    originalName: input.asset.originalName,
    declaredMime: input.asset.mimeType,
    detectedMime: options.detectedMime ?? input.asset.mimeType,
    byteSize: input.asset.byteSize,
    sha256: input.asset.sha256,
    sourceLocator: input.asset.sourceLocator,
    payloadRef: options.payloadRef ?? (input.asset.sourceLocator?.startsWith('storage:') ? 'TEMP_STORAGE' : 'EXTERNAL_REFERENCE'),
    retentionClass: options.retentionClass ?? 'ARCHIVE_REQUIRED',
  }
}
