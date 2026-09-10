import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CANONICAL_PLAN_SOURCES } from '@/app/piano-annuale/model'
import {
  prepareCurriculumReleaseIntake,
  projectTeacherCurriculumContextV1,
} from '@/core/domain/cml-curriculum-release-intake-v1'
import {
  computeCmlLocalHandoffV2Footprint,
  type CmlLocalHandoffV2,
  type CurriculumContextForClassV1,
  type CurriculumRequirementV1,
} from '@/core/domain/cml-local-handoff-v2'
import type { AnnualPlanCurriculumBaselineSnapshot } from '@/core/domain/cml-curriculum-revalidation'
import { createPlanBlockCurriculumBindingV1 } from '@/core/domain/cml-plan-block-curriculum-binding-v1'
import type {
  TeachingSessionAllocationRecord,
  TeachingSessionRecord,
} from '@/core/domain/teaching-session'
import {
  createUdaCurriculumBindingV1,
  projectUdaAuthoringContextV1,
} from './cml-uda-curriculum-binding-v1'
import {
  composeTeachingFeedbackCycleV1,
  createClassroomEvidenceV1,
  createFormativeFeedbackV1,
  createLearnerResponseV1,
  createTeacherAssessmentObservationV1,
  createTeachingUdaExecutionContextV1,
} from './cml-teaching-evidence-feedback-cycle-v1'
import {
  createTeacherCurriculumReviewV1,
  projectProfessionalCurriculumObservationV1,
  submitProfessionalCurriculumObservationV1,
} from './cml-professional-curriculum-observation-v1'
import { buildCurriculumMigrationImpactManifestV1 } from './cml-curriculum-migration-impact-manifest-v1'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

function requirement(description: string): CurriculumRequirementV1 {
  return {
    requirementId: 'req-gp-001',
    kind: 'SPECIFIC_LEARNING_OBJECTIVE',
    authorityLevel: 'NATIONAL_PRESCRIPTIVE',
    curriculumNodeRef: ref('CurriculumNodeProjection', 'node-gp-001'),
    description,
    coverageRequired: true,
    sourceRefs: [ref('NationalFramework', 'IN2025', 'DM-221-2025')],
  }
}

function handoff(input: {
  contextId: string
  versionId: string
  decisionId: string
  messageId: string
  description: string
  generatedAt: string
}): CmlLocalHandoffV2 {
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
    cohortRef: 'cohort-grade-1-2026',
    curriculumRef: ref('InstituteCurriculum', 'school-demo:technology'),
    curriculumVersionRef,
    curriculumState: 'APPROVED',
    approvalProcessRef: ref('CurriculumApprovalProcess', 'technology-2026', '1'),
    approvalDecisionRef: ref('InstitutionalDecision', input.decisionId, '1'),
    applicabilityStatus: 'APPLICABLE',
    transitionRuleRef: ref('NationalTransitionRule', 'DM-221-2025-art-5'),
    completeForPlanning: true,
    requirements: [requirement(input.description)],
    transitionRemodulation: {
      state: 'NOT_REQUIRED',
      rationale: 'Il quadro nazionale si applica direttamente alla coorte.',
      sourceRefs: [ref('NationalFramework', 'IN2025', 'DM-221-2025')],
      affectedRequirementIds: [],
      usableForPlanning: true,
      institutionallyApproved: true,
    },
    sourceRefs: [
      ref('NationalFramework', 'IN2025', 'DM-221-2025'),
      curriculumVersionRef,
      ref('InstitutionalDecision', input.decisionId, '1'),
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
      messageId: input.messageId,
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE',
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceVersion: `arena-${input.versionId}`,
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
          suggestedNodeRefs: [{ ...curricularContext.requirements[0].curriculumNodeRef }],
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

function acceptedBaseline(incoming: CmlLocalHandoffV2): AnnualPlanCurriculumBaselineSnapshot {
  const requirement = incoming.curricularContext.requirements[0]
  return {
    id: 'teacher-acceptance-gp-v1',
    sectionId: 'section-1a',
    curricularContextId: incoming.curricularContext.contextId,
    schoolYearRef: incoming.curricularContext.schoolYearRef,
    disciplineRef: incoming.curricularContext.disciplineRef,
    gradeRef: incoming.curricularContext.gradeRef,
    curriculumState: 'APPROVED',
    alignmentAuthority: 'APPROVED_INSTITUTIONAL',
    requiresRevalidationOnApproval: false,
    sourceHandoffFootprintHash: incoming.structuralFootprint.hash,
    sourceFrameworkMessageId: incoming.annualPlanningFramework.messageId,
    acceptanceDecisionId: 'teacher-decision-gp-v1',
    acceptedAt: '2026-09-10T06:15:00.000Z',
    reviewedFramework: {
      periods: [{
        periodId: 'teacher-period-1',
        label: 'Primo periodo',
        suggestedNodeRefs: [{ ...requirement.curriculumNodeRef }],
      }],
      constraints: [{
        id: 'teacher-sequence',
        kind: 'RECOMMENDED',
        description: 'Sequenza professionale scelta dal docente.',
      }],
    },
    curriculumCoverage: {
      status: 'SATISFIED',
      authority: 'APPROVED_INSTITUTIONAL',
      requiresRevalidationOnApproval: false,
      contextId: incoming.curricularContext.contextId,
      curriculumVersionRef: { ...incoming.curricularContext.curriculumVersionRef },
      requirementCoverage: [{
        requirementId: requirement.requirementId,
        coverageRequired: true,
        satisfied: true,
        curriculumNodeRef: { ...requirement.curriculumNodeRef },
        authorityLevel: requirement.authorityLevel,
      }],
      blockingRequirementIds: [],
    },
    curricularContext: JSON.parse(JSON.stringify(incoming.curricularContext)) as CurriculumContextForClassV1,
  }
}

function session(planAssetId: string, planGenerationId: string): {
  session: TeachingSessionRecord
  allocation: TeachingSessionAllocationRecord
} {
  const record: TeachingSessionRecord = {
    id: 'session-gp-001',
    workspaceId: 'workspace-gp',
    academicYearId: '2026-2027',
    sectionId: 'section-1a',
    disciplineId: 'technology',
    localDate: '2026-09-15',
    plannedStartAt: '2026-09-15T08:00:00+02:00',
    plannedEndAt: '2026-09-15T09:00:00+02:00',
    plannedMinutes: 60,
    actualMinutes: 60,
    evidenceNote: null,
    source: {
      sourceKind: 'MANUAL',
      projectedOccurrenceLogicalId: null,
      timetableVersionId: null,
      timetableSlotId: null,
      calendarState: 'SCHOOL_DAY',
      provenance: ['c2p-10-golden-path-preflight'],
    },
    supersedesSessionId: null,
    recordedBy: 'teacher-gp',
    recordedAt: '2026-09-15T09:05:00+02:00',
  }
  const allocation: TeachingSessionAllocationRecord = {
    id: 'allocation-gp-001',
    sessionId: record.id,
    blockId: 'B03',
    minutes: 60,
    canonicalPlanAssetId: planAssetId,
    canonicalGenerationId: planGenerationId,
    createdAt: '2026-09-15T09:05:00+02:00',
  }
  return { session: record, allocation }
}

describe('C2P-10 golden path predeploy contract journey', () => {
  it('composes Arena release through teacher review and C6 without authority duplication or historical rewrite', () => {
    const releaseV1 = handoff({
      contextId: 'ctx-gp-v1',
      versionId: '2026-27-v1',
      decisionId: 'curriculum-approved-v1',
      messageId: 'framework-gp-v1',
      description: 'Analizzare bisogni, risorse e sistemi tecnologici.',
      generatedAt: '2026-09-10T06:00:00.000Z',
    })

    // GP-01: Arena release enters only as preview; the acceptance receipt below
    // deliberately represents the separate human teacher checkpoint.
    const firstIntake = prepareCurriculumReleaseIntake({ current: null, incoming: releaseV1 })
    assert.equal(firstIntake.importState, 'NEW')
    assert.equal(firstIntake.mode, 'INITIAL_TEACHER_REVIEW')
    assert.equal(firstIntake.persistenceAllowed, false)
    assert.equal(firstIntake.release.authorityState, 'APPROVED')
    assert.equal(firstIntake.release.downstreamPolicy.automaticWriteAllowed, false)

    const baseline = acceptedBaseline(releaseV1)
    const currentIntake = prepareCurriculumReleaseIntake({ current: baseline, incoming: releaseV1 })
    assert.equal(currentIntake.importState, 'ALREADY_KNOWN')
    assert.equal(currentIntake.mode, 'CURRENT_CONTEXT')
    assert.equal(currentIntake.teacherContext.localAuthorityEffect, 'NONE')

    const teacherContext = projectTeacherCurriculumContextV1(baseline)
    const canonicalPlan = CANONICAL_PLAN_SOURCES.Prima
    const planBinding = createPlanBlockCurriculumBindingV1({
      bindingId: 'plan-binding-gp-B03',
      canonicalPlanAssetId: canonicalPlan.assetId,
      canonicalGenerationId: canonicalPlan.generationId,
      blockId: 'B03',
      teacherContext,
      requirementIds: ['req-gp-001'],
      professionalDecisionRef: 'teacher-plan-binding-decision-gp',
      boundAt: '2026-09-10T06:30:00.000Z',
    })
    assert.equal(planBinding.sectionExecutionEffect, 'NONE')

    // GP-02/GP-03: reuse the canonical UDA identity and expose teacher authoring
    // as DELTA_ONLY; no per-section copy is created.
    const udaBinding = createUdaCurriculumBindingV1({
      bindingId: 'uda-binding-gp-1-01',
      grade: 'Prima',
      udaSource: {
        code: 'CAN-UDA-1-01',
        assetId: 'uda-asset-gp-1-01',
        generationId: 'uda-generation-gp-1-01',
      },
      planBindings: [planBinding],
      requirementIds: ['req-gp-001'],
      professionalDecisionRef: 'teacher-uda-binding-decision-gp',
      boundAt: '2026-09-10T06:40:00.000Z',
    })
    const authoring = projectUdaAuthoringContextV1(udaBinding)
    assert.equal(authoring.owner, 'TEACHER')
    assert.equal(authoring.sectionCopyRequired, false)
    assert.equal(authoring.sectionAdaptationMode, 'DELTA_ONLY')
    assert.equal(authoring.localInstitutionalAuthorityEffect, 'NONE')

    // GP-04/GP-05: one real execution lineage with group evidence. The group
    // scope remains group-scoped and cannot become automatic individual attainment.
    const teaching = session(canonicalPlan.assetId, canonicalPlan.generationId)
    const execution = createTeachingUdaExecutionContextV1({
      executionContextId: 'execution-gp-001',
      session: teaching.session,
      allocations: [teaching.allocation],
      udaBinding,
      createdAt: '2026-09-15T09:10:00+02:00',
    })
    const subject = { scope: 'GROUP' as const, localSubjectRef: 'local-group-gp-01' }
    const evidenceV1 = createClassroomEvidenceV1({
      evidenceId: 'evidence-gp-v1',
      context: execution,
      subject,
      kind: 'EXPLANATION',
      sourceRef: 'local://evidence/gp-v1',
      observedAt: '2026-09-15T09:12:00+02:00',
      curriculumRequirementIds: ['req-gp-001'],
      teacherObservation: 'Il gruppo riconosce gli elementi principali ma deve rendere più espliciti i vincoli.',
    })
    const feedback = createFormativeFeedbackV1({
      feedbackId: 'feedback-gp-001',
      context: execution,
      evidence: evidenceV1,
      curriculumRequirementIds: ['req-gp-001'],
      issuedAt: '2026-09-15T09:15:00+02:00',
      strength: 'La relazione tra bisogno e soluzione è motivata.',
      nextStep: 'Esplicitare almeno un vincolo e verificare come modifica la soluzione proposta.',
      responseExpected: true,
    })
    const evidenceV2 = createClassroomEvidenceV1({
      evidenceId: 'evidence-gp-v2',
      context: execution,
      subject,
      kind: 'EXPLANATION',
      sourceRef: 'local://evidence/gp-v2',
      observedAt: '2026-09-15T09:25:00+02:00',
      curriculumRequirementIds: ['req-gp-001'],
      teacherObservation: 'La revisione esplicita il vincolo e ne descrive l’effetto sulla scelta.',
      supersedes: evidenceV1,
    })
    const learnerResponse = createLearnerResponseV1({
      responseId: 'learner-response-gp-001',
      context: execution,
      feedback,
      originalEvidence: evidenceV1,
      revisedEvidence: evidenceV2,
      action: 'REVISION',
      respondedAt: '2026-09-15T09:26:00+02:00',
    })
    const assessment = createTeacherAssessmentObservationV1({
      observationId: 'assessment-observation-gp-001',
      context: execution,
      response: learnerResponse,
      originalEvidence: evidenceV1,
      revisedEvidence: evidenceV2,
      curriculumRequirementIds: ['req-gp-001'],
      observedAt: '2026-09-15T09:30:00+02:00',
      summary: 'La revisione mostra un miglioramento osservabile nella lettura dei vincoli; il giudizio resta professionale del docente.',
    })
    assert.equal(assessment.subject.scope, 'GROUP')
    assert.equal(assessment.automaticGradeAllowed, false)
    assert.equal(assessment.requiresTeacherJudgment, true)

    const cycle = composeTeachingFeedbackCycleV1({
      cycleId: 'cycle-gp-001',
      context: execution,
      initialEvidence: evidenceV1,
      feedback,
      learnerResponse,
      revisedEvidence: evidenceV2,
      assessmentObservation: assessment,
    })
    assert.equal(cycle.externalTransportAllowed, false)
    assert.equal(cycle.curriculumFeedbackRequiresProfessionalAggregation, true)

    // GP-06: teacher review deliberately consumes only execution/cycle metadata,
    // not the raw evidence/feedback objects carrying local learning subject data.
    const review = createTeacherCurriculumReviewV1({
      reviewId: 'review-gp-001',
      reviewedAt: '2026-09-20T08:00:00.000Z',
      sourceVersion: 'docente-os-c2p-10-preflight',
      curricularContextId: baseline.curricularContextId,
      sourceFrameworkMessageId: baseline.sourceFrameworkMessageId,
      category: 'PREREQUISITE',
      summary: 'Il riesame professionale segnala che l’esplicitazione dei vincoli richiede un richiamo ricorrente e merita confronto curricolare.',
      udaBinding,
      executionContexts: [execution],
      feedbackCycles: [cycle],
      requirementIds: ['req-gp-001'],
    })
    assert.equal(review.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
    assert.equal(review.rawClassroomDataIncluded, false)
    assert.equal(review.pupilLevelDataIncluded, false)

    const professionalObservation = projectProfessionalCurriculumObservationV1({
      review,
      sourceVersion: 'docente-os-c2p-10-preflight',
    })
    assert.equal(professionalObservation.observationEffect, 'REVIEW_INPUT_ONLY')
    assert.equal(professionalObservation.institutionalAuthorityEffect, 'NONE')
    assert.equal(professionalObservation.automaticTransportAllowed, false)

    const submission = submitProfessionalCurriculumObservationV1({
      observation: professionalObservation,
      teacherConfirmed: true,
    })
    assert.equal(submission.status, 'SUBMITTED_LOCALLY')
    assert.equal(submission.transportAllowed, false)
    assert.equal(submission.envelope.payload.evidenceRefs.length, 1)
    assert.equal(submission.envelope.payload.evidenceRefs[0].entityType, 'TeacherCurriculumReviewEvidence')
    const serializedEnvelope = JSON.stringify(submission.envelope)
    assert.equal(serializedEnvelope.includes('local-group-gp-01'), false)
    assert.equal(serializedEnvelope.includes('ClassroomEvidence'), false)
    assert.equal(serializedEnvelope.includes('FormativeFeedback'), false)
    assert.equal(serializedEnvelope.includes('AssessmentObservation'), false)

    // GP-07: V2 changes a requirement already used by future Plan/UDA work.
    // Historical classroom execution stays on V1 while future bindings are only
    // classified for explicit teacher rebinding; nothing is mutated automatically.
    const releaseV2 = handoff({
      contextId: 'ctx-gp-v2',
      versionId: '2026-27-v2',
      decisionId: 'curriculum-approved-v2',
      messageId: 'framework-gp-v2',
      description: 'Analizzare bisogni, risorse e sistemi tecnologici esplicitando vincoli e criteri di scelta.',
      generatedAt: '2026-10-01T06:00:00.000Z',
    })
    const transition = prepareCurriculumReleaseIntake({ current: baseline, incoming: releaseV2 })
    assert.equal(transition.importState, 'UPDATE_AVAILABLE')
    assert.equal(transition.mode, 'APPROVED_REVALIDATION')
    assert.equal(transition.persistenceAllowed, false)
    if (transition.mode !== 'APPROVED_REVALIDATION') throw new Error('golden path expected approved revalidation')

    const manifest = buildCurriculumMigrationImpactManifestV1({
      manifestId: 'manifest-gp-v1-to-v2',
      generatedAt: '2026-10-01T06:10:00.000Z',
      review: transition.review,
      targets: [
        {
          targetType: 'PLAN_BLOCK_BINDING',
          targetId: planBinding.bindingId,
          temporalScope: 'FUTURE',
          binding: planBinding,
        },
        {
          targetType: 'UDA_BINDING',
          targetId: udaBinding.bindingId,
          temporalScope: 'FUTURE',
          binding: udaBinding,
        },
        {
          targetType: 'CLASSROOM_HISTORY',
          targetId: teaching.session.id,
          temporalScope: 'HISTORICAL',
          recordKind: 'TEACHING_SESSION',
          sourceBindingIds: [planBinding.bindingId, udaBinding.bindingId],
        },
      ],
    })

    assert.equal(manifest.policy.historicalRewriteAllowed, false)
    assert.equal(manifest.policy.silentRebindAllowed, false)
    assert.equal(manifest.policy.automaticPersistenceAllowed, false)
    assert.equal(manifest.policy.institutionalAuthorityEffect, 'NONE')
    assert.equal(manifest.entries.find((entry) => entry.targetType === 'CLASSROOM_HISTORY')?.disposition, 'HISTORICAL_PRESERVE')
    assert.equal(manifest.entries.find((entry) => entry.targetType === 'PLAN_BLOCK_BINDING')?.disposition, 'FUTURE_REBIND_REQUIRED')
    assert.equal(manifest.entries.find((entry) => entry.targetType === 'UDA_BINDING')?.disposition, 'FUTURE_REBIND_REQUIRED')

    // C2P-10 predeploy boundary: this test proves contract composition only.
    // It deliberately cannot manufacture deployment identity or human acceptance.
    assert.equal(firstIntake.persistenceAllowed, false)
    assert.equal(submission.transportAllowed, false)
    assert.equal(manifest.entries.every((entry) => entry.automaticMutationAllowed === false), true)
  })
})
