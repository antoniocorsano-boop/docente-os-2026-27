import assert from 'node:assert/strict'
import test from 'node:test'
import { projectTemporalDay, resolveTimetableVersionForDate } from './temporal-projection-service'
import type {
  CalendarDayReadModel,
  CalendarEventReadModel,
  TimetableSlotReadModel,
  TimetableVersionReadModel,
} from './ports/temporal-projection'

const activeVersion: TimetableVersionReadModel = {
  id: 'tt-active',
  status: 'ACTIVE',
  effectiveFrom: '2026-09-01',
  effectiveTo: null,
}

const mondayLesson: TimetableSlotReadModel = {
  id: 'slot-1',
  timetableVersionId: 'tt-active',
  weekday: 1,
  startTime: '08:00',
  endTime: '09:00',
  kind: 'LESSON',
  sectionId: 'section-1a',
  sectionLabel: '1ª A',
  disciplineId: 'technology',
  disciplineLabel: 'Tecnologia',
  manualClassLabel: null,
  room: null,
}

function day(localDate: string, kind: CalendarDayReadModel['kind'], label: string): CalendarDayReadModel {
  return { id: `day-${localDate}`, localDate, kind, label }
}

function project(input: {
  localDate?: string
  days?: CalendarDayReadModel[]
  events?: CalendarEventReadModel[]
  versions?: TimetableVersionReadModel[]
  slots?: TimetableSlotReadModel[]
}) {
  return projectTemporalDay({
    localDate: input.localDate ?? '2026-09-07',
    timetableVersions: input.versions ?? [activeVersion],
    timetableSlots: input.slots ?? [mondayLesson],
    calendarDays: input.days ?? [],
    calendarEvents: input.events ?? [],
  })
}

test('projection fails closed when Calendar has not classified the local date', () => {
  const result = project({})
  assert.equal(result.calendarState, 'UNDETERMINED')
  assert.equal(result.timetableState, 'UNAVAILABLE')
  assert.deepEqual(result.occurrences, [])
})

test('a documented school day materializes the timetable occurrence in force', () => {
  const result = project({ days: [day('2026-09-07', 'SCHOOL_DAY', 'Giorno di lezione')] })
  assert.equal(result.calendarState, 'SCHOOL_DAY')
  assert.equal(result.timetableState, 'IN_FORCE')
  assert.equal(result.occurrences.length, 1)
  assert.equal(result.occurrences[0].title, '1ª A · Tecnologia')
  assert.equal(result.occurrences[0].timetableVersionId, 'tt-active')
  assert.deepEqual(result.occurrences[0].provenance.slice(0, 2), ['timetable_version:tt-active', 'timetable_slot:slot-1'])
})

test('a suspension suppresses recurring lessons without deleting the timetable pattern', () => {
  const result = project({ days: [day('2026-09-07', 'SUSPENSION', 'Lezioni sospese')] })
  assert.equal(result.calendarState, 'NO_LESSONS')
  assert.equal(result.timetableState, 'NOT_APPLICABLE')
  assert.deepEqual(result.occurrences, [])
})

test('calendar events remain visible even on a non-teaching day', () => {
  const event: CalendarEventReadModel = {
    id: 'event-1',
    title: 'Collegio docenti',
    kind: 'MEETING',
    startsOn: '2026-09-07',
    endsOn: '2026-09-07',
    allDay: false,
    startTime: '15:00',
    endTime: '17:00',
    note: null,
  }
  const result = project({
    days: [day('2026-09-07', 'SUSPENSION', 'Lezioni sospese')],
    events: [event],
  })
  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].title, 'Collegio docenti')
  assert.equal(result.events[0].kind, 'CALENDAR_EVENT')
})

test('historical projection resolves the version whose effective interval covers the date', () => {
  const versions: TimetableVersionReadModel[] = [
    { id: 'old', status: 'ARCHIVED', effectiveFrom: '2026-09-01', effectiveTo: '2026-10-04' },
    { id: 'new', status: 'ACTIVE', effectiveFrom: '2026-10-05', effectiveTo: null },
    { id: 'draft', status: 'DRAFT', effectiveFrom: '2026-11-01', effectiveTo: null },
  ]
  assert.equal(resolveTimetableVersionForDate(versions, '2026-09-28')?.id, 'old')
  assert.equal(resolveTimetableVersionForDate(versions, '2026-10-05')?.id, 'new')
  assert.equal(resolveTimetableVersionForDate(versions, '2026-08-31'), null)
})
