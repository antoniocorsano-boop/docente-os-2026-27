import assert from 'node:assert/strict'
import test from 'node:test'
import type { HomeDailyContext, HomeDailyLesson } from './home-daily-context'
import {
  enrichTodayCopilotContext,
  respondToTodayCopilotK2,
  type TodayDayReviewContext,
} from './next-lesson-preparation'
import type { PlannerAssistantContext } from './planner-assistant-context'
import { buildTodayCopilotContext, respondToTodayCopilot } from './today-copilot-context'

const DATE = '2026-09-15'

function lesson(id: string, start: string, end: string, title: string, recorded = false): HomeDailyLesson {
  return {
    logicalId: id,
    localDate: DATE,
    startAt: `${DATE}T${start}:00`,
    endAt: `${DATE}T${end}:00`,
    title,
    sectionId: `section-${id}`,
    disciplineId: 'technology',
    timetableVersionId: 'tt-active',
    timetableSlotId: `slot-${id}`,
    authority: 'IN_FORCE',
    recorded,
  }
}

function planner(overrides: Partial<PlannerAssistantContext['planner']> = {}): PlannerAssistantContext['planner'] {
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
    ...overrides,
  }
}

function daily(overrides: Partial<HomeDailyContext> = {}): HomeDailyContext {
  const lessons = [
    lesson('1', '09:00', '10:00', '2C · Tecnologia'),
    lesson('2', '11:00', '12:00', '1A · Tecnologia'),
  ]
  return {
    localDate: DATE,
    authority: 'IN_FORCE',
    lessons,
    lessonCount: lessons.length,
    pendingRegistrationCount: 0,
    primary: {
      kind: 'UPCOMING_LESSON',
      lesson: lessons[0],
      minutesUntilStart: 30,
    },
    ...overrides,
  }
}

function context(input: {
  homeDaily?: HomeDailyContext
  planner?: PlannerAssistantContext['planner']
  calendarState?: 'SCHOOL_DAY' | 'NO_LESSONS' | 'UNDETERMINED'
  timetableState?: 'IN_FORCE' | 'UNAVAILABLE' | 'NOT_APPLICABLE'
} = {}) {
  return buildTodayCopilotContext({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    homeDaily: input.homeDaily ?? daily(),
    calendarState: input.calendarState ?? 'SCHOOL_DAY',
    calendarLabel: null,
    timetableState: input.timetableState ?? 'IN_FORCE',
    planner: input.planner ?? planner(),
  })
}

function dayReview(overrides: Partial<TodayDayReviewContext> = {}): TodayDayReviewContext {
  return {
    localDate: DATE,
    tomorrowLocalDate: '2026-09-16',
    concludedCount: 2,
    recordedCount: 1,
    pendingCount: 1,
    remainingCount: 0,
    tomorrowLessonCount: 2,
    tomorrowReadyCount: 0,
    tomorrowAttentionCount: 1,
    tomorrowBlockedCount: 1,
    decisions: [
      {
        id: 'record:1',
        kind: 'RECORD_LESSON',
        title: 'Registra 2C · Tecnologia',
        detail: 'La lezione è conclusa ma non risulta ancora registrata nel Diario.',
        actionLabel: 'Apri la classe',
        href: '/classi/section-1',
      },
      {
        id: 'blocked:2',
        kind: 'VERIFY_TOMORROW',
        title: '1A: preparazione bloccata',
        detail: 'Il pacchetto non è ancora utilizzabile con sufficiente certezza.',
        actionLabel: 'Apri il pacchetto',
        href: '/materiali/domani/lesson-2',
      },
      {
        id: 'attention:3',
        kind: 'COMPLETE_TOMORROW',
        title: '2C: completa la preparazione',
        detail: 'Il pacchetto richiede ancora una verifica o un materiale.',
        actionLabel: 'Apri il pacchetto',
        href: '/materiali/domani/lesson-3',
      },
      {
        id: 'uda:session-1',
        kind: 'REVIEW_UDA_PROPOSAL',
        title: '2C · Tecnologia: valuta la proposta per l’UDA',
        detail: 'Rallentare la fase operativa e aggiungere un esempio guidato.',
        actionLabel: 'Apri il Diario',
        href: '/classi/section-1/diario',
      },
    ],
    ...overrides,
  }
}

test('K1: lezioni presenti non vengono annullate da un Planner vuoto', () => {
  const result = respondToTodayCopilot(context(), 'Che lezioni ho oggi?')

  assert.equal(result.answerStatus, 'SUPPORTED')
  assert.match(result.text, /2C · Tecnologia/)
  assert.match(result.text, /1A · Tecnologia/)
  assert.doesNotMatch(result.text, /non (?:risultano|sono previste) lezioni/i)
})

test('K1: il riepilogo della giornata mantiene lezioni e Planner in sezioni distinte', () => {
  const result = respondToTodayCopilot(context({
    planner: planner({
      activeCount: 1,
      openCount: 1,
      todayCount: 1,
      tasks: [{
        id: 'task-1',
        title: 'Preparare scheda 2C',
        status: 'OPEN',
        priority: 'HIGH',
        plannedFor: DATE,
        sourceKind: 'MANUAL',
      }],
    }),
  }), 'Cosa devo fare oggi?')

  assert.match(result.text, /\*\*Lezioni\*\*/)
  assert.match(result.text, /\*\*Attività Planner\*\*/)
  assert.match(result.text, /2C · Tecnologia/)
  assert.match(result.text, /Preparare scheda 2C/)
})

test('K1: un contesto temporale ambiguo non produce lezioni inventate', () => {
  const ambiguous = daily({
    authority: 'AMBIGUOUS',
    lessons: [],
    lessonCount: 0,
    primary: { kind: 'AMBIGUOUS', lesson: null, minutesUntilStart: null },
  })
  const result = respondToTodayCopilot(context({ homeDaily: ambiguous, timetableState: 'UNAVAILABLE' }), 'Che lezioni ho oggi?')

  assert.equal(result.answerStatus, 'PARTIAL')
  assert.match(result.text, /ambigu/i)
  assert.doesNotMatch(result.text, /2C|1A/)
})

test('K1: un orario provvisorio resta esplicitamente provvisorio', () => {
  const provisionalLessons = [
    { ...lesson('1', '09:00', '10:00', '2C · Tecnologia'), authority: 'PROVISIONAL_DRAFT' as const },
  ]
  const provisional = daily({
    authority: 'PROVISIONAL_DRAFT',
    lessons: provisionalLessons,
    lessonCount: 1,
    primary: { kind: 'UPCOMING_LESSON', lesson: provisionalLessons[0], minutesUntilStart: 20 },
  })
  const result = respondToTodayCopilot(context({ homeDaily: provisional, timetableState: 'UNAVAILABLE' }), 'Che lezioni ho oggi?')

  assert.equal(result.answerStatus, 'PARTIAL')
  assert.match(result.text, /provvisorio/i)
  assert.match(result.text, /2C · Tecnologia/)
})

test('K1: le registrazioni pendenti sono un dominio distinto dal Planner', () => {
  const pendingLesson = lesson('1', '09:00', '10:00', '2C · Tecnologia')
  const withPending = daily({
    lessons: [pendingLesson],
    lessonCount: 1,
    pendingRegistrationCount: 1,
    primary: { kind: 'PENDING_REGISTRATION', lesson: pendingLesson, minutesUntilStart: null },
  })
  const result = respondToTodayCopilot(context({ homeDaily: withPending }), 'Cosa devo ancora registrare?')

  assert.match(result.text, /1 lezione conclusa da registrare/)
  assert.match(result.text, /2C · Tecnologia/)
  assert.match(result.text, /Non registro automaticamente/)
})

test('K1: giornata senza lezioni può comunque contenere attività Planner', () => {
  const noLessons = daily({
    authority: 'NONE',
    lessons: [],
    lessonCount: 0,
    primary: null,
  })
  const result = respondToTodayCopilot(context({
    homeDaily: noLessons,
    calendarState: 'NO_LESSONS',
    timetableState: 'NOT_APPLICABLE',
    planner: planner({
      activeCount: 1,
      openCount: 1,
      todayCount: 1,
      tasks: [{
        id: 'task-2',
        title: 'Rivedere UDA',
        status: 'OPEN',
        priority: 'NORMAL',
        plannedFor: DATE,
        sourceKind: 'MANUAL',
      }],
    }),
  }), 'Organizza la mia giornata')

  assert.match(result.text, /calendario non prevede lezioni/i)
  assert.match(result.text, /Rivedere UDA/)
})

test('MDS-6: il Copilota usa la coda MDS-5 nello stesso ordine governato', () => {
  const governed = {
    ...enrichTodayCopilotContext(context(), null),
    dayReview: dayReview(),
  }
  const result = respondToTodayCopilotK2(governed, 'Cosa devo sistemare prima di domani?')

  assert.equal(result.actionKind, 'READ_ONLY')
  assert.equal(result.answerStatus, 'SUPPORTED')
  assert.match(result.text, /\*\*Prima di domani\*\*/)
  const recordAt = result.text.indexOf('Registra 2C · Tecnologia')
  const blockedAt = result.text.indexOf('1A: preparazione bloccata')
  const attentionAt = result.text.indexOf('2C: completa la preparazione')
  const udaAt = result.text.indexOf('valuta la proposta per l’UDA')
  assert.ok(recordAt >= 0 && blockedAt > recordAt && attentionAt > blockedAt && udaAt > attentionAt)
  assert.match(result.text, /non applico proposte UDA automaticamente/i)
})

test('MDS-6: una coda vuota non inventa attività prima di domani', () => {
  const governed = {
    ...enrichTodayCopilotContext(context(), null),
    dayReview: dayReview({
      concludedCount: 2,
      recordedCount: 2,
      pendingCount: 0,
      tomorrowReadyCount: 2,
      tomorrowAttentionCount: 0,
      tomorrowBlockedCount: 0,
      decisions: [],
    }),
  }
  const result = respondToTodayCopilotK2(governed, 'Chiudi la giornata')

  assert.equal(result.actionKind, 'READ_ONLY')
  assert.equal(result.answerStatus, 'SUPPORTED')
  assert.match(result.text, /Non risultano decisioni aperte/i)
  assert.doesNotMatch(result.text, /Registra 2C|preparazione bloccata|completa la preparazione/)
})

test('MDS-6: senza coda caricata il Copilota non ricostruisce priorità per deduzione', () => {
  const governed = enrichTodayCopilotContext(context(), null)
  const result = respondToTodayCopilotK2(governed, 'Cosa manca per domani?')

  assert.equal(result.actionKind, 'READ_ONLY')
  assert.equal(result.answerStatus, 'PARTIAL')
  assert.match(result.text, /non è stata caricata/i)
  assert.match(result.text, /Non ricostruisco priorità per deduzione/i)
})
