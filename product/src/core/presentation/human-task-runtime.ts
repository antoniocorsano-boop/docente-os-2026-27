import type { GradeKey } from '@/app/piano-annuale/model'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskLessonProjection as resolveLegacyHumanTaskLessonProjection,
  type HumanTaskLessonProjection,
} from './human-task-content'
import {
  APPROVED_HUMAN_TASK_RUNTIME_PROJECTIONS,
  APPROVED_HUMAN_TASK_SUPPORT_PACK_BINDINGS,
} from './human-task-approved-registry'

type CanonicalRuntimeBlock = {
  id: string
  uda: string
  pack: string
  supportPacks?: string[]
  period: string
  focus: string
  title?: string
}

const APPROVED_PROJECTIONS = new Map<string, HumanTaskLessonProjection>(
  APPROVED_HUMAN_TASK_RUNTIME_PROJECTIONS.map((projection) => [projectionKey(projection.grade, projection.blockId), projection]),
)

export function resolveRuntimeHumanTaskLessonProjection(
  grade: GradeKey,
  block: CanonicalRuntimeBlock,
): HumanTaskLessonProjection | null {
  const legacy = resolveLegacyHumanTaskLessonProjection(grade, block)
  if (legacy) return legacy

  const key = projectionKey(grade, block.id)
  const projection = APPROVED_PROJECTIONS.get(key) ?? null
  if (!projection) return null
  if (projection.grade !== grade) return null
  if (projection.blockId !== block.id.toUpperCase()) return null
  if (projection.udaCode !== block.uda) return null
  if (projection.packCode !== block.pack) return null
  if (projection.period !== block.period) return null
  if (block.title && projection.title !== block.title) return null
  if (!sameStringArray(block.supportPacks ?? [], APPROVED_HUMAN_TASK_SUPPORT_PACK_BINDINGS.get(key) ?? [])) return null
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

function sameStringArray(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function hasValidResourceBindings(projection: HumanTaskLessonProjection) {
  const resourceIds = new Set(projection.resources.map((resource) => resource.id))
  return projection.steps.every((step) => (step.resourceIds ?? []).every((resourceId) => resourceIds.has(resourceId)))
}
