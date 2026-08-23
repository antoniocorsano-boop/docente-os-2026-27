import type { GradeKey } from '@/app/piano-annuale/model'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskLessonProjection as resolveLegacyHumanTaskLessonProjection,
  type HumanTaskLessonProjection,
} from './human-task-content'
import { APPROVED_HUMAN_TASK_PROJECTIONS } from './human-task-approved-projections'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B11_B15 } from './human-task-approved-projections-b11-b15'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B16_B19 } from './human-task-approved-projections-b16-b19'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B20_B22 } from './human-task-approved-projections-b20-b22'

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
  [
    ...APPROVED_HUMAN_TASK_PROJECTIONS,
    ...APPROVED_HUMAN_TASK_PROJECTIONS_B11_B15,
    ...APPROVED_HUMAN_TASK_PROJECTIONS_B16_B19,
    ...APPROVED_HUMAN_TASK_PROJECTIONS_B20_B22,
  ].map((projection) => [projectionKey(projection.grade, projection.blockId), projection]),
)

const APPROVED_SUPPORT_PACK_BINDINGS = new Map<string, readonly string[]>([
  [projectionKey('Prima', 'B13'), ['CAN-PACK-1C']],
  [projectionKey('Prima', 'B14'), ['CAN-PACK-1C']],
  [projectionKey('Prima', 'B15'), ['CAN-PACK-1C', 'CAN-PACK-1D']],
])

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
  if (!sameStringArray(block.supportPacks ?? [], APPROVED_SUPPORT_PACK_BINDINGS.get(key) ?? [])) return null
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
