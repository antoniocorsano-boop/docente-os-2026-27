import type {
  CalendarDayReadModel,
  CalendarEventReadModel,
  CalendarProjectionReadPort,
  TimetableProjectionReadPort,
  TimetableSlotReadModel,
  TimetableVersionReadModel,
} from '@/core/application/ports/temporal-projection'
import type { TimetableSlotKind } from '@/core/domain/timetable'

export type ProjectedCalendarState = 'SCHOOL_DAY' | 'NO_LESSONS' | 'UNDETERMINED'
export type ProjectedTimetableState = 'IN_FORCE' | 'UNAVAILABLE' | 'NOT_APPLICABLE'
export type ProjectedExceptionState = 'NONE'

export type ProjectedOccurrence = {
  logicalId: string
  localDate: string
  startAt: string | null
  endAt: string | null
  kind: TimetableSlotKind | 'CALENDAR_EVENT'
  title: string
  sectionId: string | null
  disciplineId: string | null
  timetableVersionId: string | null
  timetableSlotId: string | null
  calendarEventId: string | null
  calendarState: ProjectedCalendarState
  exceptionState: ProjectedExceptionState
  provenance: string[]
}

export type ProjectedDay = {
  localDate: string
  calendarState: ProjectedCalendarState
  calendarLabel: string | null
  timetableState: ProjectedTimetableState
  timetableVersionId: string | null
  occurrences: ProjectedOccurrence[]
  events: ProjectedOccurrence[]
}

export class TemporalProjectionService {
  constructor(
    private readonly timetable: TimetableProjectionReadPort,
    private readonly calendar: CalendarProjectionReadPort,
  ) {}

  async projectDay(input: { workspaceId: string; academicYearId: string; localDate: string }): Promise<ProjectedDay> {
    const [timetable, calendar] = await Promise.all([
      this.timetable.read(input.workspaceId, input.academicYearId),
      this.calendar.read(input.workspaceId, input.academicYearId),
    ])
    return projectTemporalDay({
      localDate: input.localDate,
      timetableVersions: timetable.versions,
      timetableSlots: timetable.slots,
      calendarDays: calendar.days,
      calendarEvents: calendar.events,
    })
  }
}

export function projectTemporalDay(input: {
  localDate: string
  timetableVersions: TimetableVersionReadModel[]
  timetableSlots: TimetableSlotReadModel[]
  calendarDays: CalendarDayReadModel[]
  calendarEvents: CalendarEventReadModel[]
}): ProjectedDay {
  const calendarDay = input.calendarDays.find((day) => day.localDate === input.localDate) ?? null
  const calendarState = resolveCalendarState(calendarDay)
  const calendarLabel = calendarDay?.label ?? null
  const events = input.calendarEvents
    .filter((event) => event.startsOn <= input.localDate && event.endsOn >= input.localDate)
    .map((event) => projectCalendarEvent(event, input.localDate, calendarState))
    .sort(compareOccurrence)

  if (calendarState === 'UNDETERMINED') {
    return {
      localDate: input.localDate,
      calendarState,
      calendarLabel,
      timetableState: 'UNAVAILABLE',
      timetableVersionId: null,
      occurrences: [],
      events,
    }
  }

  if (calendarState === 'NO_LESSONS') {
    return {
      localDate: input.localDate,
      calendarState,
      calendarLabel,
      timetableState: 'NOT_APPLICABLE',
      timetableVersionId: null,
      occurrences: [],
      events,
    }
  }

  const version = resolveTimetableVersionForDate(input.timetableVersions, input.localDate)
  if (!version) {
    return {
      localDate: input.localDate,
      calendarState,
      calendarLabel,
      timetableState: 'UNAVAILABLE',
      timetableVersionId: null,
      occurrences: [],
      events,
    }
  }

  const weekday = isoWeekday(input.localDate)
  const occurrences = input.timetableSlots
    .filter((slot) => slot.timetableVersionId === version.id && slot.weekday === weekday)
    .map((slot) => projectTimetableSlot(slot, version, input.localDate, calendarState))
    .sort(compareOccurrence)

  return {
    localDate: input.localDate,
    calendarState,
    calendarLabel,
    timetableState: 'IN_FORCE',
    timetableVersionId: version.id,
    occurrences,
    events,
  }
}

export function resolveTimetableVersionForDate(versions: TimetableVersionReadModel[], localDate: string) {
  return versions
    .filter((version) => version.status !== 'DRAFT')
    .filter((version) => version.effectiveFrom <= localDate)
    .filter((version) => !version.effectiveTo || version.effectiveTo >= localDate)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.id.localeCompare(b.id))[0] ?? null
}

function resolveCalendarState(day: CalendarDayReadModel | null): ProjectedCalendarState {
  if (!day) return 'UNDETERMINED'
  return day.kind === 'SCHOOL_DAY' ? 'SCHOOL_DAY' : 'NO_LESSONS'
}

function projectTimetableSlot(
  slot: TimetableSlotReadModel,
  version: TimetableVersionReadModel,
  localDate: string,
  calendarState: ProjectedCalendarState,
): ProjectedOccurrence {
  return {
    logicalId: `tt:${version.id}:${slot.id}:${localDate}`,
    localDate,
    startAt: `${localDate}T${slot.startTime}:00`,
    endAt: `${localDate}T${slot.endTime}:00`,
    kind: slot.kind,
    title: occurrenceTitle(slot),
    sectionId: slot.sectionId,
    disciplineId: slot.disciplineId,
    timetableVersionId: version.id,
    timetableSlotId: slot.id,
    calendarEventId: null,
    calendarState,
    exceptionState: 'NONE',
    provenance: [`timetable_version:${version.id}`, `timetable_slot:${slot.id}`, `calendar_day:${localDate}`],
  }
}

function projectCalendarEvent(event: CalendarEventReadModel, localDate: string, calendarState: ProjectedCalendarState): ProjectedOccurrence {
  const isStart = event.startsOn === localDate
  const isEnd = event.endsOn === localDate
  const startAt = event.allDay ? null : `${localDate}T${event.startTime ?? '00:00'}:00`
  const endAt = event.allDay ? null : `${localDate}T${event.endTime ?? '23:59'}:00`
  return {
    logicalId: `cal:${event.id}:${localDate}`,
    localDate,
    startAt,
    endAt,
    kind: 'CALENDAR_EVENT',
    title: event.title,
    sectionId: null,
    disciplineId: null,
    timetableVersionId: null,
    timetableSlotId: null,
    calendarEventId: event.id,
    calendarState,
    exceptionState: 'NONE',
    provenance: [`calendar_event:${event.id}`, `calendar_interval:${event.startsOn}:${event.endsOn}`, `calendar_position:${isStart ? 'start' : isEnd ? 'end' : 'middle'}`],
  }
}

function occurrenceTitle(slot: TimetableSlotReadModel) {
  if (slot.kind === 'LESSON') return [slot.sectionLabel, slot.disciplineLabel].filter(Boolean).join(' · ') || 'Lezione'
  if (slot.kind === 'CLASS_PRESENCE') return slot.manualClassLabel || 'Presenza in classe'
  if (slot.kind === 'DISPOSITION') return 'Disposizione'
  if (slot.kind === 'RECEPTION') return 'Ricevimento'
  return slot.manualClassLabel || 'Impegno in orario'
}

function isoWeekday(localDate: string) {
  const day = new Date(`${localDate}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

function compareOccurrence(a: ProjectedOccurrence, b: ProjectedOccurrence) {
  const aTime = a.startAt ?? `${a.localDate}T00:00:00`
  const bTime = b.startAt ?? `${b.localDate}T00:00:00`
  return aTime.localeCompare(bTime) || a.logicalId.localeCompare(b.logicalId)
}
