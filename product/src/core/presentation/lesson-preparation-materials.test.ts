import assert from 'node:assert/strict'
import test from 'node:test'
import { digestMaterialContentV1, type MaterialContentSnapshotV1 } from '@/core/application/material-content-digest'
import type {
  KnowledgeGenerationMaterialRecordV1,
  MaterialContentReadPortV1,
} from '@/core/application/material-content-resolution'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type {
  LessonMaterialArtifactKind,
  LessonMaterialAudience,
  LessonMaterialBindingV1,
  LessonMaterialRole as CanonicalLessonMaterialRole,
} from '@/core/domain/lesson-material-binding'
import type { HumanTaskLessonProjection } from './human-task-content'
import {
  buildLessonPreparationManifest,
  buildVerifiedLessonPreparationManifest,
  type LessonPreparationManifestResult,
} from './lesson-preparation-manifest'
import type { NextLessonPreparation } from './next-lesson-preparation'
import type { LessonCopilotContext } from './teacher-copilot-context'

const ROLES: CanonicalLessonMaterialRole[] = [
  'TEACHER_BRIEF',
  'LIM_VIEW',
  'STUDENT_HANDOUT',
  'MINI_DECK',
  'VISUAL_AID',
  'ASSESSMENT',
]

const ARTIFACT_BY_ROLE: Record<CanonicalLessonMaterialRole, LessonMaterialArtifactKind> = {
  TEACHER_BRIEF: 'GUIDE',
  LIM_VIEW: 'PRESENTATION',
  STUDENT_HANDOUT: 'WORKSHEET',
  MINI_DECK: 'PRESENTATION',
  VISUAL_AID: 'VISUAL',
  ASSESSMENT: 'ASSESSMENT',
}

const AUDIENCE_BY_ROLE: Record<CanonicalLessonMaterialRole, LessonMaterialAudience> = {
  TEACHER_BRIEF: 'TEACHER',
  LIM_VIEW: 'MIXED',
  STUDENT_HANDOUT: 'STUDENT',
  MINI_DECK: 'MIXED',
  VISUAL_AID: 'MIXED',
  ASSESSMENT: 'STUDENT',
}

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

function binding(
  role: CanonicalLessonMaterialRole,
  content: MaterialContentSnapshotV1 = snapshot(),
): LessonMaterialBindingV1 {
  return {
    schema: 'docente-os.lesson-material-binding.v1',
    role,
    artifactKind: ARTIFACT_BY_ROLE[role],
    audience: AUDIENCE_BY_ROLE[role],
    materialRef: {
      kind: 'KNOWLEDGE_GENERATION',
      assetId: `asset-${role.toLowerCase()}`,
      generationId: `generation-${role.toLowerCase()}`,
      contentDigest: digestMaterialContentV1(content),
    },
    provenance: {
      sourceArtifactRefs: [`knowledge:${role.toLowerCase()}`],
      derivationRefs: ['material-core-task-6'],
      evidenceRefs: [`evidence:${role.toLowerCase()}`],
      rightsState: 'KNOWN',
      attributionRequirements: [],
    },
  }
}

function extension(input: {
  id: string
  binding?: LessonMaterialBindingV1
  kind?: LessonDesignExtension['kind']
  status?: LessonDesignExtension['status']
}): LessonDesignExtension {
  const resolvedKind = input.kind
    ?? (input.binding?.audience === 'STUDENT' ? 'STUDENT_RESOURCE' : 'TEACHER_RESOURCE')

  return {
    id: input.id,
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-1',
    canonicalPlanAssetId: 'plan-asset-1',
    canonicalGenerationId: 'plan-generation-1',
    blockId: 'B01',
    projectionId: 'HTC-PRIMA-B01-v1',
    kind: resolvedKind,
    status: input.status ?? 'ACCEPTED',
    insertionPosition: 'END',
    anchorStepId: null,
    title: `Materiale ${input.id}`,
    body: 'Materiale canonico verificato per la lezione.',
    cue: null,
    minutes: null,
    sourceKind: 'KNOWLEDGE',
    sourceRef: input.binding?.materialRef.kind === 'KNOWLEDGE_GENERATION'
      ? `knowledge:${input.binding.materialRef.assetId}:${input.binding.materialRef.generationId}`
      : 'knowledge:legacy-material',
    sourceLabel: `Materiale ${input.id}`,
    payload: input.binding ? { materialBinding: input.binding } : { legacy: true },
    revision: 1,
    decisionHistory: [],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: input.status === 'PROPOSED' ? null : 'teacher-1',
    acceptedAt: input.status === 'PROPOSED' ? null : '2026-10-16T10:00:00.000Z',
    dismissedBy: null,
    dismissedAt: null,
    createdBy: 'teacher-1',
    createdAt: '2026-10-16T09:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
  }
}

function preparation(): NextLessonPreparation {
  return {
    lesson: {
      logicalId: 'lesson-1',
      startAt: '2026-10-16T08:00:00+02:00',
      endAt: '2026-10-16T09:00:00+02:00',
      title: 'Energia e trasformazioni',
      sectionId: 'section-1',
      disciplineId: 'tecnologia',
      authority: 'IN_FORCE',
    },
    canonicalLesson: {
      sectionLabel: '1A',
      blockId: 'B01',
      title: 'Energia e trasformazioni',
      objective: 'Comprendere le trasformazioni di energia.',
      durationMinutes: 60,
      udaTitle: 'Energia',
      progressStatus: 'IN_PROGRESS',
      preparationPreview: [],
      remainingPreparationCount: 0,
      readyTitles: [],
      readyCount: 0,
      statusLabel: 'Pronta',
    },
    continuity: null,
    replanning: null,
    knowledgeResources: [],
    missingInformation: [],
    provenance: [],
  } as unknown as NextLessonPreparation
}

function lessonContext(): LessonCopilotContext {
  return {
    surface: 'LESSON',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    discipline: 'Tecnologia',
    classLabel: '1A',
    object: {
      type: 'LESSON_PROJECTION',
      id: 'section-1:B01:HTC-PRIMA-B01-v1',
      title: 'Energia e trasformazioni',
      state: 'IN_PROGRESS',
    },
    provenance: [],
    availableCapabilities: [],
    forbiddenCapabilities: [],
    missingInformation: [],
    lesson: {
      sectionId: 'section-1',
      sectionLabel: '1A',
      blockId: 'B01',
      projectionId: 'HTC-PRIMA-B01-v1',
      title: 'Energia e trasformazioni',
      objective: 'Comprendere le trasformazioni di energia.',
      durationMinutes: 60,
      udaTitle: 'Energia',
      progressStatus: 'IN_PROGRESS',
      preparationPreview: [],
      remainingPreparationCount: 0,
      readyTitles: [],
      readyCount: 0,
      statusLabel: 'Pronta',
    },
  } as unknown as LessonCopilotContext
}

function projection(): HumanTaskLessonProjection {
  return {
    projectionId: 'HTC-PRIMA-B01-v1',
    grade: 'Prima',
    blockId: 'B01',
    udaCode: 'UDA-ENERGIA',
    udaTitle: 'Energia',
    packCode: 'PACK-ENERGIA',
    period: 'Ottobre',
    title: 'Energia e trasformazioni',
    durationMinutes: 60,
    why: 'Comprendere un sistema energetico.',
    objective: 'Comprendere le trasformazioni di energia.',
    outcomes: [],
    preparation: [],
    steps: [],
    resources: [],
    evidence: 'Discussione finale.',
    observation: [],
    assessmentNote: 'Osservazione formativa.',
    continuation: 'Proseguire con gli impianti.',
    sourceAlignment: { level: 'DIRECT' },
    sources: [],
  }
}

class FakeContentReadPort implements MaterialContentReadPortV1 {
  reads = 0

  constructor(
    private readonly mode: 'MATCH' | 'CHANGED' | 'UNAVAILABLE' = 'MATCH',
  ) {}

  async readKnowledgeGeneration(input: {
    workspaceId: string
    assetId: string
    generationId: string
  }): Promise<KnowledgeGenerationMaterialRecordV1 | null> {
    this.reads += 1
    if (this.mode === 'UNAVAILABLE') return null

    const content = this.mode === 'CHANGED'
      ? snapshot('Contenuto modificato in-place sotto la stessa generazione.')
      : snapshot()

    return {
      assetId: input.assetId,
      generationId: input.generationId,
      generationStatus: 'SUCCEEDED',
      currentGenerationId: input.generationId,
      sourceLocator: null,
      sourceIsImmutableLocal: true,
      sourceContentAvailable: true,
      sourceSha256MatchesBytes: true,
      snapshot: content,
    }
  }
}

function baseInput(extensions: LessonDesignExtension[]) {
  return {
    preparation: preparation(),
    lessonContext: lessonContext(),
    projection: projection(),
    extensions,
    requiredMaterialRoles: [...ROLES],
  }
}

function requireManifest(result: LessonPreparationManifestResult) {
  assert.notEqual(result.resolution, 'BLOCKED')
  assert.ok(result.manifest)
  return result.manifest
}

test('accepted typed bindings reconstruct all six canonical material slots', async () => {
  const extensions = ROLES.map((role, index) => extension({
    id: `extension-${index + 1}`,
    binding: binding(role),
  }))

  const result = await buildVerifiedLessonPreparationManifest({
    ...baseInput(extensions),
    materialContentReadPort: new FakeContentReadPort('MATCH'),
  })
  const manifest = requireManifest(result)

  for (const role of ROLES) {
    const slot = manifest.materialSlots.find((candidate) => candidate.role === role)
    assert.ok(slot, `missing slot for ${role}`)
    assert.equal(slot.status, 'READY', role)
    assert.ok(slot.materials, `missing material metadata for ${role}`)
    const canonical = slot.materials.find((material) => material.binding?.role === role)
    assert.ok(canonical, `missing canonical material metadata for ${role}`)
    assert.equal(canonical.binding?.artifactKind, ARTIFACT_BY_ROLE[role])
    assert.equal(canonical.binding?.audience, AUDIENCE_BY_ROLE[role])
  }
})

test('role, artifact kind and audience remain distinct after manifest serialization', async () => {
  const original = binding('LIM_VIEW')
  const result = await buildVerifiedLessonPreparationManifest({
    ...baseInput([extension({ id: 'extension-lim', binding: original })]),
    requiredMaterialRoles: ['LIM_VIEW'],
    materialContentReadPort: new FakeContentReadPort('MATCH'),
  })
  const serialized = JSON.parse(JSON.stringify(requireManifest(result))) as ReturnType<typeof requireManifest>
  const slot = serialized.materialSlots.find((candidate) => candidate.role === 'LIM_VIEW')
  const canonical = slot?.materials?.find((material) => material.binding)

  assert.equal(canonical?.binding?.role, 'LIM_VIEW')
  assert.equal(canonical?.binding?.artifactKind, 'PRESENTATION')
  assert.equal(canonical?.binding?.audience, 'MIXED')
  assert.equal(canonical?.binding?.materialRef.kind, 'KNOWLEDGE_GENERATION')
})

test('accepted resource kind without typed material binding is historical-only and never READY', () => {
  const readPort = new FakeContentReadPort('MATCH')
  const result = buildLessonPreparationManifest({
    ...baseInput([
      extension({ id: 'legacy-teacher', kind: 'TEACHER_RESOURCE' }),
      extension({ id: 'legacy-student', kind: 'STUDENT_RESOURCE' }),
    ]),
    requiredMaterialRoles: ['TEACHER_BRIEF', 'STUDENT_HANDOUT'],
  })
  const manifest = requireManifest(result)

  for (const role of ['TEACHER_BRIEF', 'STUDENT_HANDOUT'] as const) {
    const slot = manifest.materialSlots.find((candidate) => candidate.role === role)
    assert.equal(slot?.status, 'NEEDS_REVIEW')
    assert.ok(slot?.materials?.every((material) => material.binding === null))
    assert.ok(slot?.materials?.every((material) => material.authority === 'LEGACY_HISTORICAL'))
  }
  assert.equal(manifest.readiness, 'REVIEW_REQUIRED')
  assert.equal(readPort.reads, 0)
})

test('matching stored digest permits READY after exact canonical read-back', async () => {
  const accepted = extension({ id: 'extension-brief', binding: binding('TEACHER_BRIEF') })
  const result = await buildVerifiedLessonPreparationManifest({
    ...baseInput([accepted]),
    requiredMaterialRoles: ['TEACHER_BRIEF'],
    materialContentReadPort: new FakeContentReadPort('MATCH'),
  })
  const manifest = requireManifest(result)
  const slot = manifest.materialSlots.find((candidate) => candidate.role === 'TEACHER_BRIEF')

  assert.equal(slot?.status, 'READY')
  assert.equal(manifest.readiness, 'READY')
  assert.equal(result.resolution, 'SUPPORTED')
})

test('same generation with changed content becomes NEEDS_REVIEW instead of READY', async () => {
  const accepted = extension({ id: 'extension-stale', binding: binding('VISUAL_AID') })
  const result = await buildVerifiedLessonPreparationManifest({
    ...baseInput([accepted]),
    requiredMaterialRoles: ['VISUAL_AID'],
    materialContentReadPort: new FakeContentReadPort('CHANGED'),
  })
  const manifest = requireManifest(result)
  const slot = manifest.materialSlots.find((candidate) => candidate.role === 'VISUAL_AID')

  assert.equal(slot?.status, 'NEEDS_REVIEW')
  assert.match(slot?.reason ?? '', /digest|stale|verifica/i)
  assert.equal(manifest.readiness, 'REVIEW_REQUIRED')
})

test('unavailable digest verification fails closed from READY', async () => {
  const accepted = extension({ id: 'extension-unavailable', binding: binding('ASSESSMENT') })
  const result = await buildVerifiedLessonPreparationManifest({
    ...baseInput([accepted]),
    requiredMaterialRoles: ['ASSESSMENT'],
    materialContentReadPort: new FakeContentReadPort('UNAVAILABLE'),
  })
  const manifest = requireManifest(result)
  const slot = manifest.materialSlots.find((candidate) => candidate.role === 'ASSESSMENT')

  assert.equal(slot?.status, 'NEEDS_REVIEW')
  assert.notEqual(manifest.readiness, 'READY')
})
