import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertCalendarDayWithinAcademicYear,
  assertCalendarEventWithinAcademicYear,
  calendarEventIsAllDay,
} from './calendar-command-guard'

const academicYear = {
  startsOn: '2026-09-01',
  endsOn: '2027-08-31',
}

test('riconosce solo i due timing supportati', () => {
  assert.equal(calendarEventIsAllDay('ALL_DAY'), true)
  assert.equal(calendarEventIsAllDay('TIMED'), false)
  assert.throws(() => calendarEventIsAllDay('UNKNOWN'), /Unsupported calendar event timing/)
})

test('accetta un giorno interno ai limiti dell anno scolastico', () => {
  assert.doesNotThrow(() => assertCalendarDayWithinAcademicYear('2026-09-03', academicYear))
  assert.doesNotThrow(() => assertCalendarDayWithinAcademicYear(academicYear.startsOn, academicYear))
  assert.doesNotThrow(() => assertCalendarDayWithinAcademicYear(academicYear.endsOn, academicYear))
})

test('rifiuta giorni esterni o date locali non valide', () => {
  assert.throws(
    () => assertCalendarDayWithinAcademicYear('2026-08-31', academicYear),
    /active academic year/,
  )
  assert.throws(
    () => assertCalendarDayWithinAcademicYear('2027-09-01', academicYear),
    /active academic year/,
  )
  assert.throws(
    () => assertCalendarDayWithinAcademicYear('2026-02-30', academicYear),
    /valid local date/,
  )
})

test('accetta un evento intera giornata anche su più giorni entro l anno scolastico', () => {
  assert.doesNotThrow(() =>
    assertCalendarEventWithinAcademicYear(
      {
        startsOn: '2026-09-03',
        endsOn: '2026-09-05',
        allDay: true,
        startTime: null,
        endTime: null,
      },
      academicYear,
    ),
  )
})

test('rifiuta eventi con ordine date errato o fuori anno scolastico', () => {
  assert.throws(
    () =>
      assertCalendarEventWithinAcademicYear(
        {
          startsOn: '2026-09-05',
          endsOn: '2026-09-03',
          allDay: true,
          startTime: null,
          endTime: null,
        },
        academicYear,
      ),
    /end date must not precede/,
  )

  assert.throws(
    () =>
      assertCalendarEventWithinAcademicYear(
        {
          startsOn: '2026-08-31',
          endsOn: '2026-09-03',
          allDay: true,
          startTime: null,
          endTime: null,
        },
        academicYear,
      ),
    /active academic year/,
  )
})

test('accetta solo eventi orari nello stesso giorno con orari validi e crescenti', () => {
  assert.doesNotThrow(() =>
    assertCalendarEventWithinAcademicYear(
      {
        startsOn: '2026-09-03',
        endsOn: '2026-09-03',
        allDay: false,
        startTime: '09:00',
        endTime: '12:00',
      },
      academicYear,
    ),
  )

  assert.throws(
    () =>
      assertCalendarEventWithinAcademicYear(
        {
          startsOn: '2026-09-03',
          endsOn: '2026-09-04',
          allDay: false,
          startTime: '09:00',
          endTime: '12:00',
        },
        academicYear,
      ),
    /same date/,
  )

  assert.throws(
    () =>
      assertCalendarEventWithinAcademicYear(
        {
          startsOn: '2026-09-03',
          endsOn: '2026-09-03',
          allDay: false,
          startTime: '12:00',
          endTime: '09:00',
        },
        academicYear,
      ),
    /end time must be later/,
  )

  assert.throws(
    () =>
      assertCalendarEventWithinAcademicYear(
        {
          startsOn: '2026-09-03',
          endsOn: '2026-09-03',
          allDay: false,
          startTime: '25:00',
          endTime: '26:00',
        },
        academicYear,
      ),
    /valid local time/,
  )
})
