import {
  isTeachingAdjustment,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'
import {
  resolveHumanTaskResourcesForSurface,
  type HumanTaskLessonProjection,
} from '@/core/presentation/human-task-content'

export type LessonBrief = {
  title: string
  objective: string
  durationMinutes: number
  preparationPreview: string[]
  remainingPreparationCount: number
  readyTitles: string[]
  readyCount: number
  acceptedExtensionCount: number
  statusLabel: 'READY_BASE' | 'ENRICHED'
}

export function buildLessonBrief(input: {
  projection: HumanTaskLessonProjection
  extensions: LessonDesignExtension[]
}): LessonBrief {
  const preparation = input.projection.preparation
  const preparationPreview = preparation.slice(0, 3)
  const preparationResources = resolveHumanTaskResourcesForSurface(input.projection, 'PREPARE')
  const acceptedExtensions = input.extensions.filter(
    (extension) => extension.status === 'ACCEPTED' && !isTeachingAdjustment(extension),
  )
  const readyTitles = unique([
    ...preparationResources.map((resource) => resource.title),
    ...acceptedExtensions.map((extension) => extension.title),
  ])

  return {
    title: input.projection.title,
    objective: input.projection.objective,
    durationMinutes: input.projection.durationMinutes,
    preparationPreview,
    remainingPreparationCount: Math.max(0, preparation.length - preparationPreview.length),
    readyTitles: readyTitles.slice(0, 3),
    readyCount: readyTitles.length,
    acceptedExtensionCount: acceptedExtensions.length,
    statusLabel: acceptedExtensions.length > 0 ? 'ENRICHED' : 'READY_BASE',
  }
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
