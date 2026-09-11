import { TemporalProjectionService, type ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { TimetableSlotReadModel, TimetableVersionReadModel } from '@/core/application/ports/temporal-projection'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'

export type LessonRegisterTiming = {
  authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT' | 'NONE'
  occurrence: ProjectedOccurrence | null
  startAt: string | null
  endAt: string | null
  plannedMinutes: number | null
  disciplineId: string | null
  title: string | null
  timetableVersionId: string | null
  timetableSlotId: string | null
  provenance: string[]
}

export async function resolveLessonRegisterTiming(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  localDate: string
}): Promise<LessonRegisterTiming> {
  const timetable = new SupabaseTimetableProjectionReadRepository()

  try {
    const day = await new TemporalProjectionService(
      timetable,
      new SupabaseCalendarProjectionReadRepository(),
    ).projectDay(input)
    const occurrence = day.occurrences.find((item) =>
      item.sectionId === input.sectionId && (item.kind === 'LESSON' || item.kind === 'CLASS_PRESENCE'),
    ) ?? null
    if (occurrence) {
      return {
        authority: 'IN_FORCE',
        occurrence,
        startAt: occurrence.startAt,
        endAt: occurrence.endAt,
        plannedMinutes: minutesBetween(occurrence.startAt, occurrence.endAt),
        disciplineId: occurrence.disciplineId,
        title: occurrence.title,
        timetableVersionId: occurrence.timetableVersionId,
        timetableSlotId: occurrence.timetableSlotId,
        provenance: [...occurrence.provenance],
      }
    }
  } catch {
    // The canonical projection is allowed to be unavailable during timetable/calendar setup.
  }

  try {
    const snapshot = await timetable.read(input.workspaceId, input.academicYearId)
    const provisional = resolveUniqueDraftSlot({
      localDate: input.localDate,
      sectionId: input.sectionId,
      versions: snapshot.versions,
      slots: snapshot.slots,
    })
    if (provisional) {
      return {
        authority: 'PROVISIONAL_DRAFT',
        occurrence: null,
        startAt: `${input.localDate}T${provisional.slot.startTime}:00`,
        endAt: `${input.localDate}T${provisional.slot.endTime}:00`,
        plannedMinutes: minutesFromClock(provisional.slot.startTime, provisional.slot.endTime),
        disciplineId: provisional.slot.disciplineId,
        title: [provisional.slot.sectionLabel, provisional.slot.disciplineLabel].filter(Boolean).join(' · ') || null,
        timetableVersionId: provisional.version.id,
        timetableSlotId: provisional.slot.id,
        provenance: [
          `provisional_timetable_version:${provisional.version.id}`,
          `provisional_timetable_slot:${provisional.slot.id}`,
          `register_date:${input.localDate}`,
        ],
      }
    }
  } catch {
    // Ambiguous or unavailable draft timing must fail closed to a manual session.
  }

  return {
    authority: 'NONE',
    occurrence: null,
    startAt: null,
    endAt: null,
    plannedMinutes: null,
    disciplineId: null,
    title: null,
    timetableVersionId: null,
    timetableSlotId: null,
    provenance: ['classroom_register:fallback_manual'],
  }
}

export function resolveUniqueDraftSlot(input: {
  localDate: string
  sectionId: string
  versions: TimetableVersionReadModel[]
  slots: TimetableSlotReadModel[]
}) {
  const version = input.versions
    .filter((item) => item.status === 'DRAFT')
    .filter((item) => item.effectiveFrom <= input.localDate)
    .filter((item) => !item.effectiveTo || item.effectiveTo >= input.localDate)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.id.localeCompare(b.id))[0] ?? null
  if (!version) return null

  const weekday = isoWeekday(input.localDate)
  const matches = input.slots
    .filter((slot) => slot.timetableVersionId === version.id)
    .filter((slot) => slot.weekday === weekday)
    .filter((slot) => slot.sectionId === input.sectionId)
    .filter((slot) => slot.kind === 'LESSON' || slot.kind === 'CLASS_PRESENCE')
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id))

  // Draft timing is documentary context only. If more than one class period could
  // match the same material/date we refuse to guess and leave the session manual.
  return matches.length === 1 ? { version, slot: matches[0] } : null
}

function minutesBetween(startAt: string | null, endAt: string | null) {
  if (!startAt || !endAt) return null
  return minutesFromClock(startAt.slice(11, 16), endAt.slice(11, 16))
}

function minutesFromClock(start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
  return Number.isInteger(minutes) && minutes > 0 ? minutes : null
}

function isoWeekday(localDate: string) {
  const day = new Date(`${localDate}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}
