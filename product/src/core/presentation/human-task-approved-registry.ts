import type { GradeKey } from '@/app/piano-annuale/model'
import type { HumanTaskLessonProjection } from './human-task-content'
import { APPROVED_HUMAN_TASK_PROJECTIONS } from './human-task-approved-projections'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B11_B15 } from './human-task-approved-projections-b11-b15'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B16_B19 } from './human-task-approved-projections-b16-b19'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B20_B22 } from './human-task-approved-projections-b20-b22'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B23_B27 } from './human-task-approved-projections-b23-b27'
import { APPROVED_HUMAN_TASK_MANIFESTS } from './human-task-approved-manifests'
import { APPROVED_HUMAN_TASK_MANIFESTS_B31_B33_V2 } from './human-task-approved-manifests-b31-b33-v2'
import { APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B01_B04 } from './human-task-approved-manifests-seconda-b01-b04'
import { materializeApprovedHumanTaskManifests } from './human-task-approved-manifest'

const ALL_MANIFESTS = [
  ...APPROVED_HUMAN_TASK_MANIFESTS,
  ...APPROVED_HUMAN_TASK_MANIFESTS_B31_B33_V2,
  ...APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B01_B04,
]

const MANIFEST_PROJECTIONS = materializeApprovedHumanTaskManifests(ALL_MANIFESTS)

export const APPROVED_HUMAN_TASK_RUNTIME_PROJECTIONS: readonly HumanTaskLessonProjection[] = [
  ...APPROVED_HUMAN_TASK_PROJECTIONS,
  ...APPROVED_HUMAN_TASK_PROJECTIONS_B11_B15,
  ...APPROVED_HUMAN_TASK_PROJECTIONS_B16_B19,
  ...APPROVED_HUMAN_TASK_PROJECTIONS_B20_B22,
  ...APPROVED_HUMAN_TASK_PROJECTIONS_B23_B27,
  ...MANIFEST_PROJECTIONS,
]

export const APPROVED_HUMAN_TASK_SUPPORT_PACK_BINDINGS = new Map<string, readonly string[]>([
  [projectionKey('Prima', 'B13'), ['CAN-PACK-1C']],
  [projectionKey('Prima', 'B14'), ['CAN-PACK-1C']],
  [projectionKey('Prima', 'B15'), ['CAN-PACK-1C', 'CAN-PACK-1D']],
  ...ALL_MANIFESTS.map((manifest) => [
    projectionKey(manifest.structuralBinding.grade, manifest.structuralBinding.blockId),
    manifest.structuralBinding.supportPackCodes,
  ] as const),
])

/**
 * Operational titles may be sourced by an approved manifest when the canonical
 * Plan intentionally names only the segment. This preserves Plan authority for
 * order/duration while allowing a human-facing PACK title after explicit review.
 */
export const APPROVED_HUMAN_TASK_TITLE_OVERRIDES = new Map<string, string>(
  ALL_MANIFESTS.map((manifest) => [
    projectionKey(manifest.structuralBinding.grade, manifest.structuralBinding.blockId),
    manifest.structuralBinding.title,
  ]),
)

function projectionKey(grade: GradeKey, blockId: string) {
  return `${grade}:${blockId.toUpperCase()}`
}
