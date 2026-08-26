import {
  buildAnnualPlanImportPreview,
  validateCmlLocalHandoff,
  type AnnualPlanImportPreview,
  type CmlCanonicalRef,
  type CmlLocalHandoffV1,
} from './cml-local-handoff'

export const CML_HANDOFF_ACCEPTANCE_CONTRACT = 'CML_HANDOFF_ACCEPTANCE_V1' as const
export const CML_HANDOFF_APPLY_CONTRACT = 'CML_HANDOFF_APPLY_V1' as const

export type AnnualPlanFrameworkReviewDraft = {
  status: 'AWAITING_TEACHER_DECISION'
  persistenceAllowed: false
  source: {
    handoffFormat: 'CML_LOCAL_HANDOFF_V1'
    handoffFootprintHash: string
    curriculumMessageId: string
    frameworkMessageId: string
  }
  context: AnnualPlanImportPreview['context']
  periods: AnnualPlanImportPreview['periods']
  constraints: AnnualPlanImportPreview['constraints']
}

export type TeacherFrameworkDecision = {
  contract: typeof CML_HANDOFF_ACCEPTANCE_CONTRACT
  decisionId: string
  actorRole: 'TEACHER'
  decision: 'ACCEPTED' | 'REJECTED'
  confirmedAt: string
  handoffFootprintHash: string
  curriculumMessageId: string
  frameworkMessageId: string
}

export type AnnualPlanFrameworkApplyCommand = {
  contract: typeof CML_HANDOFF_APPLY_CONTRACT
  status: 'AUTHORIZED_FOR_PERSISTENCE'
  writeAuthorized: true
  target: 'ANNUAL_PLAN_FRAMEWORK_ADOPTION'
  acceptanceDecisionId: string
  acceptedAt: string
  source: AnnualPlanFrameworkReviewDraft['source']
  context: AnnualPlanFrameworkReviewDraft['context']
  reviewedFramework: {
    periods: AnnualPlanFrameworkReviewDraft['periods']
    constraints: AnnualPlanFrameworkReviewDraft['constraints']
  }
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function sameRef(a: CmlCanonicalRef, b: CmlCanonicalRef): boolean {
  return a.namespace === b.namespace
    && a.entityType === b.entityType
    && a.entityId === b.entityId
    && (a.versionId ?? null) === (b.versionId ?? null)
}

function clonePeriods(periods: AnnualPlanFrameworkReviewDraft['periods']) {
  return periods.map((period) => ({ ...period, suggestedNodeRefs: period.suggestedNodeRefs.map((ref) => ({ ...ref })) }))
}

function cloneConstraints(constraints: AnnualPlanFrameworkReviewDraft['constraints']) {
  return constraints.map((constraint) => ({ ...constraint, ...(constraint.sourceRef ? { sourceRef: { ...constraint.sourceRef } } : {}) }))
}

export function buildAnnualPlanFrameworkReviewDraft(handoff: CmlLocalHandoffV1): AnnualPlanFrameworkReviewDraft {
  const validation = validateCmlLocalHandoff(handoff)
  if (!validation.valid) throw new Error(`CML local handoff rejected: ${validation.errors.join('; ')}`)

  const preview = buildAnnualPlanImportPreview(handoff)
  return {
    status: 'AWAITING_TEACHER_DECISION',
    persistenceAllowed: false,
    source: {
      handoffFormat: handoff.format,
      handoffFootprintHash: handoff.structuralFootprint.hash,
      curriculumMessageId: preview.source.curriculumMessageId,
      frameworkMessageId: preview.source.frameworkMessageId,
    },
    context: {
      ...preview.context,
      curriculumVersionRef: { ...preview.context.curriculumVersionRef },
    },
    periods: clonePeriods(preview.periods),
    constraints: cloneConstraints(preview.constraints),
  }
}

export function prepareAnnualPlanFrameworkApply(input: {
  draft: AnnualPlanFrameworkReviewDraft
  decision: TeacherFrameworkDecision
  reviewedPeriods?: AnnualPlanFrameworkReviewDraft['periods']
  reviewedConstraints?: AnnualPlanFrameworkReviewDraft['constraints']
}): AnnualPlanFrameworkApplyCommand {
  const { draft, decision } = input
  if (draft.status !== 'AWAITING_TEACHER_DECISION' || draft.persistenceAllowed !== false) {
    throw new Error('review draft is not eligible for teacher acceptance')
  }
  if (decision.contract !== CML_HANDOFF_ACCEPTANCE_CONTRACT) throw new Error('unsupported acceptance contract')
  if (!nonEmpty(decision.decisionId)) throw new Error('decisionId is required')
  if (decision.actorRole !== 'TEACHER') throw new Error('only TEACHER may authorize apply')
  if (decision.decision !== 'ACCEPTED') throw new Error('framework was not accepted')
  if (Number.isNaN(Date.parse(decision.confirmedAt))) throw new Error('confirmedAt must be an ISO-compatible date')
  if (decision.handoffFootprintHash !== draft.source.handoffFootprintHash
    || decision.curriculumMessageId !== draft.source.curriculumMessageId
    || decision.frameworkMessageId !== draft.source.frameworkMessageId) {
    throw new Error('acceptance decision is not bound to this handoff')
  }

  const periods = input.reviewedPeriods ?? draft.periods
  const constraints = input.reviewedConstraints ?? draft.constraints
  if (periods.length === 0) throw new Error('reviewed framework must contain at least one period')

  return {
    contract: CML_HANDOFF_APPLY_CONTRACT,
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
    reviewedFramework: {
      periods: clonePeriods(periods),
      constraints: cloneConstraints(constraints),
    },
  }
}

export function assertApplyMatchesContext(command: AnnualPlanFrameworkApplyCommand, expected: AnnualPlanImportPreview['context']): void {
  if (command.context.schoolYearRef !== expected.schoolYearRef
    || command.context.disciplineRef !== expected.disciplineRef
    || command.context.gradeRef !== expected.gradeRef
    || !sameRef(command.context.curriculumVersionRef, expected.curriculumVersionRef)) {
    throw new Error('apply command context mismatch')
  }
}
