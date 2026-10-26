import type { ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { HomeDailyContext, HomeDailyLesson } from './home-daily-context'
import { buildCanonicalLessonWorkspaceHref } from './lesson-workspace-route'

export type TodayIALessonBundle = {
  lessonLogicalId: string
  blockId: string | null
}

export type TodayIALessonProjection = {
  lesson: HomeDailyLesson
  href: string
  routeKind: 'LESSON' | 'CLASS' | 'ORARIO'
}

export type TodayIACalendarCommitment = {
  id: string
  title: string
  startAt: string | null
  endAt: string | null
  href: '/calendario'
}

export type TodayIAProjection = {
  pendingLesson: TodayIALessonProjection | null
  nextLesson: TodayIALessonProjection | null
  calendarCommitments: TodayIACalendarCommitment[]
  fallback: {
    kind: 'ORARIO'
    href: '/orario'
    reason: 'AMBIGUOUS_LESSON_CONTEXT'
  } | null
}

export function buildTodayIAProjection(input: {
  homeDaily: HomeDailyContext
  minuteOfDay: number
  calendarEvents: ProjectedOccurrence[]
  lessonBundles: TodayIALessonBundle[]
}): TodayIAProjection {
  const calendarCommitments = compactCalendarCommitments(input.calendarEvents)

  if (input.homeDaily.authority === 'AMBIGUOUS') {
    return ambiguousProjection(calendarCommitments)
  }

  const current = input.homeDaily.lessons.filter((lesson) => {
    const start = lessonMinute(lesson.startAt)
    const end = lessonMinute(lesson.endAt)
    return start <= input.minuteOfDay && end > input.minuteOfDay
  })
  if (current.length > 1) return ambiguousProjection(calendarCommitments)

  const upcoming = input.homeDaily.lessons
    .filter((lesson) => lessonMinute(lesson.startAt) > input.minuteOfDay)
    .sort(compareLessonStart)
  const earliestUpcoming = uniqueEarliest(upcoming)
  if (!current.length && upcoming.length && !earliestUpcoming) {
    return ambiguousProjection(calendarCommitments)
  }

  const pendingLesson = input.homeDaily.lessons
    .filter((lesson) => !lesson.recorded && lessonMinute(lesson.endAt) <= input.minuteOfDay)
    .sort((first, second) => lessonMinute(second.endAt) - lessonMinute(first.endAt) || first.logicalId.localeCompare(second.logicalId))[0] ?? null
  const nextLesson = current[0] ?? earliestUpcoming

  return {
    pendingLesson: pendingLesson ? resolveLesson(pendingLesson, input.lessonBundles) : null,
    nextLesson: nextLesson ? resolveLesson(nextLesson, input.lessonBundles) : null,
    calendarCommitments,
    fallback: null,
  }
}

function resolveLesson(lesson: HomeDailyLesson, bundles: TodayIALessonBundle[]): TodayIALessonProjection {
  const blockId = bundles.find((bundle) => bundle.lessonLogicalId === lesson.logicalId)?.blockId ?? null
  if (lesson.sectionId && blockId) {
    return {
      lesson,
      href: buildCanonicalLessonWorkspaceHref(lesson.sectionId, blockId, {
        localDate: lesson.localDate,
        occurrenceLogicalId: lesson.logicalId,
      }),
      routeKind: 'LESSON',
    }
  }
  if (lesson.sectionId) {
    return {
      lesson,
      href: `/classi/${encodeURIComponent(lesson.sectionId)}`,
      routeKind: 'CLASS',
    }
  }
  return {
    lesson,
    href: '/orario',
    routeKind: 'ORARIO',
  }
}

function compactCalendarCommitments(events: ProjectedOccurrence[]): TodayIACalendarCommitment[] {
  return events
    .filter((event) => event.kind === 'CALENDAR_EVENT')
    .sort((first, second) => compareNullableTime(first.startAt, second.startAt) || first.logicalId.localeCompare(second.logicalId))
    .map((event) => ({
      id: event.calendarEventId ?? event.logicalId,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      href: '/calendario' as const,
    }))
}

function ambiguousProjection(calendarCommitments: TodayIACalendarCommitment[]): TodayIAProjection {
  return {
    pendingLesson: null,
    nextLesson: null,
    calendarCommitments,
    fallback: {
      kind: 'ORARIO',
      href: '/orario',
      reason: 'AMBIGUOUS_LESSON_CONTEXT',
    },
  }
}

function uniqueEarliest(lessons: HomeDailyLesson[]) {
  if (!lessons.length) return null
  const earliestMinute = lessonMinute(lessons[0].startAt)
  const matches = lessons.filter((lesson) => lessonMinute(lesson.startAt) === earliestMinute)
  return matches.length === 1 ? matches[0] : null
}

function compareLessonStart(first: HomeDailyLesson, second: HomeDailyLesson) {
  return lessonMinute(first.startAt) - lessonMinute(second.startAt) || first.logicalId.localeCompare(second.logicalId)
}

function compareNullableTime(first: string | null, second: string | null) {
  if (first === second) return 0
  if (first === null) return -1
  if (second === null) return 1
  return first.localeCompare(second)
}

function lessonMinute(value: string) {
  const [hour, minute] = value.slice(11, 16).split(':').map(Number)
  return hour * 60 + minute
}
