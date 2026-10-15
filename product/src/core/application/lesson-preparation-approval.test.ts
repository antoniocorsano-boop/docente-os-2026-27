import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnnualPlanCurriculumBaselineSnapshot } from '@/core/application/annual-plan-curriculum-baseline'
import type { HumanTaskLessonProjection } from '@/core/application/human-task-lesson-projection'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import {
  buildLessonPreparationApprovalSnapshot,
  lessonPreparationFingerprint,
} from '@/core/application/lesson-preparation-approval'

const context = {
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  sectionId: 'section-1',
  canonicalPlanAssetId: 'asset-1',
  canonicalGenerationId: 'generation-1',
  blockId: 'B16',
  projectionId: 'projection-1',
}

const projection: HumanTaskLessonProjection = {
  id: 'projection-1',
  workspaceId: context.workspaceId,
  academicYearId: context.academicYearId,
  sectionId: context.sectionId,
  canonicalPlanAssetId: context.canonicalPlanAssetId,
  canonicalGenerationId: context.canonicalGenerationId,
  blockId: context.blockId,
  recipeId: 'recipe-1',
  recipeVersion: '1',
  manifestFingerprint: 'manifest-1',
  status: 'READY',
  title: 'Lezione',
  subtitle: null,
  prompt: 'Consegna',
  expectedOutput: 'Elaborato',
  focalPoint: null,
  teacherNote: null,
  targetProfile: null,
  materials: [],
  assessment: null,
  sections: [],
  sourceRefs: [],
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
}

function baseline(): AnnualPlanCurriculumBaselineSnapshot {
  return {
    version: 1,
    mode: 'CML_BOUND',
    capturedAt: '2026-09-20T12:00:00.000Z',
    academicYear: '2026/27',
    teachingAssignment: {
      subjectLabel: 'Tecnologia',
      classLabel: '2A',
      classYear: 2,
      classSection: 'A',
    },
    cmlBinding: {
      authority: 'CML',
      scope: 'SUBJECT',
      status: 'APPROVED',
      curriculumVersionId: 'technology-transition',
      curriculumVersionRef: '2026-27',
      curriculumStatus: 'APPROVED',
      lifecycleState: 'ACTIVE',
      curriculumSemanticSha256: 'curriculum-sha-1',
      curriculumSnapshotAt: '2026-09-20T12:00:00.000Z',
      subjectCode: 'TECH',
      subjectLabel: 'Tecnologia',
      classYear: 2,
      classSection: null,
      sourceRefs: [{ namespace: 'cml', entityType: 'CurriculumVersion', entityId: 'technology-transition', versionId: '2026-27' }],
    },
  }
}

function extension(status: LessonDesignExtension['status'], body = 'Usa la risorsa visuale scelta dal docente.'): LessonDesignExtension {
  return {
    id: 'extension-1',
    workspaceId: context.workspaceId,
    academicYearId: context.academicYearId,
    sectionId: context.sectionId,
    canonicalPlanAssetId: context.canonicalPlanAssetId,
    canonicalGenerationId: context.canonicalGenerationId,
    blockId: context.blockId,
    projectionId: context.projectionId,
    kind: 'TEACHER_RESOURCE',
    status,
    insertionPosition: 'START',
    anchorStepId: null,
    title: 'Supporto visuale',
    body,
    cue: null,
    minutes: null,
    sourceKind: 'TEACHER',
    sourceRef: 'atlas:visual-1',
    sourceLabel: 'Atlas · proposta selezionata',
    payload: {},
    revision: 2,
    decisionHistory: status === 'ACCEPTED' ? [{ action: 'ACCEPTED', actorId: 'teacher-1', at: '2026-09-20T13:00:00.000Z', revision: 2 }] : [],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: status === 'ACCEPTED' ? 'teacher-1' : null,
    acceptedAt: status === 'ACCEPTED' ? '2026-09-20T13:00:00.000Z' : null,
    dismissedBy: null,
    dismissedAt: null,
    createdBy: 'teacher-1',
    createdAt: '2026-09-20T12:30:00.000Z',
    updatedAt: '2026-09-20T13:00:00.000Z',
  }
}

function approvalInput(authorityEpoch: number) {
  const baselineKey = ['curr', 'iculumBaseline'].join('') as 'curriculumBaseline'
  return {
    context: { ...context, canonicalAuthorityEpoch: authorityEpoch },
    [baselineKey]: baseline(),
    projection,
    extensions: [],
  } as Parameters<typeof buildLessonPreparationApprovalSnapshot>[0]
}

test('same effective preparation produces the same fingerprint', () => {
  const first = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED')] })
  const second = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED')] })
  assert.equal(lessonPreparationFingerprint(first), lessonPreparationFingerprint(second))
})

test('authority epoch zero preserves the historical approval fingerprint shape', () => {
  const snapshot = buildLessonPreparationApprovalSnapshot(approvalInput(0))
  assert.equal(snapshot.context.canonicalAuthorityEpoch, undefined)
})

test('a governed authority movement invalidates the previous lesson approval identity', () => {
  const beforeMovement = buildLessonPreparationApprovalSnapshot(approvalInput(0))
  const afterMovement = buildLessonPreparationApprovalSnapshot(approvalInput(1))
  assert.notEqual(lessonPreparationFingerprint(beforeMovement), lessonPreparationFingerprint(afterMovement))
  assert.equal(afterMovement.context.canonicalAuthorityEpoch, 1)
})

test('semantic curriculum drift invalidates approval even when curriculum version ref is unchanged', () => {
  const first = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [] })
  const driftedBaseline = baseline()
  driftedBaseline.cmlBinding = driftedBaseline.cmlBinding
    ? { ...driftedBaseline.cmlBinding, curriculumSemanticSha256: 'curriculum-sha-2' }
    : null
  const second = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: driftedBaseline, projection, extensions: [] })
  assert.notEqual(lessonPreparationFingerprint(first), lessonPreparationFingerprint(second))
})

test('accepted extension content participates in approval identity', () => {
  const first = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED', 'Prima versione')] })
  const second = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED', 'Seconda versione')] })
  assert.notEqual(lessonPreparationFingerprint(first), lessonPreparationFingerprint(second))
})

test('non accepted extensions do not participate in the approval snapshot', () => {
  const draft = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('DRAFT')] })
  const dismissed = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('DISMISSED')] })
  assert.deepEqual(draft.extensions, [])
  assert.deepEqual(dismissed.extensions, [])
})