import type { AnnualPlanTargetScope } from './cml-curriculum-applicability'
import type { CurriculumContextForClassV1 } from './cml-local-handoff-v2'

export const ECO02_PILOT_UPLOAD_MAX_BYTES = 500_000

export function bindArenaDisciplineRefToDocenteOs(source: string): string {
  const value = source.trim()
  if (!value) throw new Error('Curriculum disciplineRef is required')
  if (value.toLocaleLowerCase('it') === 'tecnologia' || value.toLowerCase() === 'technology') {
    return 'technology'
  }
  return value
}

export function isEco02PilotClass(input: {
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
}): boolean {
  return input.grade === 'SECONDA' && input.sectionCode.trim().toUpperCase() === 'C'
}

export function assertEco02PilotCurriculumIntakeScope(input: {
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
  disciplineRef: string
}): void {
  if (!isEco02PilotClass(input)) {
    throw new Error('ECO-02 curriculum intake is limited to the authorized Technology 2C pilot')
  }
  if (bindArenaDisciplineRefToDocenteOs(input.disciplineRef) !== 'technology') {
    throw new Error('ECO-02 curriculum intake accepts only Technology handoffs')
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
