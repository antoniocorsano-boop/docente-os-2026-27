import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildLessonBrief } from '@/core/presentation/lesson-brief'
import { buildLessonCopilotContext } from '@/core/presentation/teacher-copilot-context'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const

export async function loadAuthoritativeLessonCopilotContext(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  blockId: string
}) {
  const blockId = input.blockId.toUpperCase()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await annualRepository.list(input.workspaceId, input.academicYearId)
  const section = snapshot.sections.find((item) => item.id === input.sectionId)
  if (!section) return null

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) return null

  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection) return null

  const source = CANONICAL_PLAN_SOURCES[grade]
  const designContext = {
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    sectionId: section.id,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId: block.id,
    projectionId: projection.projectionId,
  }

  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const assignmentReader = new SupabaseTeachingAssignmentReader()
  const [extensions, disciplines, assignments] = await Promise.all([
    new SupabaseLessonDesignRepository().list(designContext),
    settingsRepository.listDisciplines(input.workspaceId, input.academicYearId),
    assignmentReader.list(input.workspaceId, input.academicYearId),
  ])

  const progress = snapshot.progress.find((entry) =>
    entry.sectionId === section.id
    && entry.canonicalGenerationId === source.generationId
    && entry.blockId === block.id,
  ) ?? null

  const confirmedDisciplineIds = unique(
    assignments
      .filter((assignment) => assignment.sectionId === section.id && assignment.status === 'CONFIRMED')
      .map((assignment) => assignment.disciplineId),
  )
  const discipline = confirmedDisciplineIds.length === 1
    ? disciplines.find((item) => item.id === confirmedDisciplineIds[0] && item.isActive)?.name ?? null
    : null

  const brief = buildLessonBrief({ projection, extensions })
  const sectionLabel = `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`

  return buildLessonCopilotContext({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    discipline,
    sectionId: section.id,
    sectionLabel,
    blockId: block.id,
    projection,
    brief,
    progressStatus: progress?.status ?? 'PIANIFICATO',
  })
}

function unique(values: string[]) {
  return [...new Set(values)]
}
