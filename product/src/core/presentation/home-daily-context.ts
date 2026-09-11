import type { ProjectedDay, ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { TimetableSlotReadModel, TimetableVersionReadModel } from '@/core/application/ports/temporal-projection'
import type { TeachingSessionRecord } from '@/core/domain/teaching-session'

export const HOME_IMMINENT_LESSON_MINUTES = 15

export type HomeDailyAuthority = 'IN_FORCE' | 'PROVISIONAL_DRAFT' | 'NONE' | 'AMBIGUOUS'
export type HomeDailyPrimaryKind = 'CURRENT_LESSON' | 'PENDING_REGISTRATION' | 'UPCOMING_LESSON' | 'AMBIGUOUS'

export type HomeDailyLesson = {
  logicalId: string
  localDate: string
  startAt: string
  endAt: string
  title: string
  sectionId: string | null
  disciplineId: string | null
  timetableVersionId: string | null
  timetableSlotId: string | null
  authority: Exclude<HomeDailyAuthority, 'NONE' | 'AMBIGUOUS'>
  recorded: boolean
}

export type HomeDailyPrimary = {
  kind: HomeDailyPrimaryKind
  lesson: HomeDailyLesson | null
  minutesUntilStart: number | null
}

export type HomeDailyContext = {
  localDate: string
  authority: HomeDailyAuthority
  lessons: HomeDailyLesson[]
  lessonCount: number
  pendingRegistrationCount: number
  primary: HomeDailyPrimary | null
}

export function resolveHomeDailyContext(input: {
  localDate: string
  minuteOfDay: number
  projectedDay: ProjectedDay
  timetableVersions: TimetableVersionReadModel[]
  timetableSlots: TimetableSlotReadModel[]
  sessions: TeachingSessionRecord[]
  imminenceMinutes?: number
}): HomeDailyContext {
  const source = resolveLessonSource(input)
  if (source.authority === 'AMBIGUOUS') {
    return {
      localDate: input.localDate,
      authority: 'AMBIGUOUS',
      lessons: [],
      lessonCount: 0,
      pendingRegistrationCount: 0,
      primary: { kind: 'AMBIGUOUS', lesson: null, minutesUntilStart: null },
    }
  }

  const currentSessions = currentSessionsForDay(input.sessions, input.localDate)
  const lessons = source.lessons.map((lesson) => ({
    ...lesson,
    recorded: isLessonRecorded(lesson, currentSessions),
  }))
  const pending = lessons
    .filter((lesson) => endMinute(lesson) <= input.minuteOfDay && !lesson.recorded)
    .sort((a, b) => endMinute(b) - endMinute(a) || a.logicalId.localeCompare(b.logicalId))

  if (source.authority === 'NONE') {
    return {
      localDate: input.localDate,
      authority: 'NONE',
      lessons,
      lessonCount: lessons.length,
      pendingRegistrationCount: pending.length,
      primary: null,
    }
  }

  const current = lessons.filter((lesson) => startMinute(lesson) <= input.minuteOfDay && endMinute(lesson) > input.minuteOfDay)
  if (current.length > 1) return ambiguousContext(input.localDate)
  if (current.length === 1) {
    return result(source.authority, input.localDate, lessons, pending, {
      kind: 'CURRENT_LESSON',
      lesson: current[0],
      minutesUntilStart: 0,
    })
  }

  const upcoming = lessons
    .filter((lesson) => startMinute(lesson) > input.minuteOfDay)
    .sort((a, b) => startMinute(a) - startMinute(b) || a.logicalId.localeCompare(b.logicalId))
  const next = uniqueEarliest(upcoming)
  if (upcoming.length > 1 && !next) return ambiguousContext(input.localDate)

  const imminence = input.imminenceMinutes ?? HOME_IMMINENT_LESSON_MINUTES
  const minutesUntilNext = next ? startMinute(next) - input.minuteOfDay : null
  const latestPending = pending[0] ?? null

  if (latestPending && next && minutesUntilNext !== null && minutesUntilNext <= imminence) {
    return result(source.authority, input.localDate, lessons, pending, {
      kind: 'UPCOMING_LESSON',
      lesson: next,
      minutesUntilStart: minutesUntilNext,
    })
  }

  if (latestPending) {
    return result(source.authority, input.localDate, lessons, pending, {
      kind: 'PENDING_REGISTRATION',
      lesson: latestPending,
      minutesUntilStart: null,
    })
  }

  if (next) {
    return result(source.authority, input.localDate, lessons, pending, {
      kind: 'UPCOMING_LESSON',
      lesson: next,
      minutesUntilStart: minutesUntilNext,
    })
  }

  return result(source.authority, input.localDate, lessons, pending, null)
}

function resolveLessonSource(input: {
  localDate: string
  projectedDay: ProjectedDay
  timetableVersions: TimetableVersionReadModel[]
  timetableSlots: TimetableSlotReadModel[]
}): { authority: HomeDailyAuthority; lessons: Omit<HomeDailyLesson, 'recorded'>[] } {
  if (input.projectedDay.timetableState === 'IN_FORCE') {
    return {
      authority: 'IN_FORCE',
      lessons: input.projectedDay.occurrences
        .filter(isLessonOccurrence)
        .filter(hasTimes)
        .map((occurrence) => fromProjectedOccurrence(occurrence)),
    }
  }

  if (input.projectedDay.calendarState === 'NO_LESSONS' || input.projectedDay.timetableState === 'NOT_APPLICABLE') {
    return { authority: 'NONE', lessons: [] }
  }

  const draft = resolveProvisionalDraftDay(input.localDate, input.timetableVersions, input.timetableSlots)
  if (draft.ambiguous) return { authority: 'AMBIGUOUS', lessons: [] }
  if (!draft.version) return { authority: 'NONE', lessons: [] }

  return {
    authority: 'PROVISIONAL_DRAFT',
    lessons: draft.slots.map((slot) => ({
      logicalId: `draft:${draft.version!.id}:${slot.id}:${input.localDate}`,
      localDate: input.localDate,
      startAt: `${input.localDate}T${slot.startTime}:00`,
      endAt: `${input.localDate}T${slot.endTime}:00`,
      title: slotTitle(slot),
      sectionId: slot.sectionId,
      disciplineId: slot.disciplineId,
      timetableVersionId: draft.version!.id,
      timetableSlotId: slot.id,
      authority: 'PROVISIONAL_DRAFT',
    })),
  }
}

export function resolveProvisionalDraftDay(
  localDate: string,
  versions: TimetableVersionReadModel[],
  slots: TimetableSlotReadModel[],
): { version: TimetableVersionReadModel | null; slots: TimetableSlotReadModel[]; ambiguous: boolean } {
  const applicable = versions
    .filter((version) => version.status === 'DRAFT')
    .filter((version) => version.effectiveFrom <= localDate)
    .filter((version) => !version.effectiveTo || version.effectiveTo >= localDate)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.id.localeCompare(b.id))

  if (!applicable.length) return { version: null, slots: [], ambiguous: false }
  const newestEffectiveFrom = applicable[0].effectiveFrom
  const newest = applicable.filter((version) => version.effectiveFrom === newestEffectiveFrom)
  if (newest.length !== 1) return { version: null, slots: [], ambiguous: true }

  const version = newest[0]
  const weekday = isoWeekday(localDate)
  const daySlots = slots
    .filter((slot) => slot.timetableVersionId === version.id)
    .filter((slot) => slot.weekday === weekday)
    .filter((slot) => slot.kind === 'LESSON' || slot.kind === 'CLASS_PRESENCE')
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id))

  return { version, slots: daySlots, ambiguous: hasOverlappingSlots(daySlots) }
}

function result(
  authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT',
  localDate: string,
  lessons: HomeDailyLesson[],
  pending: HomeDailyLesson[],
  primary: HomeDailyPrimary | null,
): HomeDailyContext {
  return {
    localDate,
    authority,
    lessons,
    lessonCount: lessons.length,
    pendingRegistrationCount: pending.length,
    primary,
  }
}

function ambiguousContext(localDate: string): HomeDailyContext {
  return {
    localDate,
    authority: 'AMBIGUOUS',
    lessons: [],
    lessonCount: 0,
    pendingRegistrationCount: 0,
    primary: { kind: 'AMBIGUOUS', lesson: null, minutesUntilStart: null },
  }
}

function currentSessionsForDay(sessions: TeachingSessionRecord[], localDate: string) {
  const daySessions = sessions.filter((session) => session.localDate === localDate)
  const superseded = new Set(
    daySessions
      .map((session) => session.supersedesSessionId)
      .filter((id): id is string => Boolean(id)),
  )
  return daySessions.filter((session) => !superseded.has(session.id))
}

function isLessonRecorded(lesson: Omit<HomeDailyLesson, 'recorded'>, sessions: TeachingSessionRecord[]) {
  return sessions.some((session) => {
    if (session.sectionId !== lesson.sectionId || session.localDate !== lesson.localDate) return false
    if (lesson.timetableSlotId && session.source.timetableSlotId === lesson.timetableSlotId) return true
    if (session.source.projectedOccurrenceLogicalId === lesson.logicalId) return true
    return session.plannedStartAt === lesson.startAt && session.plannedEndAt === lesson.endAt
  })
}

function uniqueEarliest(lessons: HomeDailyLesson[]) {
  if (!lessons.length) return null
  const earliest = startMinute(lessons[0])
  const matches = lessons.filter((lesson) => startMinute(lesson) === earliest)
  return matches.length === 1 ? matches[0] : null
}

function hasOverlappingSlots(slots: TimetableSlotReadModel[]) {
  for (let index = 1; index < slots.length; index += 1) {
    if (clockMinutes(slots[index].startTime) < clockMinutes(slots[index - 1].endTime)) return true
  }
  return false
}

function fromProjectedOccurrence(occurrence: ProjectedOccurrence): Omit<HomeDailyLesson, 'recorded'> {
  return {
    logicalId: occurrence.logicalId,
    localDate: occurrence.localDate,
    startAt: occurrence.startAt!,
    endAt: occurrence.endAt!,
    title: occurrence.title,
    sectionId: occurrence.sectionId,
    disciplineId: occurrence.disciplineId,
    timetableVersionId: occurrence.timetableVersionId,
    timetableSlotId: occurrence.timetableSlotId,
    authority: 'IN_FORCE',
  }
}

function isLessonOccurrence(occurrence: ProjectedOccurrence) {
  return occurrence.kind === 'LESSON' || occurrence.kind === 'CLASS_PRESENCE'
}

function hasTimes(occurrence: ProjectedOccurrence): occurrence is ProjectedOccurrence & { startAt: string; endAt: string } {
  return Boolean(occurrence.startAt && occurrence.endAt)
}

function slotTitle(slot: TimetableSlotReadModel) {
  if (slot.kind === 'LESSON') return [slot.sectionLabel, slot.disciplineLabel].filter(Boolean).join(' · ') || 'Lezione'
  return slot.manualClassLabel || slot.sectionLabel || 'Presenza in classe'
}

function startMinute(lesson: Pick<HomeDailyLesson, 'startAt'>) {
  return clockMinutes(lesson.startAt.slice(11, 16))
}

function endMinute(lesson: Pick<HomeDailyLesson, 'endAt'>) {
  return clockMinutes(lesson.endAt.slice(11, 16))
}

function clockMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}

function isoWeekday(localDate: string) {
  const day = new Date(`${localDate}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}
