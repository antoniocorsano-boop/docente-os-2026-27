import assert from 'node:assert/strict'
import test from 'node:test'
import { digestMaterialContentV1, type MaterialContentSnapshotV1 } from './material-content-digest'
import {
  acceptLessonMaterialProposal,
  type MaterialAcceptanceAuthorityContext,
  type MaterialAcceptanceAuthorityPort,
  type MaterialAcceptanceLessonDesignPort,
} from './material-acceptance'
import type {
  KnowledgeGenerationMaterialRecordV1,
  MaterialContentReadPortV1,
} from './material-content-resolution'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { LessonMaterialBindingV1 } from '@/core/domain/lesson-material-binding'

function snapshot(text = 'Materiale esatto della lezione.'): MaterialContentSnapshotV1 {
  return {
    assetContent: {
      originalText: text,
      mimeType: 'text/plain',
      sourceSha256: null,
    },
    document: {
      title: 'Materiale energia',
      documentType: 'TEACHING',
      language: 'it',
      normalizedText: text,
      normalizedMarkdown: null,
      summary: 'Sintesi verificata.',
      extractedData: { topic: 'energia' },
    },
    units: [
      {
        ordinal: 0,
        unitType: 'CHUNK',
        title: 'Introduzione',
        content: text,
        structuredData: {},
        sourcePage: null,
        startOffset: 0,
        endOffset: text.length,
      },
    ],
    referencedBinaryContent: [],
  }
}

function binding(content = snapshot()): LessonMaterialBindingV1 {
  return {
    schema: 'docente-os.lesson-material-binding.v1',
    role: 'TEACHER_BRIEF',
    artifactKind: 'GUIDE',
    audience: 'TEACHER',
    materialRef: {
      kind: 'KNOWLEDGE_GENERATION',
      assetId: 'asset-material-1',
      generationId: 'generation-material-1',
      contentDigest: digestMaterialContentV1(content),
    },
    provenance: {
      sourceArtifactRefs: ['knowledge:asset-material-1'],
      derivationRefs: ['local-material-preparation'],
      evidenceRefs: ['evidence:material-1'],
      rightsState: 'KNOWN',
      attributionRequirements: [],
    },
  }
}

function authority(overrides: Partial<MaterialAcceptanceAuthorityContext> = {}): MaterialAcceptanceAuthorityContext {
  return {
    actorId: 'teacher-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-1',
    canonicalPlanAssetId: 'plan-asset-1',
    canonicalGenerationId: 'plan-generation-1',
    blockId: 'B01',
    projectionId: 'HTC-PRIMA-B01-v1',
    ...overrides,
  }
}

class FakeAuthority implements MaterialAcceptanceAuthorityPort {
  constructor(private readonly value: MaterialAcceptanceAuthorityContext | null) {}
  async resolve() { return this.value }
}

class FakeContentReadPort implements MaterialContentReadPortV1 {
  reads = 0
  constructor(private readonly content: MaterialContentSnapshotV1 = snapshot()) {}

  async readKnowledgeGeneration(): Promise<KnowledgeGenerationMaterialRecordV1> {
    this.reads += 1
    return {
      assetId: 'asset-material-1',
      generationId: 'generation-material-1',
      generationStatus: 'SUCCEEDED',
      currentGenerationId: 'generation-material-1',
      sourceLocator: null,
      sourceIsImmutableLocal: true,
      sourceContentAvailable: true,
      sourceSha256MatchesBytes: true,
      snapshot: this.content,
    }
  }
}

function extensionFrom(input: {
  id?: string
  status?: LessonDesignExtension['status']
  payload: Record<string, unknown>
  context?: MaterialAcceptanceAuthorityContext
}): LessonDesignExtension {
  const context = input.context ?? authority()
  return {
    id: input.id ?? 'extension-1',
    workspaceId: context.workspaceId,
    academicYearId: context.academicYearId,
    sectionId: context.sectionId,
    canonicalPlanAssetId: context.canonicalPlanAssetId,
    canonicalGenerationId: context.canonicalGenerationId,
    blockId: context.blockId,
    projectionId: context.projectionId,
    kind: 'TEACHER_RESOURCE',
    status: input.status ?? 'PROPOSED',
    insertionPosition: 'END',
    anchorStepId: null,
    title: 'Materiale energia',
    body: 'Materiale canonico verificato per la lezione.',
    cue: null,
    minutes: null,
    sourceKind: 'KNOWLEDGE',
    sourceRef: 'knowledge:asset-material-1:generation-material-1',
    sourceLabel: 'Materiale energia',
    payload: input.payload,
    revision: 1,
    decisionHistory: [],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: input.status === 'ACCEPTED' ? context.actorId : null,
    acceptedAt: input.status === 'ACCEPTED' ? '2026-10-16T10:00:00.000Z' : null,
    dismissedBy: null,
    dismissedAt: null,
    createdBy: context.actorId,
    createdAt: '2026-10-16T09:00:00.000Z',
    updatedAt: '2026-10-16T09:00:00.000Z',
  }
}

class FakeLessonDesign implements MaterialAcceptanceLessonDesignPort {
  insertCount = 0
  acceptCount = 0
  private stored: LessonDesignExtension | null

  constructor(existing: LessonDesignExtension | null = null) {
    this.stored = existing
  }

  async addToolProposalOnce(context: MaterialAcceptanceAuthorityContext, draft: Parameters<MaterialAcceptanceLessonDesignPort['addToolProposalOnce']>[1], dedupeKey: string) {
    if (this.stored) return this.stored
    this.insertCount += 1
    this.stored = extensionFrom({ payload: { ...draft.payload, dedupeKey }, context })
    return this.stored
  }

  async accept(_context: MaterialAcceptanceAuthorityContext, extensionId: string) {
    assert.equal(this.stored?.id, extensionId)
    this.acceptCount += 1
    this.stored = {
      ...this.stored!,
      status: 'ACCEPTED',
      acceptedBy: 'teacher-1',
      acceptedAt: '2026-10-16T10:00:00.000Z',
    }
  }

  async list() {
    return this.stored ? [this.stored] : []
  }
}

const command = {
  sectionId: 'section-1',
  blockId: 'B01',
  binding: binding() as unknown,
  idempotencyKey: 'material-acceptance-1',
  title: 'Materiale energia',
  body: 'Materiale canonico verificato per la lezione.',
}

function dependencies(input: {
  authority?: MaterialAcceptanceAuthorityPort
  content?: MaterialContentReadPortV1
  lessonDesign?: MaterialAcceptanceLessonDesignPort
} = {}) {
  return {
    authority: input.authority ?? new FakeAuthority(authority()),
    content: input.content ?? new FakeContentReadPort(),
    lessonDesign: input.lessonDesign ?? new FakeLessonDesign(),
  }
}

test('unauthenticated or unauthorized actor fails closed before any material write', async () => {
  const content = new FakeContentReadPort()
  const lessonDesign = new FakeLessonDesign()

  await assert.rejects(
    acceptLessonMaterialProposal(command, dependencies({
      authority: new FakeAuthority(null),
      content,
      lessonDesign,
    })),
    /authorized material acceptance context/i,
  )

  assert.equal(content.reads, 0)
  assert.equal(lessonDesign.insertCount, 0)
  assert.equal(lessonDesign.acceptCount, 0)
})

test('cross-workspace/year/lesson context mismatch fails closed', async () => {
  const lessonDesign = new FakeLessonDesign()

  await assert.rejects(
    acceptLessonMaterialProposal(command, dependencies({
      authority: new FakeAuthority(authority({ sectionId: 'section-other' })),
      lessonDesign,
    })),
    /active lesson context/i,
  )

  assert.equal(lessonDesign.insertCount, 0)
  assert.equal(lessonDesign.acceptCount, 0)
})

test('material ref without mandatory digest fails closed before content resolution', async () => {
  const malformed = binding() as unknown as Record<string, unknown>
  const materialRef = { ...(malformed.materialRef as Record<string, unknown>) }
  delete materialRef.contentDigest
  malformed.materialRef = materialRef
  const content = new FakeContentReadPort()

  await assert.rejects(
    acceptLessonMaterialProposal({ ...command, binding: malformed }, dependencies({ content })),
    /content digest/i,
  )

  assert.equal(content.reads, 0)
})

test('acceptance recomputes digest and rejects changed content before write', async () => {
  const lessonDesign = new FakeLessonDesign()
  const changedContent = snapshot('Contenuto modificato sotto la stessa generazione.')

  await assert.rejects(
    acceptLessonMaterialProposal(command, dependencies({
      content: new FakeContentReadPort(changedContent),
      lessonDesign,
    })),
    /digest|stale/i,
  )

  assert.equal(lessonDesign.insertCount, 0)
  assert.equal(lessonDesign.acceptCount, 0)
})

test('conflicting retry under the same idempotency key fails closed', async () => {
  const conflictingBinding = binding()
  conflictingBinding.role = 'STUDENT_HANDOUT'
  conflictingBinding.audience = 'STUDENT'
  const existing = extensionFrom({
    status: 'ACCEPTED',
    payload: {
      dedupeKey: 'material-acceptance-1',
      materialBinding: conflictingBinding,
    },
  })
  const lessonDesign = new FakeLessonDesign(existing)

  await assert.rejects(
    acceptLessonMaterialProposal(command, dependencies({ lessonDesign })),
    /idempotency|conflict/i,
  )

  assert.equal(lessonDesign.insertCount, 0)
  assert.equal(lessonDesign.acceptCount, 0)
})

test('identical semantic retry returns the accepted extension without duplicate acceptance', async () => {
  const lessonDesign = new FakeLessonDesign()
  const deps = dependencies({ lessonDesign })

  const first = await acceptLessonMaterialProposal(command, deps)
  const second = await acceptLessonMaterialProposal(command, deps)

  assert.equal(first.id, second.id)
  assert.equal(second.status, 'ACCEPTED')
  assert.equal(lessonDesign.insertCount, 1)
  assert.equal(lessonDesign.acceptCount, 1)
  assert.deepEqual(second.payload.materialBinding, binding())
})
