import type { AnnualPlanGrade } from './annual-plan-execution'
import type { CmlCanonicalRef } from './cml-local-handoff'
import type { TransitionAwareAnnualPlanApplyCommand } from './cml-curriculum-applicability'

export type AnnualPlanCurriculumPersistenceSection = {
  sectionId: string
  academicYearLabel: string
  grade: AnnualPlanGrade
  sectionCode: string
}

export type AnnualPlanCurriculumPersistencePayload = {
  sectionId: string
  curricularContextId: string
  schoolYearRef: string
  disciplineRef: string
  gradeRef: string
  sectionRef: string | null
  cohortRef: string | null
  curriculumVersionRef: CmlCanonicalRef
  curriculumState: 'PROVISIONAL_COMPLETE' | 'APPROVED'
  alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
  requiresRevalidationOnApproval: boolean
  applicabilityStatus: 'APPLICABLE' | 'TRANSITIONAL'
  transitionRemodulationState: 'NOT_REQUIRED' | 'HYPOTHESIS' | 'APPROVED'
  sourceHandoffFootprintHash: string
  sourceFrameworkMessageId: string
  acceptanceDecisionId: string
  acceptedAt: string
  reviewedFramework: TransitionAwareAnnualPlanApplyCommand['reviewedFramework']
  curriculumCoverage: TransitionAwareAnnualPlanApplyCommand['curriculumCoverage']
  curricularContext: TransitionAwareAnnualPlanApplyCommand['curricularContext']
}

function normalize(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizedYear(value: string): string {
  return value.trim().replace('/', '-')
}

function gradeNumber(grade: AnnualPlanGrade): string {
  if (grade === 'PRIMA') return '1'
  if (grade === 'SECONDA') return '2'
  return '3'
}

function expectedGradeRef(grade: AnnualPlanGrade): string {
  return `grade-${gradeNumber(grade)}`
}

function sectionRefMatches(sectionRef: string, section: AnnualPlanCurriculumPersistenceSection): boolean {
  const candidate = normalize(sectionRef)
  const code = normalize(section.sectionCode)
  const number = gradeNumber(section.grade)
  const names: Record<AnnualPlanGrade, string> = { PRIMA: 'PRIMA', SECONDA: 'SECONDA', TERZA: 'TERZA' }
  return new Set([
    code,
    `${number}${code}`,
    `${names[section.grade]}${code}`,
    `GRADE${number}${code}`,
  ]).has(candidate)
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

export function prepareAnnualPlanCurriculumPersistence(input: {
  command: TransitionAwareAnnualPlanApplyCommand
  section: AnnualPlanCurriculumPersistenceSection
}): AnnualPlanCurriculumPersistencePayload {
  const { command, section } = input

  if (command.contract !== 'CML_HANDOFF_APPLY_V2') {
    throw new Error('only CML_HANDOFF_APPLY_V2 may persist curriculum context')
  }
  if (command.status !== 'AUTHORIZED_FOR_PERSISTENCE' || command.writeAuthorized !== true) {
    throw new Error('annual-plan curriculum command is not write-authorized')
  }
  if (command.curriculumCoverage.status !== 'SATISFIED') {
    throw new Error('annual-plan curriculum coverage must be SATISFIED before persistence')
  }
  if (command.curriculumCoverage.contextId !== command.curricularContext.contextId) {
    throw new Error('curriculum coverage is not bound to curricular context')
  }
  if (command.curriculumState !== command.curricularContext.curriculumState) {
    throw new Error('accepted framework curriculum state mismatch')
  }
  if (normalizedYear(section.academicYearLabel) !== normalizedYear(command.curricularContext.schoolYearRef)) {
    throw new Error('curricular school year does not match annual-plan section')
  }
  if (command.curricularContext.gradeRef !== expectedGradeRef(section.grade)) {
    throw new Error('curricular grade does not match annual-plan section')
  }
  if (command.curricularContext.sectionRef
    && !sectionRefMatches(command.curricularContext.sectionRef, section)) {
    throw new Error('curricular section does not match annual-plan section')
  }

  const expectedAuthority = command.curricularContext.curriculumState === 'APPROVED'
    ? 'APPROVED_INSTITUTIONAL'
    : 'PROVISIONAL_BASELINE'
  if (command.curriculumCoverage.authority !== expectedAuthority) {
    throw new Error('curriculum coverage authority does not match curriculum state')
  }
  if (command.curricularContext.curriculumState === 'PROVISIONAL_COMPLETE'
    && command.curriculumCoverage.requiresRevalidationOnApproval !== true) {
    throw new Error('provisional curriculum baseline must require revalidation on approval')
  }

  return {
    sectionId: section.sectionId,
    curricularContextId: command.curricularContext.contextId,
    schoolYearRef: command.curricularContext.schoolYearRef,
    disciplineRef: command.curricularContext.disciplineRef,
    gradeRef: command.curricularContext.gradeRef,
    sectionRef: command.curricularContext.sectionRef ?? null,
    cohortRef: command.curricularContext.cohortRef ?? null,
    curriculumVersionRef: cloneRef(command.curricularContext.curriculumVersionRef),
    curriculumState: command.curricularContext.curriculumState,
    alignmentAuthority: command.curriculumCoverage.authority,
    requiresRevalidationOnApproval: command.curriculumCoverage.requiresRevalidationOnApproval,
    applicabilityStatus: command.curricularContext.applicabilityStatus,
    transitionRemodulationState: command.curricularContext.transitionRemodulation.state,
    sourceHandoffFootprintHash: command.source.handoffFootprintHash,
    sourceFrameworkMessageId: command.source.frameworkMessageId,
    acceptanceDecisionId: command.acceptanceDecisionId,
    acceptedAt: command.acceptedAt,
    reviewedFramework: {
      periods: command.reviewedFramework.periods.map((period) => ({
        ...period,
        suggestedNodeRefs: period.suggestedNodeRefs.map(cloneRef),
      })),
      constraints: command.reviewedFramework.constraints.map((constraint) => ({
        ...constraint,
        ...(constraint.sourceRef ? { sourceRef: cloneRef(constraint.sourceRef) } : {}),
      })),
    },
    curriculumCoverage: {
      ...command.curriculumCoverage,
      curriculumVersionRef: cloneRef(command.curriculumCoverage.curriculumVersionRef),
      requirementCoverage: command.curriculumCoverage.requirementCoverage.map((requirement) => ({
        ...requirement,
        curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
      })),
      blockingRequirementIds: [...command.curriculumCoverage.blockingRequirementIds],
    },
    curricularContext: {
      ...command.curricularContext,
      institutionRef: cloneRef(command.curricularContext.institutionRef),
      curriculumRef: cloneRef(command.curricularContext.curriculumRef),
      curriculumVersionRef: cloneRef(command.curricularContext.curriculumVersionRef),
      approvalProcessRef: cloneRef(command.curricularContext.approvalProcessRef),
      ...(command.curricularContext.approvalDecisionRef
        ? { approvalDecisionRef: cloneRef(command.curricularContext.approvalDecisionRef) }
        : {}),
      transitionRuleRef: cloneRef(command.curricularContext.transitionRuleRef),
      requirements: command.curricularContext.requirements.map((requirement) => ({
        ...requirement,
        curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
        sourceRefs: requirement.sourceRefs.map(cloneRef),
        ...(requirement.transitionOriginRef
          ? { transitionOriginRef: cloneRef(requirement.transitionOriginRef) }
          : {}),
      })),
      transitionRemodulation: {
        ...command.curricularContext.transitionRemodulation,
        sourceRefs: command.curricularContext.transitionRemodulation.sourceRefs.map(cloneRef),
        affectedRequirementIds: [...command.curricularContext.transitionRemodulation.affectedRequirementIds],
        ...(command.curricularContext.transitionRemodulation.proposalRef
          ? { proposalRef: cloneRef(command.curricularContext.transitionRemodulation.proposalRef) }
          : {}),
        ...(command.curricularContext.transitionRemodulation.approvalDecisionRef
          ? { approvalDecisionRef: cloneRef(command.curricularContext.transitionRemodulation.approvalDecisionRef) }
          : {}),
      },
      sourceRefs: command.curricularContext.sourceRefs.map(cloneRef),
    },
  }
}
