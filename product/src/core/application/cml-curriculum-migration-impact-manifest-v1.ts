import type { CmlCanonicalRef } from '@/core/domain/cml-local-handoff'
import type {
  AnnualPlanCurriculumRevalidationReview,
  CurriculumRequirementDelta,
} from '@/core/domain/cml-curriculum-revalidation'
import type { PlanBlockCurriculumBindingV1 } from '@/core/domain/cml-plan-block-curriculum-binding-v1'
import type { UdaCurriculumBindingV1 } from './cml-uda-curriculum-binding-v1'

export const CML_CURRICULUM_MIGRATION_IMPACT_MANIFEST_V1 = 'CML_CURRICULUM_MIGRATION_IMPACT_MANIFEST_V1' as const

export type CurriculumMigrationDisposition =
  | 'UNCHANGED_COMPATIBLE'
  | 'FUTURE_REVALIDATION_REQUIRED'
  | 'FUTURE_REBIND_REQUIRED'
  | 'HISTORICAL_PRESERVE'
  | 'MANUAL_REVIEW_REQUIRED'

export type CurriculumMigrationTemporalScope = 'HISTORICAL' | 'FUTURE'

export type CurriculumMigrationReasonCode =
  | 'CURRENT_BINDING_COMPATIBLE'
  | 'CURRICULUM_FOOTPRINT_CHANGED_REQUIRES_REVALIDATION'
  | 'NEW_MANDATORY_REQUIREMENT_REQUIRES_REVALIDATION'
  | 'BOUND_REQUIREMENT_CHANGED_OR_REMOVED'
  | 'SCOPE_CHANGED_REQUIRES_MANUAL_REVIEW'
  | 'HISTORICAL_WORK_PRESERVED'

export type CurriculumMigrationPlanTargetV1 = {
  targetType: 'PLAN_BLOCK_BINDING'
  targetId: string
  temporalScope: CurriculumMigrationTemporalScope
  binding: PlanBlockCurriculumBindingV1
}

export type CurriculumMigrationUdaTargetV1 = {
  targetType: 'UDA_BINDING'
  targetId: string
  temporalScope: CurriculumMigrationTemporalScope
  binding: UdaCurriculumBindingV1
}

export type CurriculumHistoricalRecordKind =
  | 'TEACHING_SESSION'
  | 'CLASSROOM_EVIDENCE'
  | 'FORMATIVE_FEEDBACK'
  | 'LEARNER_RESPONSE'
  | 'ASSESSMENT_OBSERVATION'

export type CurriculumMigrationHistoricalRecordTargetV1 = {
  targetType: 'CLASSROOM_HISTORY'
  targetId: string
  temporalScope: 'HISTORICAL'
  recordKind: CurriculumHistoricalRecordKind
  sourceBindingIds: string[]
}

export type CurriculumMigrationTargetV1 =
  | CurriculumMigrationPlanTargetV1
  | CurriculumMigrationUdaTargetV1
  | CurriculumMigrationHistoricalRecordTargetV1

export type CurriculumMigrationImpactEntryV1 = {
  targetType: CurriculumMigrationTargetV1['targetType']
  targetId: string
  temporalScope: CurriculumMigrationTemporalScope
  disposition: CurriculumMigrationDisposition
  reasonCode: CurriculumMigrationReasonCode
  affectedRequirementIds: string[]
  preservedHistory: true
  automaticMutationAllowed: false
  teacherRevalidationRequired: boolean
  rebindingRequired: boolean
}

export type CurriculumMigrationImpactManifestV1 = {
  contract: typeof CML_CURRICULUM_MIGRATION_IMPACT_MANIFEST_V1
  manifestId: string
  generatedAt: string
  previous: {
    acceptanceReceiptId: string
  }
  incoming: {
    curricularContextId: string
    curriculumRef: CmlCanonicalRef
    curriculumVersionRef: CmlCanonicalRef
    authorityState: 'APPROVED'
    handoffFingerprintHash: string
    reviewFingerprint: string
  }
  requirementDelta: {
    addedRequirementIds: string[]
    removedRequirementIds: string[]
    changedRequirementIds: string[]
    unchangedRequirementIds: string[]
    addedMandatoryRequirementIds: string[]
  }
  entries: CurriculumMigrationImpactEntryV1[]
  policy: {
    historicalRewriteAllowed: false
    silentRebindAllowed: false
    automaticPersistenceAllowed: false
    institutionalAuthorityEffect: 'NONE'
    teacherDecisionRequiredForFutureChanges: true
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

function stableRefKey(ref: CmlCanonicalRef): string {
  return `${ref.namespace}|${ref.entityType}|${ref.entityId}`
}

function sameStableRef(left: CmlCanonicalRef, right: CmlCanonicalRef): boolean {
  return stableRefKey(left) === stableRefKey(right)
}

function sameApplicability(
  applicability: PlanBlockCurriculumBindingV1['applicability'] | UdaCurriculumBindingV1['applicability'],
  incoming: AnnualPlanCurriculumRevalidationReview['incomingHandoff']['curricularContext'],
): boolean {
  return sameStableRef(applicability.institutionRef, incoming.institutionRef)
    && applicability.schoolYearRef === incoming.schoolYearRef
    && applicability.disciplineRef === incoming.disciplineRef
    && applicability.gradeRef === incoming.gradeRef
    && nonEmpty(incoming.cohortRef)
    && applicability.cohortRef === incoming.cohortRef
}

function deltaRequirementId(delta: CurriculumRequirementDelta): string | null {
  return delta.incomingRequirement?.requirementId ?? delta.previousRequirement?.requirementId ?? null
}

function mandatoryAddedRequirementIds(review: AnnualPlanCurriculumRevalidationReview): string[] {
  return review.requirementDelta
    .filter((delta) => delta.kind === 'ADDED' && delta.incomingRequirement?.coverageRequired === true)
    .map(deltaRequirementId)
    .filter((value): value is string => Boolean(value))
}

function boundRequirementIds(target: CurriculumMigrationPlanTargetV1 | CurriculumMigrationUdaTargetV1): string[] {
  return target.binding.requirementBindings.map((item) => item.requirementId)
}

function intersect(left: readonly string[], right: ReadonlySet<string>): string[] {
  return [...new Set(left.filter((value) => right.has(value)))].sort()
}

function makeEntry(input: {
  target: CurriculumMigrationTargetV1
  disposition: CurriculumMigrationDisposition
  reasonCode: CurriculumMigrationReasonCode
  affectedRequirementIds?: string[]
}): CurriculumMigrationImpactEntryV1 {
  return {
    targetType: input.target.targetType,
    targetId: input.target.targetId,
    temporalScope: input.target.temporalScope,
    disposition: input.disposition,
    reasonCode: input.reasonCode,
    affectedRequirementIds: [...new Set(input.affectedRequirementIds ?? [])].sort(),
    preservedHistory: true,
    automaticMutationAllowed: false,
    teacherRevalidationRequired: input.disposition === 'FUTURE_REVALIDATION_REQUIRED'
      || input.disposition === 'FUTURE_REBIND_REQUIRED'
      || input.disposition === 'MANUAL_REVIEW_REQUIRED',
    rebindingRequired: input.disposition === 'FUTURE_REBIND_REQUIRED',
  }
}

function assertTargetShape(target: CurriculumMigrationTargetV1): void {
  if (!nonEmpty(target.targetId)) throw new Error('curriculum migration targetId is required')
  if (target.targetType === 'CLASSROOM_HISTORY') {
    if (target.temporalScope !== 'HISTORICAL') {
      throw new Error('classroom history can only be classified as HISTORICAL')
    }
    if (target.sourceBindingIds.length === 0 || target.sourceBindingIds.some((id) => !nonEmpty(id))) {
      throw new Error('classroom history requires source binding ids')
    }
    return
  }

  if (target.targetId !== target.binding.bindingId) {
    throw new Error('curriculum migration targetId must match the binding identity')
  }
  if (target.targetType === 'PLAN_BLOCK_BINDING') {
    if (target.binding.contract !== 'CML_PLAN_BLOCK_CURRICULUM_BINDING_V1') {
      throw new Error('plan transition target requires PlanBlockCurriculumBindingV1')
    }
    if (target.binding.sectionExecutionEffect !== 'NONE') {
      throw new Error('plan transition target cannot carry section execution effects')
    }
    return
  }
  if (target.binding.contract !== 'CML_UDA_CURRICULUM_BINDING_V1') {
    throw new Error('UDA transition target requires UdaCurriculumBindingV1')
  }
  if (target.binding.sectionExecutionEffect !== 'NONE' || target.binding.localInstitutionalAuthorityEffect !== 'NONE') {
    throw new Error('UDA transition target cannot carry section or institutional authority effects')
  }
}

function classifyBindingTarget(input: {
  target: CurriculumMigrationPlanTargetV1 | CurriculumMigrationUdaTargetV1
  review: AnnualPlanCurriculumRevalidationReview
  changedOrRemoved: ReadonlySet<string>
  addedMandatory: ReadonlySet<string>
}): CurriculumMigrationImpactEntryV1 {
  const { target, review } = input
  if (target.temporalScope === 'HISTORICAL') {
    return makeEntry({
      target,
      disposition: 'HISTORICAL_PRESERVE',
      reasonCode: 'HISTORICAL_WORK_PRESERVED',
    })
  }

  const binding = target.binding
  const incoming = review.incomingHandoff.curricularContext
  if (!sameApplicability(binding.applicability, incoming)
    || !sameStableRef(binding.curriculum.curriculumRef, incoming.curriculumRef)) {
    return makeEntry({
      target,
      disposition: 'MANUAL_REVIEW_REQUIRED',
      reasonCode: 'SCOPE_CHANGED_REQUIRES_MANUAL_REVIEW',
    })
  }

  const requirementIds = boundRequirementIds(target)
  const brokenBindings = intersect(requirementIds, input.changedOrRemoved)
  if (brokenBindings.length > 0) {
    return makeEntry({
      target,
      disposition: 'FUTURE_REBIND_REQUIRED',
      reasonCode: 'BOUND_REQUIREMENT_CHANGED_OR_REMOVED',
      affectedRequirementIds: brokenBindings,
    })
  }

  const missingMandatory = [...input.addedMandatory]
    .filter((requirementId) => !requirementIds.includes(requirementId))
    .sort()
  if (missingMandatory.length > 0) {
    return makeEntry({
      target,
      disposition: 'FUTURE_REVALIDATION_REQUIRED',
      reasonCode: 'NEW_MANDATORY_REQUIREMENT_REQUIRES_REVALIDATION',
      affectedRequirementIds: missingMandatory,
    })
  }

  if (binding.curriculum.sourceHandoffFingerprintHash !== review.incomingHandoffFootprintHash) {
    return makeEntry({
      target,
      disposition: 'FUTURE_REVALIDATION_REQUIRED',
      reasonCode: 'CURRICULUM_FOOTPRINT_CHANGED_REQUIRES_REVALIDATION',
    })
  }

  return makeEntry({
    target,
    disposition: 'UNCHANGED_COMPATIBLE',
    reasonCode: 'CURRENT_BINDING_COMPATIBLE',
  })
}

/**
 * C2P-09 / C6 impact manifest.
 *
 * This function does not migrate, persist, mutate, approve, or rebind anything.
 * It consumes the established approved-curriculum revalidation review and
 * classifies the effects on existing C2/C3 bindings and preserved classroom
 * history. Any future mutation remains an explicit teacher action in a later
 * governed surface.
 */
export function buildCurriculumMigrationImpactManifestV1(input: {
  manifestId: string
  generatedAt: string
  review: AnnualPlanCurriculumRevalidationReview
  targets: CurriculumMigrationTargetV1[]
}): CurriculumMigrationImpactManifestV1 {
  if (!nonEmpty(input.manifestId)) throw new Error('curriculum migration manifestId is required')
  if (!nonEmpty(input.generatedAt) || Number.isNaN(Date.parse(input.generatedAt))) {
    throw new Error('curriculum migration generatedAt must be an ISO-compatible date')
  }
  const { review } = input
  if (review.status !== 'AWAITING_TEACHER_REVALIDATION' || review.persistenceAllowed !== false) {
    throw new Error('curriculum migration manifest requires a non-persisting teacher revalidation review')
  }
  if (review.incomingHandoff.curricularContext.curriculumState !== 'APPROVED') {
    throw new Error('curriculum migration manifest requires an APPROVED incoming curriculum')
  }
  if (review.incomingHandoff.structuralFootprint.hash !== review.incomingHandoffFootprintHash) {
    throw new Error('curriculum migration review fingerprint does not match the incoming handoff')
  }

  const targetIds = new Set<string>()
  input.targets.forEach((target) => {
    assertTargetShape(target)
    if (targetIds.has(target.targetId)) throw new Error(`duplicate curriculum migration target: ${target.targetId}`)
    targetIds.add(target.targetId)
  })

  const changedOrRemoved = new Set([...review.changedRequirementIds, ...review.removedRequirementIds])
  const addedMandatoryIds = mandatoryAddedRequirementIds(review)
  const addedMandatory = new Set(addedMandatoryIds)

  const entries = input.targets.map((target) => {
    if (target.targetType === 'CLASSROOM_HISTORY') {
      return makeEntry({
        target,
        disposition: 'HISTORICAL_PRESERVE',
        reasonCode: 'HISTORICAL_WORK_PRESERVED',
      })
    }
    return classifyBindingTarget({ target, review, changedOrRemoved, addedMandatory })
  })

  const incoming = review.incomingHandoff.curricularContext
  return {
    contract: CML_CURRICULUM_MIGRATION_IMPACT_MANIFEST_V1,
    manifestId: input.manifestId,
    generatedAt: input.generatedAt,
    previous: {
      acceptanceReceiptId: review.previousReceiptId,
    },
    incoming: {
      curricularContextId: review.incomingCurricularContextId,
      curriculumRef: cloneRef(incoming.curriculumRef),
      curriculumVersionRef: cloneRef(incoming.curriculumVersionRef),
      authorityState: 'APPROVED',
      handoffFingerprintHash: review.incomingHandoffFootprintHash,
      reviewFingerprint: review.reviewFingerprint,
    },
    requirementDelta: {
      addedRequirementIds: [...review.addedRequirementIds],
      removedRequirementIds: [...review.removedRequirementIds],
      changedRequirementIds: [...review.changedRequirementIds],
      unchangedRequirementIds: [...review.unchangedRequirementIds],
      addedMandatoryRequirementIds: addedMandatoryIds,
    },
    entries,
    policy: {
      historicalRewriteAllowed: false,
      silentRebindAllowed: false,
      automaticPersistenceAllowed: false,
      institutionalAuthorityEffect: 'NONE',
      teacherDecisionRequiredForFutureChanges: true,
    },
  }
}
