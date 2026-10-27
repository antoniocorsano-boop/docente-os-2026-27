export type TimetableMoment = {
  weekday: number
  minutes: number
}

export function nextTimetableOccurrenceDate(localDate: string, targetWeekday: number) {
  const date = new Date(`${localDate}T12:00:00Z`)
  const currentDay = date.getUTCDay()
  const currentWeekday = currentDay === 0 ? 7 : currentDay
  const offsetDays = (targetWeekday - currentWeekday + 7) % 7
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
