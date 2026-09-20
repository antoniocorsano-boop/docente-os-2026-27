import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnnualPlanCurriculumBaselineSnapshot } from '@/core/domain/cml-curriculum-revalidation'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import {
  buildLessonPreparationApprovalSnapshot,
  curriculumBaselineFingerprint,
  isCurriculumBaselineReadyForLessonApproval,
  lessonPreparationFingerprint,
  type LessonPreparationContext,
} from './lesson-preparation-approval'

const context: LessonPreparationContext = {
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  sectionId: 'section-2c',
  canonicalPlanAssetId: 'asset-plan-2',
  canonicalGenerationId: 'generation-plan-2',
  blockId: 'B01',
  projectionId: 'HTC-SECONDA-B01-v1',
}

const projection: HumanTaskLessonProjection = {
  projectionId: 'HTC-SECONDA-B01-v1',
  grade: 'Seconda',
  blockId: 'B01',
  udaCode: '2-01',
  udaTitle: 'Agricoltura, suolo e produzioni sostenibili',
  packCode: 'CAN-PACK-2A',
  period: 'Settembre/Ottobre',
  title: 'Il territorio agricolo come sistema',
  durationMinutes: 120,
  why: 'Leggere il territorio agricolo come sistema.',
  objective: 'Riconoscere componenti e relazioni essenziali.',
  outcomes: ['Riconoscere input e output.'],
  preparation: ['Scheda 2A-1.'],
  steps: [{ id: 'S01', minutes: 120, title: 'Leggere un paesaggio agricolo', instruction: 'Analizza il sistema.' }],
  resources: [],
  evidence: 'Schema input → processo → output.',
  observation: ['Distingue input, processo e output.'],
  assessmentNote: 'Valutazione formativa.',
  continuation: 'Proseguire con il suolo.',
  sourceAlignment: { level: 'DIRECT' },
  sources: [],
}

function baseline(requirementDescription = 'Analizzare sistemi tecnologici.'): AnnualPlanCurriculumBaselineSnapshot {
  return {
    id: 'receipt-1',
    sectionId: context.sectionId,
    curricularContextId: 'ctx-2c',
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-2',
    curriculumState: 'APPROVED',
    alignmentAuthority: 'APPROVED_INSTITUTIONAL',
    requiresRevalidationOnApproval: false,
    sourceHandoffFootprintHash: 'handoff-a',
    sourceFrameworkMessageId: 'framework-a',
    acceptanceDecisionId: 'decision-a',
    acceptedAt: '2026-09-20T12:00:00.000Z',
    reviewedFramework: {
      periods: [{ periodId: 'p1', label: 'Primo periodo', suggestedNodeRefs: [] }],
      constraints: [],
    },
    curriculumCoverage: {
      contextId: 'ctx-2c',
      curriculumVersionRef: { namespace: 'cml', entityType: 'CurriculumVersion', entityId: 'technology-transition', versionId: '2026-27' },
      status: 'SATISFIED',
      authority: 'APPROVED_INSTITUTIONAL',
      requiresRevalidationOnApproval: false,
      requirementCoverage: [],
      blockingRequirementIds: [],
    },
    curricularContext: {
      contract: 'CML_CURRICULUM_CONTEXT_V1',
      contextId: 'ctx-2c',
      institutionRef: { namespace: 'cml', entityType: 'Institution', entityId: 'school' },
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-2',
      sectionRef: '2C',
      cohortRef: 'cohort-2',
      curriculumRef: { namespace: 'cml', entityType: 'Curriculum', entityId: 'technology' },
      curriculumVersionRef: { namespace: 'cml', entityType: 'CurriculumVersion', entityId: 'technology-transition', versionId: '2026-27' },
      curriculumState: 'APPROVED',
      approvalProcessRef: { namespace: 'cml', entityType: 'CurriculumApprovalProcess', entityId: 'approval' },
      approvalDecisionRef: { namespace: 'cml', entityType: 'InstitutionalDecision', entityId: 'decision' },
      applicabilityStatus: 'TRANSITIONAL',
      transitionRuleRef: { namespace: 'cml', entityType: 'CurriculumTransitionRule', entityId: 'dm221-progression' },
      completeForPlanning: true,
      requirements: [{
        requirementId: 'req-1',
        kind: 'SPECIFIC_LEARNING_OBJECTIVE',
        authorityLevel: 'NATIONAL_PRESCRIPTIVE',
        curriculumNodeRef: { namespace: 'cml', entityType: 'CurriculumNode', entityId: 'node-1' },
        description: requirementDescription,
        coverageRequired: true,
        sourceRefs: [{ namespace: 'cml', entityType: 'NationalFramework', entityId: 'indicazioni-2012' }],
      }],
      transitionRemodulation: {
        state: 'NOT_REQUIRED',
        rationale: 'Regime transitorio già determinato.',
        sourceRefs: [{ namespace: 'cml', entityType: 'CurriculumTransitionRule', entityId: 'dm221-progression' }],
        affectedRequirementIds: [],
        usableForPlanning: true,
        institutionallyApproved: false,
      },
      sourceRefs: [{ namespace: 'cml', entityType: 'CurriculumVersion', entityId: 'technology-transition', versionId: '2026-27' }],
    },
  }
}

function extension(status: LessonDesignExtension['status'], body = 'Usa la risorsa visuale scelta dal docente.'): LessonDesignExtension {
  return {
    id: 'extension-1',
    workspaceId: context.workspaceId,
    academicYearId: context.academicYearId,
    sectionId: context.sectionId,
    canonicalPlanAssetId: context.canonicalPlanAssetId,
    canonicalGenerationId: context.canonicalGenerationId,
    blockId: context.blockId,
    projectionId: context.projectionId,
    kind: 'TEACHER_RESOURCE',
    status,
    insertionPosition: 'START',
    anchorStepId: null,
    title: 'Supporto visuale',
    body,
    cue: null,
    minutes: null,
    sourceKind: 'TEACHER',
    sourceRef: 'atlas:visual-1',
    sourceLabel: 'Atlas · proposta selezionata',
    payload: {},
    revision: 2,
    decisionHistory: status === 'ACCEPTED' ? [{ action: 'ACCEPTED', actorId: 'teacher-1', at: '2026-09-20T13:00:00.000Z', revision: 2 }] : [],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: status === 'ACCEPTED' ? 'teacher-1' : null,
    acceptedAt: status === 'ACCEPTED' ? '2026-09-20T13:00:00.000Z' : null,
    dismissedBy: null,
    dismissedAt: null,
    createdBy: 'teacher-1',
    createdAt: '2026-09-20T12:30:00.000Z',
    updatedAt: '2026-09-20T13:00:00.000Z',
  }
}

test('same effective preparation produces the same fingerprint', () => {
  const first = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED')] })
  const second = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED')] })
  assert.equal(lessonPreparationFingerprint(first), lessonPreparationFingerprint(second))
})

test('semantic curriculum drift invalidates approval even when curriculum version ref is unchanged', () => {
  const firstBaseline = baseline('Analizzare sistemi tecnologici.')
  const changedBaseline = baseline('Analizzare sistemi tecnologici e valutarne gli impatti.')
  assert.notEqual(curriculumBaselineFingerprint(firstBaseline), curriculumBaselineFingerprint(changedBaseline))

  const first = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: firstBaseline, projection, extensions: [] })
  const changed = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: changedBaseline, projection, extensions: [] })
  assert.notEqual(lessonPreparationFingerprint(first), lessonPreparationFingerprint(changed))
})

test('changing an accepted teacher decision invalidates approval', () => {
  const first = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED')] })
  const changed = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('ACCEPTED', 'Usa una risorsa diversa scelta dal docente.')] })
  assert.notEqual(lessonPreparationFingerprint(first), lessonPreparationFingerprint(changed))
})

test('unaccepted proposals are outside the approved effective preparation', () => {
  const withoutProposal = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [] })
  const withProposal = buildLessonPreparationApprovalSnapshot({ context, curriculumBaseline: baseline(), projection, extensions: [extension('PROPOSED')] })
  assert.equal(lessonPreparationFingerprint(withoutProposal), lessonPreparationFingerprint(withProposal))
})

test('curriculum baseline must be complete and satisfied before lesson approval', () => {
  assert.equal(isCurriculumBaselineReadyForLessonApproval(baseline()), true)
  const provisional = baseline()
  provisional.curriculumState = 'PROVISIONAL_COMPLETE'
  provisional.alignmentAuthority = 'PROVISIONAL_BASELINE'
  provisional.requiresRevalidationOnApproval = true
  assert.equal(isCurriculumBaselineReadyForLessonApproval(provisional), false)

  assert.equal(isCurriculumBaselineReadyForLessonApproval(null), false)
  const blocked = baseline()
  blocked.curriculumCoverage.status = 'NOT_SATISFIED'
  blocked.curriculumCoverage.blockingRequirementIds = ['req-1']
  assert.equal(isCurriculumBaselineReadyForLessonApproval(blocked), false)
})
