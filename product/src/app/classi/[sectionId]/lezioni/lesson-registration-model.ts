import type { ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import { currentTeachingSessions, type TeachingSessionSnapshot } from '@/core/domain/teaching-session'

export function selectEligibleLessonOccurrence(input: {
  occurrences: ProjectedOccurrence[]
  teaching: TeachingSessionSnapshot
  sectionId: string
  nowMinutes: number
}) {
  const recordedOccurrenceIds = new Set(
    input.teaching.sessions
      .map((session) => session.source.projectedOccurrenceLogicalId)
      .filter((id): id is string => Boolean(id)),
  )

  return input.occurrences
    .filter((occurrence) => occurrence.sectionId === input.sectionId)
    .filter((occurrence) => occurrence.kind === 'LESSON' || occurrence.kind === 'CLASS_PRESENCE')
    .filter((occurrence) => !recordedOccurrenceIds.has(occurrence.logicalId))
    .filter((occurrence) => occurrence.startAt ? localTimeMinutes(occurrence.startAt) <= input.nowMinutes : true)
    .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''))[0] ?? null
}

export function hasCurrentBlockSessionOnDate(input: {
  teaching: TeachingSessionSnapshot
  canonicalGenerationId: string
  blockId: string
  localDate: string
}) {
  const current = currentTeachingSessions(input.teaching)
  const currentById = new Map(current.map((session) => [session.id, session]))

  return input.teaching.allocations.some((allocation) => {
    if (allocation.blockId !== input.blockId || allocation.canonicalGenerationId !== input.canonicalGenerationId) return false
    const session = currentById.get(allocation.sessionId)
    return session?.localDate === input.localDate
  })
}

function localTimeMinutes(value: string) {
  const match = /T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value)
  if (!match) throw new Error(`Invalid local date-time: ${value}`)
  return Number(match[1]) * 60 + Number(match[2])
}
