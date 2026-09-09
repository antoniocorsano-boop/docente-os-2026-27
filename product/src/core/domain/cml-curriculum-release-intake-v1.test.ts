import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  prepareCurriculumReleaseIntake,
  projectReceivedCurriculumReleaseV1,
  projectTeacherCurriculumContextV1,
} from './cml-curriculum-release-intake-v1'
import {
  computeCmlLocalHandoffV2Footprint,
  type CmlLocalHandoffV2,
  type CurriculumContextForClassV1,
  type CurriculumRequirementV1,
} from './cml-local-handoff-v2'
import type { AnnualPlanCurriculumBaselineSnapshot } from './cml-curriculum-revalidation'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

const stableVersionRef = ref(
  'CurriculumVersionProjection',
  'school-demo:technology:secondaria:grade-1',
  'same-content-version',
)

function requirement(description = 'Analizzare materiali, processi e sistemi tecnologici.'): CurriculumRequirementV1 {
  return {
    requirementId: 'req-001',
    kind: 'SPECIFIC_LEARNING_OBJECTIVE',
    authorityLevel: 'NATIONAL_PRESCRIPTIVE',
    curriculumNodeRef: ref('CurriculumNodeProjection', 'node-001'),
    description,
    coverageRequired: true,
    sourceRefs: [ref('NationalFramework', 'IN2025', 'DM-221-2025')],
  }
}

function context(state: 'PROVISIONAL_COMPLETE' | 'APPROVED', req = requirement()): CurriculumContextForClassV1 {
  const approved = state === 'APPROVED'
  return {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: approved ? 'ctx-approved-1a' : 'ctx-provisional-1a',
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: '1A',
    curriculumRef: ref('InstituteCurriculum', 'school-demo:technology'),
    curriculumVersionRef: { ...stableVersionRef },
    curriculumState: state,
    approvalProcessRef: ref('CurriculumApprovalProcess', 'technology-2026', '1'),
    ...(approved
      ? { approvalDecisionRef: ref('InstitutionalDecision', 'technology-2026-approved', '1') }
      : {}),
    applicabilityStatus: 'APPLICABLE',
    transitionRuleRef: ref('NationalTransitionRule', 'DM-221-2025-art-5'),
    completeForPlanning: true,
    requirements: [req],
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
      stableVersionRef,
      ...(approved ? [ref('InstitutionalDecision', 'technology-2026-approved', '1')] : []),
    ],
  }
}

function handoff(
  state: 'PROVISIONAL_COMPLETE' | 'APPROVED',
  options: { req?: CurriculumRequirementV1; messageId?: string; generatedAt?: string } = {},
): CmlLocalHandoffV2 {
  const curricularContext = context(state, options.req ?? requirement())
  const candidate: Omit<CmlLocalHandoffV2, 'structuralFootprint'> = {
    format: 'CML_LOCAL_HANDOFF_V2',
    targetProduct: 'DOCENTE_OS',
    acceptanceRequired: true,
    importMode: 'PREVIEW_ONLY',
    generatedAt: options.generatedAt ?? '2026-09-09T18:00:00.000Z',
    curricularContext,
    annualPlanningFramework: {
      contract: 'CML_INTEROP_V1',
      messageId: options.messageId ?? `framework-${state.toLowerCase()}`,
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE',
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceVersion: 'arena-c2p-02',
      emittedAt: options.generatedAt ?? '2026-09-09T18:00:00.000Z',
      payloadVersion: 1,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL',
      provenance: {
        sourceRefs: [stableVersionRef],
        generatedBy: 'SYSTEM_DERIVED',
        humanConfirmed: state === 'APPROVED',
      },
      payload: {
        curriculumVersionRef: { ...stableVersionRef },
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
          sourceRef: { ...stableVersionRef },
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

function baselineFromHandoff(
  incoming: CmlLocalHandoffV2,
  overrides: Partial<AnnualPlanCurriculumBaselineSnapshot> = {},
): AnnualPlanCurriculumBaselineSnapshot {
  const req = incoming.curricularContext.requirements[0]
  const approved = incoming.curricularContext.curriculumState === 'APPROVED'
  return {
    id: approved ? 'receipt-approved-001' : 'receipt-provisional-001',
    sectionId: 'section-uuid-1a',
    curricularContextId: incoming.curricularContext.contextId,
    schoolYearRef: incoming.curricularContext.schoolYearRef,
    disciplineRef: incoming.curricularContext.disciplineRef,
    gradeRef: incoming.curricularContext.gradeRef,
    curriculumState: incoming.curricularContext.curriculumState,
    alignmentAuthority: approved ? 'APPROVED_INSTITUTIONAL' : 'PROVISIONAL_BASELINE',
    requiresRevalidationOnApproval: !approved,
    sourceHandoffFootprintHash: incoming.structuralFootprint.hash,
    sourceFrameworkMessageId: incoming.annualPlanningFramework.messageId,
    acceptanceDecisionId: approved ? 'teacher-approved-acceptance' : 'teacher-provisional-acceptance',
    acceptedAt: '2026-09-09T18:30:00.000Z',
    reviewedFramework: {
      periods: [{
        periodId: 'teacher-period-1',
        label: 'Primo periodo',
        suggestedNodeRefs: [{ ...req.curriculumNodeRef }],
      }],
      constraints: [{
        id: 'teacher-sequence',
        kind: 'RECOMMENDED',
        description: 'Sequenza professionale scelta dal docente.',
      }],
    },
    curriculumCoverage: {
      status: 'SATISFIED',
      authority: approved ? 'APPROVED_INSTITUTIONAL' : 'PROVISIONAL_BASELINE',
      requiresRevalidationOnApproval: !approved,
      contextId: incoming.curricularContext.contextId,
      curriculumVersionRef: { ...stableVersionRef },
      requirementCoverage: [{
        requirementId: req.requirementId,
        coverageRequired: true,
        satisfied: true,
        curriculumNodeRef: { ...req.curriculumNodeRef },
        authorityLevel: req.authorityLevel,
      }],
      blockingRequirementIds: [],
    },
    curricularContext: JSON.parse(JSON.stringify(incoming.curricularContext)) as CurriculumContextForClassV1,
    ...overrides,
  }
}

describe('C2P-03 Docente OS curriculum release intake', () => {
  it('receives a provisional Arena release as preview-only teacher review', () => {
    const incoming = handoff('PROVISIONAL_COMPLETE')
    const result = prepareCurriculumReleaseIntake({ current: null, incoming })

    assert.equal(result.importState, 'NEW')
    assert.equal(result.mode, 'INITIAL_TEACHER_REVIEW')
    assert.equal(result.persistenceAllowed, false)
    assert.equal(result.release.authorityState, 'PROVISIONAL_COMPLETE')
    assert.equal(result.release.authorityReceiptRef, undefined)
    assert.equal(result.release.downstreamPolicy.automaticWriteAllowed, false)
    assert.equal(result.review.persistenceAllowed, false)
  })

  it('projects C1 without copying requirement descriptions into the release profile', () => {
    const release = projectReceivedCurriculumReleaseV1(handoff('APPROVED'))

    assert.equal(release.contract, 'CML_CURRICULUM_RELEASE_CONTRACT_V1')
    assert.equal(release.contractVersion, 1)
    assert.equal(release.authorityState, 'APPROVED')
    assert.ok(release.authorityReceiptRef)
    assert.equal('description' in release.planningSemantics.requirements[0], false)
    assert.equal(release.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
  })

  it('establishes a teacher context only from an already accepted persisted baseline', () => {
    const accepted = handoff('APPROVED')
    const current = baselineFromHandoff(accepted)
    const result = prepareCurriculumReleaseIntake({ current, incoming: accepted })

    assert.equal(result.importState, 'ALREADY_KNOWN')
    assert.equal(result.mode, 'CURRENT_CONTEXT')
    assert.equal(result.teacherContext.localAuthorityEffect, 'NONE')
    assert.equal(result.teacherContext.teacherAcceptanceState, 'ACCEPTED_FOR_PROFESSIONAL_PLANNING')
    assert.equal(result.teacherContext.institutionalAuthorityState, 'APPROVED')
    assert.equal(result.teacherContext.teacherDecisionRef, current.acceptanceDecisionId)
  })

  it('detects same-version provisional to approved authority transition through the footprint', () => {
    const provisional = handoff('PROVISIONAL_COMPLETE', { messageId: 'framework-same-version-provisional' })
    const current = baselineFromHandoff(provisional)
    const approved = handoff('APPROVED', {
      messageId: 'framework-same-version-approved',
      generatedAt: '2026-09-10T08:00:00.000Z',
    })

    assert.deepEqual(current.curricularContext.curriculumVersionRef, approved.curricularContext.curriculumVersionRef)
    assert.notEqual(current.sourceHandoffFootprintHash, approved.structuralFootprint.hash)

    const result = prepareCurriculumReleaseIntake({ current, incoming: approved })
    assert.equal(result.importState, 'UPDATE_AVAILABLE')
    assert.equal(result.mode, 'APPROVED_REVALIDATION')
    assert.equal(result.persistenceAllowed, false)
    assert.equal(result.review.status, 'AWAITING_TEACHER_REVALIDATION')
    assert.equal(result.review.persistenceAllowed, false)
    assert.deepEqual(result.review.preservedFramework, current.reviewedFramework)
  })

  it('routes a changed provisional release to review without overwriting the current provisional context', () => {
    const provisional = handoff('PROVISIONAL_COMPLETE')
    const current = baselineFromHandoff(provisional)
    const changed = handoff('PROVISIONAL_COMPLETE', {
      req: requirement('Analizzare materiali e sistemi includendo un nuovo vincolo documentale.'),
      messageId: 'framework-provisional-updated',
    })

    const result = prepareCurriculumReleaseIntake({ current, incoming: changed })
    assert.equal(result.importState, 'UPDATE_AVAILABLE')
    assert.equal(result.mode, 'PROVISIONAL_UPDATE_REVIEW')
    assert.equal(result.persistenceAllowed, false)
    assert.equal(current.curricularContext.requirements[0].description, 'Analizzare materiali, processi e sistemi tecnologici.')
  })

  it('fails closed on an attempted approved-to-provisional authority downgrade', () => {
    const approved = handoff('APPROVED')
    const current = baselineFromHandoff(approved)
    const provisional = handoff('PROVISIONAL_COMPLETE', {
      req: requirement('Nuova formulazione ancora provvisoria.'),
      messageId: 'framework-later-provisional',
    })

    assert.throws(
      () => prepareCurriculumReleaseIntake({ current, incoming: provisional }),
      /cannot downgrade an approved teacher context/,
    )
  })

  it('rejects a tampered structural footprint before creating any intake review', () => {
    const incoming = handoff('APPROVED')
    incoming.structuralFootprint.hash = '00000000'

    assert.throws(
      () => prepareCurriculumReleaseIntake({ current: null, incoming }),
      /structural footprint mismatch/,
    )
  })

  it('keeps institutional authority as a referenced fact, never a Docente OS authority effect', () => {
    const incoming = handoff('APPROVED')
    const teacherContext = projectTeacherCurriculumContextV1(baselineFromHandoff(incoming))

    assert.equal(teacherContext.sourceProduct, 'CURMANLIGHT_ARENA')
    assert.equal(teacherContext.localAuthorityEffect, 'NONE')
    assert.ok(teacherContext.institutionalAuthorityReceiptRef)
    assert.equal(teacherContext.requiresRevalidationOnApproval, false)
  })
})
