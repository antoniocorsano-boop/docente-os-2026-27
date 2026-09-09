import type { CmlCanonicalRef } from '@/core/domain/cml-local-handoff'
import {
  buildCurriculumFeedbackPreview,
  submitCurriculumFeedback,
  type CurriculumFeedbackCategory,
  type CurriculumFeedbackDraft,
  type CurriculumFeedbackPreview,
  type CurriculumFeedbackSubmission,
} from '@/core/domain/cml-curriculum-feedback'
import type { UdaCurriculumBindingV1 } from './cml-uda-curriculum-binding-v1'
import type {
  TeachingFeedbackCycleV1,
  TeachingUdaExecutionContextV1,
} from './cml-teaching-evidence-feedback-cycle-v1'

export const CML_TEACHER_CURRICULUM_REVIEW_V1 = 'CML_TEACHER_CURRICULUM_REVIEW_V1' as const
export const CML_PROFESSIONAL_CURRICULUM_OBSERVATION_V1 = 'CML_PROFESSIONAL_CURRICULUM_OBSERVATION_V1' as const

export type TeacherCurriculumReviewV1 = {
  contract: typeof CML_TEACHER_CURRICULUM_REVIEW_V1
  reviewId: string
  reviewedAt: string
  category: CurriculumFeedbackCategory
  baseline: {
    curricularContextId: string
    curriculumVersionRef: CmlCanonicalRef
    sourceHandoffFootprintHash: string
    sourceFrameworkMessageId: string
  }
  uda: {
    bindingId: string
    code: string
    assetId: string
    generationId: string
  }
  alignedRequirementIds: string[]
  alignedNodeRefs: CmlCanonicalRef[]
  aggregateEvidence: {
    executionContextCount: number
    completedFeedbackCycleCount: number
    sectionCount: number
  }
  professionalEvidenceRef: CmlCanonicalRef
  summary: string
  privacyClass: 'PROFESSIONAL_NON_PERSONAL'
  rawClassroomDataIncluded: false
  pupilLevelDataIncluded: false
  teacherConfirmationRequired: true
  localInstitutionalAuthorityEffect: 'NONE'
  curriculumMutationEffect: 'NONE'
  externalTransportAllowed: false
}

export type ProfessionalCurriculumObservationV1 = {
  contract: typeof CML_PROFESSIONAL_CURRICULUM_OBSERVATION_V1
  review: TeacherCurriculumReviewV1
  draft: CurriculumFeedbackDraft
  preview: CurriculumFeedbackPreview
  sourceProduct: 'DOCENTE_OS'
  targetProduct: 'CURMANLIGHT_ARENA'
  observationEffect: 'REVIEW_INPUT_ONLY'
  institutionalAuthorityEffect: 'NONE'
  automaticTransportAllowed: false
}

const FORBIDDEN_REVIEW_KEYS = new Set([
  'student',
  'studentId',
  'studentName',
  'studentGrade',
  'pupil',
  'pupilId',
  'pupilName',
  'pupilGrade',
  'alunno',
  'alunna',
  'alunni',
  'localSubjectRef',
  'grades',
  'attendance',
  'feedbackHistory',
  'learnerFeedback',
  'rawEvidence',
  'rawClassroomEvents',
  'teacherObservation',
  'assessmentResult',
  'individualAssessment',
])

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

function refKey(ref: CmlCanonicalRef): string {
  return `${ref.namespace}|${ref.entityType}|${ref.entityId}|${ref.versionId ?? ''}`
}

function sameRef(left: CmlCanonicalRef, right: CmlCanonicalRef): boolean {
  return refKey(left) === refKey(right)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function scanForbiddenReviewKeys(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => scanForbiddenReviewKeys(entry, `${path}[${index}]`))
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(FORBIDDEN_REVIEW_KEYS.has(key) ? [`${path}.${key}`] : []),
    ...scanForbiddenReviewKeys(entry, `${path}.${key}`),
  ])
}

function dedupeRefs(refs: CmlCanonicalRef[]) {
  const seen = new Set<string>()
  const result: CmlCanonicalRef[] = []
  for (const ref of refs) {
    const key = refKey(ref)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(cloneRef(ref))
  }
  return result
}

function assertIsoDate(field: string, value: string) {
  if (!nonEmpty(value) || Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO-compatible date`)
}

function assertProfessionalSummary(summary: string) {
  const trimmed = summary.trim()
  if (trimmed.length < 10 || trimmed.length > 2000) {
    throw new Error('professional curriculum review summary must contain 10-2000 characters')
  }
}

function assertUdaBinding(binding: UdaCurriculumBindingV1) {
  if (binding.contract !== 'CML_UDA_CURRICULUM_BINDING_V1') {
    throw new Error('professional curriculum review requires UdaCurriculumBindingV1')
  }
  if (binding.localInstitutionalAuthorityEffect !== 'NONE' || binding.sectionExecutionEffect !== 'NONE') {
    throw new Error('professional curriculum review cannot inherit institutional authority or section execution state from UDA binding')
  }
  if (!nonEmpty(binding.curriculum.sourceHandoffFingerprintHash)) {
    throw new Error('professional curriculum review requires the accepted curriculum footprint')
  }
}

function assertExecutionContextMatchesUda(
  context: TeachingUdaExecutionContextV1,
  udaBinding: UdaCurriculumBindingV1,
) {
  if (context.contract !== 'CML_TEACHING_UDA_EXECUTION_CONTEXT_V1') {
    throw new Error('professional curriculum review requires TeachingUdaExecutionContextV1 inputs')
  }
  if (context.privacyClass !== 'LOCAL_EDUCATIONAL_RECORD' || context.externalTransportAllowed !== false) {
    throw new Error('teaching execution context must remain a non-transportable local educational record')
  }
  if (context.udaBinding.bindingId !== udaBinding.bindingId
    || context.udaBinding.udaCode !== udaBinding.uda.code
    || context.udaBinding.udaAssetId !== udaBinding.uda.assetId
    || context.udaBinding.udaGenerationId !== udaBinding.uda.generationId) {
    throw new Error('teaching execution context belongs to another UDA binding')
  }
  if (!sameRef(context.udaBinding.curriculumVersionRef, udaBinding.curriculum.curriculumVersionRef)
    || context.udaBinding.sourceHandoffFingerprintHash !== udaBinding.curriculum.sourceHandoffFingerprintHash) {
    throw new Error('teaching execution context belongs to another accepted curriculum footprint')
  }
}

function assertCycleMatchesContext(
  cycle: TeachingFeedbackCycleV1,
  contextsById: Map<string, TeachingUdaExecutionContextV1>,
) {
  if (cycle.contract !== 'CML_TEACHING_FEEDBACK_CYCLE_V1' || cycle.state !== 'COMPLETE') {
    throw new Error('professional curriculum review requires completed TeachingFeedbackCycleV1 inputs')
  }
  if (cycle.externalTransportAllowed !== false
    || cycle.curriculumFeedbackEffect !== 'NONE'
    || cycle.curriculumFeedbackRequiresProfessionalAggregation !== true
    || cycle.studentDataMustBeExcludedFromCurriculumFeedback !== true) {
    throw new Error('teaching feedback cycle violates the C4/C5 professional aggregation boundary')
  }
  const context = contextsById.get(cycle.executionContextId)
  if (!context
    || cycle.sessionId !== context.session.sessionId
    || cycle.sectionId !== context.session.sectionId) {
    throw new Error('teaching feedback cycle does not belong to a supplied execution context')
  }
}

function selectAlignedRequirements(input: {
  udaBinding: UdaCurriculumBindingV1
  requirementIds?: string[]
}) {
  const available = new Map(input.udaBinding.requirementBindings.map((requirement) => [requirement.requirementId, requirement]))
  const selected = input.requirementIds ?? [...available.keys()]
  if (selected.length === 0) throw new Error('professional curriculum review requires at least one aligned curriculum requirement')
  if (new Set(selected).size !== selected.length) throw new Error('professional curriculum review contains duplicate requirementIds')

  return selected.map((requirementId) => {
    const requirement = available.get(requirementId)
    if (!requirement) throw new Error(`unknown curriculum requirement for professional review: ${requirementId}`)
    return requirement
  })
}

export function createTeacherCurriculumReviewV1(input: {
  reviewId: string
  reviewedAt: string
  sourceVersion: string
  curricularContextId: string
  sourceFrameworkMessageId: string
  category: CurriculumFeedbackCategory
  summary: string
  udaBinding: UdaCurriculumBindingV1
  executionContexts: TeachingUdaExecutionContextV1[]
  feedbackCycles: TeachingFeedbackCycleV1[]
  requirementIds?: string[]
  institutionalAuthorityClaim?: string
}): TeacherCurriculumReviewV1 {
  const forbidden = scanForbiddenReviewKeys(input)
  if (forbidden.length > 0) {
    throw new Error(`professional curriculum review contains forbidden pupil/raw-classroom fields: ${forbidden.join(', ')}`)
  }
  if (input.institutionalAuthorityClaim !== undefined && input.institutionalAuthorityClaim !== 'NONE') {
    throw new Error('teacher professional review cannot claim institutional curriculum authority')
  }
  if (!nonEmpty(input.reviewId)
    || !nonEmpty(input.sourceVersion)
    || !nonEmpty(input.curricularContextId)
    || !nonEmpty(input.sourceFrameworkMessageId)) {
    throw new Error('professional curriculum review identity and baseline are required')
  }
  assertIsoDate('reviewedAt', input.reviewedAt)
  assertProfessionalSummary(input.summary)
  assertUdaBinding(input.udaBinding)
  if (input.executionContexts.length === 0) throw new Error('professional curriculum review requires at least one teaching execution context')
  if (input.feedbackCycles.length === 0) throw new Error('professional curriculum review requires at least one completed teaching feedback cycle')

  const contextsById = new Map<string, TeachingUdaExecutionContextV1>()
  for (const context of input.executionContexts) {
    assertExecutionContextMatchesUda(context, input.udaBinding)
    if (contextsById.has(context.executionContextId)) throw new Error(`duplicate teaching execution context: ${context.executionContextId}`)
    contextsById.set(context.executionContextId, context)
  }

  const cycleIds = new Set<string>()
  for (const cycle of input.feedbackCycles) {
    if (cycleIds.has(cycle.cycleId)) throw new Error(`duplicate teaching feedback cycle: ${cycle.cycleId}`)
    cycleIds.add(cycle.cycleId)
    assertCycleMatchesContext(cycle, contextsById)
  }

  const alignedRequirements = selectAlignedRequirements({
    udaBinding: input.udaBinding,
    requirementIds: input.requirementIds,
  })
  const sections = new Set(input.feedbackCycles.map((cycle) => cycle.sectionId))
  const professionalEvidenceRef: CmlCanonicalRef = {
    namespace: 'docente.os',
    entityType: 'TeacherCurriculumReviewEvidence',
    entityId: input.reviewId,
    versionId: '1',
  }

  return {
    contract: CML_TEACHER_CURRICULUM_REVIEW_V1,
    reviewId: input.reviewId,
    reviewedAt: input.reviewedAt,
    category: input.category,
    baseline: {
      curricularContextId: input.curricularContextId,
      curriculumVersionRef: cloneRef(input.udaBinding.curriculum.curriculumVersionRef),
      sourceHandoffFootprintHash: input.udaBinding.curriculum.sourceHandoffFingerprintHash,
      sourceFrameworkMessageId: input.sourceFrameworkMessageId,
    },
    uda: {
      bindingId: input.udaBinding.bindingId,
      code: input.udaBinding.uda.code,
      assetId: input.udaBinding.uda.assetId,
      generationId: input.udaBinding.uda.generationId,
    },
    alignedRequirementIds: alignedRequirements.map((requirement) => requirement.requirementId),
    alignedNodeRefs: dedupeRefs(alignedRequirements.map((requirement) => requirement.curriculumNodeRef)),
    aggregateEvidence: {
      executionContextCount: input.executionContexts.length,
      completedFeedbackCycleCount: input.feedbackCycles.length,
      sectionCount: sections.size,
    },
    professionalEvidenceRef,
    summary: input.summary.trim(),
    privacyClass: 'PROFESSIONAL_NON_PERSONAL',
    rawClassroomDataIncluded: false,
    pupilLevelDataIncluded: false,
    teacherConfirmationRequired: true,
    localInstitutionalAuthorityEffect: 'NONE',
    curriculumMutationEffect: 'NONE',
    externalTransportAllowed: false,
  }
}

export function projectProfessionalCurriculumObservationV1(input: {
  review: TeacherCurriculumReviewV1
  sourceVersion: string
}): ProfessionalCurriculumObservationV1 {
  if (input.review.contract !== CML_TEACHER_CURRICULUM_REVIEW_V1) {
    throw new Error('professional observation projection requires TeacherCurriculumReviewV1')
  }
  if (input.review.rawClassroomDataIncluded !== false
    || input.review.pupilLevelDataIncluded !== false
    || input.review.localInstitutionalAuthorityEffect !== 'NONE'
    || input.review.curriculumMutationEffect !== 'NONE') {
    throw new Error('teacher curriculum review violates the professional observation boundary')
  }
  if (!nonEmpty(input.sourceVersion)) throw new Error('sourceVersion is required')

  const draft: CurriculumFeedbackDraft = {
    feedbackId: input.review.reviewId,
    sourceVersion: input.sourceVersion,
    submittedAt: input.review.reviewedAt,
    baseline: {
      ...input.review.baseline,
      curriculumVersionRef: cloneRef(input.review.baseline.curriculumVersionRef),
    },
    category: input.review.category,
    alignedNodeRefs: input.review.alignedNodeRefs.map(cloneRef),
    evidenceRefs: [cloneRef(input.review.professionalEvidenceRef)],
    summary: input.review.summary,
    privacyAttestation: 'NO_STUDENT_PERSONAL_DATA',
  }
  const preview = buildCurriculumFeedbackPreview(draft)

  return {
    contract: CML_PROFESSIONAL_CURRICULUM_OBSERVATION_V1,
    review: {
      ...input.review,
      baseline: {
        ...input.review.baseline,
        curriculumVersionRef: cloneRef(input.review.baseline.curriculumVersionRef),
      },
      uda: { ...input.review.uda },
      alignedRequirementIds: [...input.review.alignedRequirementIds],
      alignedNodeRefs: input.review.alignedNodeRefs.map(cloneRef),
      aggregateEvidence: { ...input.review.aggregateEvidence },
      professionalEvidenceRef: cloneRef(input.review.professionalEvidenceRef),
    },
    draft,
    preview,
    sourceProduct: 'DOCENTE_OS',
    targetProduct: 'CURMANLIGHT_ARENA',
    observationEffect: 'REVIEW_INPUT_ONLY',
    institutionalAuthorityEffect: 'NONE',
    automaticTransportAllowed: false,
  }
}

export function submitProfessionalCurriculumObservationV1(input: {
  observation: ProfessionalCurriculumObservationV1
  teacherConfirmed: boolean
}): CurriculumFeedbackSubmission {
  if (input.observation.contract !== CML_PROFESSIONAL_CURRICULUM_OBSERVATION_V1) {
    throw new Error('professional curriculum observation contract is invalid')
  }
  if (input.observation.observationEffect !== 'REVIEW_INPUT_ONLY'
    || input.observation.institutionalAuthorityEffect !== 'NONE'
    || input.observation.automaticTransportAllowed !== false) {
    throw new Error('professional curriculum observation cannot confer authority or transport itself automatically')
  }
  return submitCurriculumFeedback({
    draft: input.observation.draft,
    teacherConfirmed: input.teacherConfirmed,
  })
}
