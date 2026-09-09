import type { CmlCanonicalRef } from '@/core/domain/cml-local-handoff'
import {
  validateTeachingSessionAllocations,
  type TeachingSessionAllocationRecord,
  type TeachingSessionRecord,
} from '@/core/domain/teaching-session'
import type { UdaCurriculumBindingV1 } from './cml-uda-curriculum-binding-v1'

export const CML_TEACHING_UDA_EXECUTION_CONTEXT_V1 = 'CML_TEACHING_UDA_EXECUTION_CONTEXT_V1' as const
export const CML_CLASSROOM_EVIDENCE_V1 = 'CML_CLASSROOM_EVIDENCE_V1' as const
export const CML_FORMATIVE_FEEDBACK_V1 = 'CML_FORMATIVE_FEEDBACK_V1' as const
export const CML_LEARNER_RESPONSE_V1 = 'CML_LEARNER_RESPONSE_V1' as const
export const CML_ASSESSMENT_OBSERVATION_V1 = 'CML_ASSESSMENT_OBSERVATION_V1' as const
export const CML_TEACHING_FEEDBACK_CYCLE_V1 = 'CML_TEACHING_FEEDBACK_CYCLE_V1' as const

export type EducationalRecordPrivacyClass = 'LOCAL_EDUCATIONAL_RECORD'
export type EvidenceSubjectScope = 'CLASS' | 'GROUP' | 'INDIVIDUAL'
export type ClassroomEvidenceKind = 'PRODUCT' | 'PERFORMANCE' | 'PROCESS' | 'EXPLANATION' | 'SELF_ASSESSMENT' | 'OTHER'
export type LearnerResponseAction = 'REVISION' | 'RETRY' | 'EXPLANATION' | 'APPLICATION' | 'SELF_CORRECTION'

export type LocalLearningSubjectRef = {
  scope: EvidenceSubjectScope
  /** Opaque local reference only. Never transported to curriculum-governance feedback. */
  localSubjectRef: string | null
}

export type TeachingUdaExecutionContextV1 = {
  contract: typeof CML_TEACHING_UDA_EXECUTION_CONTEXT_V1
  executionContextId: string
  session: {
    sessionId: string
    sectionId: string
    localDate: string
    actualMinutes: number
    supersedesSessionId: string | null
  }
  udaBinding: {
    bindingId: string
    udaCode: string
    udaAssetId: string
    udaGenerationId: string
    canonicalPlanAssetId: string
    canonicalPlanGenerationId: string
    blockIds: string[]
    curriculumVersionRef: CmlCanonicalRef
    sourceHandoffFingerprintHash: string
    curriculumRequirementIds: string[]
  }
  allocations: Array<{
    allocationId: string
    blockId: string
    minutes: number
  }>
  createdAt: string
  privacyClass: EducationalRecordPrivacyClass
  externalTransportAllowed: false
  localInstitutionalAuthorityEffect: 'NONE'
  historicalBindingImmutable: true
}

export type ClassroomEvidenceV1 = {
  contract: typeof CML_CLASSROOM_EVIDENCE_V1
  evidenceId: string
  executionContextId: string
  sessionId: string
  sectionId: string
  subject: LocalLearningSubjectRef
  kind: ClassroomEvidenceKind
  sourceRef: string
  observedAt: string
  curriculumRequirementIds: string[]
  teacherObservation: string
  supersedesEvidenceId: string | null
  privacyClass: EducationalRecordPrivacyClass
  externalTransportAllowed: false
  automaticAssessmentEffect: 'NONE'
  curriculumMutationEffect: 'NONE'
}

export type FormativeFeedbackV1 = {
  contract: typeof CML_FORMATIVE_FEEDBACK_V1
  feedbackId: string
  executionContextId: string
  sessionId: string
  sectionId: string
  evidenceId: string
  subject: LocalLearningSubjectRef
  curriculumRequirementIds: string[]
  issuedAt: string
  strength: string
  nextStep: string
  responseExpected: boolean
  privacyClass: EducationalRecordPrivacyClass
  externalTransportAllowed: false
  assessmentEffect: 'NONE'
  automaticGradeAllowed: false
}

export type LearnerResponseV1 = {
  contract: typeof CML_LEARNER_RESPONSE_V1
  responseId: string
  executionContextId: string
  sessionId: string
  sectionId: string
  feedbackId: string
  originalEvidenceId: string
  revisedEvidenceId: string
  subject: LocalLearningSubjectRef
  action: LearnerResponseAction
  respondedAt: string
  privacyClass: EducationalRecordPrivacyClass
  externalTransportAllowed: false
  assessmentEffect: 'NONE'
}

export type TeacherAssessmentObservationV1 = {
  contract: typeof CML_ASSESSMENT_OBSERVATION_V1
  observationId: string
  executionContextId: string
  sessionId: string
  sectionId: string
  subject: LocalLearningSubjectRef
  evidenceIds: string[]
  curriculumRequirementIds: string[]
  observedAt: string
  summary: string
  assessmentUse: 'MAY_INFORM_TEACHER_ASSESSMENT'
  requiresTeacherJudgment: true
  automaticGradeAllowed: false
  curriculumMutationEffect: 'NONE'
  externalTransportAllowed: false
}

export type TeachingFeedbackCycleV1 = {
  contract: typeof CML_TEACHING_FEEDBACK_CYCLE_V1
  cycleId: string
  executionContextId: string
  sessionId: string
  sectionId: string
  initialEvidenceId: string
  feedbackId: string
  learnerResponseId: string
  revisedEvidenceId: string
  assessmentObservationId: string
  state: 'COMPLETE'
  externalTransportAllowed: false
  curriculumFeedbackEffect: 'NONE'
  curriculumFeedbackRequiresProfessionalAggregation: true
  studentDataMustBeExcludedFromCurriculumFeedback: true
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function assertIsoDate(field: string, value: string) {
  if (!nonEmpty(value) || Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO-compatible date`)
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

function sameSubject(left: LocalLearningSubjectRef, right: LocalLearningSubjectRef) {
  return left.scope === right.scope && left.localSubjectRef === right.localSubjectRef
}

function cloneSubject(subject: LocalLearningSubjectRef): LocalLearningSubjectRef {
  return { ...subject }
}

function assertSubject(subject: LocalLearningSubjectRef) {
  if (!['CLASS', 'GROUP', 'INDIVIDUAL'].includes(subject.scope)) throw new Error('learning subject scope is invalid')
  if (subject.scope === 'CLASS' && subject.localSubjectRef !== null) {
    throw new Error('CLASS evidence must not carry a local subject reference')
  }
  if (subject.scope !== 'CLASS' && !nonEmpty(subject.localSubjectRef)) {
    throw new Error(`${subject.scope} evidence requires an opaque local subject reference`)
  }
}

function selectRequirementIds(input: {
  allowedIds: string[]
  requestedIds?: string[]
  label: string
}) {
  const selected = input.requestedIds ?? [...input.allowedIds]
  if (selected.length === 0) throw new Error(`${input.label} requires at least one curriculum requirement`)
  if (new Set(selected).size !== selected.length) throw new Error(`${input.label} contains duplicate curriculum requirement ids`)
  const allowed = new Set(input.allowedIds)
  for (const requirementId of selected) {
    if (!allowed.has(requirementId)) throw new Error(`unknown curriculum requirement for ${input.label}: ${requirementId}`)
  }
  return selected
}

function assertEvidenceBelongsToContext(evidence: ClassroomEvidenceV1, context: TeachingUdaExecutionContextV1) {
  if (
    evidence.executionContextId !== context.executionContextId
    || evidence.sessionId !== context.session.sessionId
    || evidence.sectionId !== context.session.sectionId
  ) {
    throw new Error('classroom evidence does not belong to the teaching execution context')
  }
}

export function createTeachingUdaExecutionContextV1(input: {
  executionContextId: string
  session: TeachingSessionRecord
  allocations: TeachingSessionAllocationRecord[]
  udaBinding: UdaCurriculumBindingV1
  createdAt: string
}): TeachingUdaExecutionContextV1 {
  if (!nonEmpty(input.executionContextId)) throw new Error('executionContextId is required')
  assertIsoDate('createdAt', input.createdAt)
  if (!nonEmpty(input.session.id) || !nonEmpty(input.session.sectionId)) throw new Error('teaching session identity and section are required')
  if (input.allocations.length === 0) throw new Error('teaching UDA execution requires at least one session allocation')
  if (input.udaBinding.contract !== 'CML_UDA_CURRICULUM_BINDING_V1') throw new Error('teaching execution requires UdaCurriculumBindingV1')

  const validation = validateTeachingSessionAllocations({
    session: input.session,
    allocations: input.allocations.map((allocation) => ({
      blockId: allocation.blockId,
      minutes: allocation.minutes,
      canonicalPlanAssetId: allocation.canonicalPlanAssetId,
      canonicalGenerationId: allocation.canonicalGenerationId,
    })),
    context: {
      sectionId: input.session.sectionId,
      canonicalPlanAssetId: input.udaBinding.canonicalPlan.assetId,
      canonicalGenerationId: input.udaBinding.canonicalPlan.generationId,
    },
  })
  if (!validation.valid) {
    throw new Error(`teaching session allocation validation failed: ${validation.codes.join(',')}`)
  }

  const udaBlocks = new Set(input.udaBinding.canonicalPlan.blockIds)
  for (const allocation of input.allocations) {
    if (allocation.sessionId !== input.session.id) throw new Error('session allocation belongs to another teaching session')
    if (!udaBlocks.has(allocation.blockId)) throw new Error(`session allocation ${allocation.blockId} does not belong to bound UDA`)
  }

  return {
    contract: CML_TEACHING_UDA_EXECUTION_CONTEXT_V1,
    executionContextId: input.executionContextId,
    session: {
      sessionId: input.session.id,
      sectionId: input.session.sectionId,
      localDate: input.session.localDate,
      actualMinutes: input.session.actualMinutes,
      supersedesSessionId: input.session.supersedesSessionId,
    },
    udaBinding: {
      bindingId: input.udaBinding.bindingId,
      udaCode: input.udaBinding.uda.code,
      udaAssetId: input.udaBinding.uda.assetId,
      udaGenerationId: input.udaBinding.uda.generationId,
      canonicalPlanAssetId: input.udaBinding.canonicalPlan.assetId,
      canonicalPlanGenerationId: input.udaBinding.canonicalPlan.generationId,
      blockIds: [...input.udaBinding.canonicalPlan.blockIds],
      curriculumVersionRef: cloneRef(input.udaBinding.curriculum.curriculumVersionRef),
      sourceHandoffFingerprintHash: input.udaBinding.curriculum.sourceHandoffFingerprintHash,
      curriculumRequirementIds: input.udaBinding.requirementBindings.map((item) => item.requirementId),
    },
    allocations: input.allocations.map((allocation) => ({
      allocationId: allocation.id,
      blockId: allocation.blockId,
      minutes: allocation.minutes,
    })),
    createdAt: input.createdAt,
    privacyClass: 'LOCAL_EDUCATIONAL_RECORD',
    externalTransportAllowed: false,
    localInstitutionalAuthorityEffect: 'NONE',
    historicalBindingImmutable: true,
  }
}

export function createClassroomEvidenceV1(input: {
  evidenceId: string
  context: TeachingUdaExecutionContextV1
  subject: LocalLearningSubjectRef
  kind: ClassroomEvidenceKind
  sourceRef: string
  observedAt: string
  curriculumRequirementIds?: string[]
  teacherObservation: string
  supersedes?: ClassroomEvidenceV1 | null
}): ClassroomEvidenceV1 {
  if (!nonEmpty(input.evidenceId) || !nonEmpty(input.sourceRef)) throw new Error('evidence identity and sourceRef are required')
  assertIsoDate('observedAt', input.observedAt)
  assertSubject(input.subject)
  if (!['PRODUCT', 'PERFORMANCE', 'PROCESS', 'EXPLANATION', 'SELF_ASSESSMENT', 'OTHER'].includes(input.kind)) {
    throw new Error('classroom evidence kind is invalid')
  }
  if (!nonEmpty(input.teacherObservation)) throw new Error('teacherObservation is required')

  const requirementIds = selectRequirementIds({
    allowedIds: input.context.udaBinding.curriculumRequirementIds,
    requestedIds: input.curriculumRequirementIds,
    label: 'classroom evidence',
  })

  if (input.supersedes) {
    assertEvidenceBelongsToContext(input.supersedes, input.context)
    if (!sameSubject(input.supersedes.subject, input.subject)) throw new Error('revised evidence must preserve the same learning subject')
  }

  return {
    contract: CML_CLASSROOM_EVIDENCE_V1,
    evidenceId: input.evidenceId,
    executionContextId: input.context.executionContextId,
    sessionId: input.context.session.sessionId,
    sectionId: input.context.session.sectionId,
    subject: cloneSubject(input.subject),
    kind: input.kind,
    sourceRef: input.sourceRef.trim(),
    observedAt: input.observedAt,
    curriculumRequirementIds: [...requirementIds],
    teacherObservation: input.teacherObservation.trim(),
    supersedesEvidenceId: input.supersedes?.evidenceId ?? null,
    privacyClass: 'LOCAL_EDUCATIONAL_RECORD',
    externalTransportAllowed: false,
    automaticAssessmentEffect: 'NONE',
    curriculumMutationEffect: 'NONE',
  }
}

export function createFormativeFeedbackV1(input: {
  feedbackId: string
  context: TeachingUdaExecutionContextV1
  evidence: ClassroomEvidenceV1
  curriculumRequirementIds?: string[]
  issuedAt: string
  strength: string
  nextStep: string
  responseExpected: boolean
}): FormativeFeedbackV1 {
  if (!nonEmpty(input.feedbackId)) throw new Error('feedbackId is required')
  assertIsoDate('issuedAt', input.issuedAt)
  assertEvidenceBelongsToContext(input.evidence, input.context)
  if (!nonEmpty(input.strength) || !nonEmpty(input.nextStep)) throw new Error('formative feedback requires strength and nextStep')

  const requirementIds = selectRequirementIds({
    allowedIds: input.evidence.curriculumRequirementIds,
    requestedIds: input.curriculumRequirementIds,
    label: 'formative feedback',
  })

  return {
    contract: CML_FORMATIVE_FEEDBACK_V1,
    feedbackId: input.feedbackId,
    executionContextId: input.context.executionContextId,
    sessionId: input.context.session.sessionId,
    sectionId: input.context.session.sectionId,
    evidenceId: input.evidence.evidenceId,
    subject: cloneSubject(input.evidence.subject),
    curriculumRequirementIds: [...requirementIds],
    issuedAt: input.issuedAt,
    strength: input.strength.trim(),
    nextStep: input.nextStep.trim(),
    responseExpected: input.responseExpected,
    privacyClass: 'LOCAL_EDUCATIONAL_RECORD',
    externalTransportAllowed: false,
    assessmentEffect: 'NONE',
    automaticGradeAllowed: false,
  }
}

export function createLearnerResponseV1(input: {
  responseId: string
  context: TeachingUdaExecutionContextV1
  feedback: FormativeFeedbackV1
  originalEvidence: ClassroomEvidenceV1
  revisedEvidence: ClassroomEvidenceV1
  action: LearnerResponseAction
  respondedAt: string
}): LearnerResponseV1 {
  if (!nonEmpty(input.responseId)) throw new Error('responseId is required')
  assertIsoDate('respondedAt', input.respondedAt)
  if (!['REVISION', 'RETRY', 'EXPLANATION', 'APPLICATION', 'SELF_CORRECTION'].includes(input.action)) {
    throw new Error('learner response action is invalid')
  }
  assertEvidenceBelongsToContext(input.originalEvidence, input.context)
  assertEvidenceBelongsToContext(input.revisedEvidence, input.context)
  if (input.feedback.executionContextId !== input.context.executionContextId
    || input.feedback.evidenceId !== input.originalEvidence.evidenceId) {
    throw new Error('learner response feedback does not target the original evidence in this execution context')
  }
  if (input.revisedEvidence.supersedesEvidenceId !== input.originalEvidence.evidenceId) {
    throw new Error('learner response requires revised evidence that explicitly supersedes the original evidence')
  }
  if (!sameSubject(input.feedback.subject, input.originalEvidence.subject)
    || !sameSubject(input.originalEvidence.subject, input.revisedEvidence.subject)) {
    throw new Error('learner response chain must preserve the same learning subject')
  }

  return {
    contract: CML_LEARNER_RESPONSE_V1,
    responseId: input.responseId,
    executionContextId: input.context.executionContextId,
    sessionId: input.context.session.sessionId,
    sectionId: input.context.session.sectionId,
    feedbackId: input.feedback.feedbackId,
    originalEvidenceId: input.originalEvidence.evidenceId,
    revisedEvidenceId: input.revisedEvidence.evidenceId,
    subject: cloneSubject(input.originalEvidence.subject),
    action: input.action,
    respondedAt: input.respondedAt,
    privacyClass: 'LOCAL_EDUCATIONAL_RECORD',
    externalTransportAllowed: false,
    assessmentEffect: 'NONE',
  }
}

export function createTeacherAssessmentObservationV1(input: {
  observationId: string
  context: TeachingUdaExecutionContextV1
  response: LearnerResponseV1
  originalEvidence: ClassroomEvidenceV1
  revisedEvidence: ClassroomEvidenceV1
  curriculumRequirementIds?: string[]
  observedAt: string
  summary: string
}): TeacherAssessmentObservationV1 {
  if (!nonEmpty(input.observationId)) throw new Error('observationId is required')
  assertIsoDate('observedAt', input.observedAt)
  if (!nonEmpty(input.summary)) throw new Error('assessment observation summary is required')
  assertEvidenceBelongsToContext(input.originalEvidence, input.context)
  assertEvidenceBelongsToContext(input.revisedEvidence, input.context)
  if (input.response.executionContextId !== input.context.executionContextId
    || input.response.originalEvidenceId !== input.originalEvidence.evidenceId
    || input.response.revisedEvidenceId !== input.revisedEvidence.evidenceId) {
    throw new Error('assessment observation does not match the learner response evidence chain')
  }
  if (!sameSubject(input.response.subject, input.revisedEvidence.subject)) {
    throw new Error('assessment observation must preserve the learning subject of the response chain')
  }

  const allowedIds = [...new Set([
    ...input.originalEvidence.curriculumRequirementIds,
    ...input.revisedEvidence.curriculumRequirementIds,
  ])]
  const requirementIds = selectRequirementIds({
    allowedIds,
    requestedIds: input.curriculumRequirementIds,
    label: 'assessment observation',
  })

  return {
    contract: CML_ASSESSMENT_OBSERVATION_V1,
    observationId: input.observationId,
    executionContextId: input.context.executionContextId,
    sessionId: input.context.session.sessionId,
    sectionId: input.context.session.sectionId,
    subject: cloneSubject(input.revisedEvidence.subject),
    evidenceIds: [input.originalEvidence.evidenceId, input.revisedEvidence.evidenceId],
    curriculumRequirementIds: [...requirementIds],
    observedAt: input.observedAt,
    summary: input.summary.trim(),
    assessmentUse: 'MAY_INFORM_TEACHER_ASSESSMENT',
    requiresTeacherJudgment: true,
    automaticGradeAllowed: false,
    curriculumMutationEffect: 'NONE',
    externalTransportAllowed: false,
  }
}

export function composeTeachingFeedbackCycleV1(input: {
  cycleId: string
  context: TeachingUdaExecutionContextV1
  initialEvidence: ClassroomEvidenceV1
  feedback: FormativeFeedbackV1
  learnerResponse: LearnerResponseV1
  revisedEvidence: ClassroomEvidenceV1
  assessmentObservation: TeacherAssessmentObservationV1
}): TeachingFeedbackCycleV1 {
  if (!nonEmpty(input.cycleId)) throw new Error('cycleId is required')
  assertEvidenceBelongsToContext(input.initialEvidence, input.context)
  assertEvidenceBelongsToContext(input.revisedEvidence, input.context)
  if (input.feedback.executionContextId !== input.context.executionContextId
    || input.feedback.evidenceId !== input.initialEvidence.evidenceId) {
    throw new Error('feedback cycle contains feedback outside the initial evidence chain')
  }
  if (input.learnerResponse.executionContextId !== input.context.executionContextId
    || input.learnerResponse.feedbackId !== input.feedback.feedbackId
    || input.learnerResponse.originalEvidenceId !== input.initialEvidence.evidenceId
    || input.learnerResponse.revisedEvidenceId !== input.revisedEvidence.evidenceId) {
    throw new Error('feedback cycle contains an incoherent learner response chain')
  }
  if (input.assessmentObservation.executionContextId !== input.context.executionContextId
    || input.assessmentObservation.evidenceIds[0] !== input.initialEvidence.evidenceId
    || input.assessmentObservation.evidenceIds[1] !== input.revisedEvidence.evidenceId) {
    throw new Error('feedback cycle assessment observation does not close the evidence chain')
  }

  return {
    contract: CML_TEACHING_FEEDBACK_CYCLE_V1,
    cycleId: input.cycleId,
    executionContextId: input.context.executionContextId,
    sessionId: input.context.session.sessionId,
    sectionId: input.context.session.sectionId,
    initialEvidenceId: input.initialEvidence.evidenceId,
    feedbackId: input.feedback.feedbackId,
    learnerResponseId: input.learnerResponse.responseId,
    revisedEvidenceId: input.revisedEvidence.evidenceId,
    assessmentObservationId: input.assessmentObservation.observationId,
    state: 'COMPLETE',
    externalTransportAllowed: false,
    curriculumFeedbackEffect: 'NONE',
    curriculumFeedbackRequiresProfessionalAggregation: true,
    studentDataMustBeExcludedFromCurriculumFeedback: true,
  }
}
