'use server'

import { revalidatePath } from 'next/cache'
import { asAnnualPlanGrade } from '@/core/domain/annual-plan-execution'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function saveProfessionalContext(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTeacherSettingsRepository()
  const current = await repository.getOrCreate(context.workspace.id, context.academicYear.id)
  await repository.save({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    teacherDisplayName: text(formData, 'teacherDisplayName'),
    schoolName: text(formData, 'schoolName'),
    schoolCode: nullableText(formData, 'schoolCode'),
    schoolCity: nullableText(formData, 'schoolCity'),
    schoolType: text(formData, 'schoolType'),
    dailyPeriodCount: current.dailyPeriodCount,
    schoolDayStart: current.schoolDayStart,
    defaultPeriodMinutes: current.defaultPeriodMinutes,
    teachingWeekdays: current.teachingWeekdays,
  })
  revalidateSettingsContext()
}

export async function saveSchoolOrganization(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTeacherSettingsRepository()
  const current = await repository.getOrCreate(context.workspace.id, context.academicYear.id)
  await repository.save({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    teacherDisplayName: current.teacherDisplayName,
    schoolName: current.schoolName,
    schoolCode: current.schoolCode,
    schoolCity: current.schoolCity,
    schoolType: current.schoolType,
    dailyPeriodCount: integer(formData, 'dailyPeriodCount'),
    schoolDayStart: text(formData, 'schoolDayStart'),
    defaultPeriodMinutes: integer(formData, 'defaultPeriodMinutes'),
    teachingWeekdays: formData.getAll('teachingWeekdays').map((value) => Number(value)),
  })
  revalidatePath('/impostazioni')
  revalidatePath('/orario')
}

// Backward-compatible full save used by older clients until every Settings surface is migrated.
export async function saveTeacherSettings(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTeacherSettingsRepository()
  await repository.save({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    teacherDisplayName: text(formData, 'teacherDisplayName'),
    schoolName: text(formData, 'schoolName'),
    schoolCode: nullableText(formData, 'schoolCode'),
    schoolCity: nullableText(formData, 'schoolCity'),
    schoolType: text(formData, 'schoolType'),
    dailyPeriodCount: integer(formData, 'dailyPeriodCount'),
    schoolDayStart: text(formData, 'schoolDayStart'),
    defaultPeriodMinutes: integer(formData, 'defaultPeriodMinutes'),
    teachingWeekdays: formData.getAll('teachingWeekdays').map((value) => Number(value)),
  })
  revalidateSettingsContext()
  revalidatePath('/orario')
}

export async function addTeachingDiscipline(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTeacherSettingsRepository()
  await repository.addDiscipline(
    context.workspace.id,
    context.academicYear.id,
    text(formData, 'disciplineName'),
  )
  revalidateSettingsContext()
}

export async function setTeachingDisciplineState(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTeacherSettingsRepository()
  await repository.setDisciplineActive(
    context.workspace.id,
    context.academicYear.id,
    text(formData, 'disciplineId'),
    text(formData, 'isActive') === 'true',
  )
  revalidateSettingsContext()
  revalidatePath('/orario')
}

export async function addSettingsSection(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  await repository.addSection(
    context.workspace.id,
    context.academicYear.id,
    asAnnualPlanGrade(text(formData, 'grade')),
    text(formData, 'sectionCode'),
  )
  revalidateSettingsContext()
  revalidatePath('/piano-annuale')
  revalidatePath('/orario')
}

export async function confirmSettingsSection(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  await repository.setSectionStatus(
    context.workspace.id,
    context.academicYear.id,
    text(formData, 'sectionId'),
    'CONFERMATA',
  )
  revalidateSettingsContext()
  revalidatePath('/piano-annuale')
  revalidatePath('/orario')
}

export async function addSettingsTeachingAssignment(formData: FormData) {
  const context = await requireContext()
  const [sectionId, disciplineId] = assignmentPair(text(formData, 'assignmentPair'))
  const repository = new SupabaseTimetableRepository()
  await repository.addAssignment({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    disciplineId,
    weeklyMinutes: integer(formData, 'weeklyMinutes'),
    sourceNote: nullableText(formData, 'sourceNote'),
  })
  revalidatePath('/impostazioni')
  revalidatePath('/orario')
}

export async function updateSettingsTeachingAssignment(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.updateAssignment({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    assignmentId: text(formData, 'assignmentId'),
    weeklyMinutes: integer(formData, 'weeklyMinutes'),
    status: text(formData, 'status') === 'CONFIRMED' ? 'CONFIRMED' : 'PROVISIONAL',
  })
  revalidatePath('/impostazioni')
  revalidatePath('/orario')
}

async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function revalidateSettingsContext() {
  revalidatePath('/impostazioni')
  revalidatePath('/')
}

function assignmentPair(value: string): [string, string] {
  const [sectionId, disciplineId, extra] = value.split('|')
  if (!sectionId || !disciplineId || extra) throw new Error('Invalid teaching assignment pair')
  return [sectionId, disciplineId]
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') throw new Error(`${key} required`)
  return value
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key).trim()
  return value || null
}

function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key))
  if (!Number.isInteger(value)) throw new Error(`${key} must be an integer`)
  return value
}
