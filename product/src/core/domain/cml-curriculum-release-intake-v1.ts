import type { CmlCanonicalRef } from './cml-local-handoff'
import {
  validateCmlLocalHandoffV2,
  type CmlLocalHandoffV2,
  type CurriculumApprovalState,
  type CurriculumRequirementAuthority,
  type CurriculumRequirementKind,
} from './cml-local-handoff-v2'
import {
  buildAnnualPlanFrameworkReviewDraftV2,
  type AnnualPlanFrameworkReviewDraftV2,
} from './cml-handoff-v2-acceptance'
import {
  buildApprovedCurriculumRevalidationReview,
  classifyCurriculumImportState,
  type AnnualPlanCurriculumBaselineSnapshot,
  type AnnualPlanCurriculumRevalidationReview,
} from './cml-curriculum-revalidation'

export const CML_CURRICULUM_RELEASE_CONTRACT_V1 = 'CML_CURRICULUM_RELEASE_CONTRACT_V1' as const
export const CML_CURRICULUM_RELEASE_CONTRACT_VERSION = 1 as const
export const CML_TEACHER_CURRICULUM_CONTEXT_V1 = 'CML_TEACHER_CURRICULUM_CONTEXT_V1' as const

export type CurriculumReleaseRequirementRefV1 = {
  requirementId: string
  kind: CurriculumRequirementKind
  authorityLevel: CurriculumRequirementAuthority
  curriculumNodeRef: CmlCanonicalRef
  coverageRequired: boolean
  sourceRefs: CmlCanonicalRef[]
  transitionOriginRef?: CmlCanonicalRef
}

export type ReceivedCurriculumReleaseV1 = {
  contract: typeof CML_CURRICULUM_RELEASE_CONTRACT_V1
  contractVersion: typeof CML_CURRICULUM_RELEASE_CONTRACT_VERSION
  sourceHandoffFormat: 'CML_LOCAL_HANDOFF_V2'
  sourceContextContract: 'CML_CURRICULUM_CONTEXT_V1'
  curriculumId: CmlCanonicalRef
  curriculumVersionRef: CmlCanonicalRef
  authorityState: CurriculumApprovalState
  authorityReceiptRef?: CmlCanonicalRef
  structuralFingerprint: CmlLocalHandoffV2['structuralFootprint']
  applicabilityContext: {
    institutionRef: CmlCanonicalRef
    schoolYearRef: string
    disciplineRef: string
    gradeRef: string
    sectionRef?: string
    cohortRef?: string
    applicabilityStatus: 'APPLICABLE' | 'TRANSITIONAL'
    transitionRuleRef: CmlCanonicalRef
  }
  provenanceRefs: CmlCanonicalRef[]
  planningSemantics: {
    requirements: CurriculumReleaseRequirementRefV1[]
    nodeRefs: CmlCanonicalRef[]
  }
  issuedAt: string
  privacyClass: 'PROFESSIONAL_NON_PERSONAL'
  downstreamPolicy: {
    targetProduct: 'DOCENTE_OS'
    importMode: 'PREVIEW_ONLY'
    acceptanceRequired: true
    automaticWriteAllowed: false
  }
}

export type TeacherCurriculumContextV1 = {
  contract: typeof CML_TEACHER_CURRICULUM_CONTEXT_V1
  sourceProduct: 'CURMANLIGHT_ARENA'
  sourceReleaseContract: typeof CML_CURRICULUM_RELEASE_CONTRACT_V1
  localAuthorityEffect: 'NONE'
  teacherAcceptanceState: 'ACCEPTED_FOR_PROFESSIONAL_PLANNING'
  curriculumRef: CmlCanonicalRef
  curriculumVersionRef: CmlCanonicalRef
  institutionalAuthorityState: CurriculumApprovalState
  institutionalAuthorityReceiptRef?: CmlCanonicalRef
  sourceHandoffFingerprintHash: string
  scope: {
    institutionRef: CmlCanonicalRef
    schoolYearRef: string
    disciplineRef: string
    gradeRef: string
    sectionRef?: string
    cohortRef?: string
  }
  requirementRefs: Array<{
    requirementId: string
    curriculumNodeRef: CmlCanonicalRef
    authorityLevel: CurriculumRequirementAuthority
    coverageRequired: boolean
  }>
  teacherDecisionRef: string
  acceptedAt: string
  requiresRevalidationOnApproval: boolean
}

export type CurriculumReleaseIntakeResult =
  | {
      importState: 'NEW'
      mode: 'INITIAL_TEACHER_REVIEW'
      persistenceAllowed: false
      release: ReceivedCurriculumReleaseV1
      review: AnnualPlanFrameworkReviewDraftV2
    }
  | {
      importState: 'ALREADY_KNOWN'
      mode: 'CURRENT_CONTEXT'
      persistenceAllowed: false
      release: ReceivedCurriculumReleaseV1
      teacherContext: TeacherCurriculumContextV1
    }
  | {
      importState: 'UPDATE_AVAILABLE'
      mode: 'PROVISIONAL_UPDATE_REVIEW'
      persistenceAllowed: false
      release: ReceivedCurriculumReleaseV1
      review: AnnualPlanFrameworkReviewDraftV2
    }
  | {
      importState: 'UPDATE_AVAILABLE'
      mode: 'APPROVED_REVALIDATION'
      persistenceAllowed: false
      release: ReceivedCurriculumReleaseV1
      review: AnnualPlanCurriculumRevalidationReview
    }

function refKey(ref: CmlCanonicalRef): string {
  return `${ref.namespace}|${ref.entityType}|${ref.entityId}|${ref.versionId ?? ''}`
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

function dedupeRefs(refs: CmlCanonicalRef[]): CmlCanonicalRef[] {
  const seen = new Set<string>()
  const result: CmlCanonicalRef[] = []
  refs.forEach((ref) => {
    const key = refKey(ref)
    if (seen.has(key)) return
    seen.add(key)
    result.push(cloneRef(ref))
  })
  return result
}

function frameworkNodeRefs(handoff: CmlLocalHandoffV2): CmlCanonicalRef[] {
  const payload = handoff.annualPlanningFramework.payload as Record<string, unknown>
  const periods = Array.isArray(payload.periods) ? payload.periods : []
  return periods.flatMap((period) => {
    if (typeof period !== 'object' || period === null || Array.isArray(period)) return []
    const refs = (period as Record<string, unknown>).suggestedNodeRefs
    return Array.isArray(refs) ? refs.map((ref) => cloneRef(ref as CmlCanonicalRef)) : []
  })
}

/**
 * Receives the Arena C1 semantic profile by projecting the already governed
 * CML_LOCAL_HANDOFF_V2. This is an ephemeral receiver view, not a second
 * transport or persistence source.
 */
export function projectReceivedCurriculumReleaseV1(handoff: CmlLocalHandoffV2): ReceivedCurriculumReleaseV1 {
  const validation = validateCmlLocalHandoffV2(handoff)
  if (!validation.valid) throw new Error(`CML curriculum release rejected: ${validation.errors.join('; ')}`)

  const context = handoff.curricularContext
  return {
    contract: CML_CURRICULUM_RELEASE_CONTRACT_V1,
    contractVersion: CML_CURRICULUM_RELEASE_CONTRACT_VERSION,
    sourceHandoffFormat: 'CML_LOCAL_HANDOFF_V2',
    sourceContextContract: 'CML_CURRICULUM_CONTEXT_V1',
    curriculumId: cloneRef(context.curriculumRef),
    curriculumVersionRef: cloneRef(context.curriculumVersionRef),
    authorityState: context.curriculumState,
    ...(context.approvalDecisionRef ? { authorityReceiptRef: cloneRef(context.approvalDecisionRef) } : {}),
    structuralFingerprint: { ...handoff.structuralFootprint },
    applicabilityContext: {
      institutionRef: cloneRef(context.institutionRef),
      schoolYearRef: context.schoolYearRef,
      disciplineRef: context.disciplineRef,
      gradeRef: context.gradeRef,
      ...(context.sectionRef ? { sectionRef: context.sectionRef } : {}),
      ...(context.cohortRef ? { cohortRef: context.cohortRef } : {}),
      applicabilityStatus: context.applicabilityStatus,
      transitionRuleRef: cloneRef(context.transitionRuleRef),
    },
    provenanceRefs: dedupeRefs([
      ...context.sourceRefs,
      ...context.transitionRemodulation.sourceRefs,
      ...context.requirements.flatMap((requirement) => requirement.sourceRefs),
      ...handoff.annualPlanningFramework.provenance.sourceRefs,
    ]),
    planningSemantics: {
      requirements: context.requirements.map((requirement) => ({
        requirementId: requirement.requirementId,
        kind: requirement.kind,
        authorityLevel: requirement.authorityLevel,
        curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
        coverageRequired: requirement.coverageRequired,
        sourceRefs: requirement.sourceRefs.map(cloneRef),
        ...(requirement.transitionOriginRef ? { transitionOriginRef: cloneRef(requirement.transitionOriginRef) } : {}),
      })),
      nodeRefs: dedupeRefs([
        ...context.requirements.map((requirement) => requirement.curriculumNodeRef),
        ...frameworkNodeRefs(handoff),
      ]),
    },
    issuedAt: handoff.generatedAt,
    privacyClass: 'PROFESSIONAL_NON_PERSONAL',
    downstreamPolicy: {
      targetProduct: 'DOCENTE_OS',
      importMode: 'PREVIEW_ONLY',
      acceptanceRequired: true,
      automaticWriteAllowed: false,
    },
  }
}

/**
 * Projects the already persisted teacher acceptance as a working context.
 * Institutional authority remains a referenced Arena fact; Docente OS gains
 * no institutional authority from this projection.
 */
export function projectTeacherCurriculumContextV1(
  current: AnnualPlanCurriculumBaselineSnapshot,
): TeacherCurriculumContextV1 {
  const context = current.curricularContext
  return {
    contract: CML_TEACHER_CURRICULUM_CONTEXT_V1,
    sourceProduct: 'CURMANLIGHT_ARENA',
    sourceReleaseContract: CML_CURRICULUM_RELEASE_CONTRACT_V1,
    localAuthorityEffect: 'NONE',
    teacherAcceptanceState: 'ACCEPTED_FOR_PROFESSIONAL_PLANNING',
    curriculumRef: cloneRef(context.curriculumRef),
    curriculumVersionRef: cloneRef(context.curriculumVersionRef),
    institutionalAuthorityState: current.curriculumState,
    ...(context.approvalDecisionRef
      ? { institutionalAuthorityReceiptRef: cloneRef(context.approvalDecisionRef) }
      : {}),
    sourceHandoffFingerprintHash: current.sourceHandoffFootprintHash,
    scope: {
      institutionRef: cloneRef(context.institutionRef),
      schoolYearRef: current.schoolYearRef,
      disciplineRef: current.disciplineRef,
      gradeRef: current.gradeRef,
      ...(context.sectionRef ? { sectionRef: context.sectionRef } : {}),
      ...(context.cohortRef ? { cohortRef: context.cohortRef } : {}),
    },
    requirementRefs: context.requirements.map((requirement) => ({
      requirementId: requirement.requirementId,
      curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
      authorityLevel: requirement.authorityLevel,
      coverageRequired: requirement.coverageRequired,
    })),
    teacherDecisionRef: current.acceptanceDecisionId,
    acceptedAt: current.acceptedAt,
    requiresRevalidationOnApproval: current.requiresRevalidationOnApproval,
  }
}

/**
 * Single C1 receiver orchestration. It delegates to the established acceptance
 * and revalidation domains and never authorizes persistence by itself.
 */
export function prepareCurriculumReleaseIntake(input: {
  current: AnnualPlanCurriculumBaselineSnapshot | null
  incoming: CmlLocalHandoffV2
}): CurriculumReleaseIntakeResult {
  const release = projectReceivedCurriculumReleaseV1(input.incoming)
  const importState = classifyCurriculumImportState({ current: input.current, incoming: input.incoming })

  if (importState === 'NEW') {
    return {
      importState,
      mode: 'INITIAL_TEACHER_REVIEW',
      persistenceAllowed: false,
      release,
      review: buildAnnualPlanFrameworkReviewDraftV2(input.incoming),
    }
  }

  if (!input.current) throw new Error('curriculum intake state is incoherent without a current context')

  if (importState === 'ALREADY_KNOWN') {
    return {
      importState,
      mode: 'CURRENT_CONTEXT',
      persistenceAllowed: false,
      release,
      teacherContext: projectTeacherCurriculumContextV1(input.current),
    }
  }

  if (input.incoming.curricularContext.curriculumState === 'PROVISIONAL_COMPLETE') {
    if (input.current.curriculumState === 'APPROVED') {
      throw new Error('curriculum intake cannot downgrade an approved teacher context to a provisional release')
    }
    return {
      importState,
      mode: 'PROVISIONAL_UPDATE_REVIEW',
      persistenceAllowed: false,
      release,
      review: buildAnnualPlanFrameworkReviewDraftV2(input.incoming),
    }
  }

  return {
    importState,
    mode: 'APPROVED_REVALIDATION',
    persistenceAllowed: false,
    release,
    review: buildApprovedCurriculumRevalidationReview({
      current: input.current,
      incoming: input.incoming,
    }),
  }
}
