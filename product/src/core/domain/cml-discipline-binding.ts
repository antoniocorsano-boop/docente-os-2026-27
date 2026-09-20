import type { AnnualPlanTargetScope } from './cml-curriculum-applicability'
import type { CurriculumContextForClassV1 } from './cml-local-handoff-v2'

export const ECO02_PILOT_UPLOAD_MAX_BYTES = 500_000

export type Eco02PilotIdentity = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
}

export function bindArenaDisciplineRefToDocenteOs(source: string): string {
  const value = source.trim()
  if (!value) throw new Error('Curriculum disciplineRef is required')
  if (value.toLocaleLowerCase('it') === 'tecnologia' || value.toLowerCase() === 'technology') {
    return 'technology'
  }
  return value
}

export function isEco02PilotClass(
  input: Eco02PilotIdentity,
  authorized: Eco02PilotIdentity | null,
): boolean {
  if (!authorized) return false
  return input.workspaceId === authorized.workspaceId
    && input.academicYearId === authorized.academicYearId
    && input.sectionId === authorized.sectionId
    && input.grade === authorized.grade
    && input.sectionCode.trim().toUpperCase() === authorized.sectionCode.trim().toUpperCase()
}

export function assertEco02PilotCurriculumIntakeScope(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
  disciplineRef: string
}, authorized: Eco02PilotIdentity | null): void {
  if (!isEco02PilotClass(input, authorized)) {
    throw new Error('ECO-02 curriculum intake is limited to the explicitly authorized Technology 2C pilot identity')
  }
  if (bindArenaDisciplineRefToDocenteOs(input.disciplineRef) !== 'technology') {
    throw new Error('ECO-02 curriculum intake accepts only Technology handoffs')
  }
}

export function assertUploadedArenaAuthorityContextAllowed(
  context: CurriculumContextForClassV1,
): void {
  const remodulation = context.transitionRemodulation
  if (
    context.curriculumState === 'APPROVED'
    || context.approvalDecisionRef !== undefined
    || remodulation.state === 'APPROVED'
    || remodulation.institutionallyApproved
    || remodulation.approvalDecisionRef !== undefined
  ) {
    throw new Error('local Arena upload cannot establish institutional approval authority')
  }
}

export function buildArenaCurriculumTargetScope(input: {
  context: CurriculumContextForClassV1
  localSectionRef: string
}): AnnualPlanTargetScope {
  const target: AnnualPlanTargetScope = {
    schoolYearRef: input.context.schoolYearRef,
    disciplineRef: input.context.disciplineRef,
    gradeRef: input.context.gradeRef,
  }

  if (input.context.sectionRef) target.sectionRef = input.localSectionRef
  if (input.context.cohortRef) target.cohortRef = input.context.cohortRef

  return target
}
