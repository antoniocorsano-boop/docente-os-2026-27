import type { CanonicalDocumentEnvelope, IngressArtifact } from '@/core/domain/document-intake'
import type { TransformableAsset } from '@/core/domain/knowledge'

export interface DocumentNormalizerPort {
  supports(input: { artifact: IngressArtifact; source: TransformableAsset }): boolean
  normalize(input: { artifact: IngressArtifact; source: TransformableAsset }): Promise<CanonicalDocumentEnvelope>
}

export class DocumentNormalizationUnsupportedError extends Error {
  constructor(message = 'No document normalizer is available for this ingress artifact') {
    super(message)
    this.name = 'DocumentNormalizationUnsupportedError'
  }
}
