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

test('lesson context keeps internal authority while provider view removes workspace and object identifiers', () => {
  const context = buildLessonCopilotContext({
    workspaceId: 'workspace-secret-id',
    academicYearId: 'year-2026',
    discipline: 'Tecnologia',
    sectionId: 'section-2c-id',
    sectionLabel: '2ª C',
    blockId: 'B01',
    projection,
    brief,
    progressStatus: 'PIANIFICATO',
  })

  assert.equal(context.surface, 'LESSON')
  assert.equal(context.object?.id, 'section-2c-id:B01:projection-2c-b01')
  assert.deepEqual(context.provenance.map((item) => item.ref), ['CAN-PLAN-2', 'CAN-UDA-2-01'])
  assert.ok(context.forbiddenCapabilities.includes('PLAN_COMPLETE_BLOCK'))

  const provider = lessonCopilotProviderContext(context)
  assert.equal('workspaceId' in provider, false)
  assert.equal('academicYearId' in provider, false)
  assert.equal('sectionId' in provider.lesson, false)
  assert.equal('blockId' in provider.lesson, false)
  assert.equal('projectionId' in provider.lesson, false)
  assert.equal(provider.classLabel, '2ª C')
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
  const context = buildLessonCopilotContext({
    workspaceId: 'workspace-secret-id',
    academicYearId: 'year-2026',
    discipline: 'Tecnologia',
    sectionId: 'section-2c-id',
    sectionLabel: '2ª C',
    blockId: 'B01',
    projection,
    brief,
    progressStatus: 'PIANIFICATO',
  })

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

test('fallback remains useful when the model provider is unavailable', () => {
  const context = buildLessonCopilotContext({
    workspaceId: 'workspace-secret-id',
    academicYearId: 'year-2026',
    discipline: 'Tecnologia',
    sectionId: 'section-2c-id',
    sectionLabel: '2ª C',
    blockId: 'B01',
    projection,
    brief,
    progressStatus: 'PIANIFICATO',
  })

  const response = fallbackLessonCopilotResponse(context, 'Cosa devo preparare e cosa è già pronto?')
  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /Immagine di un paesaggio agricolo/)
  assert.match(response.text, /Schema input-processo-output/)
  assert.ok(response.evidenceRefs.length > 0)
})
