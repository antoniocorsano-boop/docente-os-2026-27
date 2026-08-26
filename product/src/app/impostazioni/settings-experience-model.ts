import type { AnnualPlanSection } from '@/core/domain/annual-plan-execution'
import { buildTextbookSettingsCoverage, type TextbookAdoption } from '@/core/domain/textbook-adoption'
import type { TeachingAssignment } from '@/core/domain/timetable'
import type { TeacherWorkspaceSettings, TeachingDiscipline } from '@/core/domain/teacher-settings'

export type SettingsAreaKey = 'context' | 'disciplines' | 'classes' | 'assignments' | 'textbooks' | 'organization'
export type SettingsAreaStatus = 'COMPLETE' | 'INCOMPLETE' | 'REVIEW' | 'OPTIONAL'

export type SettingsArea = {
  key: SettingsAreaKey
  number: number
  label: string
  question: string
  status: SettingsAreaStatus
  summary: string
  href: string
  nextAction: string
}

export type SettingsExperienceModel = {
  mode: 'GUIDED' | 'MAINTENANCE'
  readyCount: number
  totalCount: number
  nextArea: SettingsArea | null
  areas: SettingsArea[]
}

export function buildSettingsExperienceModel(input: {
  settings: Pick<
    TeacherWorkspaceSettings,
    'teacherDisplayName' | 'schoolName' | 'schoolType' | 'dailyPeriodCount' | 'schoolDayStart' | 'defaultPeriodMinutes' | 'teachingWeekdays'
  >
  disciplines: Pick<TeachingDiscipline, 'id' | 'name' | 'isActive'>[]
  sections: Pick<AnnualPlanSection, 'id' | 'status'>[]
  assignments: Pick<TeachingAssignment, 'id' | 'sectionId' | 'disciplineId' | 'status' | 'weeklyMinutes'>[]
  textbookAdoptions?: Pick<TextbookAdoption, 'teachingAssignmentId' | 'status' | 'usageKind'>[]
}): SettingsExperienceModel {
  const activeDisciplines = input.disciplines.filter((item) => item.isActive)
  const activeDisciplineIds = new Set(activeDisciplines.map((item) => item.id))
  const activeAssignments = input.assignments.filter((assignment) => activeDisciplineIds.has(assignment.disciplineId))
  const contextComplete = Boolean(
    input.settings.teacherDisplayName.trim() && input.settings.schoolName.trim() && input.settings.schoolType.trim(),
  )
  const organizationComplete = Boolean(
    input.settings.dailyPeriodCount > 0
      && /^\d{2}:\d{2}/.test(input.settings.schoolDayStart)
      && input.settings.defaultPeriodMinutes > 0
      && input.settings.teachingWeekdays.length > 0,
  )

  const classStatus: SettingsAreaStatus = input.sections.length === 0
    ? 'INCOMPLETE'
    : input.sections.some((section) => section.status !== 'CONFERMATA')
      ? 'REVIEW'
      : 'COMPLETE'

  const assignmentSectionIds = new Set(activeAssignments.map((assignment) => assignment.sectionId))
  const missingAssignmentCount = input.sections.filter((section) => !assignmentSectionIds.has(section.id)).length
  const assignmentStatus: SettingsAreaStatus = input.sections.length === 0 || activeDisciplines.length === 0 || missingAssignmentCount > 0
    ? 'INCOMPLETE'
    : activeAssignments.some((assignment) => assignment.status !== 'CONFIRMED')
      ? 'REVIEW'
      : 'COMPLETE'

  const textbookCoverage = buildTextbookSettingsCoverage({
    assignmentIds: activeAssignments.map((assignment) => assignment.id),
    adoptions: input.textbookAdoptions ?? [],
  })
  const textbookStatus: SettingsAreaStatus = activeAssignments.length === 0
    ? 'OPTIONAL'
    : textbookCoverage.proposedBookCount > 0
      ? 'REVIEW'
      : textbookCoverage.coveredAssignmentCount === activeAssignments.length
        ? 'COMPLETE'
        : 'OPTIONAL'

  const areas: SettingsArea[] = [
    {
      key: 'context',
      number: 1,
      label: 'Tu e la scuola',
      question: 'Chi sei e dove insegni?',
      status: contextComplete ? 'COMPLETE' : 'INCOMPLETE',
      summary: contextComplete
        ? `${input.settings.teacherDisplayName} · ${input.settings.schoolName}`
        : 'Completa nome professionale, istituto e tipo di scuola.',
      href: '#contesto',
      nextAction: contextComplete ? 'Rivedi il contesto' : 'Completa il contesto',
    },
    {
      key: 'disciplines',
      number: 2,
      label: 'Discipline',
      question: 'Che cosa insegni?',
      status: activeDisciplines.length > 0 ? 'COMPLETE' : 'INCOMPLETE',
      summary: activeDisciplines.length > 0
        ? `${activeDisciplines.length} ${activeDisciplines.length === 1 ? 'disciplina attiva' : 'discipline attive'}`
        : 'Aggiungi almeno una disciplina attiva.',
      href: '#discipline',
      nextAction: activeDisciplines.length > 0 ? 'Gestisci le discipline' : 'Configura le discipline',
    },
    {
      key: 'classes',
      number: 3,
      label: 'Classi',
      question: 'Con quali classi lavori?',
      status: classStatus,
      summary: classesSummary(input.sections),
      href: '#classi',
      nextAction: classStatus === 'COMPLETE' ? 'Gestisci le classi' : classStatus === 'REVIEW' ? 'Controlla le classi' : 'Configura le classi',
    },
    {
      key: 'assignments',
      number: 4,
      label: 'Cattedra',
      question: 'In quali classi insegni cosa e per quante ore?',
      status: assignmentStatus,
      summary: assignmentsSummary({
        assignmentCount: activeAssignments.length,
        sectionCount: input.sections.length,
        activeDisciplineCount: activeDisciplines.length,
        missingAssignmentCount,
        provisionalCount: activeAssignments.filter((assignment) => assignment.status !== 'CONFIRMED').length,
      }),
      href: '#cattedra',
      nextAction: assignmentStatus === 'COMPLETE' ? 'Gestisci la cattedra' : assignmentStatus === 'REVIEW' ? 'Controlla la cattedra' : 'Completa la cattedra',
    },
    {
      key: 'textbooks',
      number: 5,
      label: 'Libri di testo',
      question: 'Quali libri usi in ciascuna classe e disciplina?',
      status: textbookStatus,
      summary: textbooksSummary(textbookCoverage),
      href: '/impostazioni/libri-di-testo',
      nextAction: textbookStatus === 'REVIEW' ? 'Controlla i libri proposti' : 'Gestisci i libri di testo',
    },
    {
      key: 'organization',
      number: 6,
      label: 'Organizzazione scolastica',
      question: 'Com’è normalmente organizzata la settimana?',
      status: organizationComplete ? 'COMPLETE' : 'INCOMPLETE',
      summary: organizationComplete
        ? `${input.settings.teachingWeekdays.length} giorni · ${input.settings.dailyPeriodCount} periodi · dalle ${input.settings.schoolDayStart.slice(0, 5)}`
        : 'Controlla giorni, orario di inizio e durata abituale dei periodi.',
      href: '#organizzazione',
      nextAction: organizationComplete ? 'Rivedi l’organizzazione' : 'Completa l’organizzazione',
    },
  ]

  const readyCount = areas.filter((area) => area.status === 'COMPLETE' || area.status === 'OPTIONAL').length
  const nextArea = areas.find((area) => area.status === 'INCOMPLETE')
    ?? areas.find((area) => area.status === 'REVIEW')
    ?? null

  return {
    mode: nextArea ? 'GUIDED' : 'MAINTENANCE',
    readyCount,
    totalCount: areas.length,
    nextArea,
    areas,
  }
}

export function settingsAreaStatusLabel(status: SettingsAreaStatus) {
  if (status === 'COMPLETE') return 'Completo'
  if (status === 'INCOMPLETE') return 'Da completare'
  if (status === 'REVIEW') return 'Da controllare'
  return 'Facoltativo'
}

function classesSummary(sections: Pick<AnnualPlanSection, 'status'>[]) {
  if (!sections.length) return 'Nessuna classe ancora configurata.'
  const confirmed = sections.filter((section) => section.status === 'CONFERMATA').length
  return `${sections.length} ${sections.length === 1 ? 'classe' : 'classi'} · ${confirmed} ${confirmed === 1 ? 'confermata' : 'confermate'}`
}

function assignmentsSummary(input: {
  assignmentCount: number
  sectionCount: number
  activeDisciplineCount: number
  missingAssignmentCount: number
  provisionalCount: number
}) {
  if (input.sectionCount === 0) return 'Prima configura almeno una classe.'
  if (input.activeDisciplineCount === 0) return 'Prima indica almeno una disciplina attiva.'
  if (input.assignmentCount === 0) return `Associa la cattedra alle ${input.sectionCount} ${input.sectionCount === 1 ? 'classe configurata' : 'classi configurate'}.`
  if (input.missingAssignmentCount > 0) return `${input.assignmentCount} associazioni · ${input.missingAssignmentCount} ${input.missingAssignmentCount === 1 ? 'classe da associare' : 'classi da associare'}`
  if (input.provisionalCount > 0) return `${input.assignmentCount} associazioni · ${input.provisionalCount} da confermare`
  return `${input.assignmentCount} ${input.assignmentCount === 1 ? 'associazione confermata' : 'associazioni confermate'}`
}

function textbooksSummary(coverage: ReturnType<typeof buildTextbookSettingsCoverage>) {
  if (coverage.assignmentCount === 0) return 'Disponibile quando hai almeno una Cattedra.'
  if (coverage.proposedBookCount > 0) return `${coverage.confirmedBookCount} confermati · ${coverage.proposedBookCount} da controllare`
  if (coverage.confirmedBookCount === 0) return 'Nessun libro collegato. Puoi aggiungerli quando ti servono.'
  if (coverage.missingAssignmentIds.length > 0) return `${coverage.confirmedBookCount} libri · ${coverage.missingAssignmentIds.length} ${coverage.missingAssignmentIds.length === 1 ? 'cattedra senza libro' : 'cattedre senza libro'}`
  return `${coverage.confirmedBookCount} ${coverage.confirmedBookCount === 1 ? 'libro confermato' : 'libri confermati'} · tutte le cattedre coperte`
}
