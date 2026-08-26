import type { CmlCanonicalRef } from './cml-local-handoff'
import type { AnnualPlanFrameworkApplyCommand } from './cml-handoff-acceptance'

export const CML_CURRICULUM_APPLICABILITY_CONTRACT = 'CML_CURRICULUM_APPLICABILITY_V1' as const

export type CurriculumApplicabilityStatus =
  | 'APPLICABLE'
  | 'TRANSITIONAL'
  | 'SUPERSEDED_FOR_NEW_COHORTS'

export type CurriculumApplicabilityEvidence = {
  contract: typeof CML_CURRICULUM_APPLICABILITY_CONTRACT
  evidenceId: string
  curriculumVersionRef: CmlCanonicalRef
  schoolYearRef: string
  disciplineRef: string
  gradeRef: string
  sectionRef?: string
  cohortRef?: string
  applicabilityStatus: CurriculumApplicabilityStatus
  authorityRef: CmlCanonicalRef
  transitionRuleRef: CmlCanonicalRef
  humanConfirmed: true
}

export type TransitionAwareAnnualPlanApplyCommand = AnnualPlanFrameworkApplyCommand & {
  applicability: CurriculumApplicabilityEvidence
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

function validRef(value: CmlCanonicalRef): boolean {
  return nonEmpty(value.namespace)
    && nonEmpty(value.entityType)
    && nonEmpty(value.entityId)
    && (value.versionId === undefined || nonEmpty(value.versionId))
}

export function validateCurriculumApplicabilityEvidence(
  evidence: CurriculumApplicabilityEvidence,
  command: AnnualPlanFrameworkApplyCommand,
): void {
  if (evidence.contract !== CML_CURRICULUM_APPLICABILITY_CONTRACT) throw new Error('unsupported curriculum applicability contract')
  if (!nonEmpty(evidence.evidenceId)) throw new Error('applicability evidenceId is required')
  if (!validRef(evidence.curriculumVersionRef)) throw new Error('applicability curriculumVersionRef is invalid')
  if (!validRef(evidence.authorityRef)) throw new Error('applicability authorityRef is required')
  if (!validRef(evidence.transitionRuleRef)) throw new Error('transitionRuleRef is required during curriculum transition')
  if (evidence.humanConfirmed !== true) throw new Error('curriculum applicability must be human confirmed')
  if (!['APPLICABLE', 'TRANSITIONAL', 'SUPERSEDED_FOR_NEW_COHORTS'].includes(evidence.applicabilityStatus)) {
    throw new Error('unsupported curriculum applicability status')
  }
  if (evidence.schoolYearRef !== command.context.schoolYearRef
    || evidence.disciplineRef !== command.context.disciplineRef
    || evidence.gradeRef !== command.context.gradeRef
    || !sameRef(evidence.curriculumVersionRef, command.context.curriculumVersionRef)) {
    throw new Error('curriculum applicability does not match annual-plan context')
  }
  if (!evidence.sectionRef && !evidence.cohortRef) {
    throw new Error('curriculum applicability requires sectionRef or cohortRef')
  }
}

export function bindCurriculumApplicability(input: {
  command: AnnualPlanFrameworkApplyCommand
  evidence: CurriculumApplicabilityEvidence
}): TransitionAwareAnnualPlanApplyCommand {
  validateCurriculumApplicabilityEvidence(input.evidence, input.command)
  if (input.evidence.applicabilityStatus === 'SUPERSEDED_FOR_NEW_COHORTS') {
    throw new Error('selected curriculum is superseded for this cohort and cannot be persisted')
  }
  return {
    ...input.command,
    applicability: {
      ...input.evidence,
      curriculumVersionRef: { ...input.evidence.curriculumVersionRef },
      authorityRef: { ...input.evidence.authorityRef },
      transitionRuleRef: { ...input.evidence.transitionRuleRef },
    },
  }
}
