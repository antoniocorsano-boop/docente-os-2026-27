import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildApprovedCurriculumRevalidationReview,
  classifyCurriculumImportState,
  prepareApprovedCurriculumRevalidationApply,
  type AnnualPlanCurriculumBaselineSnapshot,
  type TeacherCurriculumRevalidationDecision,
} from './cml-curriculum-revalidation'
import {
  computeCmlLocalHandoffV2Footprint,
  type CmlLocalHandoffV2,
  type CurriculumContextForClassV1,
  type CurriculumRequirementV1,
} from './cml-local-handoff-v2'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

const versionRef = ref('CurriculumVersionProjection', 'school-demo:technology:secondaria:grade-1', 'same-content-hash')
const curriculumRef = ref('InstituteCurriculum', 'school-demo:technology')
const requirement: CurriculumRequirementV1 = {
  requirementId: 'req-same-version-001',
  kind: 'SPECIFIC_LEARNING_OBJECTIVE',
  authorityLevel: 'NATIONAL_PRESCRIPTIVE',
  curriculumNodeRef: ref('CurriculumNodeProjection', 'node-001'),
  description: 'Analizzare materiali, processi e sistemi tecnologici.',
  coverageRequired: true,
  sourceRefs: [ref('NationalFramework', 'IN2025', 'DM-221-2025')],
}

function curriculumContext(state: 'PROVISIONAL_COMPLETE' | 'APPROVED'): CurriculumContextForClassV1 {
  const approved = state === 'APPROVED'
  return {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: approved ? 'ctx-approved-same-version' : 'ctx-provisional-same-version',
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: '1A',
    curriculumRef,
    curriculumVersionRef: versionRef,
    curriculumState: state,
    approvalProcessRef: ref('CurriculumApprovalProcess', 'school-demo:technology', 'process-v1'),
    ...(approved
      ? { approvalDecisionRef: ref('CompleteCurriculumApprovalDecision', 'decision-complete-2026-01', '1') }
      : {}),
    applicabilityStatus: 'APPLICABLE',
    transitionRuleRef: ref('NationalTransitionRule', 'DM-221-2025-art-5'),
    completeForPlanning: true,
    requirements: [{ ...requirement, sourceRefs: requirement.sourceRefs.map((item) => ({ ...item })) }],
    transitionRemodulation: {
      state: 'NOT_REQUIRED',
      rationale: 'Il quadro nazionale si applica direttamente alla classe.',
      sourceRefs: [ref('NationalFramework', 'IN2025', 'DM-221-2025')],
      affectedRequirementIds: [],
      usableForPlanning: true,
      institutionallyApproved: false,
    },
    sourceRefs: [
      ref('NationalFramework', 'IN2025', 'DM-221-2025'),
      versionRef,
      ...(approved ? [ref('CompleteCurriculumApprovalDecision', 'decision-complete-2026-01', '1')] : []),
    ],
  }
}

function approvedHandoff(): CmlLocalHandoffV2 {
  const curricularContext = curriculumContext('APPROVED')
  const candidate: Omit<CmlLocalHandoffV2, 'structuralFootprint'> = {
    format: 'CML_LOCAL_HANDOFF_V2',
    targetProduct: 'DOCENTE_OS',
    acceptanceRequired: true,
    importMode: 'PREVIEW_ONLY',
    generatedAt: '2026-08-29T15:00:00.000Z',
    curricularContext,
    annualPlanningFramework: {
      contract: 'CML_INTEROP_V1',
      messageId: 'framework-same-version-approved',
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE',
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceVersion: 'arena-runtime-binding-v2',
      emittedAt: '2026-08-29T15:00:00.000Z',
      payloadVersion: 1,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL',
      provenance: {
        sourceRefs: [versionRef, ref('CompleteCurriculumApprovalDecision', 'decision-complete-2026-01', '1')],
        generatedBy: 'SYSTEM_DERIVED',
        humanConfirmed: true,
      },
      payload: {
        curriculumVersionRef: versionRef,
        disciplineRef: 'technology',
        gradeRef: 'grade-1',
        periods: [{
          periodId: 'annual',
          label: 'Intero anno',
          suggestedNodeRefs: [{ ...requirement.curriculumNodeRef }],
        }],
        constraints: [{
          id: 'cover-mandatory-curriculum-requirements',
          kind: 'REQUIRED',
          description: 'Il Piano annuale deve coprire i requisiti obbligatori.',
          sourceRef: versionRef,
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

function provisionalBaseline(): AnnualPlanCurriculumBaselineSnapshot {
  const curricularContext = curriculumContext('PROVISIONAL_COMPLETE')
  return {
    id: 'receipt-provisional-same-version',
    sectionId: 'section-uuid',
    curricularContextId: curricularContext.contextId,
    schoolYearRef: curricularContext.schoolYearRef,
    disciplineRef: curricularContext.disciplineRef,
    gradeRef: curricularContext.gradeRef,
    curriculumState: 'PROVISIONAL_COMPLETE',
    alignmentAuthority: 'PROVISIONAL_BASELINE',
    requiresRevalidationOnApproval: true,
    sourceHandoffFootprintHash: 'provisional-footprint-different-by-authority',
    sourceFrameworkMessageId: 'framework-same-version-provisional',
    acceptanceDecisionId: 'teacher-acceptance-provisional',
    acceptedAt: '2026-08-28T10:00:00.000Z',
    reviewedFramework: {
      periods: [{
        periodId: 'teacher-period-1',
        label: 'Primo periodo',
        suggestedNodeRefs: [{ ...requirement.curriculumNodeRef }],
      }],
      constraints: [{
        id: 'teacher-sequence',
        kind: 'RECOMMENDED',
        description: 'Sequenza operativa scelta dal docente.',
      }],
    },
    curriculumCoverage: {
      status: 'SATISFIED',
      authority: 'PROVISIONAL_BASELINE',
      requiresRevalidationOnApproval: true,
      contextId: curricularContext.contextId,
      curriculumVersionRef: { ...versionRef },
      requirementCoverage: [{
        requirementId: requirement.requirementId,
        coverageRequired: true,
        satisfied: true,
        curriculumNodeRef: { ...requirement.curriculumNodeRef },
        authorityLevel: requirement.authorityLevel,
      }],
      blockingRequirementIds: [],
    },
    curricularContext,
  }
}

function acceptedDecision(review: ReturnType<typeof buildApprovedCurriculumRevalidationReview>): TeacherCurriculumRevalidationDecision {
  return {
    contract: 'CML_CURRICULUM_REVALIDATION_V1',
    decisionId: 'teacher-revalidation-same-version',
    actorRole: 'TEACHER',
    decision: 'ACCEPTED',
    confirmedAt: '2026-08-29T15:30:00.000Z',
    previousReceiptId: review.previousReceiptId,
    incomingHandoffFootprintHash: review.incomingHandoffFootprintHash,
    reviewFingerprint: review.reviewFingerprint,
  }
}

describe('DOS-S0 same-version authority revalidation', () => {
  it('detects APPROVED as UPDATE_AVAILABLE even when curriculumVersionRef is unchanged', () => {
    const current = provisionalBaseline()
    const incoming = approvedHandoff()

    assert.deepEqual(current.curricularContext.curriculumVersionRef, incoming.curricularContext.curriculumVersionRef)
    assert.notEqual(current.sourceHandoffFootprintHash, incoming.structuralFootprint.hash)
    assert.equal(classifyCurriculumImportState({ current, incoming }), 'UPDATE_AVAILABLE')
  })

  it('requires teacher revalidation and preserves the teacher-authored framework', () => {
    const current = provisionalBaseline()
    const incoming = approvedHandoff()
    const review = buildApprovedCurriculumRevalidationReview({ current, incoming })

    assert.equal(review.status, 'AWAITING_TEACHER_REVALIDATION')
    assert.equal(review.persistenceAllowed, false)
    assert.equal(review.previousAuthority, 'PROVISIONAL_BASELINE')
    assert.equal(review.incomingAuthority, 'APPROVED_INSTITUTIONAL')
    assert.deepEqual(review.unchangedRequirementIds, [requirement.requirementId])
    assert.deepEqual(review.changedRequirementIds, [])
    assert.deepEqual(review.addedRequirementIds, [])
    assert.deepEqual(review.removedRequirementIds, [])
    assert.deepEqual(review.preservedFramework, current.reviewedFramework)
    assert.notEqual(review.preservedFramework, current.reviewedFramework)

    const apply = prepareApprovedCurriculumRevalidationApply({
      current,
      review,
      decision: acceptedDecision(review),
    })

    assert.equal(apply.curricularContext.curriculumState, 'APPROVED')
    assert.deepEqual(apply.curricularContext.curriculumVersionRef, current.curricularContext.curriculumVersionRef)
    assert.equal(apply.curriculumCoverage.authority, 'APPROVED_INSTITUTIONAL')
    assert.equal(apply.curriculumCoverage.requiresRevalidationOnApproval, false)
    assert.deepEqual(apply.reviewedFramework, current.reviewedFramework)
    assert.equal(current.curriculumState, 'PROVISIONAL_COMPLETE')
    assert.equal(current.requiresRevalidationOnApproval, true)
  })
})
