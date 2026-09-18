import assert from 'node:assert/strict'
import test from 'node:test'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from './human-task-content'
import type { LessonBrief } from './lesson-brief'
import { projectAcceptedTeachingAdjustments } from './lesson-replanning-decision'
import type { TeacherMoment } from './teacher-moment'
import {
  buildLessonCopilotContext,
  buildTeacherMomentCopilotContext,
  fallbackLessonCopilotResponse,
  lessonCopilotProviderContext,
  validateTeacherCopilotResponse,
  type LessonCurriculumAuthority,
} from './teacher-copilot-context'

const projection: HumanTaskLessonProjection = {
  projectionId: 'projection-2c-b01',
  grade: 'Seconda',
  blockId: 'B01',
  udaCode: '2-01',
  udaTitle: 'Agricoltura, suolo e produzioni sostenibili',
  packCode: 'PACK-2A',
  period: 'Settembre',
  title: 'L’agricoltura come sistema tecnologico',
  durationMinutes: 60,
  why: 'Leggere l’agricoltura come sistema di elementi collegati.',
  objective: 'Riconoscere input, processo e output in un sistema agricolo.',
  outcomes: ['Riconosce gli elementi del sistema.'],
  preparation: ['Immagine di un paesaggio agricolo.', 'Lavagna o LIM.', 'Quaderno.'],
  steps: [{ id: 'S01', minutes: 10, title: 'Osserva', instruction: 'Osserva il paesaggio.' }],
  resources: [{
    id: 'SCHEDA',
    kind: 'STUDENT_SHEET',
    title: 'Schema input-processo-output',
    instruction: 'Completa lo schema.',
    prompts: [],
    surfaces: ['PREPARE'],
  }],
  evidence: 'Schema completato.',
  observation: ['Distingue risorse naturali e mezzi tecnici.'],
  assessmentNote: 'Formativa.',
  continuation: 'Approfondire il suolo.',
  sourceAlignment: { level: 'DIRECT' },
  sources: [
    { code: 'CAN-PLAN-2', label: 'Piano annuale classe seconda', role: 'PLAN', url: 'https://example.test/plan' },
    { code: 'CAN-UDA-2-01', label: 'UDA agricoltura', role: 'UDA', url: 'https://example.test/uda' },
  ],
}

const brief: LessonBrief = {
  title: projection.title,
  objective: projection.objective,
  durationMinutes: 60,
  preparationPreview: projection.preparation,
  remainingPreparationCount: 0,
  readyTitles: ['Schema input-processo-output'],
  readyCount: 1,
  acceptedExtensionCount: 0,
  statusLabel: 'READY_BASE',
}

const approvedAuthority: LessonCurriculumAuthority = {
  curriculumState: 'APPROVED',
  alignmentAuthority: 'APPROVED_INSTITUTIONAL',
  requiresRevalidationOnApproval: false,
  applicabilityStatus: 'APPLICABLE',
  transitionRemodulationState: 'NOT_REQUIRED',
}

const provisionalAuthority: LessonCurriculumAuthority = {
  curriculumState: 'PROVISIONAL_COMPLETE',
  alignmentAuthority: 'PROVISIONAL_BASELINE',
  requiresRevalidationOnApproval: true,
  applicabilityStatus: 'TRANSITIONAL',
  transitionRemodulationState: 'HYPOTHESIS',
}

function lessonContext(
  authority: LessonCurriculumAuthority | null = approvedAuthority,
  replanning = projectAcceptedTeachingAdjustments({ extensions: [], scope: replanningScope }),
) {
  return buildLessonCopilotContext({
    workspaceId: 'workspace-secret-id',
    academicYearId: 'year-2026',
    discipline: 'Tecnologia',
    sectionId: 'section-2c-id',
    sectionLabel: '2ª C',
    blockId: 'B01',
    projection,
    brief,
    progressStatus: 'PIANIFICATO',
    curriculumAuthority: authority,
    curriculumAuthorityEvidence: authority ? { ref: 'framework-message-1', label: 'Autorità curricolare' } : null,
    replanning,
  })
}

const replanningScope = {
  workspaceId: 'workspace-secret-id',
  academicYearId: 'year-2026',
  sectionId: 'section-2c-id',
  canonicalPlanAssetId: 'plan-2',
  canonicalGenerationId: 'generation-2',
  blockId: 'B01',
  projectionId: 'projection-2c-b01',
}

function replanningExtension(overrides: Partial<LessonDesignExtension> = {}): LessonDesignExtension {
  return {
    id: 'adjustment-accepted',
    workspaceId: replanningScope.workspaceId,
    academicYearId: replanningScope.academicYearId,
    sectionId: replanningScope.sectionId,
    canonicalPlanAssetId: replanningScope.canonicalPlanAssetId,
    canonicalGenerationId: replanningScope.canonicalGenerationId,
    blockId: replanningScope.blockId,
    projectionId: replanningScope.projectionId,
    kind: 'TEACHING_ADJUSTMENT',
    status: 'ACCEPTED',
    insertionPosition: 'END',
    anchorStepId: null,
    title: 'Riprendere la misura con un esempio concreto',
    body: 'Usare prima un oggetto reale e poi tornare alla rappresentazione grafica.',
    cue: null,
    minutes: null,
    sourceKind: 'TEACHER',
    sourceRef: 'session-previous',
    sourceLabel: 'Riflessione post-lezione',
    payload: {},
    revision: 1,
    decisionHistory: [{
      action: 'ACCEPTED',
      actorId: 'teacher-1',
      at: '2026-09-17T18:00:00Z',
      revision: 1,
    }],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: 'teacher-1',
    acceptedAt: '2026-09-17T18:00:00Z',
    dismissedBy: null,
    dismissedAt: null,
    createdBy: 'teacher-1',
    createdAt: '2026-09-17T17:50:00Z',
    updatedAt: '2026-09-17T18:00:00Z',
    ...overrides,
  }
}

test('H9-A projects only accepted teaching adjustments inside the exact canonical scope', () => {
  const result = projectAcceptedTeachingAdjustments({
    scope: replanningScope,
    extensions: [
      replanningExtension({
        id: 'proposed',
        status: 'PROPOSED',
        acceptedBy: null,
        acceptedAt: null,
        decisionHistory: [],
      }),
      replanningExtension({ id: 'accepted' }),
      replanningExtension({
        id: 'dismissed',
        status: 'DISMISSED',
        acceptedBy: null,
        acceptedAt: null,
        dismissedBy: 'teacher-1',
        dismissedAt: '2026-09-17T18:05:00Z',
        decisionHistory: [{
          action: 'DISMISSED',
          actorId: 'teacher-1',
          at: '2026-09-17T18:05:00Z',
          revision: 1,
        }],
      }),
    ],
  })

  assert.equal(result.resolution, 'SUPPORTED')
  assert.deepEqual(result.decisions.map((decision) => decision.extensionId), ['accepted'])
  assert.equal(result.decisions[0]?.sourceRef, 'session-previous')
  assert.equal(result.decisions[0]?.decisionHistory[0]?.action, 'ACCEPTED')
})

test('H9-A fails closed when an accepted teaching adjustment does not match the canonical projection', () => {
  const result = projectAcceptedTeachingAdjustments({
    scope: replanningScope,
    extensions: [replanningExtension({ projectionId: 'projection-other' })],
  })

  assert.equal(result.resolution, 'BLOCKED')
  assert.deepEqual(result.decisions, [])
  assert.ok(result.reasons.includes('REPLANNING_SCOPE_MISMATCH:adjustment-accepted:projectionId'))
})

test('lesson copilot keeps accepted replanning text local while provider context receives only decision count', () => {
  const replanning = projectAcceptedTeachingAdjustments({
    scope: replanningScope,
    extensions: [replanningExtension()],
  })
  const context = lessonContext(approvedAuthority, replanning)
  const provider = lessonCopilotProviderContext(context)
  const serializedProvider = JSON.stringify(provider)
  const fallback = fallbackLessonCopilotResponse(context, 'Cosa devo preparare e cosa devo tenere d’occhio?')

  assert.equal(provider.lesson.replanning.acceptedDecisionCount, 1)
  assert.doesNotMatch(serializedProvider, /Riprendere la misura con un esempio concreto/)
  assert.doesNotMatch(serializedProvider, /session-previous/)
  assert.match(fallback.text, /Decisioni di riprogettazione accettate/)
  assert.match(fallback.text, /Riprendere la misura con un esempio concreto/)
})

test('lesson context keeps internal authority while provider view removes workspace, object and free-form readiness identifiers', () => {
  const context = buildLessonCopilotContext({
    workspaceId: 'workspace-secret-id',
    academicYearId: 'year-2026',
    discipline: 'Tecnologia',
    sectionId: 'section-2c-id',
    sectionLabel: '2ª C',
    blockId: 'B01',
    projection,
    brief: { ...brief, readyTitles: ['FREE-FORM-LOCAL-ONLY'] },
    progressStatus: 'PIANIFICATO',
    curriculumAuthority: approvedAuthority,
    curriculumAuthorityEvidence: { ref: 'framework-message-1', label: 'Curricolo istituzionale approvato' },
  })

  assert.equal(context.surface, 'LESSON')
  assert.equal(context.object?.id, 'section-2c-id:B01:projection-2c-b01')
  assert.deepEqual(context.provenance.map((item) => item.ref), ['CAN-PLAN-2', 'CAN-UDA-2-01', 'framework-message-1'])
  assert.ok(context.forbiddenCapabilities.includes('PLAN_COMPLETE_BLOCK'))
  assert.deepEqual(context.lesson.readyTitles, ['FREE-FORM-LOCAL-ONLY'])

  const provider = lessonCopilotProviderContext(context)
  assert.equal('workspaceId' in provider, false)
  assert.equal('academicYearId' in provider, false)
  assert.equal('sectionId' in provider.lesson, false)
  assert.equal('blockId' in provider.lesson, false)
  assert.equal('projectionId' in provider.lesson, false)
  assert.equal('readyTitles' in provider.lesson, false)
  assert.equal(provider.classLabel, '2ª C')
  assert.equal(provider.curriculumAuthority?.alignmentAuthority, 'APPROVED_INSTITUTIONAL')
})

test('teacher moment context preserves temporal authority and does not claim calendar confirmation', () => {
  const moment: TeacherMoment = {
    mode: 'PREPARE_NEXT',
    localDate: '2026-09-15',
    daysAhead: 1,
    authority: 'SCHEDULE_ONLY',
    calendarLabel: null,
    lessons: [{
      timetableSlotId: 'slot-1',
      localDate: '2026-09-15',
      startTime: '08:00',
      endTime: '09:00',
      sectionId: 'section-2c-id',
      sectionLabel: '2ª C',
      disciplineId: 'technology-id',
      disciplineLabel: 'Tecnologia',
      room: null,
    }],
  }

  const context = buildTeacherMomentCopilotContext({
    workspaceId: 'workspace-secret-id',
    academicYearId: 'year-2026',
    moment,
  })

  assert.equal(context.teacherMoment.authority, 'SCHEDULE_ONLY')
  assert.equal(context.classLabel, '2ª C')
  assert.equal(context.discipline, 'Tecnologia')
  assert.ok(context.missingInformation.includes('Calendario del giorno non confermato'))
  assert.equal(context.provenance[0]?.label, 'Orario disponibile; Calendario da confermare')
})

test('response contract rejects unknown evidence and write-like action kinds', () => {
  const context = lessonContext()
  const invalid = validateTeacherCopilotResponse(context, {
    actionKind: 'WRITE_REVERSIBLE',
    answerStatus: 'SUPPORTED',
    text: 'Questa risposta tenta una scrittura e usa anche una evidenza non presente nel contesto corrente.',
    evidenceRefs: ['invented-ref'],
  } as never)

  assert.equal(invalid.valid, false)
  assert.ok(invalid.problems.some((problem) => problem.includes('soltanto leggere o proporre')))
  assert.ok(invalid.problems.some((problem) => problem.includes('invented-ref')))
})

test('SUPPORTED requires at least one authoritative evidence reference', () => {
  const invalid = validateTeacherCopilotResponse(lessonContext(), {
    actionKind: 'READ_ONLY',
    answerStatus: 'SUPPORTED',
    text: 'Questa risposta dichiara supporto pieno ma non porta alcuna evidenza autorevole collegata al contesto.',
    evidenceRefs: [],
  })

  assert.equal(invalid.valid, false)
  assert.ok(invalid.problems.some((problem) => problem.includes('almeno una evidenza autorevole')))
})

test('provisional curriculum authority cannot be promoted to SUPPORTED', () => {
  const context = lessonContext(provisionalAuthority)
  const invalid = validateTeacherCopilotResponse(context, {
    actionKind: 'READ_ONLY',
    answerStatus: 'SUPPORTED',
    text: 'La risposta usa fonti reali ma non può presentare come definitiva una base curricolare ancora provvisoria.',
    evidenceRefs: ['CAN-PLAN-2'],
  })

  assert.equal(invalid.valid, false)
  assert.ok(context.missingInformation.some((item) => item.includes('Base curricolare provvisoria')))
  assert.ok(invalid.problems.some((problem) => problem.includes('answerStatus PARTIAL')))
})

test('missing curriculum authority is explicit and degrades fallback to PARTIAL', () => {
  const context = lessonContext(null)
  const response = fallbackLessonCopilotResponse(context, 'Cosa devo preparare?')

  assert.ok(context.missingInformation.includes('Autorità curricolare non disponibile per questa lezione'))
  assert.equal(response.answerStatus, 'PARTIAL')
})

test('fallback remains useful and SUPPORTED with approved authority and evidence', () => {
  const context = lessonContext()
  const response = fallbackLessonCopilotResponse(context, 'Cosa devo preparare e cosa è già pronto?')
  assert.equal(response.actionKind, 'PROPOSE')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /Immagine di un paesaggio agricolo/)
  assert.match(response.text, /Schema input-processo-output/)
  assert.ok(response.evidenceRefs.length > 0)
})
