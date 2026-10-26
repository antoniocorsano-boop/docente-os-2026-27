import { currentRomeDomainClock } from '@/core/application/domain-clock'
import { projectTemporalDay } from '@/core/application/temporal-projection-service'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveHomeDailyContext, type HomeDailyContext } from '@/core/presentation/home-daily-context'
import {
  enrichTodayCopilotContext,
  type TodayCopilotK2Context,
} from '@/core/presentation/next-lesson-preparation'
import { buildPlannerAssistantContext } from '@/core/presentation/planner-assistant-context'
import { buildTodayCopilotContext } from '@/core/presentation/today-copilot-context'
import {
  loadNextLessonPreparationBundle,
  type LoadedNextLessonPreparation,
} from './next-lesson-preparation-loader'

const NEXT_LESSON_LOOKAHEAD_DAYS = 7

type TimetableProjection = Awaited<ReturnType<SupabaseTimetableProjectionReadRepository['read']>>
type CalendarProjection = Awaited<ReturnType<SupabaseCalendarProjectionReadRepository['read']>>

export type LoadedTodayOperationalContext = {
  workspaceContext: NonNullable<Awaited<ReturnType<SupabaseWorkspaceRepository['getCurrentContext']>>>
  localDate: string
  minuteOfDay: number
  tasks: Awaited<ReturnType<SupabasePlannerRepository['listByWorkspace']>>
  projectedDay: ReturnType<typeof projectTemporalDay> | null
  homeDaily: HomeDailyContext
  preparation: LoadedNextLessonPreparation | null
}

export type LoadedTodayCopilotContext = {
  context: TodayCopilotK2Context
  preparation: LoadedNextLessonPreparation | null
}

export async function loadCurrentTodayOperationalContext(
  options: { includePreparation?: boolean; includeTasks?: boolean } = {},
): Promise<LoadedTodayOperationalContext | null> {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const workspaceContext = await workspaceRepository.getCurrentContext()
  if (!workspaceContext) return null

  const clock = currentRomeDomainClock()
  const plannerRepository = new SupabasePlannerRepository()
  const tasks = options.includeTasks === false
    ? []
    : await plannerRepository.listByWorkspace(workspaceContext.workspace.id)

  if (!workspaceContext.academicYear) {
    return {
      workspaceContext,
      localDate: clock.localDate,
      minuteOfDay: clock.minuteOfDay,
      tasks,
      projectedDay: null,
      homeDaily: emptyDailyContext(clock.localDate),
      preparation: null,
    }
  }

  const academicYearId = workspaceContext.academicYear.id
  const timetableRepository = new SupabaseTimetableProjectionReadRepository()
  const calendarRepository = new SupabaseCalendarProjectionReadRepository()
  const sessionRepository = new SupabaseTeachingSessionRepository()

  const [timetable, calendar, sessions] = await Promise.all([
    timetableRepository.read(workspaceContext.workspace.id, academicYearId),
    calendarRepository.read(workspaceContext.workspace.id, academicYearId),
    sessionRepository.listByDay(workspaceContext.workspace.id, academicYearId, clock.localDate),
  ])

  const projectedDay = projectTemporalDay({
    localDate: clock.localDate,
    timetableVersions: timetable.versions,
    timetableSlots: timetable.slots,
    calendarDays: calendar.days,
    calendarEvents: calendar.events,
  })

  const homeDaily = resolveHomeDailyContext({
    localDate: clock.localDate,
    minuteOfDay: clock.minuteOfDay,
    projectedDay,
    timetableVersions: timetable.versions,
    timetableSlots: timetable.slots,
    sessions,
  })

  let preparation: LoadedNextLessonPreparation | null = null
  if (options.includePreparation !== false) {
    try {
      preparation = await loadNextLessonPreparationBundle({
        workspaceId: workspaceContext.workspace.id,
        academicYearId,
        homeDaily,
        minuteOfDay: clock.minuteOfDay,
      })
      if (!preparation) {
        preparation = await loadNearestUpcomingPreparation({
          workspaceId: workspaceContext.workspace.id,
          academicYearId,
          localDate: clock.localDate,
          timetable,
          calendar,
        })
      }
    } catch {
      console.warn('[DOCENTE OS] Lesson preparation unavailable; Today Copilot continues with base context.')
    }
  }

  return {
    workspaceContext,
    localDate: clock.localDate,
    minuteOfDay: clock.minuteOfDay,
    tasks,
    projectedDay,
    homeDaily,
    preparation,
  }
}

async function loadNearestUpcomingPreparation(input: {
  workspaceId: string
  academicYearId: string
  localDate: string
  timetable: TimetableProjection
  calendar: CalendarProjection
}): Promise<LoadedNextLessonPreparation | null> {
  for (let offset = 1; offset <= NEXT_LESSON_LOOKAHEAD_DAYS; offset += 1) {
    const futureDate = addLocalDays(input.localDate, offset)
    const projectedDay = projectTemporalDay({
      localDate: futureDate,
      timetableVersions: input.timetable.versions,
      timetableSlots: input.timetable.slots,
      calendarDays: input.calendar.days,
      calendarEvents: input.calendar.events,
    })
    const futureDaily = resolveHomeDailyContext({
      localDate: futureDate,
      minuteOfDay: 0,
      projectedDay,
      timetableVersions: input.timetable.versions,
      timetableSlots: input.timetable.slots,
      sessions: [],
    })

    if (futureDaily.authority === 'AMBIGUOUS') return null
    if (!futureDaily.lessons.length) continue

    const preparation = await loadNextLessonPreparationBundle({
      workspaceId: input.workspaceId,
      academicYearId: input.academicYearId,
      homeDaily: futureDaily,
      minuteOfDay: 0,
    })
    if (preparation) return preparation
  }

  return null
}

export async function loadCurrentTodayCopilotContext(): Promise<LoadedTodayCopilotContext | null> {
  const operational = await loadCurrentTodayOperationalContext()
  if (!operational) return null

  const {
    workspaceContext,
    localDate,
    tasks,
    projectedDay,
    homeDaily,
    preparation,
  } = operational
  const planner = buildPlannerAssistantContext({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear?.id ?? null,
    localDate,
    tasks,
  }).planner
  const base = buildTodayCopilotContext({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear?.id ?? null,
    homeDaily,
    calendarState: projectedDay?.calendarState ?? 'UNDETERMINED',
    calendarLabel: projectedDay?.calendarLabel ?? null,
    timetableState: projectedDay?.timetableState ?? 'UNAVAILABLE',
    planner,
  })

  return {
    context: enrichTodayCopilotContext(base, preparation?.preparation ?? null),
    preparation,
  }
}

function emptyDailyContext(localDate: string): HomeDailyContext {
  return {
    localDate,
    authority: 'NONE',
    lessons: [],
    lessonCount: 0,
    pendingRegistrationCount: 0,
    primary: null,
  }
}

function addLocalDays(localDate: string, days: number) {
  const date = new Date(`${localDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}