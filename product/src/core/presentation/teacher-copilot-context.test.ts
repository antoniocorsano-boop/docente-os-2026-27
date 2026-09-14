import assert from 'node:assert/strict'
import test from 'node:test'
import type { HumanTaskLessonProjection } from './human-task-content'
import type { LessonBrief } from './lesson-brief'
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

function lessonContext(authority: LessonCurriculumAuthority | null = approvedAuthority) {
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
  })
}

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
