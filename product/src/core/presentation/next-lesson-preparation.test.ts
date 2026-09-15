import assert from 'node:assert/strict'
import test from 'node:test'
import type { HomeDailyContext, HomeDailyLesson } from './home-daily-context'
import {
  buildNextLessonPreparation,
  enrichTodayCopilotContext,
  respondToTodayCopilotK2,
  selectNextLessonForPreparation,
} from './next-lesson-preparation'
import type { PlannerAssistantContext } from './planner-assistant-context'
import type { LessonCopilotContext } from './teacher-copilot-context'
import { buildTodayCopilotContext } from './today-copilot-context'

const DATE = '2026-09-15'

function lesson(id: string, start: string, end: string, title: string, authority: HomeDailyLesson['authority'] = 'IN_FORCE'): HomeDailyLesson {
  return {
    logicalId: id,
    localDate: DATE,
    startAt: `${DATE}T${start}:00`,
    endAt: `${DATE}T${end}:00`,
    title,
    sectionId: 'section-2c',
    disciplineId: 'technology',
    timetableVersionId: authority === 'IN_FORCE' ? 'tt-active' : 'tt-draft',
    timetableSlotId: `slot-${id}`,
    authority,
    recorded: false,
  }
}

function daily(lessons: HomeDailyLesson[], overrides: Partial<HomeDailyContext> = {}): HomeDailyContext {
  return {
    localDate: DATE,
    authority: lessons[0]?.authority ?? 'IN_FORCE',
    lessons,
    lessonCount: lessons.length,
    pendingRegistrationCount: 0,
    primary: null,
    ...overrides,
  }
}

function planner(): PlannerAssistantContext['planner'] {
  return {
    localDate: DATE,
    activeCount: 0,
    openCount: 0,
    waitingCount: 0,
    overdueCount: 0,
    todayCount: 0,
    urgentCount: 0,
    highCount: 0,
    undatedCount: 0,
    tasks: [],
  }
}

function lessonContext(overrides: Partial<LessonCopilotContext> = {}): LessonCopilotContext {
  return {
    surface: 'LESSON',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    discipline: 'Tecnologia',
    classLabel: '2ª C',
    object: { type: 'LESSON_PROJECTION', id: 'section-2c:B03:projection-3', title: 'Misurare con precisione', state: 'PIANIFICATO' },
    provenance: [
      { kind: 'CANONICAL_PLAN', ref: 'plan:2:B03', label: 'Piano annuale classe seconda' },
      { kind: 'CURRICULUM_AUTHORITY', ref: 'curriculum:approved', label: 'Curricolo istituzionale approvato' },
    ],
    availableCapabilities: ['LESSON_EXPLAIN_CONTEXT'],
    forbiddenCapabilities: ['LESSON_RECORD_EXECUTION'],
    missingInformation: [],
    curriculumAuthority: {
      curriculumState: 'APPROVED',
      alignmentAuthority: 'APPROVED_INSTITUTIONAL',
      requiresRevalidationOnApproval: false,
      applicabilityStatus: 'APPLICABLE',
      transitionRemodulationState: 'NOT_REQUIRED',
    },
    lesson: {
      sectionId: 'section-2c',
      sectionLabel: '2ª C',
      blockId: 'B03',
      projectionId: 'projection-3',
      title: 'Misurare con precisione',
      objective: 'Misurare e rappresentare un oggetto con procedure controllabili.',
      durationMinutes: 60,
      udaTitle: 'Misurare e rappresentare',
      progressStatus: 'PIANIFICATO',
      preparationPreview: ['Righelli', 'Oggetto semplice da misurare'],
      remainingPreparationCount: 0,
      readyTitles: ['Scheda studente – Misurare e rappresentare'],
      readyCount: 1,
      statusLabel: 'ENRICHED',
    },
    ...overrides,
  }
}

function today(homeDaily: HomeDailyContext, preparation: ReturnType<typeof buildNextLessonPreparation>) {
  const base = buildTodayCopilotContext({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    homeDaily,
    calendarState: 'SCHOOL_DAY',
    calendarLabel: null,
    timetableState: homeDaily.authority === 'IN_FORCE' ? 'IN_FORCE' : 'UNAVAILABLE',
    planner: planner(),
  })
  return enrichTodayCopilotContext(base, preparation)
}

test('K2: una registrazione pendente non nasconde la vera prossima lezione', () => {
  const past = lesson('past', '09:00', '10:00', '1A · Tecnologia')
  const upcoming = lesson('next', '15:00', '16:00', '2C · Tecnologia')
  const home = daily([past, upcoming], {
    pendingRegistrationCount: 1,
    primary: { kind: 'PENDING_REGISTRATION', lesson: past, minutesUntilStart: null },
  })

  assert.equal(selectNextLessonForPreparation(home, 14 * 60 + 30)?.logicalId, 'next')
})

test('K2: la prossima lezione collega Piano, Lesson Brief, materiali pronti e Conoscenza', () => {
  const next = lesson('next', '15:00', '16:00', '2C · Tecnologia')
  const home = daily([next], {
    primary: { kind: 'UPCOMING_LESSON', lesson: next, minutesUntilStart: 30 },
  })
  const preparation = buildNextLessonPreparation({
    lesson: next,
    lessonContext: lessonContext(),
    knowledgeResources: [{
      assetId: 'asset-1',
      title: 'Scheda sulle misure',
      categoryLabel: 'Materiale',
      relevanceLabel: 'Fase corrente',
    }],
  })

  const result = respondToTodayCopilotK2(today(home, preparation), 'Qual è la prossima lezione?')

  assert.equal(result.answerStatus, 'SUPPORTED')
  assert.match(result.text, /2C · Tecnologia/)
  assert.match(result.text, /B03 · Misurare e rappresentare/)
  assert.match(result.text, /Misurare e rappresentare un oggetto/)
  assert.match(result.text, /Righelli/)
  assert.match(result.text, /Scheda studente – Misurare e rappresentare/)
  assert.match(result.text, /Scheda sulle misure · Fase corrente/)
})

test('K2: se il Piano non è risolvibile non inventa blocco, obiettivo o materiali', () => {
  const next = lesson('next', '15:00', '16:00', '2C · Tecnologia')
  const home = daily([next], {
    primary: { kind: 'UPCOMING_LESSON', lesson: next, minutesUntilStart: 30 },
  })
  const preparation = buildNextLessonPreparation({
    lesson: next,
    lessonContext: null,
    missingInformation: ['Il prossimo blocco del Piano annuale non è disponibile'],
  })

  const result = respondToTodayCopilotK2(today(home, preparation), 'Come preparo la prossima lezione?')

  assert.equal(result.answerStatus, 'PARTIAL')
  assert.match(result.text, /non posso collegarla.*blocco canonico/i)
  assert.match(result.text, /non è disponibile/i)
  assert.doesNotMatch(result.text, /B03|Righelli|Scheda sulle misure/)
})

test('K2: un orario provvisorio resta PARTIAL anche con Lesson Brief completo', () => {
  const next = lesson('next', '15:00', '16:00', '2C · Tecnologia', 'PROVISIONAL_DRAFT')
  const home = daily([next], {
    authority: 'PROVISIONAL_DRAFT',
    primary: { kind: 'UPCOMING_LESSON', lesson: next, minutesUntilStart: 30 },
  })
  const preparation = buildNextLessonPreparation({ lesson: next, lessonContext: lessonContext() })

  const result = respondToTodayCopilotK2(today(home, preparation), 'Qual è la prossima lezione?')

  assert.equal(result.answerStatus, 'PARTIAL')
  assert.match(result.text, /orario provvisorio/i)
  assert.match(result.text, /B03/)
})

test('K2: un contesto ambiguo non seleziona arbitrariamente una preparazione', () => {
  const ambiguous: HomeDailyContext = {
    localDate: DATE,
    authority: 'AMBIGUOUS',
    lessons: [],
    lessonCount: 0,
    pendingRegistrationCount: 0,
    primary: { kind: 'AMBIGUOUS', lesson: null, minutesUntilStart: null },
  }

  assert.equal(selectNextLessonForPreparation(ambiguous, 14 * 60 + 30), null)

  const base = buildTodayCopilotContext({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    homeDaily: ambiguous,
    calendarState: 'SCHOOL_DAY',
    calendarLabel: null,
    timetableState: 'UNAVAILABLE',
    planner: planner(),
  })
  const result = respondToTodayCopilotK2(enrichTodayCopilotContext(base, null), 'Qual è la prossima lezione?')
  assert.equal(result.answerStatus, 'PARTIAL')
  assert.match(result.text, /ambigu/i)
})
