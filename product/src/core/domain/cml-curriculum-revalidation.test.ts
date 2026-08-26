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
  namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}),
})

function requirement(input: Partial<CurriculumRequirementV1> & { requirementId: string; description: string }): CurriculumRequirementV1 {
  return {
    requirementId: input.requirementId,
    kind: input.kind ?? 'SPECIFIC_LEARNING_OBJECTIVE',
    authorityLevel: input.authorityLevel ?? 'NATIONAL_PRESCRIPTIVE',
    curriculumNodeRef: input.curriculumNodeRef ?? ref('CurriculumNode', `node-${input.requirementId}`),
    description: input.description,
    coverageRequired: input.coverageRequired ?? true,
    sourceRefs: input.sourceRefs ?? [ref('NationalFramework', 'in2025')],
    ...(input.transitionOriginRef ? { transitionOriginRef: input.transitionOriginRef } : {}),
  }
}

function context(input: {
  state: 'PROVISIONAL_COMPLETE' | 'APPROVED'
  contextId: string
  curriculumVersionId: string
  requirements: CurriculumRequirementV1[]
}): CurriculumContextForClassV1 {
  const approved = input.state === 'APPROVED'
  return {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: input.contextId,
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: '1A',
    cohortRef: 'cohort-2026-grade-1',
    curriculumRef: ref('Curriculum', 'technology'),
    curriculumVersionRef: ref('CurriculumVersion', input.curriculumVersionId, '2026-27'),
    curriculumState: input.state,
    approvalProcessRef: ref('CurriculumApprovalProcess', 'approval-2026'),
    ...(approved ? { approvalDecisionRef: ref('InstitutionalDecision', 'curriculum-approved-2026') } : {}),
    applicabilityStatus: 'APPLICABLE',
    transitionRuleRef: ref('CurriculumTransitionRule', 'dm221-2025-progression'),
    completeForPlanning: true,
    requirements: input.requirements,
    transitionRemodulation: {
      state: 'NOT_REQUIRED',
      rationale: 'Nessuna rimodulazione richiesta per questa classe.',
      sourceRefs: [ref('CurriculumTransitionRule', 'dm221-2025-progression')],
      affectedRequirementIds: [],
      usableForPlanning: true,
      institutionallyApproved: false,
    },
    sourceRefs: [ref('CurriculumVersion', input.curriculumVersionId, '2026-27')],
  }
}

function incomingApproved(requirements: CurriculumRequirementV1[]): CmlLocalHandoffV2 {
  const curricularContext = context({
    state: 'APPROVED',
    contextId: 'ctx-approved-1a',
    curriculumVersionId: 'technology-approved',
    requirements,
  })
  const candidate: Omit<CmlLocalHandoffV2, 'structuralFootprint'> = {
    format: 'CML_LOCAL_HANDOFF_V2',
    targetProduct: 'DOCENTE_OS',
    acceptanceRequired: true,
    importMode: 'PREVIEW_ONLY',
    generatedAt: '2026-09-15T10:00:00.000Z',
    curricularContext,
    annualPlanningFramework: {
      contract: 'CML_INTEROP_V1',
      messageId: 'framework-approved-001',
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE',
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceVersion: 'arena-approved-v1',
      emittedAt: '2026-09-15T10:00:00.000Z',
      payloadVersion: 1,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL',
      provenance: {
        sourceRefs: [ref('CurriculumVersion', 'technology-approved', '2026-27')],
        generatedBy: 'HUMAN',
        humanConfirmed: true,
      },
      payload: {
        curriculumVersionRef: ref('CurriculumVersion', 'technology-approved', '2026-27'),
        disciplineRef: 'technology',
        gradeRef: 'grade-1',
        periods: [{
          periodId: 'annual',
          label: 'Intero anno',
          suggestedNodeRefs: requirements.filter((item) => item.coverageRequired).map((item) => ({ ...item.curriculumNodeRef })),
        }],
        constraints: [{ id: 'approved', kind: 'REQUIRED', description: 'Curricolo istituzionale approvato.' }],
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

function currentBaseline(): AnnualPlanCurriculumBaselineSnapshot {
  const oldRequirement = requirement({
    requirementId: 'req-old-001',
    description: 'Analizzare materiali, processi e sistemi tecnologici.',
    curriculumNodeRef: ref('CurriculumNode', 'node-old-001', 'draft'),
  })
  const curricularContext = context({
    state: 'PROVISIONAL_COMPLETE',
    contextId: 'ctx-provisional-1a',
    curriculumVersionId: 'technology-working',
    requirements: [oldRequirement],
  })
  return {
    id: 'receipt-provisional-001',
    sectionId: 'section-uuid',
    curricularContextId: curricularContext.contextId,
    schoolYearRef: curricularContext.schoolYearRef,
    disciplineRef: curricularContext.disciplineRef,
    gradeRef: curricularContext.gradeRef,
    curriculumState: 'PROVISIONAL_COMPLETE',
    alignmentAuthority: 'PROVISIONAL_BASELINE',
    requiresRevalidationOnApproval: true,
    sourceHandoffFootprintHash: 'deadbeef',
    sourceFrameworkMessageId: 'framework-provisional-001',
    acceptanceDecisionId: 'teacher-acceptance-001',
    acceptedAt: '2026-08-26T14:00:00.000Z',
    reviewedFramework: {
      periods: [{
        periodId: 'p1',
        label: 'Primo periodo',
        suggestedNodeRefs: [ref('CurriculumNode', 'node-old-001', 'draft')],
      }],
      constraints: [{ id: 'teacher-constraint', kind: 'RECOMMENDED', description: 'Sequenza scelta dal docente.' }],
    },
    curriculumCoverage: {
      status: 'SATISFIED',
      authority: 'PROVISIONAL_BASELINE',
      requiresRevalidationOnApproval: true,
      contextId: curricularContext.contextId,
      curriculumVersionRef: { ...curricularContext.curriculumVersionRef },
      requirementCoverage: [{
        requirementId: oldRequirement.requirementId,
        coverageRequired: true,
        satisfied: true,
        curriculumNodeRef: { ...oldRequirement.curriculumNodeRef },
        authorityLevel: oldRequirement.authorityLevel,
      }],
      blockingRequirementIds: [],
    },
    curricularContext,
  }
}

function acceptedDecision(review: ReturnType<typeof buildApprovedCurriculumRevalidationReview>): TeacherCurriculumRevalidationDecision {
  return {
    contract: 'CML_CURRICULUM_REVALIDATION_V1',
    decisionId: 'teacher-revalidation-001',
    actorRole: 'TEACHER',
    decision: 'ACCEPTED',
    confirmedAt: '2026-09-16T09:00:00.000Z',
    previousReceiptId: review.previousReceiptId,
    incomingHandoffFootprintHash: review.incomingHandoffFootprintHash,
    reviewFingerprint: review.reviewFingerprint,
  }
}

describe('approved curriculum revalidation', () => {
  it('classifies the first Arena curriculum as NEW', () => {
    const incoming = incomingApproved([
      requirement({ requirementId: 'req-approved-001', description: 'Analizzare materiali, processi e sistemi tecnologici.' }),
    ])
    assert.equal(classifyCurriculumImportState({ current: null, incoming }), 'NEW')
  })

  it('classifies the same Arena handoff fingerprint as ALREADY_KNOWN', () => {
    const current = currentBaseline()
    const incoming = incomingApproved([
      requirement({ requirementId: 'req-approved-001', description: 'Analizzare materiali, processi e sistemi tecnologici.' }),
    ])
    current.sourceHandoffFootprintHash = incoming.structuralFootprint.hash
    assert.equal(classifyCurriculumImportState({ current, incoming }), 'ALREADY_KNOWN')
  })

  it('preserves teacher framework and carries coverage for semantically unchanged requirements', () => {
    const current = currentBaseline()
    const incoming = incomingApproved([
      requirement({
        requirementId: 'req-approved-renamed',
        description: 'Analizzare materiali, processi e sistemi tecnologici.',
        curriculumNodeRef: ref('CurriculumNode', 'node-approved-999', 'approved'),
      }),
    ])
    const review = buildApprovedCurriculumRevalidationReview({ current, incoming })

    assert.equal(review.importState, 'UPDATE_AVAILABLE')
    assert.equal(review.unchangedRequirementIds.length, 1)
    assert.equal(review.changedRequirementIds.length, 0)
    assert.equal(review.coverageAgainstApproved.status, 'SATISFIED')
    assert.deepEqual(review.preservedFramework, current.reviewedFramework)
    assert.notEqual(review.preservedFramework, current.reviewedFramework)
  })

  it('marks a newly approved mandatory requirement as blocking without overwriting the teacher plan', () => {
    const current = currentBaseline()
    const incoming = incomingApproved([
      requirement({
        requirementId: 'req-approved-001',
        description: 'Analizzare materiali, processi e sistemi tecnologici.',
        curriculumNodeRef: ref('CurriculumNode', 'node-approved-001'),
      }),
      requirement({
        requirementId: 'req-approved-added',
        description: 'Progettare una soluzione digitale documentandone il processo.',
        curriculumNodeRef: ref('CurriculumNode', 'node-approved-added'),
      }),
    ])
    const review = buildApprovedCurriculumRevalidationReview({ current, incoming })

    assert.deepEqual(review.addedRequirementIds, ['req-approved-added'])
    assert.equal(review.coverageAgainstApproved.status, 'PARTIALLY_SATISFIED')
    assert.deepEqual(review.blockingRequirementIds, ['req-approved-added'])
    assert.equal(current.reviewedFramework.periods[0].suggestedNodeRefs.length, 1)
  })

  it('requires teacher alignment before an approved receipt can be authorized', () => {
    const current = currentBaseline()
    const addedNode = ref('CurriculumNode', 'node-approved-added')
    const incoming = incomingApproved([
      requirement({
        requirementId: 'req-approved-001',
        description: 'Analizzare materiali, processi e sistemi tecnologici.',
        curriculumNodeRef: ref('CurriculumNode', 'node-approved-001'),
      }),
      requirement({
        requirementId: 'req-approved-added',
        description: 'Progettare una soluzione digitale documentandone il processo.',
        curriculumNodeRef: addedNode,
      }),
    ])
    const review = buildApprovedCurriculumRevalidationReview({ current, incoming })

    assert.throws(
      () => prepareApprovedCurriculumRevalidationApply({ current, review, decision: acceptedDecision(review) }),
      /still need teacher alignment/,
    )

    const reviewedFramework = {
      ...review.preservedFramework,
      periods: review.preservedFramework.periods.map((period, index) => index === 0
        ? { ...period, suggestedNodeRefs: [...period.suggestedNodeRefs, addedNode] }
        : period),
    }
    const apply = prepareApprovedCurriculumRevalidationApply({
      current,
      review,
      decision: acceptedDecision(review),
      reviewedFramework,
    })

    assert.equal(apply.curricularContext.curriculumState, 'APPROVED')
    assert.equal(apply.curriculumCoverage.authority, 'APPROVED_INSTITUTIONAL')
    assert.equal(apply.curriculumCoverage.requiresRevalidationOnApproval, false)
    assert.equal(apply.curriculumCoverage.status, 'SATISFIED')
    assert.equal(apply.acceptanceDecisionId, 'teacher-revalidation-001')
    assert.equal(current.curriculumState, 'PROVISIONAL_COMPLETE')
  })

  it('blocks rejected or incorrectly bound revalidation decisions', () => {
    const current = currentBaseline()
    const incoming = incomingApproved([
      requirement({ requirementId: 'req-approved-001', description: 'Analizzare materiali, processi e sistemi tecnologici.' }),
    ])
    const review = buildApprovedCurriculumRevalidationReview({ current, incoming })
    const rejected = { ...acceptedDecision(review), decision: 'REJECTED' as const }
    assert.throws(
      () => prepareApprovedCurriculumRevalidationApply({ current, review, decision: rejected }),
      /was not accepted/,
    )
    const wrong = { ...acceptedDecision(review), reviewFingerprint: 'badc0ffe' }
    assert.throws(
      () => prepareApprovedCurriculumRevalidationApply({ current, review, decision: wrong }),
      /not bound to this review/,
    )
  })

  it('rejects a handoff for another class context', () => {
    const current = currentBaseline()
    const incoming = incomingApproved([
      requirement({ requirementId: 'req-approved-001', description: 'Analizzare materiali, processi e sistemi tecnologici.' }),
    ])
    incoming.curricularContext.sectionRef = '1B'
    incoming.structuralFootprint.hash = computeCmlLocalHandoffV2Footprint(incoming)
    assert.throws(
      () => classifyCurriculumImportState({ current, incoming }),
      /does not match the persisted annual-plan scope/,
    )
  })

  it('does not use revalidation to accept another provisional baseline', () => {
    const current = currentBaseline()
    const incoming = incomingApproved([
      requirement({ requirementId: 'req-approved-001', description: 'Analizzare materiali, processi e sistemi tecnologici.' }),
    ])
    incoming.curricularContext.curriculumState = 'PROVISIONAL_COMPLETE'
    delete incoming.curricularContext.approvalDecisionRef
    incoming.structuralFootprint.hash = computeCmlLocalHandoffV2Footprint(incoming)
    assert.throws(
      () => buildApprovedCurriculumRevalidationReview({ current, incoming }),
      /requires an APPROVED Arena curriculum context/,
    )
  })

  it('treats a semantic change as needing explicit new coverage', () => {
    const current = currentBaseline()
    const incoming = incomingApproved([
      requirement({
        requirementId: 'req-old-001',
        description: 'Analizzare e progettare sistemi tecnologici includendo nuovi vincoli digitali.',
        curriculumNodeRef: ref('CurriculumNode', 'node-old-001', 'approved'),
      }),
    ])
    const review = buildApprovedCurriculumRevalidationReview({ current, incoming })

    assert.deepEqual(review.changedRequirementIds, ['req-old-001'])
    assert.equal(review.coverageAgainstApproved.status, 'NOT_SATISFIED')
    assert.deepEqual(review.blockingRequirementIds, ['req-old-001'])
  })
})
