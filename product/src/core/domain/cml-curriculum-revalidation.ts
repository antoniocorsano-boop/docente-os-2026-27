import type { CmlCanonicalRef } from './cml-local-handoff'
import {
  validateCmlLocalHandoffV2,
  type CmlLocalHandoffV2,
  type CurriculumContextForClassV1,
  type CurriculumRequirementV1,
} from './cml-local-handoff-v2'
import type { AnnualPlanFrameworkApplyCommandV2 } from './cml-handoff-v2-acceptance'
import type {
  CurriculumCoverageEvaluation,
  CurriculumRequirementCoverage,
  TransitionAwareAnnualPlanApplyCommand,
} from './cml-curriculum-applicability'

export const CML_CURRICULUM_REVALIDATION_CONTRACT = 'CML_CURRICULUM_REVALIDATION_V1' as const

export type CurriculumImportState = 'NEW' | 'UPDATE_AVAILABLE' | 'ALREADY_KNOWN'
export type CurriculumRequirementDeltaKind = 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED'

export type AnnualPlanCurriculumBaselineSnapshot = {
  id: string
  sectionId: string
  curricularContextId: string
  schoolYearRef: string
  disciplineRef: string
  gradeRef: string
  curriculumState: 'PROVISIONAL_COMPLETE' | 'APPROVED'
  alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
  requiresRevalidationOnApproval: boolean
  sourceHandoffFootprintHash: string
  sourceFrameworkMessageId: string
  acceptanceDecisionId: string
  acceptedAt: string
  reviewedFramework: AnnualPlanFrameworkApplyCommandV2['reviewedFramework']
  curriculumCoverage: CurriculumCoverageEvaluation
  curricularContext: CurriculumContextForClassV1
}

export type CurriculumRequirementDelta = {
  kind: CurriculumRequirementDeltaKind
  previousRequirement?: CurriculumRequirementV1
  incomingRequirement?: CurriculumRequirementV1
}

export type AnnualPlanCurriculumRevalidationReview = {
  status: 'AWAITING_TEACHER_REVALIDATION'
  persistenceAllowed: false
  importState: 'UPDATE_AVAILABLE'
  previousReceiptId: string
  incomingHandoffFootprintHash: string
  incomingFrameworkMessageId: string
  incomingCurricularContextId: string
  reviewFingerprint: string
  previousAuthority: AnnualPlanCurriculumBaselineSnapshot['alignmentAuthority']
  incomingAuthority: 'APPROVED_INSTITUTIONAL'
  requirementDelta: CurriculumRequirementDelta[]
  addedRequirementIds: string[]
  removedRequirementIds: string[]
  changedRequirementIds: string[]
  unchangedRequirementIds: string[]
  preservedFramework: AnnualPlanFrameworkApplyCommandV2['reviewedFramework']
  coverageAgainstApproved: CurriculumCoverageEvaluation
  blockingRequirementIds: string[]
  incomingHandoff: CmlLocalHandoffV2
}

export type TeacherCurriculumRevalidationDecision = {
  contract: typeof CML_CURRICULUM_REVALIDATION_CONTRACT
  decisionId: string
  actorRole: 'TEACHER'
  decision: 'ACCEPTED' | 'REJECTED'
  confirmedAt: string
  previousReceiptId: string
  incomingHandoffFootprintHash: string
  reviewFingerprint: string
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

function fullRefKey(ref: CmlCanonicalRef): string {
  return `${ref.namespace}|${ref.entityType}|${ref.entityId}|${ref.versionId ?? ''}`
}

function stableRefKey(ref: CmlCanonicalRef): string {
  return `${ref.namespace}|${ref.entityType}|${ref.entityId}`
}

function sameRef(a: CmlCanonicalRef, b: CmlCanonicalRef): boolean {
  return fullRefKey(a) === fullRefKey(b)
}

function sameScope(a: CurriculumContextForClassV1, b: CurriculumContextForClassV1): boolean {
  return a.schoolYearRef === b.schoolYearRef
    && a.disciplineRef === b.disciplineRef
    && a.gradeRef === b.gradeRef
    && (a.sectionRef ?? null) === (b.sectionRef ?? null)
    && (a.cohortRef ?? null) === (b.cohortRef ?? null)
    && stableRefKey(a.institutionRef) === stableRefKey(b.institutionRef)
    && stableRefKey(a.curriculumRef) === stableRefKey(b.curriculumRef)
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('it')
}

function semanticRequirementKey(requirement: CurriculumRequirementV1): string {
  return [
    requirement.kind,
    requirement.authorityLevel,
    requirement.coverageRequired ? 'required' : 'optional',
    normalizeText(requirement.description),
  ].join('|')
}

function requirementEquivalent(a: CurriculumRequirementV1, b: CurriculumRequirementV1): boolean {
  return semanticRequirementKey(a) === semanticRequirementKey(b)
}

function cloneRequirement(requirement: CurriculumRequirementV1): CurriculumRequirementV1 {
  return {
    ...requirement,
    curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
    sourceRefs: requirement.sourceRefs.map(cloneRef),
    ...(requirement.transitionOriginRef ? { transitionOriginRef: cloneRef(requirement.transitionOriginRef) } : {}),
  }
}

function cloneFramework(
  framework: AnnualPlanFrameworkApplyCommandV2['reviewedFramework'],
): AnnualPlanFrameworkApplyCommandV2['reviewedFramework'] {
  return {
    periods: framework.periods.map((period) => ({
      ...period,
      suggestedNodeRefs: period.suggestedNodeRefs.map(cloneRef),
    })),
    constraints: framework.constraints.map((constraint) => ({
      ...constraint,
      ...(constraint.sourceRef ? { sourceRef: cloneRef(constraint.sourceRef) } : {}),
    })),
  }
}

function cloneContext(context: CurriculumContextForClassV1): CurriculumContextForClassV1 {
  return {
    ...context,
    institutionRef: cloneRef(context.institutionRef),
    curriculumRef: cloneRef(context.curriculumRef),
    curriculumVersionRef: cloneRef(context.curriculumVersionRef),
    approvalProcessRef: cloneRef(context.approvalProcessRef),
    ...(context.approvalDecisionRef ? { approvalDecisionRef: cloneRef(context.approvalDecisionRef) } : {}),
    transitionRuleRef: cloneRef(context.transitionRuleRef),
    requirements: context.requirements.map(cloneRequirement),
    transitionRemodulation: {
      ...context.transitionRemodulation,
      sourceRefs: context.transitionRemodulation.sourceRefs.map(cloneRef),
      affectedRequirementIds: [...context.transitionRemodulation.affectedRequirementIds],
      ...(context.transitionRemodulation.proposalRef ? { proposalRef: cloneRef(context.transitionRemodulation.proposalRef) } : {}),
      ...(context.transitionRemodulation.approvalDecisionRef
        ? { approvalDecisionRef: cloneRef(context.transitionRemodulation.approvalDecisionRef) }
        : {}),
    },
    sourceRefs: context.sourceRefs.map(cloneRef),
  }
}

function cloneHandoff(handoff: CmlLocalHandoffV2): CmlLocalHandoffV2 {
  return JSON.parse(JSON.stringify(handoff)) as CmlLocalHandoffV2
}

function canonicalSerialize(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalSerialize(record[key])}`).join(',')}}`
  }
  throw new Error(`Unsupported canonical value: ${typeof value}`)
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function makeDelta(
  previous: CurriculumRequirementV1[],
  incoming: CurriculumRequirementV1[],
): CurriculumRequirementDelta[] {
  const unmatchedIncoming = new Set(incoming.map((_, index) => index))
  const delta: CurriculumRequirementDelta[] = []

  function findIncoming(previousRequirement: CurriculumRequirementV1): number | undefined {
    for (const index of unmatchedIncoming) {
      if (incoming[index].requirementId === previousRequirement.requirementId) return index
    }
    for (const index of unmatchedIncoming) {
      if (stableRefKey(incoming[index].curriculumNodeRef) === stableRefKey(previousRequirement.curriculumNodeRef)) return index
    }
    for (const index of unmatchedIncoming) {
      if (semanticRequirementKey(incoming[index]) === semanticRequirementKey(previousRequirement)) return index
    }
    return undefined
  }

  for (const previousRequirement of previous) {
    const incomingIndex = findIncoming(previousRequirement)
    if (incomingIndex === undefined) {
      delta.push({ kind: 'REMOVED', previousRequirement: cloneRequirement(previousRequirement) })
      continue
    }
    unmatchedIncoming.delete(incomingIndex)
    const incomingRequirement = incoming[incomingIndex]
    delta.push({
      kind: requirementEquivalent(previousRequirement, incomingRequirement) ? 'UNCHANGED' : 'CHANGED',
      previousRequirement: cloneRequirement(previousRequirement),
      incomingRequirement: cloneRequirement(incomingRequirement),
    })
  }

  for (const index of unmatchedIncoming) {
    delta.push({ kind: 'ADDED', incomingRequirement: cloneRequirement(incoming[index]) })
  }

  const order: Record<CurriculumRequirementDeltaKind, number> = {
    CHANGED: 0,
    ADDED: 1,
    REMOVED: 2,
    UNCHANGED: 3,
  }
  return delta.sort((a, b) => {
    const kindDifference = order[a.kind] - order[b.kind]
    if (kindDifference !== 0) return kindDifference
    const aId = a.incomingRequirement?.requirementId ?? a.previousRequirement?.requirementId ?? ''
    const bId = b.incomingRequirement?.requirementId ?? b.previousRequirement?.requirementId ?? ''
    return aId.localeCompare(bId)
  })
}

function planNodeRefs(framework: AnnualPlanFrameworkApplyCommandV2['reviewedFramework']): CmlCanonicalRef[] {
  return framework.periods.flatMap((period) => period.suggestedNodeRefs)
}

function previousSatisfied(snapshot: AnnualPlanCurriculumBaselineSnapshot, requirementId: string): boolean {
  return snapshot.curriculumCoverage.requirementCoverage.some(
    (coverage) => coverage.requirementId === requirementId && coverage.satisfied,
  )
}

function evaluateApprovedCoverage(input: {
  previous: AnnualPlanCurriculumBaselineSnapshot
  approvedContext: CurriculumContextForClassV1
  framework: AnnualPlanFrameworkApplyCommandV2['reviewedFramework']
  delta: CurriculumRequirementDelta[]
}): CurriculumCoverageEvaluation {
  const nodes = planNodeRefs(input.framework)
  const unchangedByIncomingId = new Map<string, CurriculumRequirementDelta>()
  input.delta.forEach((entry) => {
    if (entry.kind === 'UNCHANGED' && entry.incomingRequirement) {
      unchangedByIncomingId.set(entry.incomingRequirement.requirementId, entry)
    }
  })

  const requirementCoverage: CurriculumRequirementCoverage[] = input.approvedContext.requirements.map((requirement) => {
    const direct = nodes.some((node) => sameRef(node, requirement.curriculumNodeRef))
    const continuity = unchangedByIncomingId.get(requirement.requirementId)
    const carried = continuity?.previousRequirement
      ? previousSatisfied(input.previous, continuity.previousRequirement.requirementId)
      : false
    return {
      requirementId: requirement.requirementId,
      coverageRequired: requirement.coverageRequired,
      satisfied: direct || carried,
      curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
      authorityLevel: requirement.authorityLevel,
    }
  })

  const mandatory = requirementCoverage.filter((requirement) => requirement.coverageRequired)
  if (mandatory.length === 0) throw new Error('approved curricular context contains no mandatory coverage requirements')
  const blockingRequirementIds = mandatory
    .filter((requirement) => !requirement.satisfied)
    .map((requirement) => requirement.requirementId)
  const satisfiedCount = mandatory.length - blockingRequirementIds.length
  const status = blockingRequirementIds.length === 0
    ? 'SATISFIED' as const
    : satisfiedCount > 0
      ? 'PARTIALLY_SATISFIED' as const
      : 'NOT_SATISFIED' as const

  return {
    status,
    authority: 'APPROVED_INSTITUTIONAL',
    requiresRevalidationOnApproval: false,
    contextId: input.approvedContext.contextId,
    curriculumVersionRef: cloneRef(input.approvedContext.curriculumVersionRef),
    requirementCoverage,
    blockingRequirementIds,
  }
}

export function classifyCurriculumImportState(input: {
  current: AnnualPlanCurriculumBaselineSnapshot | null
  incoming: CmlLocalHandoffV2
}): CurriculumImportState {
  const validation = validateCmlLocalHandoffV2(input.incoming)
  if (!validation.valid) throw new Error(`CML local handoff v2 rejected: ${validation.errors.join('; ')}`)
  if (!input.current) return 'NEW'
  if (!sameScope(input.current.curricularContext, input.incoming.curricularContext)) {
    throw new Error('incoming curriculum context does not match the persisted annual-plan scope')
  }
  if (input.current.sourceHandoffFootprintHash === input.incoming.structuralFootprint.hash) return 'ALREADY_KNOWN'
  return 'UPDATE_AVAILABLE'
}

export function buildApprovedCurriculumRevalidationReview(input: {
  current: AnnualPlanCurriculumBaselineSnapshot
  incoming: CmlLocalHandoffV2
}): AnnualPlanCurriculumRevalidationReview {
  const importState = classifyCurriculumImportState(input)
  if (importState === 'ALREADY_KNOWN') throw new Error('approved curriculum handoff is already known')
  if (input.incoming.curricularContext.curriculumState !== 'APPROVED') {
    throw new Error('revalidation requires an APPROVED Arena curriculum context')
  }
  if (input.current.curriculumState === 'PROVISIONAL_COMPLETE'
    && input.current.requiresRevalidationOnApproval !== true) {
    throw new Error('persisted provisional baseline is missing the revalidation obligation')
  }

  const approvedContext = input.incoming.curricularContext
  const requirementDelta = makeDelta(input.current.curricularContext.requirements, approvedContext.requirements)
  const preservedFramework = cloneFramework(input.current.reviewedFramework)
  const coverageAgainstApproved = evaluateApprovedCoverage({
    previous: input.current,
    approvedContext,
    framework: preservedFramework,
    delta: requirementDelta,
  })

  const ids = (kind: CurriculumRequirementDeltaKind) => requirementDelta
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.incomingRequirement?.requirementId ?? entry.previousRequirement?.requirementId ?? '')
    .filter(nonEmpty)

  const reviewMaterial = {
    previousReceiptId: input.current.id,
    incomingHandoffFootprintHash: input.incoming.structuralFootprint.hash,
    incomingCurricularContextId: approvedContext.contextId,
    requirementDelta: requirementDelta.map((entry) => ({
      kind: entry.kind,
      previousRequirementId: entry.previousRequirement?.requirementId ?? null,
      incomingRequirementId: entry.incomingRequirement?.requirementId ?? null,
    })),
    coverageStatus: coverageAgainstApproved.status,
    blockingRequirementIds: coverageAgainstApproved.blockingRequirementIds,
  }

  return {
    status: 'AWAITING_TEACHER_REVALIDATION',
    persistenceAllowed: false,
    importState: 'UPDATE_AVAILABLE',
    previousReceiptId: input.current.id,
    incomingHandoffFootprintHash: input.incoming.structuralFootprint.hash,
    incomingFrameworkMessageId: input.incoming.annualPlanningFramework.messageId,
    incomingCurricularContextId: approvedContext.contextId,
    reviewFingerprint: fnv1a(canonicalSerialize(reviewMaterial)),
    previousAuthority: input.current.alignmentAuthority,
    incomingAuthority: 'APPROVED_INSTITUTIONAL',
    requirementDelta,
    addedRequirementIds: ids('ADDED'),
    removedRequirementIds: ids('REMOVED'),
    changedRequirementIds: ids('CHANGED'),
    unchangedRequirementIds: ids('UNCHANGED'),
    preservedFramework,
    coverageAgainstApproved,
    blockingRequirementIds: [...coverageAgainstApproved.blockingRequirementIds],
    incomingHandoff: cloneHandoff(input.incoming),
  }
}

export function prepareApprovedCurriculumRevalidationApply(input: {
  current: AnnualPlanCurriculumBaselineSnapshot
  review: AnnualPlanCurriculumRevalidationReview
  decision: TeacherCurriculumRevalidationDecision
  reviewedFramework?: AnnualPlanFrameworkApplyCommandV2['reviewedFramework']
}): TransitionAwareAnnualPlanApplyCommand {
  const { current, review, decision } = input
  if (review.status !== 'AWAITING_TEACHER_REVALIDATION' || review.persistenceAllowed !== false) {
    throw new Error('curriculum revalidation review is not eligible for teacher decision')
  }
  if (decision.contract !== CML_CURRICULUM_REVALIDATION_CONTRACT) throw new Error('unsupported curriculum revalidation contract')
  if (!nonEmpty(decision.decisionId)) throw new Error('revalidation decisionId is required')
  if (decision.actorRole !== 'TEACHER') throw new Error('only TEACHER may revalidate the annual-plan curriculum baseline')
  if (decision.decision !== 'ACCEPTED') throw new Error('curriculum revalidation was not accepted')
  if (Number.isNaN(Date.parse(decision.confirmedAt))) throw new Error('revalidation confirmedAt must be an ISO-compatible date')
  if (decision.previousReceiptId !== current.id
    || decision.previousReceiptId !== review.previousReceiptId
    || decision.incomingHandoffFootprintHash !== review.incomingHandoffFootprintHash
    || decision.reviewFingerprint !== review.reviewFingerprint) {
    throw new Error('curriculum revalidation decision is not bound to this review')
  }
  if (current.sourceHandoffFootprintHash === review.incomingHandoffFootprintHash) {
    throw new Error('curriculum revalidation cannot create a duplicate receipt for an already-known handoff')
  }

  const approvedContext = review.incomingHandoff.curricularContext
  if (approvedContext.curriculumState !== 'APPROVED') throw new Error('revalidation apply requires approved curriculum context')
  const reviewedFramework = cloneFramework(input.reviewedFramework ?? review.preservedFramework)
  if (reviewedFramework.periods.length === 0) throw new Error('revalidated framework must contain at least one period')
  const curriculumCoverage = evaluateApprovedCoverage({
    previous: current,
    approvedContext,
    framework: reviewedFramework,
    delta: review.requirementDelta,
  })
  if (curriculumCoverage.status !== 'SATISFIED') {
    throw new Error(`approved curriculum requirements still need teacher alignment: ${curriculumCoverage.blockingRequirementIds.join(', ')}`)
  }

  return {
    contract: 'CML_HANDOFF_APPLY_V2',
    status: 'AUTHORIZED_FOR_PERSISTENCE',
    writeAuthorized: true,
    target: 'ANNUAL_PLAN_FRAMEWORK_ADOPTION',
    acceptanceDecisionId: decision.decisionId,
    acceptedAt: decision.confirmedAt,
    source: {
      handoffFormat: 'CML_LOCAL_HANDOFF_V2',
      handoffFootprintHash: review.incomingHandoff.structuralFootprint.hash,
      curricularContextId: approvedContext.contextId,
      frameworkMessageId: review.incomingHandoff.annualPlanningFramework.messageId,
    },
    context: {
      schoolYearRef: approvedContext.schoolYearRef,
      disciplineRef: approvedContext.disciplineRef,
      gradeRef: approvedContext.gradeRef,
      curriculumVersionRef: cloneRef(approvedContext.curriculumVersionRef),
    },
    curriculumState: 'APPROVED',
    reviewedFramework,
    curricularContext: cloneContext(approvedContext),
    curriculumCoverage,
  }
}
