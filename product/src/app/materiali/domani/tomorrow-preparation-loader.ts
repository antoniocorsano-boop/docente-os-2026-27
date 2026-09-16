import { projectTemporalDay } from '@/core/application/temporal-projection-service'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { resolveHomeDailyContext, type HomeDailyAuthority } from '@/core/presentation/home-daily-context'
import {
  loadLessonPreparationBundlesForLessons,
  type LoadedNextLessonPreparation,
} from '@/app/api/assistant/next-lesson-preparation-loader'

export type TomorrowPreparationEntry = {
  logicalId: string
  loaded: LoadedNextLessonPreparation
}

export type TomorrowPreparationBundle = {
  localDate: string
  authority: HomeDailyAuthority
  entries: TomorrowPreparationEntry[]
  reasons: string[]
}

export async function loadTomorrowPreparationBundle(input: {
  workspaceId: string
  academicYearId: string
}): Promise<TomorrowPreparationBundle> {
  const localDate = nextLocalDate(currentRomeLocalDate())
  const timetableRepository = new SupabaseTimetableProjectionReadRepository()
  const calendarRepository = new SupabaseCalendarProjectionReadRepository()
  const sessionRepository = new SupabaseTeachingSessionRepository()

  const [timetable, calendar, sessions] = await Promise.all([
    timetableRepository.read(input.workspaceId, input.academicYearId),
    calendarRepository.read(input.workspaceId, input.academicYearId),
    sessionRepository.listByDay(input.workspaceId, input.academicYearId, localDate),
  ])

  const projectedDay = projectTemporalDay({
    localDate,
    timetableVersions: timetable.versions,
    timetableSlots: timetable.slots,
    calendarDays: calendar.days,
    calendarEvents: calendar.events,
  })

  const daily = resolveHomeDailyContext({
    localDate,
    minuteOfDay: 0,
    projectedDay,
    timetableVersions: timetable.versions,
    timetableSlots: timetable.slots,
    sessions,
  })

  if (daily.authority === 'AMBIGUOUS') {
    return {
      localDate,
      authority: daily.authority,
      entries: [],
      reasons: ['L’orario di domani presenta sovrapposizioni o più fonti con la stessa autorità.'],
    }
  }

  if (daily.authority === 'NONE' || daily.lessons.length === 0) {
    return {
      localDate,
      authority: daily.authority,
      entries: [],
      reasons: [],
    }
  }

  const packs = await loadLessonPreparationBundlesForLessons({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    lessons: daily.lessons,
  })

  return {
    localDate,
    authority: daily.authority,
    entries: packs.map(({ lesson, loaded }) => ({ logicalId: lesson.logicalId, loaded })),
    reasons: [],
  }
}

function currentRomeLocalDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function nextLocalDate(localDate: string) {
  const date = new Date(`${localDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
