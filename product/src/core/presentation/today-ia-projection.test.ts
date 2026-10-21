import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { HomeDailyContext, HomeDailyLesson } from './home-daily-context'
import { buildTodayIAProjection } from './today-ia-projection'

function lesson(input: Partial<HomeDailyLesson> & Pick<HomeDailyLesson, 'logicalId' | 'startAt' | 'endAt'>): HomeDailyLesson {
  return {
    logicalId: input.logicalId,
    localDate: input.localDate ?? '2026-10-21',
    startAt: input.startAt,
    endAt: input.endAt,
    title: input.title ?? input.logicalId,
    sectionId: input.sectionId ?? 'section-3c',
    disciplineId: input.disciplineId ?? 'technology',
    timetableVersionId: input.timetableVersionId ?? 'tt-v1',
    timetableSlotId: input.timetableSlotId ?? `slot-${input.logicalId}`,
    authority: input.authority ?? 'IN_FORCE',
    recorded: input.recorded ?? false,
  }
}

function day(lessons: HomeDailyLesson[], authority: HomeDailyContext['authority'] = 'IN_FORCE'): HomeDailyContext {
  return {
    localDate: '2026-10-21',
    authority,
    lessons,
    lessonCount: lessons.length,
    pendingRegistrationCount: lessons.filter((item) => !item.recorded && item.endAt.slice(11, 16) <= '10:00').length,
    primary: authority === 'AMBIGUOUS' ? { kind: 'AMBIGUOUS', lesson: null, minutesUntilStart: null } : null,
  }
}

function calendarEvent(id: string, title: string, startAt: string | null): ProjectedOccurrence {
  return {
    logicalId: `cal:${id}:2026-10-21`,
    localDate: '2026-10-21',
    startAt,
    endAt: startAt ? startAt.replace('10:30', '11:00') : null,
    kind: 'CALENDAR_EVENT',
    title,
    sectionId: null,
    disciplineId: null,
    timetableVersionId: null,
    timetableSlotId: null,
    calendarEventId: id,
    calendarState: 'SCHOOL_DAY',
    exceptionState: 'NONE',
    provenance: [`calendar_event:${id}`],
  }
}

test('Oggi keeps latest pending registration and first upcoming lesson together', () => {
  const earlyPending = lesson({ logicalId: 'early', startAt: '2026-10-21T08:00:00', endAt: '2026-10-21T09:00:00' })
  const latestPending = lesson({ logicalId: 'latest', startAt: '2026-10-21T09:00:00', endAt: '2026-10-21T10:00:00' })
  const upcoming = lesson({ logicalId: 'next', startAt: '2026-10-21T11:00:00', endAt: '2026-10-21T12:00:00' })

  const projection = buildTodayIAProjection({
    homeDaily: day([earlyPending, latestPending, upcoming]),
    minuteOfDay: 10 * 60 + 15,
    calendarEvents: [calendarEvent('meeting', 'Collegio', '2026-10-21T10:30:00')],
    lessonBundles: [
      { lessonLogicalId: 'latest', blockId: 'B03' },
      { lessonLogicalId: 'next', blockId: 'B04' },
    ],
  })

  assert.equal(projection.pendingLesson?.lesson.logicalId, 'latest')
  assert.equal(projection.nextLesson?.lesson.logicalId, 'next')
  assert.equal(projection.fallback, null)
  assert.equal('planner' in projection, false)
  assert.equal(projection.calendarCommitments.length, 1)
  assert.deepEqual(Object.keys(projection.calendarCommitments[0]).sort(), ['endAt', 'href', 'id', 'startAt', 'title'])
})

test('resolved lesson links go directly to Lezione with date and occurrence context', () => {
  const upcoming = lesson({ logicalId: 'next/one', sectionId: '3 C', startAt: '2026-10-21T11:00:00', endAt: '2026-10-21T12:00:00' })
  const projection = buildTodayIAProjection({
    homeDaily: day([upcoming]),
    minuteOfDay: 10 * 60,
    calendarEvents: [],
    lessonBundles: [{ lessonLogicalId: 'next/one', blockId: 'B 04' }],
  })

  assert.equal(
    projection.nextLesson?.href,
    '/classi/3%20C/lezioni/B%2004?date=2026-10-21&occurrence=next%2Fone',
  )
  assert.equal(projection.nextLesson?.routeKind, 'LESSON')
})

test('current lesson wins over later upcoming lesson', () => {
  const current = lesson({ logicalId: 'current', startAt: '2026-10-21T10:00:00', endAt: '2026-10-21T11:00:00' })
  const later = lesson({ logicalId: 'later', startAt: '2026-10-21T12:00:00', endAt: '2026-10-21T13:00:00' })
  const projection = buildTodayIAProjection({
    homeDaily: day([later, current]),
    minuteOfDay: 10 * 60 + 15,
    calendarEvents: [],
    lessonBundles: [{ lessonLogicalId: 'current', blockId: 'B02' }],
  })
  assert.equal(projection.nextLesson?.lesson.logicalId, 'current')
})

test('ambiguous lesson context fails closed to Orario', () => {
  const projection = buildTodayIAProjection({
    homeDaily: day([], 'AMBIGUOUS'),
    minuteOfDay: 10 * 60,
    calendarEvents: [calendarEvent('meeting', 'Collegio', null)],
    lessonBundles: [],
  })
  assert.equal(projection.pendingLesson, null)
  assert.equal(projection.nextLesson, null)
  assert.deepEqual(projection.fallback, { kind: 'ORARIO', href: '/orario', reason: 'AMBIGUOUS_LESSON_CONTEXT' })
  assert.equal(projection.calendarCommitments[0].href, '/calendario')
})
