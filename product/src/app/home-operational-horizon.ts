import type { CalendarEvent } from '@/core/domain/calendar'
import {
  suggestOperationalPreparation,
  type OperationalAgendaEventSnapshot,
  type OperationalAgendaEventWorkspace,
  type OperationalAgendaState,
} from '@/core/domain/operational-agenda'

export type DailyOperationalHorizon = {
  event: OperationalAgendaEventSnapshot
  historical: boolean
  localStarted: boolean
  pendingChecklistCount: number
  openDecisionCount: number
  preparationTitle: string | null
  decisionTitle: string | null
}

export function buildDailyOperationalHorizon(
  events: readonly CalendarEvent[],
  state: OperationalAgendaState | null,
  today: string,
): DailyOperationalHorizon | null {
  const upcoming = [...events]
    .filter((event) => event.endsOn >= today)
    .sort(compareCalendarEvents)[0]

  if (upcoming) {
    return summarizeEvent(upcoming, state?.eventWorkspaces[upcoming.id] ?? null, false)
  }

  if (!state) return null

  const unfinishedHistoricalWorkspace = Object.values(state.eventWorkspaces)
    .filter(hasOpenLocalWork)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]

  if (!unfinishedHistoricalWorkspace) return null
  return summarizeEvent(
    unfinishedHistoricalWorkspace.eventSnapshot,
    unfinishedHistoricalWorkspace,
    true,
  )
}

function summarizeEvent(
  event: OperationalAgendaEventSnapshot,
  workspace: OperationalAgendaEventWorkspace | null,
  historical: boolean,
): DailyOperationalHorizon {
  const pendingChecklist = workspace?.checklist.filter((item) => !item.done) ?? []
  const openDecisions = workspace?.decisions.filter((decision) => decision.status !== 'CONFIRMED') ?? []
  const suggestions = suggestOperationalPreparation(event)
  const preparationSuggestion = suggestions.find((suggestion) => suggestion.kind !== 'DECISION') ?? null
  const decisionSuggestion = suggestions.find((suggestion) => suggestion.kind === 'DECISION') ?? null

  return {
    event,
    historical,
    localStarted: Boolean(workspace),
    pendingChecklistCount: pendingChecklist.length,
    openDecisionCount: openDecisions.length,
    preparationTitle: pendingChecklist[0]?.title ?? preparationSuggestion?.title ?? null,
    decisionTitle: openDecisions[0]?.title ?? decisionSuggestion?.title ?? null,
  }
}

function compareCalendarEvents(left: CalendarEvent, right: CalendarEvent) {
  const dateComparison = left.startsOn.localeCompare(right.startsOn)
  if (dateComparison !== 0) return dateComparison

  if (left.allDay !== right.allDay) return left.allDay ? 1 : -1
  return (left.startTime ?? '23:59').localeCompare(right.startTime ?? '23:59')
}

function hasOpenLocalWork(workspace: OperationalAgendaEventWorkspace) {
  return workspace.checklist.some((item) => !item.done)
    || workspace.decisions.some((decision) => decision.status !== 'CONFIRMED')
}
