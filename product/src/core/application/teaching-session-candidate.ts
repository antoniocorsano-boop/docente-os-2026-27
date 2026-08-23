import type { ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'

export function teachingSessionCandidateFromOccurrence(
  occurrence: ProjectedOccurrence,
): Omit<TeachingSessionDraft, 'actualMinutes' | 'evidenceNote'> {
  if (!occurrence.sectionId || (occurrence.kind !== 'LESSON' && occurrence.kind !== 'CLASS_PRESENCE')) {
    throw new Error('Projected occurrence is not a class teaching candidate')
  }

  const plannedMinutes = occurrence.startAt && occurrence.endAt
    ? durationMinutes(occurrence.startAt, occurrence.endAt)
    : null

  return {
    sectionId: occurrence.sectionId,
    disciplineId: occurrence.disciplineId,
    localDate: occurrence.localDate,
    plannedStartAt: occurrence.startAt,
    plannedEndAt: occurrence.endAt,
    plannedMinutes,
    source: {
      sourceKind: 'PROJECTED_OCCURRENCE',
      projectedOccurrenceLogicalId: occurrence.logicalId,
      timetableVersionId: occurrence.timetableVersionId,
      timetableSlotId: occurrence.timetableSlotId,
      calendarState: occurrence.calendarState,
      provenance: [...occurrence.provenance],
    },
  }
}

function durationMinutes(startAt: string, endAt: string) {
  const start = localDateTimeMinutes(startAt)
  const end = localDateTimeMinutes(endAt)
  const duration = end - start
  if (!Number.isInteger(duration) || duration <= 0) throw new Error('Projected occurrence has invalid duration')
  return duration
}

function localDateTimeMinutes(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value)
  if (!match) throw new Error(`Invalid local date-time: ${value}`)
  const [, year, month, day, hour, minute] = match.map(Number)
  return Date.UTC(year, month - 1, day, hour, minute) / 60000
}
