import {
  loadCurrentTodayCopilotContext,
  type LoadedTodayCopilotContext,
} from '@/app/api/assistant/today-context-loader'
import { loadTomorrowPreparationBundle } from '@/app/materiali/domani/tomorrow-preparation-loader'
import { currentTeachingSessions } from '@/core/domain/teaching-session'
import { parseTeachingSessionEvidenceNote, type TeachingSessionReflection } from '@/core/domain/teaching-session-reflection'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { buildLessonPreparationRoleView, type RoleViewSnapshot } from '@/core/presentation/roleview-governance'

export type DayReviewDecision = {
  id: string
  kind: 'RECORD_LESSON' | 'VERIFY_TOMORROW' | 'COMPLETE_TOMORROW' | 'REVIEW_UDA_PROPOSAL'
  title: string
  detail: string
  actionLabel: string
  href: string
}

export type DayReviewReflection = {
  sessionId: string
  sectionId: string
  lessonTitle: string
  timeLabel: string | null
  reflection: TeachingSessionReflection
}

export type DayReviewTomorrowEntry = {
  logicalId: string
  title: string
  sectionLabel: string
  timeLabel: string
  status: RoleViewSnapshot['status']
  nextActivity: string | null
  href: string
}

export type DayReviewBundle = {
  localDate: string
  minuteOfDay: number
  today: {
    concludedCount: number
    recordedCount: number
    pendingCount: number
    remainingCount: number
    concluded: Array<{
      logicalId: string
      title: string
      sectionId: string | null
      timeLabel: string
      recorded: boolean
    }>
    reflections: DayReviewReflection[]
  }
  tomorrow: {
    localDate: string
    lessonCount: number
    readyCount: number
    attentionCount: number
    blockedCount: number
    reasons: string[]
    entries: DayReviewTomorrowEntry[]
  }
  decisions: DayReviewDecision[]
}

export async function loadDayReviewBundle(
  input: {
    workspaceId: string
    academicYearId: string
  },
  options: {
    todayLoaded?: LoadedTodayCopilotContext | null
  } = {},
): Promise<DayReviewBundle> {
  const clock = currentRomeClock()
  const todayPromise = options.todayLoaded === undefined
    ? loadCurrentTodayCopilotContext()
    : Promise.resolve(options.todayLoaded)
  const [todayLoaded, tomorrow, rawSessions] = await Promise.all([
    todayPromise,
    loadTomorrowPreparationBundle(input),
    new SupabaseTeachingSessionRepository().listByDay(input.workspaceId, input.academicYearId, clock.localDate),
  ])

  const today = todayLoaded?.context.today
  const lessons = today?.lessons ?? []
  const concluded = lessons
    .filter((lesson) => lessonMinute(lesson.endAt) <= clock.minuteOfDay)
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
  const remaining = lessons.filter((lesson) => lessonMinute(lesson.endAt) > clock.minuteOfDay)
  const sessions = currentTeachingSessions({ sessions: rawSessions, allocations: [] })
  const reflections = sessions
    .map((session) => {
      const parsed = parseTeachingSessionEvidenceNote(session.evidenceNote)
      if (!parsed) return null
      const lesson = lessons.find((candidate) => lessonMatchesSession(candidate, session))
      return {
        sessionId: session.id,
        sectionId: session.sectionId,
        lessonTitle: lesson?.title ?? 'Lezione registrata',
        timeLabel: session.plannedStartAt ? session.plannedStartAt.slice(11, 16) : null,
        reflection: parsed.reflection,
      } satisfies DayReviewReflection
    })
    .filter((entry): entry is DayReviewReflection => Boolean(entry))
    .sort((left, right) => (left.timeLabel ?? '99:99').localeCompare(right.timeLabel ?? '99:99'))

  const tomorrowEntries: DayReviewTomorrowEntry[] = tomorrow.entries.map((entry) => {
    const preparation = entry.loaded.preparation
    const canonical = preparation.canonicalLesson
    const roleView = buildLessonPreparationRoleView(entry.loaded.manifest, 'TEACHER')
    return {
      logicalId: entry.logicalId,
      title: canonical?.title ?? preparation.lesson.title,
      sectionLabel: canonical?.sectionLabel ?? preparation.lesson.title,
      timeLabel: preparation.lesson.startAt.slice(11, 16),
      status: roleView.status,
      nextActivity: preparation.continuity?.nextActivity ?? null,
      href: `/materiali/domani/${encodeURIComponent(entry.logicalId)}`,
    }
  })

  const decisions: DayReviewDecision[] = []
  for (const lesson of concluded.filter((item) => !item.recorded)) {
    decisions.push({
      id: `record:${lesson.logicalId}`,
      kind: 'RECORD_LESSON',
      title: `Registra ${lesson.title}`,
      detail: `La lezione delle ${lesson.startAt.slice(11, 16)} è conclusa ma non risulta ancora registrata nel Diario.`,
      actionLabel: lesson.sectionId ? 'Apri la classe' : 'Apri le classi',
      href: lesson.sectionId ? `/classi/${encodeURIComponent(lesson.sectionId)}` : '/classi',
    })
  }

  if (tomorrow.reasons.length) {
    decisions.push({
      id: 'tomorrow:authority',
      kind: 'VERIFY_TOMORROW',
      title: 'Verifica il contesto di domani',
      detail: tomorrow.reasons.join(' '),
      actionLabel: 'Controlla orario e calendario',
      href: '/orario',
    })
  }

  for (const entry of tomorrowEntries.filter((item) => item.status === 'BLOCKED')) {
    decisions.push({
      id: `blocked:${entry.logicalId}`,
      kind: 'VERIFY_TOMORROW',
      title: `${entry.sectionLabel}: preparazione bloccata`,
      detail: `Il pacchetto delle ${entry.timeLabel} non è ancora utilizzabile con sufficiente certezza.`,
      actionLabel: 'Apri il pacchetto',
      href: entry.href,
    })
  }

  for (const entry of tomorrowEntries.filter((item) => item.status === 'ATTENTION')) {
    decisions.push({
      id: `attention:${entry.logicalId}`,
      kind: 'COMPLETE_TOMORROW',
      title: `${entry.sectionLabel}: completa la preparazione`,
      detail: `Il pacchetto delle ${entry.timeLabel} è individuato ma richiede ancora una verifica o un materiale.`,
      actionLabel: 'Apri il pacchetto',
      href: entry.href,
    })
  }

  for (const entry of reflections.filter((item) => Boolean(item.reflection.udaChangeProposal))) {
    decisions.push({
      id: `uda:${entry.sessionId}`,
      kind: 'REVIEW_UDA_PROPOSAL',
      title: `${entry.lessonTitle}: valuta la proposta per l’UDA`,
      detail: entry.reflection.udaChangeProposal,
      actionLabel: 'Apri il Diario',
      href: `/classi/${encodeURIComponent(entry.sectionId)}/diario`,
    })
  }

  return {
    localDate: clock.localDate,
    minuteOfDay: clock.minuteOfDay,
    today: {
      concludedCount: concluded.length,
      recordedCount: concluded.filter((lesson) => lesson.recorded).length,
      pendingCount: concluded.filter((lesson) => !lesson.recorded).length,
      remainingCount: remaining.length,
      concluded: concluded.map((lesson) => ({
        logicalId: lesson.logicalId,
        title: lesson.title,
        sectionId: lesson.sectionId,
        timeLabel: `${lesson.startAt.slice(11, 16)}–${lesson.endAt.slice(11, 16)}`,
        recorded: lesson.recorded,
      })),
      reflections,
    },
    tomorrow: {
      localDate: tomorrow.localDate,
      lessonCount: tomorrowEntries.length,
      readyCount: tomorrowEntries.filter((entry) => entry.status === 'READY').length,
      attentionCount: tomorrowEntries.filter((entry) => entry.status === 'ATTENTION').length,
      blockedCount: tomorrowEntries.filter((entry) => entry.status === 'BLOCKED').length,
      reasons: [...tomorrow.reasons],
      entries: tomorrowEntries,
    },
    decisions,
  }
}

function lessonMatchesSession(
  lesson: { logicalId: string; sectionId: string | null; startAt: string; timetableSlotId: string | null },
  session: { sectionId: string; plannedStartAt: string | null; source: { timetableSlotId: string | null; projectedOccurrenceLogicalId: string | null } },
) {
  if (lesson.sectionId !== session.sectionId) return false
  if (lesson.timetableSlotId && session.source.timetableSlotId === lesson.timetableSlotId) return true
  if (session.source.projectedOccurrenceLogicalId === lesson.logicalId) return true
  return Boolean(session.plannedStartAt && session.plannedStartAt === lesson.startAt)
}

function lessonMinute(value: string) {
  const [hour, minute] = value.slice(11, 16).split(':').map(Number)
  return hour * 60 + minute
}

function currentRomeClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    localDate: `${value.year}-${value.month}-${value.day}`,
    minuteOfDay: Number(value.hour) * 60 + Number(value.minute),
  }
}
