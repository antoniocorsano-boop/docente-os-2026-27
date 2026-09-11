import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProjectedDay, ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { TimetableSlotReadModel, TimetableVersionReadModel } from '@/core/application/ports/temporal-projection'
import type { TeachingSessionRecord } from '@/core/domain/teaching-session'
import { resolveHomeDailyContext } from './home-daily-context'

const date = '2026-09-11'

function occurrence(input: { id: string; sectionId: string; start: string; end: string }): ProjectedOccurrence {
  return {
    logicalId: `tt:v1:${input.id}:${date}`,
    localDate: date,
    startAt: `${date}T${input.start}:00`,
    endAt: `${date}T${input.end}:00`,
    kind: 'LESSON',
    title: input.sectionId,
    sectionId: input.sectionId,
    disciplineId: 'technology',
    timetableVersionId: 'v1',
    timetableSlotId: input.id,
    calendarEventId: null,
    calendarState: 'SCHOOL_DAY',
    exceptionState: 'NONE',
    provenance: ['test'],
  }
}

function projectedDay(occurrences: ProjectedOccurrence[]): ProjectedDay {
  return {
    localDate: date,
    calendarState: 'SCHOOL_DAY',
    calendarLabel: 'Lezioni',
    timetableState: 'IN_FORCE',
    timetableVersionId: 'v1',
    occurrences,
    events: [],
  }
}

function unavailableDay(): ProjectedDay {
  return {
    localDate: date,
    calendarState: 'UNDETERMINED',
    calendarLabel: null,
    timetableState: 'UNAVAILABLE',
    timetableVersionId: null,
    occurrences: [],
    events: [],
  }
}

function recordedSession(slotId: string, sectionId: string, start: string, end: string): TeachingSessionRecord {
  return {
    id: `session-${slotId}`,
    workspaceId: 'workspace',
    academicYearId: 'year',
    sectionId,
    disciplineId: 'technology',
    localDate: date,
    plannedStartAt: `${date}T${start}:00`,
    plannedEndAt: `${date}T${end}:00`,
    plannedMinutes: 60,
    actualMinutes: 55,
    evidenceNote: null,
    source: {
      sourceKind: 'PROJECTED_OCCURRENCE',
      projectedOccurrenceLogicalId: `tt:v1:${slotId}:${date}`,
      timetableVersionId: 'v1',
      timetableSlotId: slotId,
      calendarState: 'SCHOOL_DAY',
      provenance: ['test'],
    },
    supersedesSessionId: null,
    recordedBy: 'teacher',
    recordedAt: `${date}T12:00:00Z`,
  }
}

const lessons = [
  occurrence({ id: 's1', sectionId: '2A', start: '08:00', end: '09:00' }),
  occurrence({ id: 's2', sectionId: '3A', start: '09:00', end: '10:00' }),
  occurrence({ id: 's3', sectionId: '1A', start: '10:00', end: '11:00' }),
  occurrence({ id: 's4', sectionId: '3C', start: '11:00', end: '12:00' }),
]

test('before the first lesson the next lesson becomes the primary action', () => {
  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 7 * 60 + 40,
    projectedDay: projectedDay(lessons),
    timetableVersions: [],
    timetableSlots: [],
    sessions: [],
  })

  assert.equal(context.primary?.kind, 'UPCOMING_LESSON')
  assert.equal(context.primary?.lesson?.sectionId, '2A')
  assert.equal(context.lessonCount, 4)
})

test('during a lesson the current lesson wins', () => {
  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 9 * 60 + 25,
    projectedDay: projectedDay(lessons),
    timetableVersions: [],
    timetableSlots: [],
    sessions: [],
  })

  assert.equal(context.primary?.kind, 'CURRENT_LESSON')
  assert.equal(context.primary?.lesson?.sectionId, '3A')
})

test('between close lessons the upcoming lesson wins while the previous one stays pending', () => {
  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 8 * 60 + 55,
    projectedDay: projectedDay([
      occurrence({ id: 'early', sectionId: '2A', start: '08:00', end: '08:50' }),
      occurrence({ id: 'next', sectionId: '3A', start: '09:00', end: '10:00' }),
    ]),
    timetableVersions: [],
    timetableSlots: [],
    sessions: [],
  })

  assert.equal(context.primary?.kind, 'UPCOMING_LESSON')
  assert.equal(context.primary?.lesson?.sectionId, '3A')
  assert.equal(context.pendingRegistrationCount, 1)
})

test('after the last lesson a missing TeachingSession becomes primary', () => {
  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 16 * 60,
    projectedDay: projectedDay(lessons),
    timetableVersions: [],
    timetableSlots: [],
    sessions: [],
  })

  assert.equal(context.primary?.kind, 'PENDING_REGISTRATION')
  assert.equal(context.primary?.lesson?.sectionId, '3C')
  assert.equal(context.pendingRegistrationCount, 4)
})

test('a recorded TeachingSession is not considered pending', () => {
  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 8 * 60 + 30,
    projectedDay: projectedDay([lessons[0]]),
    timetableVersions: [],
    timetableSlots: [],
    sessions: [recordedSession('s1', '2A', '08:00', '09:00')],
  })

  assert.equal(context.primary?.kind, 'CURRENT_LESSON')
  assert.equal(context.pendingRegistrationCount, 0)
  assert.equal(context.lessons[0].recorded, true)
})

test('a unique applicable draft timetable is documentary context and is labeled provisional', () => {
  const versions: TimetableVersionReadModel[] = [
    { id: 'draft-1', status: 'DRAFT', effectiveFrom: '2026-09-01', effectiveTo: null },
  ]
  const slots: TimetableSlotReadModel[] = [
    {
      id: 'draft-slot',
      timetableVersionId: 'draft-1',
      weekday: 5,
      startTime: '08:00',
      endTime: '09:00',
      kind: 'LESSON',
      sectionId: '2A',
      sectionLabel: '2ª A',
      disciplineId: 'technology',
      disciplineLabel: 'Tecnologia',
      manualClassLabel: null,
      room: null,
    },
  ]

  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 7 * 60 + 30,
    projectedDay: unavailableDay(),
    timetableVersions: versions,
    timetableSlots: slots,
    sessions: [],
  })

  assert.equal(context.authority, 'PROVISIONAL_DRAFT')
  assert.equal(context.primary?.kind, 'UPCOMING_LESSON')
  assert.equal(context.primary?.lesson?.sectionId, '2A')
})

test('overlapping draft slots fail closed instead of guessing a class', () => {
  const versions: TimetableVersionReadModel[] = [
    { id: 'draft-1', status: 'DRAFT', effectiveFrom: '2026-09-01', effectiveTo: null },
  ]
  const slots: TimetableSlotReadModel[] = [
    {
      id: 'a', timetableVersionId: 'draft-1', weekday: 5, startTime: '08:00', endTime: '09:00', kind: 'LESSON',
      sectionId: '2A', sectionLabel: '2ª A', disciplineId: 'technology', disciplineLabel: 'Tecnologia', manualClassLabel: null, room: null,
    },
    {
      id: 'b', timetableVersionId: 'draft-1', weekday: 5, startTime: '08:30', endTime: '09:30', kind: 'LESSON',
      sectionId: '3A', sectionLabel: '3ª A', disciplineId: 'technology', disciplineLabel: 'Tecnologia', manualClassLabel: null, room: null,
    },
  ]

  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 8 * 60 + 40,
    projectedDay: unavailableDay(),
    timetableVersions: versions,
    timetableSlots: slots,
    sessions: [],
  })

  assert.equal(context.authority, 'AMBIGUOUS')
  assert.equal(context.primary?.kind, 'AMBIGUOUS')
  assert.equal(context.primary?.lesson, null)
})

test('a no-lessons calendar day never falls back to a draft timetable', () => {
  const versions: TimetableVersionReadModel[] = [
    { id: 'draft-1', status: 'DRAFT', effectiveFrom: '2026-09-01', effectiveTo: null },
  ]
  const slots: TimetableSlotReadModel[] = [
    {
      id: 'draft-slot', timetableVersionId: 'draft-1', weekday: 5, startTime: '08:00', endTime: '09:00', kind: 'LESSON',
      sectionId: '2A', sectionLabel: '2ª A', disciplineId: 'technology', disciplineLabel: 'Tecnologia', manualClassLabel: null, room: null,
    },
  ]
  const noLessons: ProjectedDay = {
    localDate: date,
    calendarState: 'NO_LESSONS',
    calendarLabel: 'Sospensione lezioni',
    timetableState: 'NOT_APPLICABLE',
    timetableVersionId: null,
    occurrences: [],
    events: [],
  }

  const context = resolveHomeDailyContext({
    localDate: date,
    minuteOfDay: 8 * 60 + 15,
    projectedDay: noLessons,
    timetableVersions: versions,
    timetableSlots: slots,
    sessions: [],
  })

  assert.equal(context.authority, 'NONE')
  assert.equal(context.lessonCount, 0)
  assert.equal(context.primary, null)
})
