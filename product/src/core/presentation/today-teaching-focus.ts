import { buildLessonWorkspaceHref } from './human-task-runtime'
import type { NextLessonPreparation } from './next-lesson-preparation'

export type TodayTeachingFocusAction = {
  kind: 'PREPARE' | 'CLASS'
  label: 'Prepara lezione' | 'Apri la classe'
  href: string
}

export type TodayTeachingContinuity = {
  label: 'Riprendi il filo'
  detail: string
  href: string
} | null

export type TodayTeachingFocus = {
  state: 'CURRENT' | 'NEXT'
  stateLabel: 'Lezione in corso' | 'Prossima lezione'
  minutesUntilStart: number
  classLabel: string | null
  subjectLabel: string | null
  occurrenceTitle: string
  lessonTitle: string
  startAt: string
  endAt: string
  authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT'
  authorityLabel: 'Orario in vigore' | 'Orario provvisorio'
  chips: string[]
  action: TodayTeachingFocusAction | null
  continuity: TodayTeachingContinuity
}

export function buildTodayTeachingFocus(input: {
  preparation: NextLessonPreparation | null
  minuteOfDay: number
}): TodayTeachingFocus | null {
  const preparation = input.preparation
  if (!preparation) return null

  const start = lessonMinute(preparation.lesson.startAt)
  const end = lessonMinute(preparation.lesson.endAt)
  if (input.minuteOfDay >= end) return null

  const state = input.minuteOfDay >= start ? 'CURRENT' : 'NEXT'
  const canonical = preparation.canonicalLesson
  const action = buildAction(preparation)
  const nextActivity = preparation.continuity?.nextActivity.trim() ?? ''

  return {
    state,
    stateLabel: state === 'CURRENT' ? 'Lezione in corso' : 'Prossima lezione',
    minutesUntilStart: state === 'CURRENT' ? 0 : Math.max(0, start - input.minuteOfDay),
    classLabel: canonical?.sectionLabel ?? null,
    subjectLabel: canonical?.disciplineLabel ?? null,
    occurrenceTitle: preparation.lesson.title,
    lessonTitle: canonical?.title ?? preparation.lesson.title,
    startAt: preparation.lesson.startAt,
    endAt: preparation.lesson.endAt,
    authority: preparation.lesson.authority,
    authorityLabel: preparation.lesson.authority === 'IN_FORCE' ? 'Orario in vigore' : 'Orario provvisorio',
    chips: buildChips(preparation),
    action,
    continuity: nextActivity && action
      ? {
          label: 'Riprendi il filo',
          detail: nextActivity,
          href: action.href,
        }
      : null,
  }
}

function buildAction(preparation: NextLessonPreparation): TodayTeachingFocusAction | null {
  const sectionId = preparation.lesson.sectionId
  if (!sectionId) return null

  const blockId = preparation.canonicalLesson?.blockId
  if (blockId) {
    return {
      kind: 'PREPARE',
      label: 'Prepara lezione',
      href: buildLessonWorkspaceHref(sectionId, blockId, 'prepare'),
    }
  }

  return {
    kind: 'CLASS',
    label: 'Apri la classe',
    href: `/classi/${encodeURIComponent(sectionId)}`,
  }
}

function buildChips(preparation: NextLessonPreparation) {
  const canonical = preparation.canonicalLesson
  if (!canonical) return []

  const chips = [canonical.udaTitle]
  if (canonical.readyCount > 0) {
    chips.push(`${canonical.readyCount} ${canonical.readyCount === 1 ? 'materiale pronto' : 'materiali pronti'}`)
  }
  if (canonical.remainingPreparationCount > 0) {
    chips.push(`${canonical.remainingPreparationCount} ${canonical.remainingPreparationCount === 1 ? 'elemento da preparare' : 'elementi da preparare'}`)
  } else if (canonical.preparationPreview.length > 0) {
    chips.push('Preparazione definita')
  }
  return unique(chips).slice(0, 3)
}

function lessonMinute(value: string) {
  const [hour, minute] = value.slice(11, 16).split(':').map(Number)
  return hour * 60 + minute
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
