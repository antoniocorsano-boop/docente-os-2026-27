import assert from 'node:assert/strict'
import test from 'node:test'

import type { CanonicalMaterialContentResolutionV1 } from '@/core/application/material-content-resolution'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import {
  presentClassMaterialAcceptance,
  projectClassMaterialAcceptanceForAsset,
  type ClassMaterialAcceptanceState,
} from './class-material-acceptance-projection'

const states: readonly ClassMaterialAcceptanceState[] = [
  'PREPARED',
  'REVALIDATION_REQUIRED',
  'CONFIRMED',
]

const digest = {
  algorithm: 'SHA-256' as const,
  canonicalization: 'docente-os.material-content.v1' as const,
  value: 'a'.repeat(64),
}

const ready: CanonicalMaterialContentResolutionV1 = {
  status: 'READY',
  snapshot: {
    assetContent: { originalText: 'Energia', mimeType: 'text/plain', sourceSha256: null },
    document: {
      title: 'Energia',
      documentType: 'TEACHING_RESOURCE',
      language: 'it',
      normalizedText: 'Energia',
      normalizedMarkdown: null,
      summary: null,
      extractedData: {},
    },
    units: [],
    referencedBinaryContent: [],
  },
  actualDigest: digest,
}

function acceptedMaterialExtension(assetId = 'asset-1'): LessonDesignExtension {
  return {
    id: 'extension-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-1',
    canonicalPlanAssetId: 'plan-1',
    canonicalGenerationId: 'plan-generation-1',
    blockId: 'B01',
    projectionId: 'projection-1',
    kind: 'TEACHER_RESOURCE',
    status: 'ACCEPTED',
    insertionPosition: 'END',
    anchorStepId: null,
    title: 'Materiale energia',
    body: 'Materiale canonico verificato.',
    cue: null,
    minutes: null,
    sourceKind: 'KNOWLEDGE',
    sourceRef: `knowledge:${assetId}`,
    sourceLabel: 'Materiale energia',
    payload: {
      materialBinding: {
        schema: 'docente-os.lesson-material-binding.v1',
        role: 'TEACHER_BRIEF',
        artifactKind: 'GUIDE',
        audience: 'TEACHER',
        materialRef: {
          kind: 'KNOWLEDGE_GENERATION',
          assetId,
          generationId: 'generation-1',
          contentDigest: digest,
        },
        provenance: {
          sourceArtifactRefs: [assetId],
          derivationRefs: [],
          evidenceRefs: ['evidence-1'],
          rightsState: 'KNOWN',
          attributionRequirements: [],
        },
      },
    },
    revision: 1,
    decisionHistory: [{ action: 'ACCEPTED', actorId: 'teacher-1', at: '2026-10-16T12:00:00Z', revision: 1 }],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: 'teacher-1',
    acceptedAt: '2026-10-16T12:00:00Z',
    dismissedBy: null,
    dismissedAt: null,
    createdBy: 'teacher-1',
    createdAt: '2026-10-16T11:59:00Z',
    updatedAt: '2026-10-16T12:00:00Z',
  }
}

test('class material projection keeps prepared, revalidation and canonical confirmation distinct', () => {
  assert.deepEqual(
    states.map((state) => presentClassMaterialAcceptance(state)),
    [
      { state: 'PREPARED', label: 'Predisposto', canonicalConfirmed: false, requiresRevalidation: false },
      { state: 'REVALIDATION_REQUIRED', label: 'Da riconfermare', canonicalConfirmed: false, requiresRevalidation: true },
      { state: 'CONFIRMED', label: 'Confermato', canonicalConfirmed: true, requiresRevalidation: false },
    ],
  )
})

test('accepted typed extension with READY exact-content verification yields canonical Confermato', () => {
  const projection = projectClassMaterialAcceptanceForAsset({
    assetId: 'asset-1',
    sourceMetadata: { approvalState: 'PENDING_HUMAN' },
    extensions: [acceptedMaterialExtension()],
    materialContentResolutions: { 'extension-1': ready },
  })

  assert.equal(projection.state, 'CONFIRMED')
  assert.equal(projection.label, 'Confermato')
  assert.equal(projection.canonicalConfirmed, true)
})

test('accepted typed extension with stale verification requires revalidation instead of confirmation', () => {
  const projection = projectClassMaterialAcceptanceForAsset({
    assetId: 'asset-1',
    sourceMetadata: { approvalState: 'APPROVED' },
    extensions: [acceptedMaterialExtension()],
    materialContentResolutions: {
      'extension-1': {
        status: 'STALE',
        snapshot: ready.status === 'READY' ? ready.snapshot : neverSnapshot(),
        expectedDigest: digest,
        actualDigest: { ...digest, value: 'b'.repeat(64) },
        reason: 'CONTENT_DIGEST_MISMATCH',
      },
    },
  })

  assert.equal(projection.state, 'REVALIDATION_REQUIRED')
  assert.equal(projection.label, 'Da riconfermare')
  assert.equal(projection.canonicalConfirmed, false)
})

function neverSnapshot() {
  throw new Error('unreachable')
}
