import type { AnnualPlanBlockProgress } from './annual-plan-execution'
import type { CmlCanonicalRef } from './cml-local-handoff'
import {
  CML_TEACHER_CURRICULUM_CONTEXT_V1,
  type TeacherCurriculumContextV1,
} from './cml-curriculum-release-intake-v1'

export const CML_PLAN_BLOCK_CURRICULUM_BINDING_V1 = 'CML_PLAN_BLOCK_CURRICULUM_BINDING_V1' as const

export type PlanBlockCurriculumRequirementBindingV1 = {
  requirementId: string
  curriculumNodeRef: CmlCanonicalRef
  authorityLevel: TeacherCurriculumContextV1['requirementRefs'][number]['authorityLevel']
  coverageRequired: boolean
}

export type PlanBlockCurriculumBindingV1 = {
  contract: typeof CML_PLAN_BLOCK_CURRICULUM_BINDING_V1
  bindingId: string
  bindingScope: 'CANONICAL_PLAN_BLOCK'
  canonicalPlan: {
    assetId: string
    generationId: string
    blockId: string
  }
  curriculum: {
    curriculumRef: CmlCanonicalRef
    curriculumVersionRef: CmlCanonicalRef
    institutionalAuthorityState: TeacherCurriculumContextV1['institutionalAuthorityState']
    institutionalAuthorityReceiptRef?: CmlCanonicalRef
    sourceHandoffFingerprintHash: string
    teacherAcceptanceDecisionRef: string
    acceptedAt: string
    requiresRevalidationOnApproval: boolean
  }
  applicability: {
    institutionRef: CmlCanonicalRef
    schoolYearRef: string
    disciplineRef: string
    gradeRef: string
    cohortRef: string
  }
  requirementBindings: PlanBlockCurriculumRequirementBindingV1[]
  professionalDecisionRef: string
  boundAt: string
  sectionExecutionEffect: 'NONE'
}

export type PlanBlockBindingContextState = 'CURRENT' | 'REVALIDATION_REQUIRED' | 'SCOPE_MISMATCH'

export type PlanBlockExecutionCurriculumLinkV1 = {
  bindingId: string
  progressId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  executionStatus: AnnualPlanBlockProgress['status']
  curriculumVersionRef: CmlCanonicalRef
  bindingMutated: false
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

function refKey(ref: CmlCanonicalRef): string {
  return `${ref.namespace}|${ref.entityType}|${ref.entityId}|${ref.versionId ?? ''}`
}

function sameRef(a: CmlCanonicalRef, b: CmlCanonicalRef): boolean {
  return refKey(a) === refKey(b)
}

function assertTeacherContextEligible(context: TeacherCurriculumContextV1): void {
  if (context.contract !== CML_TEACHER_CURRICULUM_CONTEXT_V1) {
    throw new Error('annual-plan curriculum binding requires TeacherCurriculumContextV1')
  }
  if (context.sourceProduct !== 'CURMANLIGHT_ARENA') {
    throw new Error('annual-plan curriculum binding requires an Arena-derived teacher context')
  }
  if (context.localAuthorityEffect !== 'NONE') {
    throw new Error('teacher curriculum context cannot confer local institutional authority')
  }
  if (context.teacherAcceptanceState !== 'ACCEPTED_FOR_PROFESSIONAL_PLANNING') {
    throw new Error('annual-plan curriculum binding requires explicit teacher acceptance')
  }
  if (!nonEmpty(context.sourceHandoffFingerprintHash)) {
    throw new Error('annual-plan curriculum binding requires a source handoff fingerprint')
  }
  if (!nonEmpty(context.teacherDecisionRef) || !nonEmpty(context.acceptedAt) || Number.isNaN(Date.parse(context.acceptedAt))) {
    throw new Error('annual-plan curriculum binding requires a valid teacher acceptance receipt')
  }
  if (!nonEmpty(context.scope.cohortRef)) {
    throw new Error('canonical annual-plan binding requires cohortRef; section-only context cannot bind a common plan block')
  }
  if (context.institutionalAuthorityState === 'APPROVED' && !context.institutionalAuthorityReceiptRef) {
    throw new Error('approved teacher curriculum context requires institutional authority receipt')
  }
  if (context.requirementRefs.length === 0) {
    throw new Error('teacher curriculum context contains no curricular requirements')
  }
}

export function createPlanBlockCurriculumBindingV1(input: {
  bindingId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  teacherContext: TeacherCurriculumContextV1
  requirementIds: string[]
  professionalDecisionRef: string
  boundAt: string
}): PlanBlockCurriculumBindingV1 {
  assertTeacherContextEligible(input.teacherContext)
  for (const [field, value] of Object.entries({
    bindingId: input.bindingId,
    canonicalPlanAssetId: input.canonicalPlanAssetId,
    canonicalGenerationId: input.canonicalGenerationId,
    blockId: input.blockId,
    professionalDecisionRef: input.professionalDecisionRef,
  })) {
    if (!nonEmpty(value)) throw new Error(`${field} is required`)
  }
  if (!nonEmpty(input.boundAt) || Number.isNaN(Date.parse(input.boundAt))) {
    throw new Error('boundAt must be an ISO-compatible date')
  }
  if (input.requirementIds.length === 0) {
    throw new Error('annual-plan block binding requires at least one curriculum requirement')
  }
  const uniqueRequirementIds = [...new Set(input.requirementIds)]
  if (uniqueRequirementIds.length !== input.requirementIds.length) {
    throw new Error('annual-plan block binding contains duplicate requirementIds')
  }

  const requirementMap = new Map(
    input.teacherContext.requirementRefs.map((requirement) => [requirement.requirementId, requirement]),
  )
  const requirementBindings = uniqueRequirementIds.map((requirementId) => {
    const requirement = requirementMap.get(requirementId)
    if (!requirement) throw new Error(`unknown curriculum requirement for annual-plan binding: ${requirementId}`)
    return {
      requirementId,
      curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
      authorityLevel: requirement.authorityLevel,
      coverageRequired: requirement.coverageRequired,
    }
  })

  const context = input.teacherContext
  return {
    contract: CML_PLAN_BLOCK_CURRICULUM_BINDING_V1,
    bindingId: input.bindingId,
    bindingScope: 'CANONICAL_PLAN_BLOCK',
    canonicalPlan: {
      assetId: input.canonicalPlanAssetId,
      generationId: input.canonicalGenerationId,
      blockId: input.blockId,
    },
    curriculum: {
      curriculumRef: cloneRef(context.curriculumRef),
      curriculumVersionRef: cloneRef(context.curriculumVersionRef),
      institutionalAuthorityState: context.institutionalAuthorityState,
      ...(context.institutionalAuthorityReceiptRef
        ? { institutionalAuthorityReceiptRef: cloneRef(context.institutionalAuthorityReceiptRef) }
        : {}),
      sourceHandoffFingerprintHash: context.sourceHandoffFingerprintHash,
      teacherAcceptanceDecisionRef: context.teacherDecisionRef,
      acceptedAt: context.acceptedAt,
      requiresRevalidationOnApproval: context.requiresRevalidationOnApproval,
    },
    applicability: {
      institutionRef: cloneRef(context.scope.institutionRef),
      schoolYearRef: context.scope.schoolYearRef,
      disciplineRef: context.scope.disciplineRef,
      gradeRef: context.scope.gradeRef,
      cohortRef: context.scope.cohortRef as string,
    },
    requirementBindings,
    professionalDecisionRef: input.professionalDecisionRef,
    boundAt: input.boundAt,
    sectionExecutionEffect: 'NONE',
  }
}

export function classifyPlanBlockBindingAgainstTeacherContext(
  binding: PlanBlockCurriculumBindingV1,
  context: TeacherCurriculumContextV1,
): PlanBlockBindingContextState {
  assertTeacherContextEligible(context)
  const sameScope = sameRef(binding.applicability.institutionRef, context.scope.institutionRef)
    && binding.applicability.schoolYearRef === context.scope.schoolYearRef
    && binding.applicability.disciplineRef === context.scope.disciplineRef
    && binding.applicability.gradeRef === context.scope.gradeRef
    && binding.applicability.cohortRef === context.scope.cohortRef
  if (!sameScope) return 'SCOPE_MISMATCH'

  const sameCurriculum = sameRef(binding.curriculum.curriculumRef, context.curriculumRef)
    && sameRef(binding.curriculum.curriculumVersionRef, context.curriculumVersionRef)
  if (!sameCurriculum || binding.curriculum.sourceHandoffFingerprintHash !== context.sourceHandoffFingerprintHash) {
    return 'REVALIDATION_REQUIRED'
  }
  return 'CURRENT'
}

export function linkPlanBlockBindingToSectionExecution(
  binding: PlanBlockCurriculumBindingV1,
  progress: AnnualPlanBlockProgress,
): PlanBlockExecutionCurriculumLinkV1 {
  if (binding.canonicalPlan.assetId !== progress.canonicalPlanAssetId
    || binding.canonicalPlan.generationId !== progress.canonicalGenerationId
    || binding.canonicalPlan.blockId !== progress.blockId) {
    throw new Error('section execution does not match the canonical plan block curriculum binding')
  }

  return {
    bindingId: binding.bindingId,
    progressId: progress.id,
    sectionId: progress.sectionId,
    canonicalPlanAssetId: progress.canonicalPlanAssetId,
    canonicalGenerationId: progress.canonicalGenerationId,
    blockId: progress.blockId,
    executionStatus: progress.status,
    curriculumVersionRef: cloneRef(binding.curriculum.curriculumVersionRef),
    bindingMutated: false,
  }
}
