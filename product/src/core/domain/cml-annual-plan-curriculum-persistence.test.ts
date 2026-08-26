import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TransitionAwareAnnualPlanApplyCommand } from './cml-curriculum-applicability'
import { prepareAnnualPlanCurriculumPersistence } from './cml-annual-plan-curriculum-persistence'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}),
})

function command(state: 'PROVISIONAL_COMPLETE' | 'APPROVED' = 'PROVISIONAL_COMPLETE'): TransitionAwareAnnualPlanApplyCommand {
  const approved = state === 'APPROVED'
  return {
    contract: 'CML_HANDOFF_APPLY_V2',
    status: 'AUTHORIZED_FOR_PERSISTENCE',
    writeAuthorized: true,
    target: 'ANNUAL_PLAN_FRAMEWORK_ADOPTION',
    acceptanceDecisionId: 'teacher-decision-001',
    acceptedAt: '2026-08-26T14:00:00.000Z',
    source: {
      handoffFormat: 'CML_LOCAL_HANDOFF_V2',
      handoffFootprintHash: 'deadbeef',
      curricularContextId: 'ctx-tech-2026-1a',
      frameworkMessageId: 'framework-001',
    },
    context: {
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-1',
      curriculumVersionRef: ref('CurriculumVersion', approved ? 'technology-2025' : 'technology-working', '2026-27'),
    },
    curriculumState: state,
    reviewedFramework: {
      periods: [{ periodId: 'p1', label: 'Primo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-001')] }],
      constraints: [{ id: 'c1', kind: 'REQUIRED', description: 'Copertura minima.' }],
    },
    curricularContext: {
      contract: 'CML_CURRICULUM_CONTEXT_V1',
      contextId: 'ctx-tech-2026-1a',
      institutionRef: ref('Institution', 'school-demo'),
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-1',
      sectionRef: '1A',
      cohortRef: 'cohort-2026-grade-1',
      curriculumRef: ref('Curriculum', 'technology'),
      curriculumVersionRef: ref('CurriculumVersion', approved ? 'technology-2025' : 'technology-working', '2026-27'),
      curriculumState: state,
      approvalProcessRef: ref('CurriculumApprovalProcess', 'approval-2026'),
      ...(approved ? { approvalDecisionRef: ref('InstitutionalDecision', 'decision-2026') } : {}),
      applicabilityStatus: 'APPLICABLE',
      transitionRuleRef: ref('CurriculumTransitionRule', 'dm221-2025-progression'),
      completeForPlanning: true,
      requirements: [{
        requirementId: 'req-001',
        kind: 'SPECIFIC_LEARNING_OBJECTIVE',
        authorityLevel: 'NATIONAL_PRESCRIPTIVE',
        curriculumNodeRef: ref('CurriculumNode', 'node-001'),
        description: 'Requirement obbligatorio.',
        coverageRequired: true,
        sourceRefs: [ref('NationalFramework', 'in2025')],
      }],
      transitionRemodulation: {
        state: 'NOT_REQUIRED',
        rationale: 'Nessuna rimodulazione richiesta per questa classe.',
        sourceRefs: [ref('CurriculumTransitionRule', 'dm221-2025-progression')],
        affectedRequirementIds: [],
        usableForPlanning: true,
        institutionallyApproved: approved,
        ...(approved ? { approvalDecisionRef: ref('InstitutionalDecision', 'decision-2026') } : {}),
      },
      sourceRefs: [ref('CurriculumVersion', approved ? 'technology-2025' : 'technology-working', '2026-27')],
    },
    curriculumCoverage: {
      status: 'SATISFIED',
      authority: approved ? 'APPROVED_INSTITUTIONAL' : 'PROVISIONAL_BASELINE',
      requiresRevalidationOnApproval: !approved,
      contextId: 'ctx-tech-2026-1a',
      curriculumVersionRef: ref('CurriculumVersion', approved ? 'technology-2025' : 'technology-working', '2026-27'),
      requirementCoverage: [{
        requirementId: 'req-001',
        coverageRequired: true,
        satisfied: true,
        curriculumNodeRef: ref('CurriculumNode', 'node-001'),
        authorityLevel: 'NATIONAL_PRESCRIPTIVE',
      }],
      blockingRequirementIds: [],
    },
  }
}

const section = {
  sectionId: 'section-uuid',
  academicYearLabel: '2026/2027',
  grade: 'PRIMA' as const,
  sectionCode: 'A',
}

describe('annual plan curriculum persistence contract', () => {
  it('persists a complete provisional baseline without treating it as approved', () => {
    const payload = prepareAnnualPlanCurriculumPersistence({ command: command(), section })
    assert.equal(payload.curriculumState, 'PROVISIONAL_COMPLETE')
    assert.equal(payload.alignmentAuthority, 'PROVISIONAL_BASELINE')
    assert.equal(payload.requiresRevalidationOnApproval, true)
    assert.equal(payload.sectionRef, '1A')
  })

  it('persists an approved institutional baseline distinctly', () => {
    const payload = prepareAnnualPlanCurriculumPersistence({ command: command('APPROVED'), section })
    assert.equal(payload.curriculumState, 'APPROVED')
    assert.equal(payload.alignmentAuthority, 'APPROVED_INSTITUTIONAL')
    assert.equal(payload.requiresRevalidationOnApproval, false)
  })

  it('rejects a plan whose mandatory coverage is no longer satisfied', () => {
    const candidate = command()
    candidate.curriculumCoverage.status = 'PARTIALLY_SATISFIED'
    candidate.curriculumCoverage.blockingRequirementIds = ['req-001']
    assert.throws(
      () => prepareAnnualPlanCurriculumPersistence({ command: candidate, section }),
      /coverage must be SATISFIED/,
    )
  })

  it('rejects persistence through the legacy v1 apply path', () => {
    const candidate = command()
    ;(candidate as { contract: string }).contract = 'CML_HANDOFF_APPLY_V1'
    assert.throws(
      () => prepareAnnualPlanCurriculumPersistence({ command: candidate, section }),
      /only CML_HANDOFF_APPLY_V2/,
    )
  })

  it('rejects a curriculum context for another grade', () => {
    const candidate = command()
    candidate.curricularContext.gradeRef = 'grade-2'
    assert.throws(
      () => prepareAnnualPlanCurriculumPersistence({ command: candidate, section }),
      /grade does not match/,
    )
  })

  it('rejects a curriculum context for another section', () => {
    const candidate = command()
    candidate.curricularContext.sectionRef = '1B'
    assert.throws(
      () => prepareAnnualPlanCurriculumPersistence({ command: candidate, section }),
      /section does not match/,
    )
  })
})
