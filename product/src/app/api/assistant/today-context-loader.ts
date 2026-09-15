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

export type LoadedTodayCopilotContext = {
  context: TodayCopilotK2Context
  preparation: LoadedNextLessonPreparation | null
}

export async function loadCurrentTodayCopilotContext(): Promise<LoadedTodayCopilotContext | null> {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const workspaceContext = await workspaceRepository.getCurrentContext()
  if (!workspaceContext) return null

  const clock = currentRomeClock()
  const plannerRepository = new SupabasePlannerRepository()
  const tasks = await plannerRepository.listByWorkspace(workspaceContext.workspace.id)
  const planner = buildPlannerAssistantContext({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear?.id ?? null,
    localDate: clock.localDate,
    tasks,
  }).planner

  if (!workspaceContext.academicYear) {
    const base = buildTodayCopilotContext({
      workspaceId: workspaceContext.workspace.id,
      academicYearId: null,
      homeDaily: emptyDailyContext(clock.localDate),
      calendarState: 'UNDETERMINED',
      calendarLabel: null,
      timetableState: 'UNAVAILABLE',
      planner,
    })
    return {
      context: enrichTodayCopilotContext(base, null),
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

  const base = buildTodayCopilotContext({
    workspaceId: workspaceContext.workspace.id,
    academicYearId,
    homeDaily,
    calendarState: projectedDay.calendarState,
    calendarLabel: projectedDay.calendarLabel,
    timetableState: projectedDay.timetableState,
    planner,
  })

  const preparation = await loadNextLessonPreparationBundle({
    workspaceId: workspaceContext.workspace.id,
    academicYearId,
    homeDaily,
    minuteOfDay: clock.minuteOfDay,
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
  const localDate = `${value.year}-${value.month}-${value.day}`
  const minuteOfDay = Number(value.hour) * 60 + Number(value.minute)
  return { localDate, minuteOfDay }
}
