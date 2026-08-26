import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CmlCanonicalRef } from './cml-local-handoff'
import type { AnnualPlanFrameworkApplyCommand } from './cml-handoff-acceptance'
import type { CurriculumContextForClassV1 } from './cml-local-handoff-v2'
import {
  bindCurriculumContextAndCoverage,
  evaluateCurriculumCoverage,
} from './cml-curriculum-applicability'

function ref(entityType: string, entityId: string, versionId?: string): CmlCanonicalRef {
  return { namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}) }
}

function command(nodeIds: string[] = ['node-001', 'node-002']): AnnualPlanFrameworkApplyCommand {
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
      periods: [{ periodId: 'p1', label: 'Primo periodo', suggestedNodeRefs: nodeIds.map((id) => ref('CurriculumNode', id)) }],
      constraints: [],
    },
  }
}

function provisionalContext(): CurriculumContextForClassV1 {
  return {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: 'ctx-technology-1A-2026-27',
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: '1A',
    cohortRef: 'cohort-2026-grade-1',
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
        description: 'Obiettivo curricolare obbligatorio.',
        coverageRequired: true,
        sourceRefs: [ref('NationalFramework', 'indicazioni-2025')],
      },
      {
        requirementId: 'req-002',
        kind: 'INSTITUTIONAL_REQUIREMENT',
        authorityLevel: 'TRANSITION_REQUIRED',
        curriculumNodeRef: ref('CurriculumNode', 'node-002'),
        description: 'Requisito della rimodulazione transitoria proposta.',
        coverageRequired: true,
        sourceRefs: [ref('CurriculumDraft', 'technology-transition-draft')],
        transitionOriginRef: ref('RevisionProposal', 'remod-001'),
      },
      {
        requirementId: 'req-rec',
        kind: 'ESSENTIAL_KNOWLEDGE',
        authorityLevel: 'RECOMMENDED',
        curriculumNodeRef: ref('CurriculumNode', 'node-recommended'),
        description: 'Conoscenza raccomandata non bloccante.',
        coverageRequired: false,
        sourceRefs: [ref('CurriculumDraft', 'technology-transition-draft')],
      },
    ],
    transitionRemodulation: {
      state: 'HYPOTHESIS',
      rationale: 'Ipotesi di rimodulazione usabile durante l’iter di approvazione.',
      sourceRefs: [ref('NationalFramework', 'indicazioni-2012'), ref('NationalFramework', 'indicazioni-2025')],
      affectedRequirementIds: ['req-002'],
      usableForPlanning: true,
      institutionallyApproved: false,
      proposalRef: ref('RevisionProposal', 'remod-001'),
    },
    sourceRefs: [ref('RevisionProposal', 'curriculum-draft-001')],
  }
}

const targetScope = {
  schoolYearRef: '2026-2027',
  disciplineRef: 'technology',
  gradeRef: 'grade-1',
  sectionRef: '1A',
  cohortRef: 'cohort-2026-grade-1',
}

describe('CML curriculum applicability and minimum coverage', () => {
  it('allows planning against a complete provisional curriculum when all mandatory requirements are covered', () => {
    const result = bindCurriculumContextAndCoverage({ command: command(), curricularContext: provisionalContext(), targetScope })
    assert.equal(result.curriculumCoverage.status, 'SATISFIED')
    assert.equal(result.curriculumCoverage.authority, 'PROVISIONAL_BASELINE')
    assert.equal(result.curriculumCoverage.requiresRevalidationOnApproval, true)
    assert.equal(result.writeAuthorized, true)
  })

  it('blocks apply when a mandatory curricular requirement is not covered', () => {
    const evaluation = evaluateCurriculumCoverage({ command: command(['node-001']), curricularContext: provisionalContext(), targetScope })
    assert.equal(evaluation.status, 'PARTIALLY_SATISFIED')
    assert.deepEqual(evaluation.blockingRequirementIds, ['req-002'])
    assert.throws(
      () => bindCurriculumContextAndCoverage({ command: command(['node-001']), curricularContext: provisionalContext(), targetScope }),
      /does not satisfy mandatory curricular requirements: req-002/,
    )
  })

  it('does not let an uncovered recommended requirement block curricular satisfaction', () => {
    const result = bindCurriculumContextAndCoverage({ command: command(), curricularContext: provisionalContext(), targetScope })
    const recommended = result.curriculumCoverage.requirementCoverage.find((requirement) => requirement.requirementId === 'req-rec')
    assert.equal(recommended?.satisfied, false)
    assert.equal(result.curriculumCoverage.status, 'SATISFIED')
  })

  it('rejects a curricular context for a different class', () => {
    assert.throws(
      () => evaluateCurriculumCoverage({ command: command(), curricularContext: provisionalContext(), targetScope: { ...targetScope, sectionRef: '1B' } }),
      /sectionRef mismatch/,
    )
  })

  it('rejects a curricular context for a different curriculum version', () => {
    const context = { ...provisionalContext(), curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-2', '2012') }
    assert.throws(
      () => evaluateCurriculumCoverage({ command: command(), curricularContext: context, targetScope }),
      /does not match accepted annual-plan command/,
    )
  })

  it('promotes alignment authority only after institutional approval exists', () => {
    const base = provisionalContext()
    const approved: CurriculumContextForClassV1 = {
      ...base,
      curriculumState: 'APPROVED',
      approvalDecisionRef: ref('InstitutionalDecision', 'curriculum-approved-001'),
      transitionRemodulation: {
        ...base.transitionRemodulation,
        state: 'APPROVED',
        institutionallyApproved: true,
        approvalDecisionRef: ref('InstitutionalDecision', 'remodulation-approved-001'),
      },
    }
    const result = bindCurriculumContextAndCoverage({ command: command(), curricularContext: approved, targetScope })
    assert.equal(result.curriculumCoverage.authority, 'APPROVED_INSTITUTIONAL')
    assert.equal(result.curriculumCoverage.requiresRevalidationOnApproval, false)
  })

  it('rejects a false approval claim without an institutional decision', () => {
    const invalid = { ...provisionalContext(), curriculumState: 'APPROVED' as const }
    assert.throws(
      () => evaluateCurriculumCoverage({ command: command(), curricularContext: invalid, targetScope }),
      /approved curriculum requires approvalDecisionRef/,
    )
  })
})
