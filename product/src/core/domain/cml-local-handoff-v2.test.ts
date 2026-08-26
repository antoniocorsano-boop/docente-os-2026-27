import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CmlCanonicalRef } from './cml-local-handoff'
import {
  computeCmlLocalHandoffV2Footprint,
  validateCmlLocalHandoffV2,
  type CmlLocalHandoffV2,
  type CurriculumContextForClassV1,
} from './cml-local-handoff-v2'
import {
  buildAnnualPlanFrameworkReviewDraftV2,
  prepareAnnualPlanFrameworkApplyV2,
  type TeacherFrameworkDecisionV2,
} from './cml-handoff-v2-acceptance'
import { bindCurriculumContextAndCoverage } from './cml-curriculum-applicability'

function ref(entityType: string, entityId: string, versionId?: string): CmlCanonicalRef {
  return { namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}) }
}

function curricularContext(): CurriculumContextForClassV1 {
  return {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: 'ctx-technology-grade-1-2026-27',
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: 'section-A',
    curriculumRef: ref('Curriculum', 'technology'),
    curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
    curriculumState: 'PROVISIONAL_COMPLETE',
    approvalProcessRef: ref('RevisionProcess', 'curriculum-2025-transition'),
    applicabilityStatus: 'TRANSITIONAL',
    transitionRuleRef: ref('TransitionRule', 'dm221-2025-art5'),
    completeForPlanning: true,
    requirements: [
      {
        requirementId: 'req-001',
        kind: 'SPECIFIC_LEARNING_OBJECTIVE',
        authorityLevel: 'NATIONAL_PRESCRIPTIVE',
        curriculumNodeRef: ref('CurriculumNode', 'node-001'),
        description: 'Requisito nazionale obbligatorio.',
        coverageRequired: true,
        sourceRefs: [ref('NationalFramework', 'indicazioni-2025')],
      },
      {
        requirementId: 'req-002',
        kind: 'INSTITUTIONAL_REQUIREMENT',
        authorityLevel: 'TRANSITION_REQUIRED',
        curriculumNodeRef: ref('CurriculumNode', 'node-002'),
        description: 'Requisito transitorio proposto dall’istituto.',
        coverageRequired: true,
        sourceRefs: [ref('CurriculumDraft', 'technology-transition-draft')],
        transitionOriginRef: ref('TransitionRemodulationProposal', 'remod-001'),
      },
    ],
    transitionRemodulation: {
      state: 'HYPOTHESIS',
      rationale: 'Ipotesi completa usabile per la progettazione in attesa di approvazione.',
      sourceRefs: [ref('NationalFramework', 'indicazioni-2012'), ref('NationalFramework', 'indicazioni-2025')],
      affectedRequirementIds: ['req-002'],
      usableForPlanning: true,
      institutionallyApproved: false,
      proposalRef: ref('RevisionProposal', 'remod-001'),
    },
    sourceRefs: [ref('RevisionProposal', 'curriculum-draft-001')],
  }
}

function handoff(generatedAt = '2026-08-26T14:00:00.000Z'): CmlLocalHandoffV2 {
  const base = {
    format: 'CML_LOCAL_HANDOFF_V2' as const,
    targetProduct: 'DOCENTE_OS' as const,
    acceptanceRequired: true as const,
    importMode: 'PREVIEW_ONLY' as const,
    generatedAt,
    curricularContext: curricularContext(),
    annualPlanningFramework: {
      contract: 'CML_INTEROP_V1' as const,
      messageId: 'msg-framework-001',
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE' as const,
      sourceProduct: 'CURMANLIGHT_ARENA' as const,
      sourceVersion: 'fixture-v2',
      emittedAt: '2026-08-26T12:00:00.000Z',
      payloadVersion: 1 as const,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL' as const,
      provenance: {
        sourceRefs: [ref('CurriculumVersion', 'technology-grade-1', '2026-27')],
        generatedBy: 'SYSTEM_DERIVED' as const,
        humanConfirmed: false,
      },
      payload: {
        curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
        disciplineRef: 'technology',
        gradeRef: 'grade-1',
        periods: [
          { periodId: 'p1', label: 'Primo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-001')] },
          { periodId: 'p2', label: 'Secondo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-002')] },
        ],
        constraints: [{ id: 'constraint-001', kind: 'REQUIRED' as const, description: 'Preservare la copertura curricolare.' }],
      },
    },
  }
  return {
    ...base,
    structuralFootprint: { algorithm: 'fnv1a', version: 1, hash: computeCmlLocalHandoffV2Footprint(base) },
  }
}

function decision(source: CmlLocalHandoffV2): TeacherFrameworkDecisionV2 {
  return {
    contract: 'CML_HANDOFF_ACCEPTANCE_V2',
    decisionId: 'teacher-decision-001',
    actorRole: 'TEACHER',
    decision: 'ACCEPTED',
    confirmedAt: '2026-08-26T15:00:00.000Z',
    handoffFootprintHash: source.structuralFootprint.hash,
    curricularContextId: source.curricularContext.contextId,
    frameworkMessageId: source.annualPlanningFramework.messageId,
  }
}

describe('CML local handoff v2 receiver', () => {
  it('accepts the Arena sender-shaped provisional curriculum package', () => {
    assert.deepEqual(validateCmlLocalHandoffV2(handoff()), { valid: true, errors: [] })
  })

  it('excludes generatedAt from the structural footprint just like Arena', () => {
    assert.equal(handoff('2026-08-26T14:00:00.000Z').structuralFootprint.hash, handoff('2026-08-26T15:00:00.000Z').structuralFootprint.hash)
  })

  it('rejects forbidden personal-data keys even when the footprint is recomputed', () => {
    const original = handoff()
    const tamperedBase = {
      ...original,
      curricularContext: {
        ...original.curricularContext,
        requirements: original.curricularContext.requirements.map((requirement, index) => index === 0
          ? { ...requirement, studentName: 'forbidden' }
          : requirement),
      },
    }
    const tampered = {
      ...tamperedBase,
      structuralFootprint: {
        algorithm: 'fnv1a' as const,
        version: 1 as const,
        hash: computeCmlLocalHandoffV2Footprint(tamperedBase),
      },
    }
    const result = validateCmlLocalHandoffV2(tampered)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some((error) => error.includes('studentName')))
  })

  it('runs preview -> teacher acceptance -> apply -> mandatory curriculum coverage without treating provisional as approved', () => {
    const source = handoff()
    const draft = buildAnnualPlanFrameworkReviewDraftV2(source)
    assert.equal(draft.persistenceAllowed, false)
    assert.equal(draft.curriculumState, 'PROVISIONAL_COMPLETE')
    const apply = prepareAnnualPlanFrameworkApplyV2({ draft, decision: decision(source) })
    const bound = bindCurriculumContextAndCoverage({
      command: apply,
      curricularContext: source.curricularContext,
      targetScope: {
        schoolYearRef: '2026-2027',
        disciplineRef: 'technology',
        gradeRef: 'grade-1',
        sectionRef: 'section-A',
      },
    })
    assert.equal(bound.curriculumCoverage.status, 'SATISFIED')
    assert.equal(bound.curriculumCoverage.authority, 'PROVISIONAL_BASELINE')
    assert.equal(bound.curriculumCoverage.requiresRevalidationOnApproval, true)
  })

  it('rejects a teacher decision bound to another curricular context', () => {
    const source = handoff()
    const draft = buildAnnualPlanFrameworkReviewDraftV2(source)
    assert.throws(
      () => prepareAnnualPlanFrameworkApplyV2({ draft, decision: { ...decision(source), curricularContextId: 'another-context' } }),
      /not bound to this handoff/,
    )
  })
})
