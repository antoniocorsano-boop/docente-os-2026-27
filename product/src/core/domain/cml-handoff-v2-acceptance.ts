import type { CmlCanonicalRef } from './cml-local-handoff'
import {
  validateCmlLocalHandoffV2,
  type CmlLocalHandoffV2,
} from './cml-local-handoff-v2'

export const CML_HANDOFF_ACCEPTANCE_CONTRACT_V2 = 'CML_HANDOFF_ACCEPTANCE_V2' as const
export const CML_HANDOFF_APPLY_CONTRACT_V2 = 'CML_HANDOFF_APPLY_V2' as const

export type AnnualPlanFrameworkReviewDraftV2 = {
  status: 'AWAITING_TEACHER_DECISION'
  persistenceAllowed: false
  source: {
    handoffFormat: 'CML_LOCAL_HANDOFF_V2'
    handoffFootprintHash: string
    curricularContextId: string
    frameworkMessageId: string
  }
  context: {
    schoolYearRef: string
    disciplineRef: string
    gradeRef: string
    curriculumVersionRef: CmlCanonicalRef
  }
  curriculumState: 'APPROVED' | 'PROVISIONAL_COMPLETE'
  periods: Array<{
    periodId: string
    label: string
    suggestedNodeRefs: CmlCanonicalRef[]
  }>
  constraints: Array<{
    id: string
    kind: 'REQUIRED' | 'RECOMMENDED' | 'INFORMATIONAL'
    description: string
    sourceRef?: CmlCanonicalRef
  }>
}

export type TeacherFrameworkDecisionV2 = {
  contract: typeof CML_HANDOFF_ACCEPTANCE_CONTRACT_V2
  decisionId: string
  actorRole: 'TEACHER'
  decision: 'ACCEPTED' | 'REJECTED'
  confirmedAt: string
  handoffFootprintHash: string
  curricularContextId: string
  frameworkMessageId: string
}

export type AnnualPlanFrameworkApplyCommandV2 = {
  contract: typeof CML_HANDOFF_APPLY_CONTRACT_V2
  status: 'AUTHORIZED_FOR_PERSISTENCE'
  writeAuthorized: true
  target: 'ANNUAL_PLAN_FRAMEWORK_ADOPTION'
  acceptanceDecisionId: string
  acceptedAt: string
  source: AnnualPlanFrameworkReviewDraftV2['source']
  context: AnnualPlanFrameworkReviewDraftV2['context']
  curriculumState: AnnualPlanFrameworkReviewDraftV2['curriculumState']
  reviewedFramework: {
    periods: AnnualPlanFrameworkReviewDraftV2['periods']
    constraints: AnnualPlanFrameworkReviewDraftV2['constraints']
  }
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function clonePeriods(periods: AnnualPlanFrameworkReviewDraftV2['periods']) {
  return periods.map((period) => ({
    ...period,
    suggestedNodeRefs: period.suggestedNodeRefs.map((ref) => ({ ...ref })),
  }))
}

function cloneConstraints(constraints: AnnualPlanFrameworkReviewDraftV2['constraints']) {
  return constraints.map((constraint) => ({
    ...constraint,
    ...(constraint.sourceRef ? { sourceRef: { ...constraint.sourceRef } } : {}),
  }))
}

export function buildAnnualPlanFrameworkReviewDraftV2(handoff: CmlLocalHandoffV2): AnnualPlanFrameworkReviewDraftV2 {
  const validation = validateCmlLocalHandoffV2(handoff)
  if (!validation.valid) throw new Error(`CML local handoff v2 rejected: ${validation.errors.join('; ')}`)
  const framework = handoff.annualPlanningFramework.payload as Record<string, unknown>
  return {
    status: 'AWAITING_TEACHER_DECISION',
    persistenceAllowed: false,
    source: {
      handoffFormat: 'CML_LOCAL_HANDOFF_V2',
      handoffFootprintHash: handoff.structuralFootprint.hash,
      curricularContextId: handoff.curricularContext.contextId,
      frameworkMessageId: handoff.annualPlanningFramework.messageId,
    },
    context: {
      schoolYearRef: handoff.curricularContext.schoolYearRef,
      disciplineRef: handoff.curricularContext.disciplineRef,
      gradeRef: handoff.curricularContext.gradeRef,
      curriculumVersionRef: { ...handoff.curricularContext.curriculumVersionRef },
    },
    curriculumState: handoff.curricularContext.curriculumState,
    periods: clonePeriods(framework.periods as AnnualPlanFrameworkReviewDraftV2['periods']),
    constraints: cloneConstraints(framework.constraints as AnnualPlanFrameworkReviewDraftV2['constraints']),
  }
}

export function prepareAnnualPlanFrameworkApplyV2(input: {
  draft: AnnualPlanFrameworkReviewDraftV2
  decision: TeacherFrameworkDecisionV2
  reviewedPeriods?: AnnualPlanFrameworkReviewDraftV2['periods']
  reviewedConstraints?: AnnualPlanFrameworkReviewDraftV2['constraints']
}): AnnualPlanFrameworkApplyCommandV2 {
  const { draft, decision } = input
  if (draft.status !== 'AWAITING_TEACHER_DECISION' || draft.persistenceAllowed !== false) {
    throw new Error('review draft v2 is not eligible for teacher acceptance')
  }
  if (decision.contract !== CML_HANDOFF_ACCEPTANCE_CONTRACT_V2) throw new Error('unsupported acceptance contract v2')
  if (!nonEmpty(decision.decisionId)) throw new Error('decisionId is required')
  if (decision.actorRole !== 'TEACHER') throw new Error('only TEACHER may authorize apply')
  if (decision.decision !== 'ACCEPTED') throw new Error('framework was not accepted')
  if (Number.isNaN(Date.parse(decision.confirmedAt))) throw new Error('confirmedAt must be an ISO-compatible date')
  if (decision.handoffFootprintHash !== draft.source.handoffFootprintHash
    || decision.curricularContextId !== draft.source.curricularContextId
    || decision.frameworkMessageId !== draft.source.frameworkMessageId) {
    throw new Error('acceptance decision v2 is not bound to this handoff')
  }
  const periods = input.reviewedPeriods ?? draft.periods
  const constraints = input.reviewedConstraints ?? draft.constraints
  if (periods.length === 0) throw new Error('reviewed framework must contain at least one period')
  return {
    contract: CML_HANDOFF_APPLY_CONTRACT_V2,
    status: 'AUTHORIZED_FOR_PERSISTENCE',
    writeAuthorized: true,
    target: 'ANNUAL_PLAN_FRAMEWORK_ADOPTION',
    acceptanceDecisionId: decision.decisionId,
    acceptedAt: decision.confirmedAt,
    source: { ...draft.source },
    context: {
      ...draft.context,
      curriculumVersionRef: { ...draft.context.curriculumVersionRef },
    },
    curriculumState: draft.curriculumState,
    reviewedFramework: {
      periods: clonePeriods(periods),
      constraints: cloneConstraints(constraints),
    },
  }
}
