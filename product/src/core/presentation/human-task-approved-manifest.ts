import type { GradeKey } from '@/app/piano-annuale/model'
import type { HumanTaskLessonProjection } from './human-task-content'
import type { HumanTaskImprovementDisposition } from '@/core/application/human-task-continuous-improvement'
import {
  HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY,
  type HumanTaskContextStakeholder,
} from '@/core/application/human-task-stakeholder-cognition'

export type ApprovedHumanTaskSourceBinding = {
  code: string
  role: 'PLAN' | 'UDA' | 'PACK'
  /** DIDACTIC is exposed to the teacher; STRUCTURAL is retained only for validation/fingerprint provenance. */
  contribution?: 'DIDACTIC' | 'STRUCTURAL'
  assetId: string
  generationId: string
  sourceRevision?: string
}

export type ApprovedHumanTaskCognitiveReceipt = {
  policyVersion: 1
  status: 'SATISFIED'
  stakeholders: Array<{
    stakeholder: HumanTaskContextStakeholder
    evidence: string[]
    note: string
  }>
  note: string
}

export type ApprovedHumanTaskManifest = {
  schemaVersion: 1 | 2
  recipeFamily: 'DIRECT' | 'PACK_COMPOSED' | 'UDA_ONLY' | 'PLAN_GUIDED_UDA'
  timingSpecificity: 'FULL' | 'PARTIAL' | 'UNSPECIFIED'
  structuralBinding: {
    grade: GradeKey
    blockId: string
    udaCode: string
    packCode: string
    supportPackCodes: string[]
    period: string
    title: string
  }
  sourceBindings: ApprovedHumanTaskSourceBinding[]
  projection: HumanTaskLessonProjection
  approval: {
    decision: 'APPROVE'
    approvedAt: string
    reviewPackageId: string
    improvementDisposition: Exclude<HumanTaskImprovementDisposition, 'PENDING' | 'SYSTEM_IMPROVEMENT_REQUIRED'>
    improvementNote: string
    /** Required for schema v2 and later; v1 manifests remain readable as legacy approvals. */
    cognitiveFulfillment?: ApprovedHumanTaskCognitiveReceipt
  }
}

export function validateApprovedHumanTaskManifest(manifest: ApprovedHumanTaskManifest): string[] {
  const issues: string[] = []
  const binding = manifest.structuralBinding
  const projection = manifest.projection

  if (manifest.approval.decision !== 'APPROVE') issues.push('MANIFEST_NOT_APPROVED')
  if (!manifest.approval.reviewPackageId.trim()) issues.push('REVIEW_PACKAGE_MISSING')
  if (!manifest.approval.improvementNote.trim()) issues.push('IMPROVEMENT_REVIEW_MISSING')
  if (!manifest.sourceBindings.length || manifest.sourceBindings.some((source) => !source.assetId || !source.generationId)) {
    issues.push('SOURCE_GENERATION_BINDING_MISSING')
  }
  if (manifest.schemaVersion >= 2) {
    issues.push(...validateCognitiveReceipt(manifest.approval.cognitiveFulfillment))
  }
  if (projection.grade !== binding.grade) issues.push('GRADE_MISMATCH')
  if (projection.blockId !== binding.blockId) issues.push('BLOCK_MISMATCH')
  if (projection.udaCode !== binding.udaCode) issues.push('UDA_MISMATCH')
  if (projection.packCode !== binding.packCode) issues.push('PACK_MISMATCH')
  if (projection.period !== binding.period) issues.push('PERIOD_MISMATCH')
  if (projection.title !== binding.title) issues.push('TITLE_MISMATCH')
  if ((manifest.recipeFamily === 'PACK_COMPOSED' || manifest.recipeFamily === 'PLAN_GUIDED_UDA')
    && (projection.sourceAlignment.level !== 'COMPOSED' || !projection.sourceAlignment.note?.trim())) {
    issues.push('COMPOSED_ALIGNMENT_NOTE_REQUIRED')
  }
  if (manifest.timingSpecificity === 'UNSPECIFIED' && projection.steps.some((step) => step.minutes !== null)) {
    issues.push('UNSUPPORTED_INTERNAL_TIMING')
  }
  const resourceIds = new Set(projection.resources.map((resource) => resource.id))
  if (projection.steps.some((step) => (step.resourceIds ?? []).some((resourceId) => !resourceIds.has(resourceId)))) {
    issues.push('BROKEN_RESOURCE_BINDING')
  }
  const contributingCodes = new Set(projection.sources.map((source) => source.code))
  if (manifest.sourceBindings.some((source) => (source.contribution ?? 'DIDACTIC') === 'DIDACTIC' && !contributingCodes.has(source.code))) {
    issues.push('BOUND_SOURCE_NOT_EXPOSED')
  }

  return issues
}

export function materializeApprovedHumanTaskManifests(manifests: readonly ApprovedHumanTaskManifest[]) {
  const seen = new Set<string>()
  return manifests.flatMap((manifest) => {
    const key = `${manifest.structuralBinding.grade}:${manifest.structuralBinding.blockId}`
    if (seen.has(key)) return []
    seen.add(key)
    return validateApprovedHumanTaskManifest(manifest).length ? [] : [manifest.projection]
  })
}

function validateCognitiveReceipt(receipt: ApprovedHumanTaskCognitiveReceipt | undefined) {
  if (!receipt) return ['COGNITIVE_FULFILLMENT_MISSING']
  const issues: string[] = []
  if (receipt.status !== 'SATISFIED' || !receipt.note.trim()) issues.push('COGNITIVE_FULFILLMENT_INCOMPLETE')

  const required = Object.keys(HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.requirements) as HumanTaskContextStakeholder[]
  const byStakeholder = new Map(receipt.stakeholders.map((item) => [item.stakeholder, item]))
  if (byStakeholder.size !== required.length) issues.push('COGNITIVE_STAKEHOLDER_SET_MISMATCH')
  for (const stakeholder of required) {
    const item = byStakeholder.get(stakeholder)
    if (!item || !item.note.trim() || item.evidence.length === 0) {
      issues.push(`COGNITIVE_STAKEHOLDER_UNFULFILLED:${stakeholder}`)
    }
  }
  return issues
}
