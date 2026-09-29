import type { AssetTransformerPort } from '@/core/application/ports/knowledge-base'
import {
  CANONICAL_DOCUMENT_SCHEMA,
  type CanonicalDocumentEnvelope,
  type IngressArtifact,
} from '@/core/domain/document-intake'
import type { TransformableAsset } from '@/core/domain/knowledge'
import {
  DocumentNormalizationUnsupportedError,
  type DocumentNormalizerPort,
} from '@/core/application/ports/document-intake'

export class FastPathDocumentNormalizer implements DocumentNormalizerPort {
  constructor(private readonly transformers: AssetTransformerPort[]) {}

  supports(input: { artifact: IngressArtifact; source: TransformableAsset }) {
    return this.transformers.some((candidate) => candidate.supports(input.source.asset))
  }

  async normalize(input: { artifact: IngressArtifact; source: TransformableAsset }): Promise<CanonicalDocumentEnvelope> {
    const transformer = this.transformers.find((candidate) => candidate.supports(input.source.asset))
    if (!transformer) throw new DocumentNormalizationUnsupportedError()

    const normalized = await transformer.transform(input.source)
    const extracted = normalized.extractedData ?? {}
    const uncertainPages = numberArray(readNested(extracted, ['extraction', 'unresolvedVisualPages']))
    const requiresReview = normalized.units.some((unit) => unit.structuredData?.requiresHumanReview === true)
      || uncertainPages.length > 0

    return {
      schema: CANONICAL_DOCUMENT_SCHEMA,
      artifact: input.artifact,
      normalized: {
        ...normalized,
        extractedData: {
          ...extracted,
          canonical: {
            schema: CANONICAL_DOCUMENT_SCHEMA,
            source: {
              intakeId: input.artifact.intakeId,
              sourceProvider: input.artifact.sourceProvider,
              sourceLocator: input.artifact.sourceLocator,
              originalName: input.artifact.originalName,
              declaredMime: input.artifact.declaredMime,
              detectedMime: input.artifact.detectedMime,
              sha256: input.artifact.sha256,
            },
            quality: {
              extractionMethods: extractionMethods(normalized.processor),
              completeness: uncertainPages.length ? 'PARTIAL' : 'UNKNOWN',
              uncertainPages,
              requiresReview,
            },
          },
        },
      },
      quality: {
        extractionMethods: extractionMethods(normalized.processor),
        completeness: uncertainPages.length ? 'PARTIAL' : 'UNKNOWN',
        uncertainPages,
        requiresReview,
      },
    }
  }
}

function extractionMethods(processor: string) {
  return [...new Set(processor.split('+').map((part) => part.trim()).filter(Boolean))]
}

function readNested(input: Record<string, unknown>, path: string[]) {
  let current: unknown = input
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function numberArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
    : []
}
