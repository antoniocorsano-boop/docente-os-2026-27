import assert from 'node:assert/strict'
import test from 'node:test'

import { buildClassMaterialAcceptanceEvidenceV1 } from '@/core/application/class-material-acceptance-evidence'
import { digestMaterialContentV1, type MaterialContentSnapshotV1 } from '@/core/application/material-content-digest'
import type {
  KnowledgeGenerationMaterialRecordV1,
  MaterialContentReadPortV1,
} from '@/core/application/material-content-resolution'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'

function snapshot(text = 'Materiale energia'): MaterialContentSnapshotV1 {
  return {
    assetContent: { originalText: text, mimeType: 'text/plain', sourceSha256: null },
    document: {
      title: 'Materiale energia',
      documentType: 'TEACHING_RESOURCE',
      language: 'it',
      normalizedText: text,
      normalizedMarkdown: null,
      summary: null,
      extractedData: {},
    },
    units: [],
    referencedBinaryContent: [],
  }
}

function extension(overrides: Partial<LessonDesignExtension> = {}): LessonDesignExtension {
  const acceptedSnapshot = snapshot()
  return {
    id: 'extension-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-2c',
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
    sourceRef: 'knowledge:asset-1',
    sourceLabel: 'Materiale energia',
    payload: {
      materialBinding: {
        schema: 'docente-os.lesson-material-binding.v1',
        role: 'TEACHER_BRIEF',
        artifactKind: 'GUIDE',
        audience: 'TEACHER',
        materialRef: {
          kind: 'KNOWLEDGE_GENERATION',
          assetId: 'asset-1',
          generationId: 'generation-1',
          contentDigest: digestMaterialContentV1(acceptedSnapshot),
        },
        provenance: {
          sourceArtifactRefs: ['asset-1'],
          derivationRefs: [],
          evidenceRefs: ['teacher-acceptance-1'],
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
    ...overrides,
  }
}

class FakeReadPort implements MaterialContentReadPortV1 {
  reads: Array<{ workspaceId: string; assetId: string; generationId: string }> = []

  constructor(private readonly currentSnapshot: MaterialContentSnapshotV1) {}

  async readKnowledgeGeneration(input: { workspaceId: string; assetId: string; generationId: string }): Promise<KnowledgeGenerationMaterialRecordV1 | null> {
    this.reads.push(input)
    return {
      assetId: input.assetId,
      generationId: input.generationId,
      generationStatus: 'SUCCEEDED',
      currentGenerationId: input.generationId,
      sourceLocator: null,
      sourceIsImmutableLocal: true,
      sourceContentAvailable: true,
      sourceSha256MatchesBytes: true,
      snapshot: this.currentSnapshot,
    }
  }
}

test('accepted typed material extension resolves exact content and returns READY evidence keyed by extension id', async () => {
  const readPort = new FakeReadPort(snapshot())
  const accepted = extension()

  const evidence = await buildClassMaterialAcceptanceEvidenceV1({
    workspaceId: 'workspace-1',
    extensions: [accepted],
    readPort,
  })

  assert.deepEqual(evidence.extensions, [accepted])
  assert.equal(evidence.materialContentResolutions['extension-1']?.status, 'READY')
  assert.deepEqual(readPort.reads, [{
    workspaceId: 'workspace-1',
    assetId: 'asset-1',
    generationId: 'generation-1',
  }])
})

test('post-acceptance exact-content mutation remains STALE in class acceptance evidence', async () => {
  const readPort = new FakeReadPort(snapshot('Contenuto modificato dopo accettazione'))

  const evidence = await buildClassMaterialAcceptanceEvidenceV1({
    workspaceId: 'workspace-1',
    extensions: [extension()],
    readPort,
  })

  assert.equal(evidence.materialContentResolutions['extension-1']?.status, 'STALE')
})

test('non-accepted and non-material extensions never trigger canonical content reads', async () => {
  const readPort = new FakeReadPort(snapshot())
  const proposed = extension({ id: 'proposed', status: 'PROPOSED' })
  const acceptedLegacy = extension({
    id: 'legacy',
    status: 'ACCEPTED',
    payload: {},
  })

  const evidence = await buildClassMaterialAcceptanceEvidenceV1({
    workspaceId: 'workspace-1',
    extensions: [proposed, acceptedLegacy],
    readPort,
  })

  assert.deepEqual(evidence.extensions, [proposed, acceptedLegacy])
  assert.deepEqual(evidence.materialContentResolutions, {})
  assert.deepEqual(readPort.reads, [])
})
