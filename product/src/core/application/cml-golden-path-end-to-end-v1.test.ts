import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CANONICAL_PLAN_SOURCES } from '@/app/piano-annuale/model'
import { bindCurriculumContextAndCoverage } from '@/core/domain/cml-curriculum-applicability'
import { prepareAnnualPlanCurriculumPersistence } from '@/core/domain/cml-annual-plan-curriculum-persistence'
import {
  prepareCurriculumReleaseIntake,
  projectTeacherCurriculumContextV1,
} from '@/core/domain/cml-curriculum-release-intake-v1'
import type { AnnualPlanCurriculumBaselineSnapshot } from '@/core/domain/cml-curriculum-revalidation'
import { prepareAnnualPlanFrameworkApplyV2 } from '@/core/domain/cml-handoff-v2-acceptance'
import {
  computeCmlLocalHandoffV2Footprint,
  type CmlLocalHandoffV2,
  type CurriculumContextForClassV1,
  type CurriculumRequirementV1,
} from '@/core/domain/cml-local-handoff-v2'
import { createPlanBlockCurriculumBindingV1 } from '@/core/domain/cml-plan-block-curriculum-binding-v1'
import type { TeachingSessionAllocationRecord, TeachingSessionRecord } from '@/core/domain/teaching-session'
import { buildCurriculumMigrationImpactManifestV1 } from './cml-curriculum-migration-impact-manifest-v1'
import {
  createTeacherCurriculumReviewV1,
  projectProfessionalCurriculumObservationV1,
  submitProfessionalCurriculumObservationV1,
} from './cml-professional-curriculum-observation-v1'
import {
  composeTeachingFeedbackCycleV1,
  createClassroomEvidenceV1,
  createFormativeFeedbackV1,
  createLearnerResponseV1,
  createTeacherAssessmentObservationV1,
  createTeachingUdaExecutionContextV1,
} from './cml-teaching-evidence-feedback-cycle-v1'
import {
  createUdaCurriculumBindingV1,
  projectUdaAuthoringContextV1,
} from './cml-uda-curriculum-binding-v1'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

function requirement(input: {
  id: string
  nodeId: string
  description: string
  authorityLevel?: CurriculumRequirementV1['authorityLevel']
}): CurriculumRequirementV1 {
  return {
    requirementId: input.id,
    kind: 'SPECIFIC_LEARNING_OBJECTIVE',
    authorityLevel: input.authorityLevel ?? 'NATIONAL_PRESCRIPTIVE',
    curriculumNodeRef: ref('CurriculumNodeProjection', input.nodeId),
    description: input.description,
    coverageRequired: true,
    sourceRefs: [ref('NationalFramework', 'IN2025', 'DM-221-2025')],
  }
}

function approvedHandoff(input: {
  versionId: string
  contextId: string
  frameworkMessageId: string
  projectRequirementDescription: string
  generatedAt: string
}): CmlLocalHandoffV2 {
  const requirements = [
    requirement({
      id: 'req-systems',
      nodeId: 'technology-systems',
      description: 'Analizzare materiali, processi e sistemi tecnologici.',
    }),
    requirement({
      id: 'req-project',
      nodeId: 'technology-project-method',
      description: input.projectRequirementDescription,
      authorityLevel: 'INSTITUTIONAL_REQUIRED',
    }),
  ]
  const curriculumVersionRef = ref(
    'CurriculumVersionProjection',
    'school-demo:technology:secondaria:grade-1',
    input.versionId,
  )
  const curricularContext: CurriculumContextForClassV1 = {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: input.contextId,
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: '1A',
    cohortRef: 'cohort-2026-grade-1',
    curriculumRef: ref('InstituteCurriculum', 'school-demo:technology'),
    curriculumVersionRef,
    curriculumState: 'APPROVED',
    approvalProcessRef: ref('CurriculumApprovalProcess', 'technology-2026', '1'),
    approvalDecisionRef: ref('InstitutionalDecision', `technology-${input.versionId}-approved`, '1'),
    applicabilityStatus: 'APPLICABLE',
    transitionRuleRef: ref('NationalTransitionRule', 'DM-221-2025-art-5'),
    completeForPlanning: true,
    requirements,
    transitionRemodulation: {
      state: 'NOT_REQUIRED',
      rationale: 'Il quadro curricolare approvato si applica direttamente alla classe.',
      sourceRefs: [ref('NationalFramework', 'IN2025', 'DM-221-2025')],
      affectedRequirementIds: [],
      usableForPlanning: true,
      institutionallyApproved: false,
    },
    sourceRefs: [
      ref('NationalFramework', 'IN2025', 'DM-221-2025'),
      curriculumVersionRef,
      ref('InstitutionalDecision', `technology-${input.versionId}-approved`, '1'),
    ],
  }
  const candidate: Omit<CmlLocalHandoffV2, 'structuralFootprint'> = {
    format: 'CML_LOCAL_HANDOFF_V2',
    targetProduct: 'DOCENTE_OS',
    acceptanceRequired: true,
    importMode: 'PREVIEW_ONLY',
    generatedAt: input.generatedAt,
    curricularContext,
    annualPlanningFramework: {
      contract: 'CML_INTEROP_V1',
      messageId: input.frameworkMessageId,
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE',
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceVersion: 'arena-c2p-10',
      emittedAt: input.generatedAt,
      payloadVersion: 1,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL',
      provenance: {
        sourceRefs: [curriculumVersionRef],
        generatedBy: 'SYSTEM_DERIVED',
        humanConfirmed: true,
      },
      payload: {
        curriculumVersionRef,
        disciplineRef: 'technology',
        gradeRef: 'grade-1',
        periods: [{
          periodId: 'annual',
          label: 'Intero anno',
          suggestedNodeRefs: requirements.map((item) => ({ ...item.curriculumNodeRef })),
        }],
        constraints: [{
          id: 'cover-curriculum',
          kind: 'REQUIRED',
          description: 'Coprire i requisiti curricolari obbligatori.',
          sourceRef: curriculumVersionRef,
        }],
      },
    },
  }
  return {
    ...candidate,
    structuralFootprint: {
      algorithm: 'fnv1a',
      version: 1,
      hash: computeCmlLocalHandoffV2Footprint(candidate),
    },
  }
}

function baselineFromApprovedHandoff(handoff: CmlLocalHandoffV2): AnnualPlanCurriculumBaselineSnapshot {
  const intake = prepareCurriculumReleaseIntake({ current: null, incoming: handoff })
  if (intake.mode !== 'INITIAL_TEACHER_REVIEW') throw new Error('golden path expected initial teacher review')

  const apply = prepareAnnualPlanFrameworkApplyV2({
    draft: intake.review,
    decision: {
      contract: 'CML_HANDOFF_ACCEPTANCE_V2',
      decisionId: 'teacher-acceptance-v1',
      actorRole: 'TEACHER',
      decision: 'ACCEPTED',
      confirmedAt: '2026-09-10T06:30:00.000Z',
      handoffFootprintHash: intake.review.source.handoffFootprintHash,
      curricularContextId: intake.review.source.curricularContextId,
      frameworkMessageId: intake.review.source.frameworkMessageId,
    },
  })
  const transitionAware = bindCurriculumContextAndCoverage({
    command: apply,
    curricularContext: handoff.curricularContext,
    targetScope: {
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-1',
      sectionRef: '1A',
      cohortRef: 'cohort-2026-grade-1',
    },
  })
  const persisted = prepareAnnualPlanCurriculumPersistence({
    command: transitionAware,
    section: {
      sectionId: 'section-1a',
      academicYearLabel: '2026/2027',
      grade: 'PRIMA',
      sectionCode: 'A',
    },
  })
  return {
    id: 'curriculum-acceptance-receipt-v1',
    sectionId: persisted.sectionId,
    curricularContextId: persisted.curricularContextId,
    schoolYearRef: persisted.schoolYearRef,
    disciplineRef: persisted.disciplineRef,
    gradeRef: persisted.gradeRef,
    curriculumState: persisted.curriculumState,
    alignmentAuthority: persisted.alignmentAuthority,
    requiresRevalidationOnApproval: persisted.requiresRevalidationOnApproval,
    sourceHandoffFootprintHash: persisted.sourceHandoffFootprintHash,
    sourceFrameworkMessageId: persisted.sourceFrameworkMessageId,
    acceptanceDecisionId: persisted.acceptanceDecisionId,
    acceptedAt: persisted.acceptedAt,
    reviewedFramework: persisted.reviewedFramework,
    curriculumCoverage: persisted.curriculumCoverage,
    curricularContext: persisted.curricularContext,
  }
}

function session(): TeachingSessionRecord {
  return {
    id: 'session-1a-001',
    workspaceId: 'workspace-1',
    academicYearId: '2026-2027',
    sectionId: 'section-1a',
    disciplineId: 'technology',
    localDate: '2026-09-10',
    plannedStartAt: '2026-09-10T08:00:00+02:00',
    plannedEndAt: '2026-09-10T09:00:00+02:00',
    plannedMinutes: 60,
    actualMinutes: 60,
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

function allocation(planAssetId: string, generationId: string): TeachingSessionAllocationRecord {
  return {
    id: 'allocation-b03',
    sessionId: 'session-1a-001',
    blockId: 'B03',
    minutes: 60,
    canonicalPlanAssetId: planAssetId,
    canonicalGenerationId: generationId,
    createdAt: '2026-09-10T09:05:00+02:00',
  }
}

function buildCompletedProfessionalJourney() {
  const v1 = approvedHandoff({
    versionId: '2026-27-v1',
    contextId: 'ctx-tech-grade1-v1',
    frameworkMessageId: 'framework-tech-grade1-v1',
    projectRequirementDescription: 'Applicare un metodo progettuale esplicitando problema, vincoli e verifica della soluzione.',
    generatedAt: '2026-09-10T06:00:00.000Z',
  })
  const baseline = baselineFromApprovedHandoff(v1)
  const current = prepareCurriculumReleaseIntake({ current: baseline, incoming: v1 })
  if (current.mode !== 'CURRENT_CONTEXT') throw new Error('golden path expected the accepted curriculum context')
  const teacherContext = current.teacherContext

  const planSource = CANONICAL_PLAN_SOURCES.Prima
  const planBindings = ['B03', 'B04'].map((blockId) => createPlanBlockCurriculumBindingV1({
    bindingId: `binding-${blockId.toLowerCase()}`,
    canonicalPlanAssetId: planSource.assetId,
    canonicalGenerationId: planSource.generationId,
    blockId,
    teacherContext,
    requirementIds: ['req-systems', 'req-project'],
    professionalDecisionRef: `teacher-plan-${blockId.toLowerCase()}`,
    boundAt: '2026-09-10T06:45:00.000Z',
  }))

  const udaBinding = createUdaCurriculumBindingV1({
    bindingId: 'uda-binding-1-01',
    grade: 'Prima',
    udaSource: {
      code: 'CAN-UDA-1-01',
      assetId: 'uda-asset-1-01',
      generationId: 'uda-generation-101',
    },
    planBindings,
    professionalDecisionRef: 'teacher-uda-binding-001',
    boundAt: '2026-09-10T07:00:00.000Z',
  })
  const authoringContext = projectUdaAuthoringContextV1(udaBinding)

  const executionContext = createTeachingUdaExecutionContextV1({
    executionContextId: 'exec-1a-001',
    session: session(),
    allocations: [allocation(planSource.assetId, planSource.generationId)],
    udaBinding,
    createdAt: '2026-09-10T09:06:00+02:00',
  })
  const subject = { scope: 'INDIVIDUAL' as const, localSubjectRef: 'learner-local-17' }
  const initialEvidence = createClassroomEvidenceV1({
    evidenceId: 'evidence-001',
    context: executionContext,
    subject,
    kind: 'PRODUCT',
    sourceRef: 'local-artifact://work/001-v1',
    observedAt: '2026-09-10T08:40:00+02:00',
    curriculumRequirementIds: ['req-project'],
    teacherObservation: 'La soluzione è motivata ma non rende ancora esplicito un vincolo progettuale.',
  })
  const feedback = createFormativeFeedbackV1({
    feedbackId: 'feedback-001',
    context: executionContext,
    evidence: initialEvidence,
    curriculumRequirementIds: ['req-project'],
    issuedAt: '2026-09-10T08:45:00+02:00',
    strength: 'La scelta tecnica è motivata e leggibile.',
    nextStep: 'Esplicita il vincolo e verifica nuovamente la soluzione rispetto ad esso.',
    responseExpected: true,
  })
  const revisedEvidence = createClassroomEvidenceV1({
    evidenceId: 'evidence-002',
    context: executionContext,
    subject,
    kind: 'PRODUCT',
    sourceRef: 'local-artifact://work/001-v2',
    observedAt: '2026-09-10T08:55:00+02:00',
    curriculumRequirementIds: ['req-project'],
    teacherObservation: 'La revisione esplicita il vincolo e modifica coerentemente la soluzione.',
    supersedes: initialEvidence,
  })
  const learnerResponse = createLearnerResponseV1({
    responseId: 'response-001',
    context: executionContext,
    feedback,
    originalEvidence: initialEvidence,
    revisedEvidence,
    action: 'REVISION',
    respondedAt: '2026-09-10T08:55:00+02:00',
  })
  const assessmentObservation = createTeacherAssessmentObservationV1({
    observationId: 'assessment-observation-001',
    context: executionContext,
    response: learnerResponse,
    originalEvidence: initialEvidence,
    revisedEvidence,
    curriculumRequirementIds: ['req-project'],
    observedAt: '2026-09-10T09:00:00+02:00',
    summary: 'La revisione usa il feedback per verificare un vincolo progettuale esplicito.',
  })
  const feedbackCycle = composeTeachingFeedbackCycleV1({
    cycleId: 'cycle-001',
    context: executionContext,
    initialEvidence,
    feedback,
    learnerResponse,
    revisedEvidence,
    assessmentObservation,
  })

  const review = createTeacherCurriculumReviewV1({
    reviewId: 'teacher-review-uda-1-01',
    reviewedAt: '2026-09-10T10:00:00.000Z',
    sourceVersion: 'docente-os-c2p-10',
    curricularContextId: baseline.curricularContextId,
    sourceFrameworkMessageId: baseline.sourceFrameworkMessageId,
    category: 'PREREQUISITE',
    summary: 'Il riesame professionale segnala che il richiamo esplicito ai vincoli prima della fase progettuale favorisce revisioni più consapevoli.',
    udaBinding,
    executionContexts: [executionContext],
    feedbackCycles: [feedbackCycle],
    requirementIds: ['req-project'],
  })
  const observation = projectProfessionalCurriculumObservationV1({
    review,
    sourceVersion: 'docente-os-c2p-10',
  })
  const submission = submitProfessionalCurriculumObservationV1({
    observation,
    teacherConfirmed: true,
  })

  return {
    v1,
    baseline,
    planBindings,
    udaBinding,
    authoringContext,
    executionContext,
    initialEvidence,
    feedback,
    revisedEvidence,
    learnerResponse,
    assessmentObservation,
    feedbackCycle,
    review,
    observation,
    submission,
  }
}

describe('C2P-10 golden path automated acceptance evidence', () => {
  it('composes the governed Arena release through planning, UDA, execution, evidence, feedback, revision and professional observation', () => {
    const journey = buildCompletedProfessionalJourney()

    assert.equal(journey.baseline.curriculumState, 'APPROVED')
    assert.equal(journey.baseline.alignmentAuthority, 'APPROVED_INSTITUTIONAL')
    assert.equal(journey.planBindings.every((binding) => binding.sectionExecutionEffect === 'NONE'), true)
    assert.equal(journey.udaBinding.sectionExecutionEffect, 'NONE')
    assert.equal(journey.udaBinding.localInstitutionalAuthorityEffect, 'NONE')
    assert.equal(journey.authoringContext.sectionCopyRequired, false)
    assert.equal(journey.authoringContext.sectionAdaptationMode, 'DELTA_ONLY')
    assert.equal(journey.executionContext.historicalBindingImmutable, true)
    assert.equal(journey.feedback.automaticGradeAllowed, false)
    assert.equal(journey.revisedEvidence.supersedesEvidenceId, journey.initialEvidence.evidenceId)
    assert.equal(journey.learnerResponse.feedbackId, journey.feedback.feedbackId)
    assert.equal(journey.assessmentObservation.requiresTeacherJudgment, true)
    assert.equal(journey.feedbackCycle.state, 'COMPLETE')
    assert.equal(journey.review.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
    assert.equal(journey.review.rawClassroomDataIncluded, false)
    assert.equal(journey.review.pupilLevelDataIncluded, false)
    assert.equal(journey.observation.observationEffect, 'REVIEW_INPUT_ONLY')
    assert.equal(journey.observation.institutionalAuthorityEffect, 'NONE')
    assert.equal(journey.submission.status, 'SUBMITTED_LOCALLY')
    assert.equal(journey.submission.transportAllowed, false)
    assert.equal(journey.submission.envelope.contract, 'CML_INTEROP_V1')
    assert.equal(journey.submission.envelope.sourceProduct, 'DOCENTE_OS')
    assert.equal(journey.submission.envelope.messageType, 'CURRICULUM_FEEDBACK_SUBMITTED')
    assert.equal(journey.submission.envelope.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
    assert.deepEqual(
      journey.submission.envelope.payload.evidenceRefs.map((item) => [item.namespace, item.entityType]),
      [['docente.os', 'TeacherCurriculumReviewEvidence']],
    )

    const outgoing = JSON.stringify(journey.submission.envelope)
    assert.equal(outgoing.includes('learner-local-17'), false)
    assert.equal(outgoing.includes('local-artifact://'), false)
    assert.equal(outgoing.includes('ClassroomEvidence'), false)
    assert.equal(outgoing.includes('FormativeFeedback'), false)
    assert.equal(outgoing.includes('AssessmentObservation'), false)

    assert.throws(
      () => submitProfessionalCurriculumObservationV1({
        observation: journey.observation,
        teacherConfirmed: false,
      }),
      /teacher confirmation is required/,
    )
  })

  it('preserves completed V1 history and classifies affected future work explicitly when Arena releases V2', () => {
    const journey = buildCompletedProfessionalJourney()
    const v2 = approvedHandoff({
      versionId: '2026-27-v2',
      contextId: 'ctx-tech-grade1-v2',
      frameworkMessageId: 'framework-tech-grade1-v2',
      projectRequirementDescription: 'Applicare un metodo progettuale esplicitando problema, vincoli, criteri di verifica e motivazione della soluzione.',
      generatedAt: '2026-10-01T08:00:00.000Z',
    })
    const intake = prepareCurriculumReleaseIntake({ current: journey.baseline, incoming: v2 })
    if (intake.mode !== 'APPROVED_REVALIDATION') throw new Error('golden path expected approved curriculum revalidation')

    const manifest = buildCurriculumMigrationImpactManifestV1({
      manifestId: 'migration-v1-to-v2',
      generatedAt: '2026-10-01T08:05:00.000Z',
      review: intake.review,
      targets: [
        {
          targetType: 'PLAN_BLOCK_BINDING',
          targetId: journey.planBindings[0].bindingId,
          temporalScope: 'FUTURE',
          binding: journey.planBindings[0],
        },
        {
          targetType: 'UDA_BINDING',
          targetId: journey.udaBinding.bindingId,
          temporalScope: 'FUTURE',
          binding: journey.udaBinding,
        },
        {
          targetType: 'CLASSROOM_HISTORY',
          targetId: journey.feedbackCycle.cycleId,
          temporalScope: 'HISTORICAL',
          recordKind: 'TEACHING_SESSION',
          sourceBindingIds: [journey.planBindings[0].bindingId, journey.udaBinding.bindingId],
        },
      ],
    })

    assert.deepEqual(intake.review.changedRequirementIds, ['req-project'])
    assert.equal(intake.review.persistenceAllowed, false)
    assert.equal(manifest.entries[0].disposition, 'FUTURE_REBIND_REQUIRED')
    assert.equal(manifest.entries[1].disposition, 'FUTURE_REBIND_REQUIRED')
    assert.equal(manifest.entries[2].disposition, 'HISTORICAL_PRESERVE')
    assert.equal(manifest.entries.every((entry) => entry.preservedHistory), true)
    assert.equal(manifest.entries.every((entry) => entry.automaticMutationAllowed === false), true)
    assert.equal(manifest.policy.historicalRewriteAllowed, false)
    assert.equal(manifest.policy.silentRebindAllowed, false)
    assert.equal(manifest.policy.automaticPersistenceAllowed, false)
    assert.equal(manifest.policy.institutionalAuthorityEffect, 'NONE')
    assert.equal(manifest.policy.teacherDecisionRequiredForFutureChanges, true)
    assert.equal(
      journey.executionContext.udaBinding.curriculumVersionRef.versionId,
      '2026-27-v1',
    )
    assert.equal(journey.feedbackCycle.state, 'COMPLETE')
  })
})
