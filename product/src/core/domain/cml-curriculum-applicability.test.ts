import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CmlCanonicalRef } from './cml-local-handoff'
import type { AnnualPlanFrameworkApplyCommand } from './cml-handoff-acceptance'
import {
  bindCurriculumApplicability,
  type CurriculumApplicabilityEvidence,
} from './cml-curriculum-applicability'

function ref(entityType: string, entityId: string, versionId?: string): CmlCanonicalRef {
  return { namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}) }
}

function command(): AnnualPlanFrameworkApplyCommand {
  return {
    contract: 'CML_HANDOFF_APPLY_V1',
    status: 'AUTHORIZED_FOR_PERSISTENCE',
    writeAuthorized: true,
    target: 'ANNUAL_PLAN_FRAMEWORK_ADOPTION',
    acceptanceDecisionId: 'decision-001',
    acceptedAt: '2026-08-26T13:00:00.000Z',
    source: {
      handoffFormat: 'CML_LOCAL_HANDOFF_V1',
      handoffFootprintHash: 'deadbeef',
      curriculumMessageId: 'msg-curriculum-001',
      frameworkMessageId: 'msg-framework-001',
    },
    context: {
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-1',
      curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
    },
    reviewedFramework: {
      periods: [{ periodId: 'p1', label: 'Primo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-001')] }],
      constraints: [],
    },
  }
}

function applicability(): CurriculumApplicabilityEvidence {
  return {
    contract: 'CML_CURRICULUM_APPLICABILITY_V1',
    evidenceId: 'applicability-001',
    curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: '1A',
    cohortRef: 'cohort-2026-grade-1',
    applicabilityStatus: 'TRANSITIONAL',
    authorityRef: ref('InstitutionalDecision', 'curriculum-transition-2026'),
    transitionRuleRef: ref('CurriculumTransitionRule', 'dm221-2025-progression'),
    humanConfirmed: true,
  }
}

describe('CML transition-aware curriculum applicability', () => {
  it('binds an institutionally confirmed transition rule to the apply command', () => {
    const result = bindCurriculumApplicability({ command: command(), evidence: applicability() })
    assert.equal(result.applicability.applicabilityStatus, 'TRANSITIONAL')
    assert.equal(result.applicability.sectionRef, '1A')
  })

  it('rejects persistence when transitionRuleRef is missing', () => {
    const evidence = { ...applicability(), transitionRuleRef: { namespace: '', entityType: '', entityId: '' } }
    assert.throws(() => bindCurriculumApplicability({ command: command(), evidence }), /transitionRuleRef/)
  })

  it('rejects applicability for a different curriculum version', () => {
    const evidence = { ...applicability(), curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-2', '2012') }
    assert.throws(() => bindCurriculumApplicability({ command: command(), evidence }), /does not match annual-plan context/)
  })

  it('rejects applicability without class or cohort scope', () => {
    const evidence = { ...applicability(), sectionRef: undefined, cohortRef: undefined }
    assert.throws(() => bindCurriculumApplicability({ command: command(), evidence }), /sectionRef or cohortRef/)
  })

  it('rejects a curriculum superseded for the target cohort', () => {
    const evidence = { ...applicability(), applicabilityStatus: 'SUPERSEDED_FOR_NEW_COHORTS' as const }
    assert.throws(() => bindCurriculumApplicability({ command: command(), evidence }), /superseded for this cohort/)
  })

  it('rejects non-human-confirmed applicability evidence', () => {
    const evidence = { ...applicability(), humanConfirmed: false as unknown as true }
    assert.throws(() => bindCurriculumApplicability({ command: command(), evidence }), /must be human confirmed/)
  })
})
