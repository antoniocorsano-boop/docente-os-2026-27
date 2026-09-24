import type { ProjectedDay, ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'

export type TodayMoment =
  | 'BEFORE_DAY'
  | 'BEFORE_LESSON'
  | 'IN_LESSON'
  | 'AFTER_LESSON'
  | 'BETWEEN_LESSONS'
  | 'END_OF_DAY'

export type TodayTemporalItem = {
  kind: 'TEMPORAL'
  id: string
  title: string
  startAt: string | null
  endAt: string | null
  sectionId: string | null
  occurrenceKind: ProjectedOccurrence['kind']
  provenance: string[]
}

export type TodayPlannerItem = {
  kind: 'PLANNER'
  task: PlannerTask
}

export type TodayFocus = TodayTemporalItem | TodayPlannerItem

export type TodayProjection = {
  localDate: string
  moment: TodayMoment
  focus: TodayFocus | null
  timeline: TodayTemporalItem[]
  planner: {
    overdue: PlannerTask[]
    today: PlannerTask[]
    waiting: PlannerTask[]
    undated: PlannerTask[]
    week: PlannerTask[]
  }
}

export function buildTodayProjection(input: {
  localDate: string
  nowMinutes: number
  temporalDay: ProjectedDay | null
  tasks: PlannerTask[]
}): TodayProjection {
  const planner = classifyPlannerTasks(input.tasks, input.localDate)
  const timeline = buildTimeline(input.temporalDay)
  const currentTemporal = timeline.find((item) => isCurrent(item, input.nowMinutes)) ?? null
  const nextTemporal = timeline
    .filter((item) => item.startAt && minutes(item.startAt) > input.nowMinutes)
    .sort(compareTemporal)[0] ?? null

  const fallbackTemporal = currentTemporal ?? nextTemporal ?? timeline.find((item) => !item.startAt) ?? null
  const plannerFocus = planner.overdue[0] ?? planner.today[0] ?? null
  const focus: TodayFocus | null = fallbackTemporal ?? (plannerFocus ? { kind: 'PLANNER', task: plannerFocus } : null)

  return {
    localDate: input.localDate,
    moment: resolveMoment(timeline, input.nowMinutes),
    focus,
    timeline,
    planner,
  }
}

function buildTimeline(day: ProjectedDay | null): TodayTemporalItem[] {
  if (!day) return []
  return [...day.occurrences, ...day.events]
    .map((item) => ({
      kind: 'TEMPORAL' as const,
      id: item.logicalId,
      title: item.title,
      startAt: item.startAt,
      endAt: item.endAt,
      sectionId: item.sectionId,
      occurrenceKind: item.kind,
      provenance: item.provenance,
    }))
    .sort(compareTemporal)
}

function classifyPlannerTasks(tasks: PlannerTask[], localDate: string): TodayProjection['planner'] {
  const horizon = addDays(localDate, 7)
  const result: TodayProjection['planner'] = { overdue: [], today: [], waiting: [], undated: [], week: [] }

  for (const task of tasks) {
    if (task.status === 'DONE' || task.status === 'CANCELLED') continue
    if (task.status === 'WAITING') {
      result.waiting.push(task)
      continue
    }

    const due = task.dueAt?.slice(0, 10) ?? null
    if (due && due < localDate) {
      result.overdue.push(task)
      continue
    }
    if (task.plannedFor === localDate || due === localDate) {
      result.today.push(task)
      continue
    }
    if (!task.plannedFor && !due) {
      result.undated.push(task)
      continue
    }
    const relevantDate = task.plannedFor ?? due
    if (relevantDate && relevantDate > localDate && relevantDate <= horizon) result.week.push(task)
  }

  for (const values of Object.values(result)) values.sort(compareTasks)
  return result
}

function resolveMoment(timeline: TodayTemporalItem[], nowMinutes: number): TodayMoment {
  const timed = timeline.filter((item) => item.startAt && item.endAt)
  if (timed.some((item) => isCurrent(item, nowMinutes))) return 'IN_LESSON'
  if (!timed.length) return 'BEFORE_DAY'

  const firstStart = Math.min(...timed.map((item) => minutes(item.startAt!)))
  const lastEnd = Math.max(...timed.map((item) => minutes(item.endAt!)))
  if (nowMinutes < firstStart) return 'BEFORE_LESSON'
  if (nowMinutes >= lastEnd) return 'END_OF_DAY'

  const next = timed.filter((item) => minutes(item.startAt!) > nowMinutes).sort(compareTemporal)[0]
  if (next) return 'BETWEEN_LESSONS'
  return 'AFTER_LESSON'
}

function compareTemporal(a: TodayTemporalItem, b: TodayTemporalItem) {
  const aTime = a.startAt ?? `${a.id}:00`
  const bTime = b.startAt ?? `${b.id}:00`
  return aTime.localeCompare(bTime) || a.id.localeCompare(b.id)
}

function compareTasks(a: PlannerTask, b: PlannerTask) {
  const priority = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const
  const byPriority = priority[a.priority] - priority[b.priority]
  if (byPriority !== 0) return byPriority
  const aDate = a.dueAt?.slice(0, 10) ?? a.plannedFor ?? '9999-12-31'
  const bDate = b.dueAt?.slice(0, 10) ?? b.plannedFor ?? '9999-12-31'
  return aDate.localeCompare(bDate) || a.createdAt.localeCompare(b.createdAt)
}

function isCurrent(item: TodayTemporalItem, nowMinutes: number) {
  return Boolean(item.startAt && item.endAt && minutes(item.startAt) <= nowMinutes && minutes(item.endAt) > nowMinutes)
}

function minutes(value: string) {
  const [hours, mins] = value.slice(11, 16).split(':').map(Number)
  return hours * 60 + mins
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
