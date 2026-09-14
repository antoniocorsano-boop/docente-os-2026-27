import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CalendarDayReadModel,
  TimetableSlotReadModel,
  TimetableVersionReadModel,
} from '@/core/application/ports/temporal-projection'
import { resolveNextTeacherMoment } from './teacher-moment'

const active: TimetableVersionReadModel = {
  id: 'active-1',
  status: 'ACTIVE',
  effectiveFrom: '2026-09-01',
  effectiveTo: null,
}

function lesson(input: {
  id: string
  weekday: number
  start: string
  end: string
  section: string
  versionId?: string
}): TimetableSlotReadModel {
  return {
    id: input.id,
    timetableVersionId: input.versionId ?? active.id,
    weekday: input.weekday,
    startTime: input.start,
    endTime: input.end,
    kind: 'LESSON',
    sectionId: input.section,
    sectionLabel: input.section,
    disciplineId: 'technology',
    disciplineLabel: 'Tecnologia',
    manualClassLabel: null,
    room: null,
  }
}

function day(localDate: string, kind: CalendarDayReadModel['kind'], label: string): CalendarDayReadModel {
  return { id: `cal-${localDate}`, localDate, kind, label }
}

test('tomorrow with a confirmed school day becomes the next Teacher Moment', () => {
  const result = resolveNextTeacherMoment({
    fromDate: '2026-09-14', // Monday
    timetableVersions: [active],
    timetableSlots: [lesson({ id: 'tue-1', weekday: 2, start: '08:00', end: '09:00', section: '2C' })],
    calendarDays: [day('2026-09-15', 'SCHOOL_DAY', 'Lezioni')],
  })

  assert.equal(result?.localDate, '2026-09-15')
  assert.equal(result?.daysAhead, 1)
  assert.equal(result?.authority, 'CALENDAR_CONFIRMED')
  assert.equal(result?.lessons[0].sectionId, '2C')
})

test('an undefined calendar still allows planning from the active timetable without claiming a real lesson', () => {
  const result = resolveNextTeacherMoment({
    fromDate: '2026-09-14',
    timetableVersions: [active],
    timetableSlots: [lesson({ id: 'tue-1', weekday: 2, start: '09:00', end: '10:00', section: '3A' })],
    calendarDays: [],
  })

  assert.equal(result?.localDate, '2026-09-15')
  assert.equal(result?.authority, 'SCHEDULE_ONLY')
  assert.equal(result?.lessons[0].sectionId, '3A')
})

test('an explicit suspension skips that day and resolves the following teaching day', () => {
  const result = resolveNextTeacherMoment({
    fromDate: '2026-09-14',
    timetableVersions: [active],
    timetableSlots: [
      lesson({ id: 'tue-1', weekday: 2, start: '08:00', end: '09:00', section: '2C' }),
      lesson({ id: 'wed-1', weekday: 3, start: '10:00', end: '11:00', section: '1A' }),
    ],
    calendarDays: [
      day('2026-09-15', 'SUSPENSION', 'Lezioni sospese'),
      day('2026-09-16', 'SCHOOL_DAY', 'Lezioni'),
    ],
  })

  assert.equal(result?.localDate, '2026-09-16')
  assert.equal(result?.daysAhead, 2)
  assert.equal(result?.lessons[0].sectionId, '1A')
})

test('weekend days are naturally skipped when no teaching slots exist', () => {
  const result = resolveNextTeacherMoment({
    fromDate: '2026-09-18', // Friday
    timetableVersions: [active],
    timetableSlots: [lesson({ id: 'mon-1', weekday: 1, start: '08:00', end: '09:00', section: '1C' })],
    calendarDays: [],
  })

  assert.equal(result?.localDate, '2026-09-21')
  assert.equal(result?.daysAhead, 3)
  assert.equal(result?.authority, 'SCHEDULE_ONLY')
})

test('a unique draft timetable can provide provisional planning context', () => {
  const draft: TimetableVersionReadModel = {
    id: 'draft-1',
    status: 'DRAFT',
    effectiveFrom: '2026-09-01',
    effectiveTo: null,
  }
  const result = resolveNextTeacherMoment({
    fromDate: '2026-09-14',
    timetableVersions: [draft],
    timetableSlots: [lesson({ id: 'draft-tue', weekday: 2, start: '11:00', end: '12:00', section: '2A', versionId: draft.id })],
    calendarDays: [],
  })

  assert.equal(result?.authority, 'PROVISIONAL_DRAFT')
  assert.equal(result?.lessons[0].sectionId, '2A')
})

test('returns null when no teaching context is available inside the horizon', () => {
  const result = resolveNextTeacherMoment({
    fromDate: '2026-09-14',
    timetableVersions: [active],
    timetableSlots: [],
    calendarDays: [],
    horizonDays: 7,
  })

  assert.equal(result, null)
})
