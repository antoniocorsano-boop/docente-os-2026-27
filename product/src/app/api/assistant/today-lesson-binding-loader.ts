import { buildClassWorkspaceLearningFocus } from '@/app/classi/class-workspace-model'
import { CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import type { HomeDailyLesson } from '@/core/presentation/home-daily-context'
import { canonicalPlanSupportsDisciplineName } from '@/core/presentation/canonical-plan-discipline'
import type { TodayIALessonBundle } from '@/core/presentation/today-ia-projection'

type CanonicalSource = Awaited<ReturnType<SupabaseCanonicalPlanSourceRepository['resolve']>>

export async function loadTodayLessonBindings(input: {
  workspaceId: string
  academicYearId: string
  lessons: HomeDailyLesson[]
}): Promise<TodayIALessonBundle[]> {
  if (!input.lessons.length) return []

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const assignmentReader = new SupabaseTeachingAssignmentReader()
  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const sourceRepository = new SupabaseCanonicalPlanSourceRepository()

  const [snapshot, assignments, disciplines] = await Promise.all([
    annualRepository.list(input.workspaceId, input.academicYearId),
    assignmentReader.list(input.workspaceId, input.academicYearId),
    settingsRepository.listDisciplines(input.workspaceId, input.academicYearId),
  ])
  const sourceByCode = new Map<string, Promise<CanonicalSource>>()

  const resolved = await Promise.all(input.lessons.map(async (lesson): Promise<TodayIALessonBundle | null> => {
    if (!lesson.sectionId || !lesson.disciplineId) return null

    const section = snapshot.sections.find((item) => item.id === lesson.sectionId)
    if (!section) return null

    const confirmedAssignment = assignments.find((assignment) =>
      assignment.sectionId === lesson.sectionId
      && assignment.disciplineId === lesson.disciplineId
      && assignment.status === 'CONFIRMED',
    )
    if (!confirmedAssignment) return null

    const discipline = disciplines.find((item) => item.id === confirmedAssignment.disciplineId)
    if (!discipline || !discipline.isActive || !canonicalPlanSupportsDisciplineName(discipline.name)) return null

    const grade = GRADE_UI[section.grade]
    const code = CANONICAL_PLAN_SOURCES[grade].code
    let sourcePromise = sourceByCode.get(code)
    if (!sourcePromise) {
      sourcePromise = sourceRepository.resolve({
        workspaceId: input.workspaceId,
        academicYearId: input.academicYearId,
        code,
      })
      sourceByCode.set(code, sourcePromise)
    }

    let runtimeSource: CanonicalSource
    try {
      runtimeSource = await sourcePromise
    } catch {
      return null
    }

    const focus = buildClassWorkspaceLearningFocus(
      section,
      snapshot.progress,
      runtimeSource.generationId,
      [],
    )
    if (!focus.nextBlock) return null

    return {
      lessonLogicalId: lesson.logicalId,
      blockId: focus.nextBlock.id,
    }
  }))

  return resolved.filter((binding): binding is TodayIALessonBundle => binding !== null)
}
