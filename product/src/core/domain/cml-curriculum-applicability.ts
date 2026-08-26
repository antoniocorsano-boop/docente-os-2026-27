import type { CmlCanonicalRef } from './cml-local-handoff'
import type { AnnualPlanFrameworkApplyCommand } from './cml-handoff-acceptance'
import {
  validateCurriculumContextForClassV1,
  type CurriculumContextForClassV1,
  type CurriculumRequirementV1,
} from './cml-local-handoff-v2'

export type AnnualPlanTargetScope = {
  schoolYearRef: string
  disciplineRef: string
  gradeRef: string
  sectionRef?: string
  cohortRef?: string
}

export type CurriculumCoverageStatus = 'SATISFIED' | 'PARTIALLY_SATISFIED' | 'NOT_SATISFIED'
export type CurriculumAlignmentAuthority = 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'

export type CurriculumRequirementCoverage = {
  requirementId: string
  coverageRequired: boolean
  satisfied: boolean
  curriculumNodeRef: CmlCanonicalRef
  authorityLevel: CurriculumRequirementV1['authorityLevel']
}

export type CurriculumCoverageEvaluation = {
  status: CurriculumCoverageStatus
  authority: CurriculumAlignmentAuthority
  requiresRevalidationOnApproval: boolean
  contextId: string
  curriculumVersionRef: CmlCanonicalRef
  requirementCoverage: CurriculumRequirementCoverage[]
  blockingRequirementIds: string[]
}

export type TransitionAwareAnnualPlanApplyCommand = AnnualPlanFrameworkApplyCommand & {
  curricularContext: CurriculumContextForClassV1
  curriculumCoverage: CurriculumCoverageEvaluation
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sameRef(a: CmlCanonicalRef, b: CmlCanonicalRef): boolean {
  return a.namespace === b.namespace
    && a.entityType === b.entityType
    && a.entityId === b.entityId
    && (a.versionId ?? null) === (b.versionId ?? null)
}

function assertScopeMatchesContext(scope: AnnualPlanTargetScope, context: CurriculumContextForClassV1): void {
  if (!nonEmpty(scope.schoolYearRef) || !nonEmpty(scope.disciplineRef) || !nonEmpty(scope.gradeRef)) {
    throw new Error('annual-plan target scope is incomplete')
  }
  if (!scope.sectionRef && !scope.cohortRef) throw new Error('annual-plan target scope requires sectionRef or cohortRef')
  if (scope.schoolYearRef !== context.schoolYearRef
    || scope.disciplineRef !== context.disciplineRef
    || scope.gradeRef !== context.gradeRef) {
    throw new Error('curricular context does not match annual-plan target scope')
  }
  if (context.sectionRef && scope.sectionRef !== context.sectionRef) throw new Error('curricular context sectionRef mismatch')
  if (context.cohortRef && scope.cohortRef !== context.cohortRef) throw new Error('curricular context cohortRef mismatch')
}

function assertCommandMatchesContext(command: AnnualPlanFrameworkApplyCommand, context: CurriculumContextForClassV1): void {
  if (command.context.schoolYearRef !== context.schoolYearRef
    || command.context.disciplineRef !== context.disciplineRef
    || command.context.gradeRef !== context.gradeRef
    || !sameRef(command.context.curriculumVersionRef, context.curriculumVersionRef)) {
    throw new Error('curricular context does not match accepted annual-plan command')
  }
}

function planNodeRefs(command: AnnualPlanFrameworkApplyCommand): CmlCanonicalRef[] {
  return command.reviewedFramework.periods.flatMap((period) => period.suggestedNodeRefs)
}

function requirementSatisfied(requirement: CurriculumRequirementV1, nodes: CmlCanonicalRef[]): boolean {
  return nodes.some((node) => sameRef(node, requirement.curriculumNodeRef))
}

export function evaluateCurriculumCoverage(input: {
  command: AnnualPlanFrameworkApplyCommand
  curricularContext: CurriculumContextForClassV1
  targetScope: AnnualPlanTargetScope
}): CurriculumCoverageEvaluation {
  const validation = validateCurriculumContextForClassV1(input.curricularContext)
  if (!validation.valid) throw new Error(`curricular context rejected: ${validation.errors.join('; ')}`)
  assertCommandMatchesContext(input.command, input.curricularContext)
  assertScopeMatchesContext(input.targetScope, input.curricularContext)

  const nodes = planNodeRefs(input.command)
  const requirementCoverage: CurriculumRequirementCoverage[] = input.curricularContext.requirements.map((requirement) => ({
    requirementId: requirement.requirementId,
    coverageRequired: requirement.coverageRequired,
    satisfied: requirementSatisfied(requirement, nodes),
    curriculumNodeRef: { ...requirement.curriculumNodeRef },
    authorityLevel: requirement.authorityLevel,
  }))
  const mandatory = requirementCoverage.filter((requirement) => requirement.coverageRequired)
  if (mandatory.length === 0) throw new Error('curricular context contains no mandatory coverage requirements')
  const satisfiedMandatory = mandatory.filter((requirement) => requirement.satisfied)
  const blockingRequirementIds = mandatory.filter((requirement) => !requirement.satisfied).map((requirement) => requirement.requirementId)
  const status: CurriculumCoverageStatus = blockingRequirementIds.length === 0
    ? 'SATISFIED'
    : satisfiedMandatory.length > 0
      ? 'PARTIALLY_SATISFIED'
      : 'NOT_SATISFIED'

  return {
    status,
    authority: input.curricularContext.curriculumState === 'APPROVED' ? 'APPROVED_INSTITUTIONAL' : 'PROVISIONAL_BASELINE',
    requiresRevalidationOnApproval: input.curricularContext.curriculumState !== 'APPROVED'
      || input.curricularContext.transitionRemodulation.state === 'HYPOTHESIS',
    contextId: input.curricularContext.contextId,
    curriculumVersionRef: { ...input.curricularContext.curriculumVersionRef },
    requirementCoverage,
    blockingRequirementIds,
  }
}

export function bindCurriculumContextAndCoverage(input: {
  command: AnnualPlanFrameworkApplyCommand
  curricularContext: CurriculumContextForClassV1
  targetScope: AnnualPlanTargetScope
}): TransitionAwareAnnualPlanApplyCommand {
  const curriculumCoverage = evaluateCurriculumCoverage(input)
  if (curriculumCoverage.status !== 'SATISFIED') {
    throw new Error(`annual plan does not satisfy mandatory curricular requirements: ${curriculumCoverage.blockingRequirementIds.join(', ')}`)
  }
  return {
    ...input.command,
    curricularContext: {
      ...input.curricularContext,
      institutionRef: { ...input.curricularContext.institutionRef },
      curriculumRef: { ...input.curricularContext.curriculumRef },
      curriculumVersionRef: { ...input.curricularContext.curriculumVersionRef },
      approvalProcessRef: { ...input.curricularContext.approvalProcessRef },
      ...(input.curricularContext.approvalDecisionRef ? { approvalDecisionRef: { ...input.curricularContext.approvalDecisionRef } } : {}),
      transitionRuleRef: { ...input.curricularContext.transitionRuleRef },
      requirements: input.curricularContext.requirements.map((requirement) => ({
        ...requirement,
        curriculumNodeRef: { ...requirement.curriculumNodeRef },
        sourceRefs: requirement.sourceRefs.map((ref) => ({ ...ref })),
        ...(requirement.transitionOriginRef ? { transitionOriginRef: { ...requirement.transitionOriginRef } } : {}),
      })),
      transitionRemodulation: {
        ...input.curricularContext.transitionRemodulation,
        sourceRefs: input.curricularContext.transitionRemodulation.sourceRefs.map((ref) => ({ ...ref })),
        affectedRequirementIds: [...input.curricularContext.transitionRemodulation.affectedRequirementIds],
        ...(input.curricularContext.transitionRemodulation.proposalRef ? { proposalRef: { ...input.curricularContext.transitionRemodulation.proposalRef } } : {}),
        ...(input.curricularContext.transitionRemodulation.approvalDecisionRef ? { approvalDecisionRef: { ...input.curricularContext.transitionRemodulation.approvalDecisionRef } } : {}),
      },
      sourceRefs: input.curricularContext.sourceRefs.map((ref) => ({ ...ref })),
    },
    curriculumCoverage,
  }
}
