import type {
  CalendarDayReadModel,
  TimetableSlotReadModel,
  TimetableVersionReadModel,
} from '@/core/application/ports/temporal-projection'
import { resolveTimetableVersionForDate } from '@/core/application/temporal-projection-service'
import { resolveProvisionalDraftDay } from './home-daily-context'

export type TeacherMomentMode = 'PREPARE_NEXT'
export type TeacherMomentAuthority = 'CALENDAR_CONFIRMED' | 'SCHEDULE_ONLY' | 'PROVISIONAL_DRAFT'

export type TeacherMomentLesson = {
  timetableSlotId: string
  localDate: string
  startTime: string
  endTime: string
  sectionId: string | null
  sectionLabel: string | null
  disciplineId: string | null
  disciplineLabel: string | null
  room: string | null
}

export type TeacherMoment = {
  mode: TeacherMomentMode
  localDate: string
  daysAhead: number
  authority: TeacherMomentAuthority
  calendarLabel: string | null
  lessons: TeacherMomentLesson[]
}

export function resolveNextTeacherMoment(input: {
  fromDate: string
  timetableVersions: TimetableVersionReadModel[]
  timetableSlots: TimetableSlotReadModel[]
  calendarDays: CalendarDayReadModel[]
  horizonDays?: number
}): TeacherMoment | null {
  const horizonDays = Math.max(1, input.horizonDays ?? 7)

  for (let daysAhead = 1; daysAhead <= horizonDays; daysAhead += 1) {
    const localDate = addLocalDays(input.fromDate, daysAhead)
    const calendarDay = input.calendarDays.find((day) => day.localDate === localDate) ?? null

    // An explicit institutional closure always wins over the weekly timetable.
    if (calendarDay && calendarDay.kind !== 'SCHOOL_DAY') continue

    const activeVersion = resolveTimetableVersionForDate(input.timetableVersions, localDate)
    if (activeVersion) {
      const lessons = teachingSlotsForDate(localDate, activeVersion.id, input.timetableSlots)
      if (lessons.length > 0) {
        return {
          mode: 'PREPARE_NEXT',
          localDate,
          daysAhead,
          authority: calendarDay?.kind === 'SCHOOL_DAY' ? 'CALENDAR_CONFIRMED' : 'SCHEDULE_ONLY',
          calendarLabel: calendarDay?.label ?? null,
          lessons,
        }
      }
    }

    const draft = resolveProvisionalDraftDay(localDate, input.timetableVersions, input.timetableSlots)
    if (draft.ambiguous || !draft.version) continue
    const draftLessons = draft.slots
      .filter(isTeachingSlot)
      .map((slot) => toMomentLesson(localDate, slot))
    if (draftLessons.length > 0) {
      return {
        mode: 'PREPARE_NEXT',
        localDate,
        daysAhead,
        authority: 'PROVISIONAL_DRAFT',
        calendarLabel: calendarDay?.label ?? null,
        lessons: draftLessons,
      }
    }
  }

  return null
}

function teachingSlotsForDate(localDate: string, versionId: string, slots: TimetableSlotReadModel[]) {
  const weekday = isoWeekday(localDate)
  return slots
    .filter((slot) => slot.timetableVersionId === versionId)
    .filter((slot) => slot.weekday === weekday)
    .filter(isTeachingSlot)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id))
    .map((slot) => toMomentLesson(localDate, slot))
}

function isTeachingSlot(slot: TimetableSlotReadModel) {
  return slot.kind === 'LESSON' || slot.kind === 'CLASS_PRESENCE'
}

function toMomentLesson(localDate: string, slot: TimetableSlotReadModel): TeacherMomentLesson {
  return {
    timetableSlotId: slot.id,
    localDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    sectionId: slot.sectionId,
    sectionLabel: slot.sectionLabel ?? slot.manualClassLabel,
    disciplineId: slot.disciplineId,
    disciplineLabel: slot.disciplineLabel,
    room: slot.room,
  }
}

function addLocalDays(localDate: string, days: number) {
  const [year, month, day] = localDate.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  return value.toISOString().slice(0, 10)
}

function isoWeekday(localDate: string) {
  const day = new Date(`${localDate}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}
