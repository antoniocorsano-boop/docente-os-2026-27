import { projectTemporalDay, resolveTimetableVersionForDate } from '@/core/application/temporal-projection-service'

export type TimetableMoment = {
  weekday: number
  minutes: number
}

type TimetableOccurrenceContext = Omit<Parameters<typeof projectTemporalDay>[0], 'localDate'> & {
  timetableVersionId: string
  timetableSlotId: string
}

export function nextTimetableOccurrenceDate(localDate: string, targetWeekday: number): string
export function nextTimetableOccurrenceDate(
  localDate: string,
  targetWeekday: number,
  context: TimetableOccurrenceContext,
): string | null
export function nextTimetableOccurrenceDate(
  localDate: string,
  targetWeekday: number,
  context?: TimetableOccurrenceContext,
) {
  let candidate = matchingWeekdayDate(localDate, targetWeekday)
  if (!context) return candidate

  const {
    timetableVersionId,
    timetableSlotId,
    ...projection
  } = context
  const exactSlot = projection.timetableSlots.find((slot) =>
    slot.id === timetableSlotId
    && slot.timetableVersionId === timetableVersionId
    && slot.weekday === targetWeekday,
  )
  if (!exactSlot) return null

  while (true) {
    const version = resolveTimetableVersionForDate(projection.timetableVersions, candidate)
    if (!version || version.id !== timetableVersionId) return null

    const projected = projectTemporalDay({
      localDate: candidate,
      ...projection,
    })
    const occurrences = projected.occurrences.filter((occurrence) =>
      occurrence.kind === 'LESSON'
      && occurrence.timetableVersionId === timetableVersionId
      && occurrence.timetableSlotId === timetableSlotId,
    )
    if (occurrences.length === 1) return candidate
    if (occurrences.length > 1 || projected.calendarState !== 'NO_LESSONS') return null

    candidate = shiftLocalDate(candidate, 7)
  }
}

function matchingWeekdayDate(localDate: string, targetWeekday: number) {
  const date = new Date(`${localDate}T12:00:00Z`)
  const currentDay = date.getUTCDay()
  const currentWeekday = currentDay === 0 ? 7 : currentDay
  const offsetDays = (targetWeekday - currentWeekday + 7) % 7
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function shiftLocalDate(localDate: string, offsetDays: number) {
  const date = new Date(`${localDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

export function timetableMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

export function isCurrentTimetableInterval(
  weekday: number,
  startTime: string,
  endTime: string,
  moment: TimetableMoment | null,
) {
  if (!moment || moment.weekday !== weekday) return false
  const start = timetableMinutes(startTime)
  const end = timetableMinutes(endTime)
  return moment.minutes >= start && moment.minutes < end
}

export function isCurrentTimetableRow(startTime: string, endTime: string, moment: TimetableMoment | null) {
  if (!moment) return false
  const start = timetableMinutes(startTime)
  const end = timetableMinutes(endTime)
  return moment.minutes >= start && moment.minutes < end
}
