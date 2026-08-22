import type { AnnualPlanBlockProgress, AnnualPlanSection, AnnualPlanSectionStatus } from '@/core/domain/annual-plan-execution'
import type { TeachingDiscipline } from '@/core/domain/teacher-settings'
import type { TeachingAssignment } from '@/core/domain/timetable'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const
const GRADE_WORD = { PRIMA: 'prima', SECONDA: 'seconda', TERZA: 'terza' } as const
const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export type ClassWorkspaceAssignment = {
  id: string
  discipline: string
  weeklyMinutes: number
  status: 'PROVISIONAL' | 'CONFIRMED'
}

export type ClassWorkspaceSummary = {
  sectionId: string
  compactLabel: string
  displayLabel: string
  gradeQuery: 'prima' | 'seconda' | 'terza'
  sectionStatus: AnnualPlanSectionStatus
  sectionStatusLabel: string
  assignments: ClassWorkspaceAssignment[]
  completedBlocks: number
  hasProgress: boolean
}

export function buildClassWorkspaceSummary(
  section: AnnualPlanSection,
  assignments: TeachingAssignment[],
  disciplines: TeachingDiscipline[],
  progress: AnnualPlanBlockProgress[],
): ClassWorkspaceSummary {
  const disciplineById = new Map(disciplines.map((discipline) => [discipline.id, discipline.name]))
  const sectionAssignments = assignments
    .filter((assignment) => assignment.sectionId === section.id)
    .map((assignment) => ({
      id: assignment.id,
      discipline: disciplineById.get(assignment.disciplineId) ?? 'Disciplina',
      weeklyMinutes: assignment.weeklyMinutes,
      status: assignment.status,
    }))
    .sort((a, b) => a.discipline.localeCompare(b.discipline, 'it'))
  const sectionProgress = progress.filter((entry) => entry.sectionId === section.id)

  return {
    sectionId: section.id,
    compactLabel: `${GRADE_NUMBER[section.grade]}${section.sectionCode}`,
    displayLabel: `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`,
    gradeQuery: GRADE_WORD[section.grade],
    sectionStatus: section.status,
    sectionStatusLabel: sectionStatusLabel(section.status),
    assignments: sectionAssignments,
    completedBlocks: sectionProgress.filter((entry) => COMPLETE_STATUSES.has(entry.status)).length,
    hasProgress: sectionProgress.length > 0,
  }
}

export function sectionStatusLabel(status: AnnualPlanSectionStatus) {
  if (status === 'CONFERMATA') return 'Confermata'
  if (status === 'PROVVISORIA') return 'Provvisoria'
  return 'Da confermare'
}

export function formatWeeklyMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min/settimana`
  return rest ? `${hours} h ${rest} min/settimana` : `${hours} h/settimana`
}
