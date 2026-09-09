import type { ProjectedDay, ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'

export type TeacherDayPhase = 'BEFORE_SCHOOL' | 'ACTIVE_DAY' | 'BETWEEN_ACTIVITIES' | 'AFTER_SCHOOL' | 'NO_TIMED_COMMITMENTS'

export type DailyTeacherFocus = {
  kind: 'TEMPORAL' | 'TASK'
  eyebrow: string
  title: string
  description: string
  href: string
  actionLabel: string
  meta: string[]
}

export type DailyTeacherBrief = {
  phase: TeacherDayPhase
  focus: DailyTeacherFocus | null
  temporalFocus: ProjectedOccurrence | null
  todayTasks: PlannerTask[]
  attentionTasks: PlannerTask[]
  timeline: ProjectedOccurrence[]
}

export function buildDailyTeacherBrief(input: {
  day: ProjectedDay | null
  tasks: PlannerTask[]
  localDate: string
  nowMinutes: number
}): DailyTeacherBrief {
  const timeline = input.day ? sortedTimeline(input.day) : []
  const temporalFocus = selectTemporalFocus(timeline, input.nowMinutes)
  const phase = resolveTeacherDayPhase(timeline, input.nowMinutes)
  const todayTasks = input.tasks.filter((task) => isOpen(task) && isForToday(task, input.localDate)).sort(compareTasks)
  const attentionTasks = input.tasks.filter((task) => isOpen(task) && requiresAttention(task, input.localDate)).sort(compareTasks)

  const focus = temporalFocus
    ? temporalFocusToFocus(temporalFocus, input.nowMinutes)
    : taskToFocus(attentionTasks[0] ?? todayTasks[0] ?? null, input.localDate)

  return { phase, focus, temporalFocus, todayTasks, attentionTasks, timeline }
}

export function selectTemporalFocus(timeline: ProjectedOccurrence[], nowMinutes: number) {
  const timed = timeline.filter((item) => item.startAt && item.endAt)
  const current = timed.find((item) => isCurrent(item, nowMinutes))
  if (current) return current
  const next = timed
    .filter((item) => minutes(item.startAt!) > nowMinutes)
    .sort((a, b) => a.startAt!.localeCompare(b.startAt!))[0]
  if (next) return next
  return timeline.find((item) => !item.startAt) ?? null
}

export function resolveTeacherDayPhase(timeline: ProjectedOccurrence[], nowMinutes: number): TeacherDayPhase {
  const timed = timeline.filter((item) => item.startAt && item.endAt)
  if (!timed.length) return 'NO_TIMED_COMMITMENTS'

  const firstStart = Math.min(...timed.map((item) => minutes(item.startAt!)))
  const lastEnd = Math.max(...timed.map((item) => minutes(item.endAt!)))
  if (nowMinutes < firstStart) return 'BEFORE_SCHOOL'
  if (nowMinutes >= lastEnd) return 'AFTER_SCHOOL'
  if (timed.some((item) => isCurrent(item, nowMinutes))) return 'ACTIVE_DAY'
  return 'BETWEEN_ACTIVITIES'
}

function temporalFocusToFocus(item: ProjectedOccurrence, nowMinutes: number): DailyTeacherFocus {
  const current = isCurrent(item, nowMinutes)
  const isLesson = item.kind === 'LESSON' && Boolean(item.sectionId)
  const href = isLesson
    ? `/classi/${encodeURIComponent(item.sectionId!)}`
    : item.kind === 'CALENDAR_EVENT'
      ? '/calendario'
      : '/orario'

  return {
    kind: 'TEMPORAL',
    eyebrow: current ? 'IN CORSO' : 'A SEGUIRE',
    title: item.title,
    description: isLesson
      ? current ? 'Attività didattica in corso.' : 'Prossima attività didattica prevista.'
      : current ? 'Impegno in corso.' : 'Prossimo impegno previsto.',
    href,
    actionLabel: isLesson ? 'Apri attività' : item.kind === 'CALENDAR_EVENT' ? 'Apri impegno' : 'Apri orario',
    meta: [timeRange(item), item.kind === 'CALENDAR_EVENT' ? 'Calendario' : 'Orario'].filter(Boolean),
  }
}

function taskToFocus(task: PlannerTask | null, localDate: string): DailyTeacherFocus | null {
  if (!task) return null
  return {
    kind: 'TASK',
    eyebrow: 'SCADENZA',
    title: task.title,
    description: taskReason(task, localDate),
    href: '/planner',
    actionLabel: 'Apri',
    meta: [priorityLabel(task.priority), task.dueAt ? `Scade ${task.dueAt.slice(0, 10)}` : 'Prevista oggi'],
  }
}

function sortedTimeline(day: ProjectedDay) {
  return [...day.occurrences, ...day.events].sort((a, b) => {
    const aKey = a.startAt ?? `${a.localDate}T00:00:00`
    const bKey = b.startAt ?? `${b.localDate}T00:00:00`
    return aKey.localeCompare(bKey) || a.logicalId.localeCompare(b.logicalId)
  })
}

function isCurrent(item: ProjectedOccurrence, nowMinutes: number) {
  return Boolean(item.startAt && item.endAt && minutes(item.startAt) <= nowMinutes && minutes(item.endAt) > nowMinutes)
}

function minutes(value: string) {
  const [hours, mins] = value.slice(11, 16).split(':').map(Number)
  return hours * 60 + mins
}

function timeRange(item: ProjectedOccurrence) {
  if (!item.startAt || !item.endAt) return 'Tutto il giorno'
  return `${item.startAt.slice(11, 16)}–${item.endAt.slice(11, 16)}`
}

function isOpen(task: PlannerTask) {
  return task.status === 'OPEN'
}

function isForToday(task: PlannerTask, today: string) {
  return task.plannedFor === today || task.dueAt?.slice(0, 10) === today
}

function requiresAttention(task: PlannerTask, today: string) {
  const due = task.dueAt?.slice(0, 10) ?? null
  return Boolean((due && due < today) || (task.priority === 'URGENT' && due && due <= today))
}

function compareTasks(a: PlannerTask, b: PlannerTask) {
  const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const
  const byPriority = priorityRank[a.priority] - priorityRank[b.priority]
  if (byPriority !== 0) return byPriority
  const aDate = a.dueAt?.slice(0, 10) ?? a.plannedFor ?? '9999-12-31'
  const bDate = b.dueAt?.slice(0, 10) ?? b.plannedFor ?? '9999-12-31'
  return aDate.localeCompare(bDate) || a.createdAt.localeCompare(b.createdAt)
}

function taskReason(task: PlannerTask, today: string) {
  const due = task.dueAt?.slice(0, 10) ?? null
  if (due && due < today) return 'Scadenza superata.'
  if (due === today) return 'Scadenza oggi.'
  return 'Attività prevista oggi.'
}

function priorityLabel(priority: PlannerTask['priority']) {
  if (priority === 'URGENT') return 'Urgente'
  if (priority === 'HIGH') return 'Priorità alta'
  if (priority === 'LOW') return 'Priorità bassa'
  return 'Priorità normale'
}
