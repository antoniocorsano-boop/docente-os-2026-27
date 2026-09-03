export type AcademicYearDateBounds = {
  startsOn: string
  endsOn: string
}

type CalendarEventTimingInput = {
  startsOn: string
  endsOn: string
  allDay: boolean
  startTime: string | null
  endTime: string | null
}

export function calendarEventIsAllDay(value: string) {
  if (value === 'ALL_DAY') return true
  if (value === 'TIMED') return false
  throw new Error('Unsupported calendar event timing')
}

export function assertCalendarDayWithinAcademicYear(localDate: string, bounds: AcademicYearDateBounds) {
  assertDateWithinAcademicYear(localDate, bounds, 'localDate')
}

export function assertCalendarEventWithinAcademicYear(
  input: CalendarEventTimingInput,
  bounds: AcademicYearDateBounds,
) {
  assertDateWithinAcademicYear(input.startsOn, bounds, 'startsOn')
  assertDateWithinAcademicYear(input.endsOn, bounds, 'endsOn')

  if (input.endsOn < input.startsOn) {
    throw new Error('Calendar event end date must not precede start date')
  }

  if (input.allDay) return

  if (input.startsOn !== input.endsOn) {
    throw new Error('Timed calendar events must start and end on the same date')
  }

  if (!input.startTime || !input.endTime) {
    throw new Error('Start and end time are required for a timed event')
  }

  assertLocalTime(input.startTime, 'startTime')
  assertLocalTime(input.endTime, 'endTime')

  if (input.endTime <= input.startTime) {
    throw new Error('Calendar event end time must be later than start time')
  }
}

function assertDateWithinAcademicYear(date: string, bounds: AcademicYearDateBounds, field: string) {
  assertLocalDate(date, field)
  assertLocalDate(bounds.startsOn, 'academicYear.startsOn')
  assertLocalDate(bounds.endsOn, 'academicYear.endsOn')

  if (date < bounds.startsOn || date > bounds.endsOn) {
    throw new Error(`${field} must be within the active academic year`)
  }
}

function assertLocalDate(value: string, field: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`${field} must be a valid local date`)

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  const roundTrip = parsed.toISOString().slice(0, 10)

  if (roundTrip !== value) throw new Error(`${field} must be a valid local date`)
}

function assertLocalTime(value: string, field: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error(`${field} must be a valid local time`)
  }
}
