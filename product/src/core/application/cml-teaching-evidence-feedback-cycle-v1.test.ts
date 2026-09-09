import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TeacherCurriculumContextV1 } from '@/core/domain/cml-curriculum-release-intake-v1'
import { createPlanBlockCurriculumBindingV1 } from '@/core/domain/cml-plan-block-curriculum-binding-v1'
import type { TeachingSessionAllocationRecord, TeachingSessionRecord } from '@/core/domain/teaching-session'
import { createUdaCurriculumBindingV1 } from './cml-uda-curriculum-binding-v1'
import {
  composeTeachingFeedbackCycleV1,
  createClassroomEvidenceV1,
  createFormativeFeedbackV1,
  createLearnerResponseV1,
  createTeacherAssessmentObservationV1,
  createTeachingUdaExecutionContextV1,
  type LocalLearningSubjectRef,
} from './cml-teaching-evidence-feedback-cycle-v1'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

function teacherContext(): TeacherCurriculumContextV1 {
  return {
    contract: 'CML_TEACHER_CURRICULUM_CONTEXT_V1',
    sourceProduct: 'CURMANLIGHT_ARENA',
    sourceReleaseContract: 'CML_CURRICULUM_RELEASE_CONTRACT_V1',
    localAuthorityEffect: 'NONE',
    teacherAcceptanceState: 'ACCEPTED_FOR_PROFESSIONAL_PLANNING',
    curriculumRef: ref('InstituteCurriculum', 'technology'),
    curriculumVersionRef: ref('CurriculumVersionProjection', 'technology-grade-1', '2026-27-v1'),
    institutionalAuthorityState: 'APPROVED',
    institutionalAuthorityReceiptRef: ref('CompleteCurriculumApprovalDecision', 'decision-2026-01', '1'),
    sourceHandoffFingerprintHash: 'footprint-v1',
    scope: {
      institutionRef: ref('Institution', 'school-demo'),
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-1',
      sectionRef: '1A',
      cohortRef: 'cohort-2026-grade-1',
    },
    requirementRefs: [
      {
        requirementId: 'req-systems',
        curriculumNodeRef: ref('CurriculumNodeProjection', 'technology-systems'),
        authorityLevel: 'NATIONAL_PRESCRIPTIVE',
        coverageRequired: true,
      },
      {
        requirementId: 'req-project',
        curriculumNodeRef: ref('CurriculumNodeProjection', 'technology-project-method'),
        authorityLevel: 'INSTITUTIONAL_REQUIRED',
        coverageRequired: true,
      },
    ],
    teacherDecisionRef: 'teacher-acceptance-001',
    acceptedAt: '2026-09-09T18:00:00.000Z',
    requiresRevalidationOnApproval: false,
  }
}

function planBinding(blockId: string) {
  return createPlanBlockCurriculumBindingV1({
    bindingId: `binding-${blockId.toLowerCase()}`,
    canonicalPlanAssetId: '4a027986-5b6d-49db-9b52-01cfae679c08',
    canonicalGenerationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
    blockId,
    teacherContext: teacherContext(),
    requirementIds: ['req-systems', 'req-project'],
    professionalDecisionRef: `teacher-plan-${blockId.toLowerCase()}`,
    boundAt: '2026-09-09T18:30:00.000Z',
  })
}

function udaBinding() {
  return createUdaCurriculumBindingV1({
    bindingId: 'uda-binding-1-01',
    grade: 'Prima',
    udaSource: {
      code: 'CAN-UDA-1-01',
      assetId: 'uda-asset-1-01',
      generationId: 'uda-generation-101',
    },
    planBindings: [planBinding('B03'), planBinding('B04')],
    professionalDecisionRef: 'teacher-uda-binding-001',
    boundAt: '2026-09-09T19:00:00.000Z',
  })
}

function session(input: { id?: string; sectionId?: string; actualMinutes?: number } = {}): TeachingSessionRecord {
  return {
    id: input.id ?? 'session-1a-001',
    workspaceId: 'workspace-1',
    academicYearId: '2026-2027',
    sectionId: input.sectionId ?? 'section-1a',
    disciplineId: 'technology',
    localDate: '2026-09-10',
    plannedStartAt: '2026-09-10T08:00:00+02:00',
    plannedEndAt: '2026-09-10T09:00:00+02:00',
    plannedMinutes: 60,
    actualMinutes: input.actualMinutes ?? 60,
    evidenceNote: null,
    source: {
      sourceKind: 'PROJECTED_OCCURRENCE',
      projectedOccurrenceLogicalId: 'occurrence-1a-thu-1',
      timetableVersionId: 'timetable-v1',
      timetableSlotId: 'slot-1',
      calendarState: 'SCHOOL_DAY',
      provenance: ['ORARIO'],
    },
    supersedesSessionId: null,
    recordedBy: 'teacher-1',
    recordedAt: '2026-09-10T09:05:00+02:00',
  }
}

function allocation(input: {
  id?: string
  sessionId?: string
  blockId?: string
  minutes?: number
  planAssetId?: string
  generationId?: string
} = {}): TeachingSessionAllocationRecord {
  return {
    id: input.id ?? 'allocation-b03',
    sessionId: input.sessionId ?? 'session-1a-001',
    blockId: input.blockId ?? 'B03',
    minutes: input.minutes ?? 60,
    canonicalPlanAssetId: input.planAssetId ?? '4a027986-5b6d-49db-9b52-01cfae679c08',
    canonicalGenerationId: input.generationId ?? 'd327355b-76a9-496f-99cb-dc942fd950e4',
    createdAt: '2026-09-10T09:05:00+02:00',
  }
}

function executionContext() {
  return createTeachingUdaExecutionContextV1({
    executionContextId: 'exec-1a-001',
    session: session(),
    allocations: [allocation()],
    udaBinding: udaBinding(),
    createdAt: '2026-09-10T09:06:00+02:00',
  })
}

const individualSubject: LocalLearningSubjectRef = {
  scope: 'INDIVIDUAL',
  localSubjectRef: 'learner-local-17',
}

function completeCycleParts() {
  const context = executionContext()
  const initialEvidence = createClassroomEvidenceV1({
    evidenceId: 'evidence-001',
    context,
    subject: individualSubject,
    kind: 'PRODUCT',
    sourceRef: 'local-artifact://work/001-v1',
    observedAt: '2026-09-10T08:40:00+02:00',
    curriculumRequirementIds: ['req-project'],
    teacherObservation: 'La soluzione è coerente con il problema, ma il vincolo di sicurezza non è ancora esplicitato.',
  })
  const feedback = createFormativeFeedbackV1({
    feedbackId: 'feedback-001',
    context,
    evidence: initialEvidence,
    curriculumRequirementIds: ['req-project'],
    issuedAt: '2026-09-10T08:45:00+02:00',
    strength: 'La scelta tecnica è motivata e leggibile.',
    nextStep: 'Esplicita il requisito di sicurezza e verifica di nuovo la soluzione rispetto a quel vincolo.',
    responseExpected: true,
  })
  const revisedEvidence = createClassroomEvidenceV1({
    evidenceId: 'evidence-002',
    context,
    subject: individualSubject,
    kind: 'PRODUCT',
    sourceRef: 'local-artifact://work/001-v2',
    observedAt: '2026-09-10T08:55:00+02:00',
    curriculumRequirementIds: ['req-project'],
    teacherObservation: 'La revisione rende esplicito il vincolo di sicurezza e modifica coerentemente la soluzione.',
    supersedes: initialEvidence,
  })
  const learnerResponse = createLearnerResponseV1({
    responseId: 'response-001',
    context,
    feedback,
    originalEvidence: initialEvidence,
    revisedEvidence,
    action: 'REVISION',
    respondedAt: '2026-09-10T08:55:00+02:00',
  })
  const assessmentObservation = createTeacherAssessmentObservationV1({
    observationId: 'assessment-observation-001',
    context,
    response: learnerResponse,
    originalEvidence: initialEvidence,
    revisedEvidence,
    curriculumRequirementIds: ['req-project'],
    observedAt: '2026-09-10T09:00:00+02:00',
    summary: 'L’alunno usa il feedback per rivedere la soluzione e verificare un vincolo progettuale esplicito.',
  })
  return { context, initialEvidence, feedback, revisedEvidence, learnerResponse, assessmentObservation }
}

describe('C2P-06 teaching execution, evidence and feedback cycle', () => {
  it('binds an existing TeachingSession and its allocations to the canonical UDA without creating another lesson record', () => {
    const result = executionContext()

    assert.equal(result.contract, 'CML_TEACHING_UDA_EXECUTION_CONTEXT_V1')
    assert.equal(result.session.sessionId, 'session-1a-001')
    assert.equal(result.session.sectionId, 'section-1a')
    assert.equal(result.udaBinding.bindingId, 'uda-binding-1-01')
    assert.equal(result.udaBinding.udaCode, 'CAN-UDA-1-01')
    assert.deepEqual(result.allocations.map((item) => item.blockId), ['B03'])
    assert.deepEqual(result.udaBinding.curriculumRequirementIds, ['req-systems', 'req-project'])
    assert.equal(result.externalTransportAllowed, false)
    assert.equal(result.localInstitutionalAuthorityEffect, 'NONE')
    assert.equal(result.historicalBindingImmutable, true)
    assert.equal('recordedBy' in result.session, false)
  })

  it('rejects allocations from another session, plan generation or UDA block', () => {
    assert.throws(
      () => createTeachingUdaExecutionContextV1({
        executionContextId: 'exec-wrong-session',
        session: session(),
        allocations: [allocation({ sessionId: 'another-session' })],
        udaBinding: udaBinding(),
        createdAt: '2026-09-10T09:06:00+02:00',
      }),
      /another teaching session/,
    )
    assert.throws(
      () => createTeachingUdaExecutionContextV1({
        executionContextId: 'exec-wrong-generation',
        session: session(),
        allocations: [allocation({ generationId: 'old-generation' })],
        udaBinding: udaBinding(),
        createdAt: '2026-09-10T09:06:00+02:00',
      }),
      /CANONICAL_CONTEXT_MISMATCH/,
    )
    assert.throws(
      () => createTeachingUdaExecutionContextV1({
        executionContextId: 'exec-wrong-uda',
        session: session(),
        allocations: [allocation({ blockId: 'B07' })],
        udaBinding: udaBinding(),
        createdAt: '2026-09-10T09:06:00+02:00',
      }),
      /does not belong to bound UDA/,
    )
  })

  it('keeps classroom evidence local, requirement-bound and without automatic assessment or curriculum mutation', () => {
    const evidence = createClassroomEvidenceV1({
      evidenceId: 'evidence-001',
      context: executionContext(),
      subject: individualSubject,
      kind: 'PROCESS',
      sourceRef: 'local-artifact://process/001',
      observedAt: '2026-09-10T08:30:00+02:00',
      curriculumRequirementIds: ['req-systems'],
      teacherObservation: 'Riconosce input, trasformazione e output del sistema osservato.',
    })

    assert.equal(evidence.privacyClass, 'LOCAL_EDUCATIONAL_RECORD')
    assert.equal(evidence.externalTransportAllowed, false)
    assert.equal(evidence.automaticAssessmentEffect, 'NONE')
    assert.equal(evidence.curriculumMutationEffect, 'NONE')
    assert.deepEqual(evidence.curriculumRequirementIds, ['req-systems'])
  })

  it('requires opaque local subject references only for group or individual evidence', () => {
    assert.throws(
      () => createClassroomEvidenceV1({
        evidenceId: 'invalid-individual',
        context: executionContext(),
        subject: { scope: 'INDIVIDUAL', localSubjectRef: null },
        kind: 'PRODUCT',
        sourceRef: 'local-artifact://work/invalid',
        observedAt: '2026-09-10T08:30:00+02:00',
        teacherObservation: 'Osservazione.',
      }),
      /requires an opaque local subject reference/,
    )
    const classEvidence = createClassroomEvidenceV1({
      evidenceId: 'class-evidence',
      context: executionContext(),
      subject: { scope: 'CLASS', localSubjectRef: null },
      kind: 'PROCESS',
      sourceRef: 'local-artifact://class/001',
      observedAt: '2026-09-10T08:30:00+02:00',
      teacherObservation: 'La classe completa il controllo previsto.',
    })
    assert.equal(classEvidence.subject.localSubjectRef, null)
  })

  it('keeps formative feedback distinct from assessment and constrains it to the requirements evidenced', () => {
    const { context, initialEvidence } = completeCycleParts()
    const feedback = createFormativeFeedbackV1({
      feedbackId: 'feedback-check',
      context,
      evidence: initialEvidence,
      curriculumRequirementIds: ['req-project'],
      issuedAt: '2026-09-10T08:45:00+02:00',
      strength: 'La soluzione è motivata.',
      nextStep: 'Verifica il vincolo dichiarato.',
      responseExpected: true,
    })

    assert.equal(feedback.assessmentEffect, 'NONE')
    assert.equal(feedback.automaticGradeAllowed, false)
    assert.equal(feedback.externalTransportAllowed, false)
    assert.throws(
      () => createFormativeFeedbackV1({
        feedbackId: 'feedback-outside-evidence',
        context,
        evidence: initialEvidence,
        curriculumRequirementIds: ['req-systems'],
        issuedAt: '2026-09-10T08:45:00+02:00',
        strength: 'Punto riuscito.',
        nextStep: 'Passo successivo.',
        responseExpected: true,
      }),
      /unknown curriculum requirement for formative feedback/,
    )
  })

  it('accepts a learner response only when revised evidence explicitly supersedes the evidence that received feedback', () => {
    const { context, initialEvidence, feedback, revisedEvidence } = completeCycleParts()
    const response = createLearnerResponseV1({
      responseId: 'response-check',
      context,
      feedback,
      originalEvidence: initialEvidence,
      revisedEvidence,
      action: 'REVISION',
      respondedAt: '2026-09-10T08:55:00+02:00',
    })
    assert.equal(response.originalEvidenceId, 'evidence-001')
    assert.equal(response.revisedEvidenceId, 'evidence-002')
    assert.equal(response.assessmentEffect, 'NONE')

    const unrelatedRevision = createClassroomEvidenceV1({
      evidenceId: 'evidence-unrelated',
      context,
      subject: individualSubject,
      kind: 'PRODUCT',
      sourceRef: 'local-artifact://work/unrelated',
      observedAt: '2026-09-10T08:55:00+02:00',
      curriculumRequirementIds: ['req-project'],
      teacherObservation: 'Altra evidenza.',
    })
    assert.throws(
      () => createLearnerResponseV1({
        responseId: 'response-invalid',
        context,
        feedback,
        originalEvidence: initialEvidence,
        revisedEvidence: unrelatedRevision,
        action: 'REVISION',
        respondedAt: '2026-09-10T08:55:00+02:00',
      }),
      /explicitly supersedes the original evidence/,
    )
  })

  it('produces a professional assessment observation from the evidence chain but never an automatic grade', () => {
    const { assessmentObservation } = completeCycleParts()

    assert.deepEqual(assessmentObservation.evidenceIds, ['evidence-001', 'evidence-002'])
    assert.equal(assessmentObservation.assessmentUse, 'MAY_INFORM_TEACHER_ASSESSMENT')
    assert.equal(assessmentObservation.requiresTeacherJudgment, true)
    assert.equal(assessmentObservation.automaticGradeAllowed, false)
    assert.equal(assessmentObservation.curriculumMutationEffect, 'NONE')
    assert.equal(assessmentObservation.externalTransportAllowed, false)
  })

  it('closes the full evidence-feedback-response-revision-observation chain without auto-submitting curriculum feedback', () => {
    const parts = completeCycleParts()
    const cycle = composeTeachingFeedbackCycleV1({
      cycleId: 'cycle-001',
      context: parts.context,
      initialEvidence: parts.initialEvidence,
      feedback: parts.feedback,
      learnerResponse: parts.learnerResponse,
      revisedEvidence: parts.revisedEvidence,
      assessmentObservation: parts.assessmentObservation,
    })

    assert.equal(cycle.state, 'COMPLETE')
    assert.equal(cycle.externalTransportAllowed, false)
    assert.equal(cycle.curriculumFeedbackEffect, 'NONE')
    assert.equal(cycle.curriculumFeedbackRequiresProfessionalAggregation, true)
    assert.equal(cycle.studentDataMustBeExcludedFromCurriculumFeedback, true)
  })

  it('fails closed when evidence from another section is introduced into an existing execution context', () => {
    const original = executionContext()
    const otherContext = createTeachingUdaExecutionContextV1({
      executionContextId: 'exec-1c-001',
      session: session({ id: 'session-1c-001', sectionId: 'section-1c' }),
      allocations: [allocation({ id: 'allocation-1c-b03', sessionId: 'session-1c-001' })],
      udaBinding: udaBinding(),
      createdAt: '2026-09-10T10:06:00+02:00',
    })
    const otherEvidence = createClassroomEvidenceV1({
      evidenceId: 'evidence-1c',
      context: otherContext,
      subject: { scope: 'CLASS', localSubjectRef: null },
      kind: 'PROCESS',
      sourceRef: 'local-artifact://class/1c',
      observedAt: '2026-09-10T10:30:00+02:00',
      teacherObservation: 'Evidenza della sezione 1C.',
    })

    assert.throws(
      () => createFormativeFeedbackV1({
        feedbackId: 'feedback-cross-section',
        context: original,
        evidence: otherEvidence,
        issuedAt: '2026-09-10T10:40:00+02:00',
        strength: 'Punto riuscito.',
        nextStep: 'Passo successivo.',
        responseExpected: false,
      }),
      /does not belong to the teaching execution context/,
    )
  })
})
