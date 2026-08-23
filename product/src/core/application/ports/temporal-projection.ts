import type { CalendarDayKind, CalendarEventKind } from '@/core/domain/calendar'
import type { TimetableSlotKind, TimetableVersionStatus } from '@/core/domain/timetable'

export type TimetableVersionReadModel = {
  id: string
  status: TimetableVersionStatus
  effectiveFrom: string
  effectiveTo: string | null
}

export type TimetableSlotReadModel = {
  id: string
  timetableVersionId: string
  weekday: number
  startTime: string
  endTime: string
  kind: TimetableSlotKind
  sectionId: string | null
  sectionLabel: string | null
  disciplineId: string | null
  disciplineLabel: string | null
  manualClassLabel: string | null
  room: string | null
}

export type CalendarDayReadModel = {
  id: string
  localDate: string
  kind: CalendarDayKind
  label: string
}

export type CalendarEventReadModel = {
  id: string
  title: string
  kind: CalendarEventKind
  startsOn: string
  endsOn: string
  allDay: boolean
  startTime: string | null
  endTime: string | null
  note: string | null
}

export interface TimetableProjectionReadPort {
  read(workspaceId: string, academicYearId: string): Promise<{
    versions: TimetableVersionReadModel[]
    slots: TimetableSlotReadModel[]
  }>
}

export interface CalendarProjectionReadPort {
  read(workspaceId: string, academicYearId: string): Promise<{
    days: CalendarDayReadModel[]
    events: CalendarEventReadModel[]
  }>
}
