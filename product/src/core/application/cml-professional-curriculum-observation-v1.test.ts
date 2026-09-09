import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { UdaCurriculumBindingV1 } from './cml-uda-curriculum-binding-v1'
import type {
  TeachingFeedbackCycleV1,
  TeachingUdaExecutionContextV1,
} from './cml-teaching-evidence-feedback-cycle-v1'
import {
  createTeacherCurriculumReviewV1,
  projectProfessionalCurriculumObservationV1,
  submitProfessionalCurriculumObservationV1,
} from './cml-professional-curriculum-observation-v1'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

function udaBinding(): UdaCurriculumBindingV1 {
  return {
    contract: 'CML_UDA_CURRICULUM_BINDING_V1',
    bindingId: 'uda-binding-1-01',
    bindingScope: 'CANONICAL_UDA',
    uda: {
      code: 'CAN-UDA-1-01',
      assetId: 'uda-asset-1-01',
      generationId: 'uda-generation-101',
    },
    canonicalPlan: {
      grade: 'Prima',
      assetId: 'plan-asset-1',
      generationId: 'plan-generation-1',
      blockIds: ['B03', 'B04'],
      planBindingIds: ['plan-binding-b03', 'plan-binding-b04'],
    },
    curriculum: {
      curriculumRef: ref('InstituteCurriculum', 'technology'),
      curriculumVersionRef: ref('CurriculumVersionProjection', 'technology-grade-1', '2026-27-v1'),
      institutionalAuthorityState: 'APPROVED',
      institutionalAuthorityReceiptRef: ref('CompleteCurriculumApprovalDecision', 'decision-2026-01', '1'),
      sourceHandoffFingerprintHash: 'deadbeef',
      teacherAcceptanceDecisionRef: 'teacher-acceptance-001',
      requiresRevalidationOnApproval: false,
    },
    applicability: {
      institutionRef: ref('Institution', 'school-demo'),
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-1',
      cohortRef: 'cohort-2026-grade-1',
    },
    requirementBindings: [
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
    professionalDecisionRef: 'teacher-uda-binding-001',
    boundAt: '2026-09-09T19:00:00.000Z',
    sectionExecutionEffect: 'NONE',
    localInstitutionalAuthorityEffect: 'NONE',
    authoringPolicy: {
      owner: 'TEACHER',
      sectionCopyRequired: false,
      sectionAdaptationMode: 'DELTA_ONLY',
      teacherOwnedFields: [
        'PROBLEM_SITUATION',
        'PHASES_AND_SEQUENCE',
        'DURATION_AND_SCHEDULING',
        'RESOURCES_AND_MATERIALS',
        'METHODS',
        'SECTION_ADAPTATIONS',
        'CLASSROOM_EVIDENCE_DESIGN',
        'TEACHER_NOTES_AND_REVISIONS',
      ],
    },
  }
}

function context(input: { id: string; sessionId: string; sectionId: string }): TeachingUdaExecutionContextV1 {
  const binding = udaBinding()
  return {
    contract: 'CML_TEACHING_UDA_EXECUTION_CONTEXT_V1',
    executionContextId: input.id,
    session: {
      sessionId: input.sessionId,
      sectionId: input.sectionId,
      localDate: '2026-09-09',
      actualMinutes: 60,
      supersedesSessionId: null,
    },
    udaBinding: {
      bindingId: binding.bindingId,
      udaCode: binding.uda.code,
      udaAssetId: binding.uda.assetId,
      udaGenerationId: binding.uda.generationId,
      canonicalPlanAssetId: binding.canonicalPlan.assetId,
      canonicalPlanGenerationId: binding.canonicalPlan.generationId,
      blockIds: [...binding.canonicalPlan.blockIds],
      curriculumVersionRef: { ...binding.curriculum.curriculumVersionRef },
      sourceHandoffFingerprintHash: binding.curriculum.sourceHandoffFingerprintHash,
      curriculumRequirementIds: binding.requirementBindings.map((item) => item.requirementId),
    },
    allocations: [{ allocationId: `allocation-${input.id}`, blockId: 'B03', minutes: 60 }],
    createdAt: '2026-09-09T20:00:00.000Z',
    privacyClass: 'LOCAL_EDUCATIONAL_RECORD',
    externalTransportAllowed: false,
    localInstitutionalAuthorityEffect: 'NONE',
    historicalBindingImmutable: true,
  }
}

function cycle(input: { id: string; context: TeachingUdaExecutionContextV1 }): TeachingFeedbackCycleV1 {
  return {
    contract: 'CML_TEACHING_FEEDBACK_CYCLE_V1',
    cycleId: input.id,
    executionContextId: input.context.executionContextId,
    sessionId: input.context.session.sessionId,
    sectionId: input.context.session.sectionId,
    initialEvidenceId: `evidence-${input.id}-1`,
    feedbackId: `feedback-${input.id}`,
    learnerResponseId: `response-${input.id}`,
    revisedEvidenceId: `evidence-${input.id}-2`,
    assessmentObservationId: `assessment-${input.id}`,
    state: 'COMPLETE',
    externalTransportAllowed: false,
    curriculumFeedbackEffect: 'NONE',
    curriculumFeedbackRequiresProfessionalAggregation: true,
    studentDataMustBeExcludedFromCurriculumFeedback: true,
  }
}

function reviewInput() {
  const first = context({ id: 'exec-1a', sessionId: 'session-1a', sectionId: 'section-1a' })
  const second = context({ id: 'exec-1c', sessionId: 'session-1c', sectionId: 'section-1c' })
  return {
    reviewId: 'teacher-review-uda-1-01',
    reviewedAt: '2026-09-09T20:30:00.000Z',
    sourceVersion: 'docente-os-c2p-07',
    curricularContextId: 'curricular-context-technology-grade-1',
    sourceFrameworkMessageId: 'framework-message-001',
    category: 'FEASIBILITY' as const,
    summary: 'La sequenza risulta praticabile, ma il prerequisito di rappresentazione deve essere richiamato prima della fase progettuale.',
    udaBinding: udaBinding(),
    executionContexts: [first, second],
    feedbackCycles: [cycle({ id: 'cycle-1a', context: first }), cycle({ id: 'cycle-1c', context: second })],
    requirementIds: ['req-project'],
  }
}

describe('C2P-07 Teacher Review and Professional Observation', () => {
  it('aggregates completed C4 cycles into a privacy-safe professional review without exporting section or cycle identities', () => {
    const review = createTeacherCurriculumReviewV1(reviewInput())

    assert.equal(review.contract, 'CML_TEACHER_CURRICULUM_REVIEW_V1')
    assert.equal(review.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
    assert.equal(review.rawClassroomDataIncluded, false)
    assert.equal(review.pupilLevelDataIncluded, false)
    assert.equal(review.localInstitutionalAuthorityEffect, 'NONE')
    assert.equal(review.curriculumMutationEffect, 'NONE')
    assert.equal(review.externalTransportAllowed, false)
    assert.equal(review.aggregateEvidence.executionContextCount, 2)
    assert.equal(review.aggregateEvidence.completedFeedbackCycleCount, 2)
    assert.equal(review.aggregateEvidence.sectionCount, 2)
    assert.deepEqual(review.alignedRequirementIds, ['req-project'])
    assert.deepEqual(review.alignedNodeRefs.map((item) => item.entityId), ['technology-project-method'])
    assert.equal(review.professionalEvidenceRef.entityType, 'TeacherCurriculumReviewEvidence')

    const serialized = JSON.stringify(review)
    assert.equal(serialized.includes('section-1a'), false)
    assert.equal(serialized.includes('section-1c'), false)
    assert.equal(serialized.includes('cycle-1a'), false)
    assert.equal(serialized.includes('cycle-1c'), false)
  })

  it('projects through the existing CurriculumFeedbackDraft/Preview channel instead of creating a second C5 transport', () => {
    const review = createTeacherCurriculumReviewV1(reviewInput())
    const observation = projectProfessionalCurriculumObservationV1({
      review,
      sourceVersion: 'docente-os-c2p-07',
    })

    assert.equal(observation.contract, 'CML_PROFESSIONAL_CURRICULUM_OBSERVATION_V1')
    assert.equal(observation.sourceProduct, 'DOCENTE_OS')
    assert.equal(observation.targetProduct, 'CURMANLIGHT_ARENA')
    assert.equal(observation.observationEffect, 'REVIEW_INPUT_ONLY')
    assert.equal(observation.institutionalAuthorityEffect, 'NONE')
    assert.equal(observation.automaticTransportAllowed, false)
    assert.equal(observation.preview.status, 'READY_FOR_TEACHER_CONFIRMATION')
    assert.equal(observation.preview.transportAllowed, false)
    assert.deepEqual(observation.preview.evidenceRefs, [review.professionalEvidenceRef])
    assert.equal(observation.draft.privacyAttestation, 'NO_STUDENT_PERSONAL_DATA')

    const outgoing = JSON.stringify(observation.draft)
    assert.equal(outgoing.includes('section-1a'), false)
    assert.equal(outgoing.includes('cycle-1a'), false)
    assert.equal(outgoing.includes('localSubjectRef'), false)
    assert.equal(outgoing.includes('feedbackHistory'), false)
  })

  it('requires explicit teacher confirmation and preserves the existing local-submission semantics', () => {
    const observation = projectProfessionalCurriculumObservationV1({
      review: createTeacherCurriculumReviewV1(reviewInput()),
      sourceVersion: 'docente-os-c2p-07',
    })

    assert.throws(
      () => submitProfessionalCurriculumObservationV1({ observation, teacherConfirmed: false }),
      /teacher confirmation is required/,
    )

    const submitted = submitProfessionalCurriculumObservationV1({ observation, teacherConfirmed: true })
    assert.equal(submitted.status, 'SUBMITTED_LOCALLY')
    assert.equal(submitted.transportAllowed, false)
    assert.equal(submitted.envelope.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
    assert.equal(submitted.envelope.provenance.generatedBy, 'HUMAN')
    assert.equal(submitted.envelope.provenance.humanConfirmed, true)
    assert.equal(submitted.envelope.payload.teacherConfirmed, true)
    assert.deepEqual(submitted.envelope.payload.evidenceRefs, [observation.review.professionalEvidenceRef])
  })

  it('rejects pupil identifiers and raw pupil feedback history before professional review creation', () => {
    const base = reviewInput()
    const withStudent = { ...base, studentId: 'student-007' }
    assert.throws(
      () => createTeacherCurriculumReviewV1(withStudent as Parameters<typeof createTeacherCurriculumReviewV1>[0]),
      /forbidden pupil\/raw-classroom fields/,
    )

    const withFeedbackHistory = {
      ...base,
      feedbackHistory: [{ feedbackId: 'feedback-raw', nextStep: 'raw learner feedback' }],
    }
    assert.throws(
      () => createTeacherCurriculumReviewV1(withFeedbackHistory as Parameters<typeof createTeacherCurriculumReviewV1>[0]),
      /forbidden pupil\/raw-classroom fields/,
    )
  })

  it('rejects any teacher claim of institutional curriculum authority', () => {
    assert.throws(
      () => createTeacherCurriculumReviewV1({ ...reviewInput(), institutionalAuthorityClaim: 'APPROVED' }),
      /cannot claim institutional curriculum authority/,
    )
  })

  it('rejects execution contexts from another UDA or accepted curriculum footprint', () => {
    const input = reviewInput()
    const wrongUda = {
      ...input.executionContexts[0],
      udaBinding: { ...input.executionContexts[0].udaBinding, bindingId: 'another-uda-binding' },
    }
    assert.throws(
      () => createTeacherCurriculumReviewV1({ ...input, executionContexts: [wrongUda] }),
      /belongs to another UDA binding/,
    )

    const wrongFootprint = {
      ...input.executionContexts[0],
      udaBinding: { ...input.executionContexts[0].udaBinding, sourceHandoffFingerprintHash: 'cafebabe' },
    }
    assert.throws(
      () => createTeacherCurriculumReviewV1({ ...input, executionContexts: [wrongFootprint] }),
      /another accepted curriculum footprint/,
    )
  })

  it('rejects cycles that bypass professional aggregation or do not belong to a supplied execution context', () => {
    const input = reviewInput()
    const bypass = {
      ...input.feedbackCycles[0],
      curriculumFeedbackRequiresProfessionalAggregation: false,
    } as unknown as TeachingFeedbackCycleV1
    assert.throws(
      () => createTeacherCurriculumReviewV1({ ...input, feedbackCycles: [bypass] }),
      /violates the C4\/C5 professional aggregation boundary/,
    )

    const orphan = {
      ...input.feedbackCycles[0],
      executionContextId: 'missing-execution-context',
    }
    assert.throws(
      () => createTeacherCurriculumReviewV1({ ...input, feedbackCycles: [orphan] }),
      /does not belong to a supplied execution context/,
    )
  })

  it('fails closed on unknown or duplicate curriculum requirement selections', () => {
    assert.throws(
      () => createTeacherCurriculumReviewV1({ ...reviewInput(), requirementIds: ['req-unknown'] }),
      /unknown curriculum requirement for professional review/,
    )
    assert.throws(
      () => createTeacherCurriculumReviewV1({ ...reviewInput(), requirementIds: ['req-project', 'req-project'] }),
      /duplicate requirementIds/,
    )
  })

  it('rejects a forged professional observation that would carry authority or raw classroom data', () => {
    const observation = projectProfessionalCurriculumObservationV1({
      review: createTeacherCurriculumReviewV1(reviewInput()),
      sourceVersion: 'docente-os-c2p-07',
    })
    const forged = {
      ...observation,
      institutionalAuthorityEffect: 'APPROVED',
    } as unknown as Parameters<typeof submitProfessionalCurriculumObservationV1>[0]['observation']

    assert.throws(
      () => submitProfessionalCurriculumObservationV1({ observation: forged, teacherConfirmed: true }),
      /cannot confer authority or transport itself automatically/,
    )
  })
})
