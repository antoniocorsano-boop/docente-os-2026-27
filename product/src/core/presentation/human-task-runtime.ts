import type { GradeKey } from '@/app/piano-annuale/model'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskLessonProjection as resolveLegacyHumanTaskLessonProjection,
  type HumanTaskLessonProjection,
} from './human-task-content'
import { APPROVED_HUMAN_TASK_PROJECTIONS } from './human-task-approved-projections'

type CanonicalRuntimeBlock = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  title?: string
}

const APPROVED_PROJECTIONS = new Map<string, HumanTaskLessonProjection>(
  APPROVED_HUMAN_TASK_PROJECTIONS.map((projection) => [projectionKey(projection.grade, projection.blockId), projection]),
)

export function resolveRuntimeHumanTaskLessonProjection(
  grade: GradeKey,
  block: CanonicalRuntimeBlock,
): HumanTaskLessonProjection | null {
  const legacy = resolveLegacyHumanTaskLessonProjection(grade, block)
  if (legacy) return legacy

  const projection = APPROVED_PROJECTIONS.get(projectionKey(grade, block.id)) ?? null
  if (!projection) return null
  if (projection.grade !== grade) return null
  if (projection.blockId !== block.id.toUpperCase()) return null
  if (projection.udaCode !== block.uda) return null
  if (projection.packCode !== block.pack) return null
  if (projection.period !== block.period) return null
  if (block.title && projection.title !== block.title) return null
  if (!hasValidResourceBindings(projection)) return null
  return projection
}

export function hasRuntimeHumanTaskLessonProjection(grade: GradeKey, block: CanonicalRuntimeBlock) {
  return resolveRuntimeHumanTaskLessonProjection(grade, block) !== null
}

export { buildLessonWorkspaceHref }

function projectionKey(grade: GradeKey, blockId: string) {
  return `${grade}:${blockId.toUpperCase()}`
}

function hasValidResourceBindings(projection: HumanTaskLessonProjection) {
  const resourceIds = new Set(projection.resources.map((resource) => resource.id))
  return projection.steps.every((step) => (step.resourceIds ?? []).every((resourceId) => resourceIds.has(resourceId)))
}
