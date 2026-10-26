export type LessonWorkspaceResolvedState =
  | 'PREPARATION'
  | 'TEACHING'
  | 'REGISTRATION'
  | 'CONTINUITY'
  | 'AMBIGUOUS'

export type LessonWorkspaceIntent = 'start' | 'close' | null

export type LessonWorkspaceOccurrence = {
  localDate: string
  startAt: string | null
  endAt: string | null
}

export function resolveLessonWorkspaceState(input: {
  localDate: string
  minuteOfDay: number
  occurrence: LessonWorkspaceOccurrence | null
  occurrenceAmbiguous: boolean
  registered: boolean
  intent: LessonWorkspaceIntent
}): LessonWorkspaceResolvedState {
  if (input.registered) return 'CONTINUITY'
  if (input.occurrenceAmbiguous) return 'AMBIGUOUS'

  const occurrence = input.occurrence
  if (occurrence && (!occurrence.startAt || !occurrence.endAt)) return 'AMBIGUOUS'

  if (input.intent === 'close') return 'REGISTRATION'
  if (input.intent === 'start') return 'TEACHING'
  if (!occurrence) return 'PREPARATION'

  if (occurrence.localDate > input.localDate) return 'PREPARATION'
  if (occurrence.localDate < input.localDate) return 'REGISTRATION'

  const start = minuteOf(occurrence.startAt!)
  const end = minuteOf(occurrence.endAt!)
  if (start === null || end === null || end <= start) return 'AMBIGUOUS'

  if (input.minuteOfDay < start) return 'PREPARATION'
  if (input.minuteOfDay < end) return 'TEACHING'
  return 'REGISTRATION'
}

function minuteOf(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}
