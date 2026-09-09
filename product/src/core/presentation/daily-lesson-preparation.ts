import type { LessonPreparationState } from '@/core/domain/lesson-preparation'
import { buildLessonWorkspaceHref, type HumanTaskLessonProjection } from './human-task-content'

export type DailyLessonPreparationView = {
  sectionId: string
  blockId: string
  lessonTitle: string
  udaTitle: string
  status: LessonPreparationState['status']
  statusLabel: LessonPreparationState['label']
  statusReason: string
  materials: string[]
  href: string
  actionLabel: 'Prepara la lezione' | 'Rivedi e conferma' | 'Apri la lezione'
}

export function buildDailyLessonPreparationView(input: {
  sectionId: string
  blockId: string
  projection: HumanTaskLessonProjection
  preparationState: LessonPreparationState
}): DailyLessonPreparationView {
  const mode = input.preparationState.status === 'READY' ? 'teach' : 'prepare'
  return {
    sectionId: input.sectionId,
    blockId: input.blockId,
    lessonTitle: input.projection.title,
    udaTitle: input.projection.udaTitle,
    status: input.preparationState.status,
    statusLabel: input.preparationState.label,
    statusReason: input.preparationState.reason,
    materials: input.projection.preparation,
    href: buildLessonWorkspaceHref(input.sectionId, input.blockId, mode),
    actionLabel: input.preparationState.status === 'READY'
      ? 'Apri la lezione'
      : input.preparationState.status === 'NEEDS_CONFIRMATION'
        ? 'Rivedi e conferma'
        : 'Prepara la lezione',
  }
}
