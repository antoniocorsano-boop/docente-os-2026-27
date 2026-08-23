import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calendarDayKindLabel,
  eventCoversDate,
  isCalendarDateWithinAcademicYear,
} from './calendar'

test('a calendar date is valid only inside the academic year', () => {
  assert.equal(isCalendarDateWithinAcademicYear('2026-09-01', '2026-09-01', '2027-08-31'), true)
  assert.equal(isCalendarDateWithinAcademicYear('2027-08-31', '2026-09-01', '2027-08-31'), true)
  assert.equal(isCalendarDateWithinAcademicYear('2026-08-31', '2026-09-01', '2027-08-31'), false)
})

test('an all-day event covers every local date in its explicit interval', () => {
  const event = { startsOn: '2026-12-20', endsOn: '2027-01-06' }
  assert.equal(eventCoversDate(event, '2026-12-19'), false)
  assert.equal(eventCoversDate(event, '2026-12-20'), true)
  assert.equal(eventCoversDate(event, '2027-01-06'), true)
  assert.equal(eventCoversDate(event, '2027-01-07'), false)
})

test('calendar labels remain human and do not expose internal enum values', () => {
  assert.equal(calendarDayKindLabel('SUSPENSION'), 'Lezioni sospese')
  assert.equal(calendarDayKindLabel('SCHOOL_DAY'), 'Giorno di lezione')
})
