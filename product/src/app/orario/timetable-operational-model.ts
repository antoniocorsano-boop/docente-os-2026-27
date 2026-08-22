export type TimetableMoment = {
  weekday: number
  minutes: number
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
