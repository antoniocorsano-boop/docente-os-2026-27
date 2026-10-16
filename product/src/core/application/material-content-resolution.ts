import { digestMaterialContentV1, type MaterialContentSnapshotV1 } from './material-content-digest'
import type { CanonicalMaterialRefV1, MaterialContentDigestV1 } from '@/core/domain/lesson-material-binding'

export type KnowledgeGenerationMaterialRecordV1 = {
  assetId: string
  generationId: string
  generationStatus: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  currentGenerationId: string | null
  sourceLocator: string | null
  sourceIsImmutableLocal: boolean
  sourceContentAvailable: boolean
  sourceSha256MatchesBytes: boolean
  snapshot: MaterialContentSnapshotV1 | null
}

export interface MaterialContentReadPortV1 {
  readKnowledgeGeneration(input: {
    workspaceId: string
    assetId: string
    generationId: string
  }): Promise<KnowledgeGenerationMaterialRecordV1 | null>
}

export type CanonicalMaterialContentResolutionV1 =
  | {
      status: 'READY'
      snapshot: MaterialContentSnapshotV1
      actualDigest: MaterialContentDigestV1
    }
  | {
      status: 'STALE'
      snapshot: MaterialContentSnapshotV1
      expectedDigest: MaterialContentDigestV1
      actualDigest: MaterialContentDigestV1
      reason: 'CONTENT_DIGEST_MISMATCH'
    }
  | {
      status: 'MISSING'
      reason: 'KNOWLEDGE_GENERATION_NOT_FOUND'
    }
  | {
      status: 'INCOMPLETE'
      reason:
        | 'REFERENCE_CONTEXT_MISMATCH'
        | 'GENERATION_NOT_SUCCEEDED'
        | 'CONTENT_SNAPSHOT_UNAVAILABLE'
        | 'MUTABLE_SOURCE_ONLY'
        | 'SOURCE_SHA256_MISMATCH'
    }
  | {
      status: 'UNSUPPORTED_REFERENCE'
      reason: 'IMMUTABLE_REVISION_STORE_UNAVAILABLE'
    }

export async function resolveCanonicalMaterialContentV1(input: {
  workspaceId: string
  ref: CanonicalMaterialRefV1
  readPort: MaterialContentReadPortV1
}): Promise<CanonicalMaterialContentResolutionV1> {
  if (input.ref.kind === 'IMMUTABLE_REVISION') {
    return {
      status: 'UNSUPPORTED_REFERENCE',
      reason: 'IMMUTABLE_REVISION_STORE_UNAVAILABLE',
    }
  }

  const record = await input.readPort.readKnowledgeGeneration({
    workspaceId: input.workspaceId,
    assetId: input.ref.assetId,
    generationId: input.ref.generationId,
  })

  if (!record) {
    return {
      status: 'MISSING',
      reason: 'KNOWLEDGE_GENERATION_NOT_FOUND',
    }
  }

  if (record.assetId !== input.ref.assetId || record.generationId !== input.ref.generationId) {
    return {
      status: 'INCOMPLETE',
      reason: 'REFERENCE_CONTEXT_MISMATCH',
    }
  }

  if (record.generationStatus !== 'SUCCEEDED') {
    return {
      status: 'INCOMPLETE',
      reason: 'GENERATION_NOT_SUCCEEDED',
    }
  }

  if (!record.snapshot) {
    return {
      status: 'INCOMPLETE',
      reason: 'CONTENT_SNAPSHOT_UNAVAILABLE',
    }
  }

  if (!record.sourceSha256MatchesBytes) {
    return {
      status: 'INCOMPLETE',
      reason: 'SOURCE_SHA256_MISMATCH',
    }
  }

  if (!record.sourceIsImmutableLocal && !record.sourceContentAvailable) {
    return {
      status: 'INCOMPLETE',
      reason: 'MUTABLE_SOURCE_ONLY',
    }
  }

  const actualDigest = digestMaterialContentV1(record.snapshot)
  if (!sameDigest(input.ref.contentDigest, actualDigest)) {
    return {
      status: 'STALE',
      reason: 'CONTENT_DIGEST_MISMATCH',
      snapshot: record.snapshot,
      expectedDigest: input.ref.contentDigest,
      actualDigest,
    }
  }

  return {
    status: 'READY',
    snapshot: record.snapshot,
    actualDigest,
  }
}

function sameDigest(expected: MaterialContentDigestV1, actual: MaterialContentDigestV1) {
  return (
    expected.algorithm === actual.algorithm &&
    expected.canonicalization === actual.canonicalization &&
    expected.value.toLowerCase() === actual.value.toLowerCase()
  )
}
