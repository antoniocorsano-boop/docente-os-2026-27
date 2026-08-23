export type CalendarDayKind = 'SCHOOL_DAY' | 'SUSPENSION' | 'HOLIDAY' | 'CLOSURE'
export type CalendarEventKind = 'INSTITUTION' | 'MEETING' | 'DEADLINE' | 'TRAINING' | 'OTHER'
export type CalendarSourceKind = 'MANUAL' | 'INSTITUTION_DOCUMENT' | 'IMPORT'

export type CalendarDay = {
  id: string
  workspaceId: string
  academicYearId: string
  localDate: string
  dayKind: CalendarDayKind
  label: string
  note: string | null
  sourceKind: CalendarSourceKind
  sourceRef: string | null
  createdAt: string
  updatedAt: string
}

export type CalendarEvent = {
  id: string
  workspaceId: string
  academicYearId: string
  title: string
  eventKind: CalendarEventKind
  startsOn: string
  endsOn: string
  allDay: boolean
  startTime: string | null
  endTime: string | null
  note: string | null
  sourceKind: CalendarSourceKind
  sourceRef: string | null
  createdAt: string
  updatedAt: string
}

export type CalendarSnapshot = {
  days: CalendarDay[]
  events: CalendarEvent[]
}

export function asCalendarDayKind(value: string): CalendarDayKind {
  if (value === 'SCHOOL_DAY' || value === 'SUSPENSION' || value === 'HOLIDAY' || value === 'CLOSURE') return value
  throw new Error(`Unsupported calendar day kind: ${value}`)
}

export function asCalendarEventKind(value: string): CalendarEventKind {
  if (value === 'INSTITUTION' || value === 'MEETING' || value === 'DEADLINE' || value === 'TRAINING' || value === 'OTHER') return value
  throw new Error(`Unsupported calendar event kind: ${value}`)
}

export function asCalendarSourceKind(value: string): CalendarSourceKind {
  if (value === 'MANUAL' || value === 'INSTITUTION_DOCUMENT' || value === 'IMPORT') return value
  throw new Error(`Unsupported calendar source kind: ${value}`)
}

export function calendarDayKindLabel(kind: CalendarDayKind) {
  if (kind === 'SCHOOL_DAY') return 'Giorno di lezione'
  if (kind === 'SUSPENSION') return 'Lezioni sospese'
  if (kind === 'HOLIDAY') return 'Festività'
  return 'Chiusura'
}

export function calendarEventKindLabel(kind: CalendarEventKind) {
  if (kind === 'INSTITUTION') return 'Istituto'
  if (kind === 'MEETING') return 'Riunione'
  if (kind === 'DEADLINE') return 'Scadenza'
  if (kind === 'TRAINING') return 'Formazione'
  return 'Altro'
}

export function isCalendarDateWithinAcademicYear(date: string, startsOn: string, endsOn: string) {
  return date >= startsOn && date <= endsOn
}

export function eventCoversDate(event: Pick<CalendarEvent, 'startsOn' | 'endsOn'>, date: string) {
  return event.startsOn <= date && event.endsOn >= date
}
