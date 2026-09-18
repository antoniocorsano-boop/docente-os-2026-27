import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { SupabaseAnnualPlanCurriculumRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { curriculumDisciplineRefForCanonicalPlan } from '@/core/presentation/curriculum-source-binding'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildLessonBrief } from '@/core/presentation/lesson-brief'
import { projectAcceptedTeachingAdjustments } from '@/core/presentation/lesson-replanning-decision'
import { buildLessonCopilotContext } from '@/core/presentation/teacher-copilot-context'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const

export async function loadAuthoritativeLessonCopilotContext(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  blockId: string
}) {
  const bundle = await loadAuthoritativeLessonCopilotBundle(input)
  return bundle?.context ?? null
}

export async function loadAuthoritativeLessonCopilotBundle(input: {
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
  const curriculumRepository = new SupabaseAnnualPlanCurriculumRepository()
  const curriculumDisciplineRef = curriculumDisciplineRefForCanonicalPlan(source.code)
  const curriculumAuthorityPromise = curriculumDisciplineRef
    ? curriculumRepository.current({
        workspaceId: input.workspaceId,
        academicYearId: input.academicYearId,
        sectionId: section.id,
        disciplineRef: curriculumDisciplineRef,
      }).catch(() => {
        // Curriculum authority enriches confidence but is not required to expose
        // the read-only copilot. Missing/unavailable authority must degrade the
        // answer contract to PARTIAL, never take the entire lesson assistant down.
        console.warn('[DOCENTE OS] Curriculum authority unavailable; lesson copilot degraded to PARTIAL.')
        return null
      })
    : Promise.resolve(null)

  const [extensions, disciplines, assignments, curriculumAdoption] = await Promise.all([
    new SupabaseLessonDesignRepository().list(designContext),
    settingsRepository.listDisciplines(input.workspaceId, input.academicYearId),
    assignmentReader.list(input.workspaceId, input.academicYearId),
    curriculumAuthorityPromise,
  ])

  const replanning = projectAcceptedTeachingAdjustments({
    extensions,
    scope: designContext,
  })

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
  const curriculumAuthority = curriculumAdoption
    ? {
        curriculumState: curriculumAdoption.curriculumState,
        alignmentAuthority: curriculumAdoption.alignmentAuthority,
        requiresRevalidationOnApproval: curriculumAdoption.requiresRevalidationOnApproval,
        applicabilityStatus: curriculumAdoption.applicabilityStatus,
        transitionRemodulationState: curriculumAdoption.transitionRemodulationState,
      }
    : null
  const curriculumAuthorityEvidence = curriculumAdoption
    ? {
        ref: curriculumAdoption.sourceFrameworkMessageId,
        label: curriculumAdoption.alignmentAuthority === 'APPROVED_INSTITUTIONAL'
          ? 'Curricolo istituzionale approvato'
          : 'Base curricolare provvisoria',
      }
    : null

  const context = buildLessonCopilotContext({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    discipline,
    sectionId: section.id,
    sectionLabel,
    blockId: block.id,
    projection,
    brief,
    progressStatus: progress?.status ?? 'PIANIFICATO',
    curriculumAuthority,
    curriculumAuthorityEvidence,
    replanning,
  })

  return {
    context,
    projection,
    extensions,
    replanning,
  }
}

function unique(values: string[]) {
  return [...new Set(values)]
}
