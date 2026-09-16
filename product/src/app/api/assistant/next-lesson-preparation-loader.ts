import { buildClassWorkspaceLearningFocus } from '@/app/classi/class-workspace-model'
import { selectLatestTeachingSessionContinuity } from '@/core/domain/teaching-session-reflection'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import type { HomeDailyContext } from '@/core/presentation/home-daily-context'
import {
  buildInternalLessonMaterialRenderBundle,
  INTERNAL_LESSON_RENDERING_CAPABILITIES,
  type LessonMaterialRenderResult,
} from '@/core/presentation/lesson-material-renderer'
import {
  buildLessonPreparationManifest,
  type LessonPreparationManifestResult,
} from '@/core/presentation/lesson-preparation-manifest'
import {
  buildNextLessonPreparation,
  selectNextLessonForPreparation,
  type NextLessonPreparation,
} from '@/core/presentation/next-lesson-preparation'
import { loadAuthoritativeLessonCopilotBundle } from './lesson-context-loader'

export type LoadedNextLessonPreparation = {
  preparation: NextLessonPreparation
  manifest: LessonPreparationManifestResult
  rendering: LessonMaterialRenderResult
}

export async function loadNextLessonPreparation(input: {
  workspaceId: string
  academicYearId: string
  homeDaily: HomeDailyContext
  minuteOfDay: number
}): Promise<NextLessonPreparation | null> {
  const loaded = await loadNextLessonPreparationBundle(input)
  return loaded?.preparation ?? null
}

export async function loadNextLessonPreparationBundle(input: {
  workspaceId: string
  academicYearId: string
  homeDaily: HomeDailyContext
  minuteOfDay: number
}): Promise<LoadedNextLessonPreparation | null> {
  const lesson = selectNextLessonForPreparation(input.homeDaily, input.minuteOfDay)
  if (!lesson) return null

  if (!lesson.sectionId) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La prossima lezione non è associata a una sezione canonica'],
    }))
  }

  if (!lesson.disciplineId) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La prossima lezione non è associata a una disciplina canonica'],
    }))
  }

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const assignmentReader = new SupabaseTeachingAssignmentReader()
  const knowledgeRepository = new SupabaseKnowledgeRepository()
  let knowledgeUnavailable = false

  const [snapshot, assignments, knowledgeItems] = await Promise.all([
    annualRepository.list(input.workspaceId, input.academicYearId),
    assignmentReader.list(input.workspaceId, input.academicYearId),
    knowledgeRepository.listRecent(input.workspaceId, 100).catch(() => {
      knowledgeUnavailable = true
      console.warn('[DOCENTE OS] Knowledge index unavailable; next lesson preparation degraded to PARTIAL.')
      return []
    }),
  ])

  const section = snapshot.sections.find((item) => item.id === lesson.sectionId)
  if (!section) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La sezione della prossima lezione non è presente nel registro canonico delle classi'],
    }))
  }

  const confirmedAssignment = assignments.some((assignment) =>
    assignment.sectionId === lesson.sectionId
    && assignment.disciplineId === lesson.disciplineId
    && assignment.status === 'CONFIRMED',
  )
  if (!confirmedAssignment) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La cattedra non conferma il collegamento tra questa sezione e la disciplina della prossima lezione'],
    }))
  }

  const focus = buildClassWorkspaceLearningFocus(section, snapshot.progress, knowledgeItems)
  if (!focus.nextBlock) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: [
        'Non risulta un prossimo blocco del Piano annuale da collegare alla lezione',
        ...(knowledgeUnavailable ? ['Indice della Conoscenza temporaneamente non disponibile'] : []),
      ],
    }))
  }

  const sessionRepository = new SupabaseTeachingSessionRepository()
  const [lessonBundle, teachingSessions] = await Promise.all([
    loadAuthoritativeLessonCopilotBundle({
      workspaceId: input.workspaceId,
      academicYearId: input.academicYearId,
      sectionId: lesson.sectionId,
      blockId: focus.nextBlock.id,
    }),
    sessionRepository.listBySection(input.workspaceId, input.academicYearId, lesson.sectionId).catch(() => {
      console.warn('[DOCENTE OS] Teaching-session continuity unavailable; next lesson preparation continues without Diary context.')
      return { sessions: [], allocations: [] }
    }),
  ])

  const continuity = selectLatestTeachingSessionContinuity({
    snapshot: teachingSessions,
    sectionId: lesson.sectionId,
    lessonStartAt: lesson.startAt,
  })

  const preparation = buildNextLessonPreparation({
    lesson,
    lessonContext: lessonBundle?.context ?? null,
    continuity,
    knowledgeResources: focus.materials,
    missingInformation: [
      ...(!lessonBundle ? ['Il Lesson Brief canonico del prossimo blocco non è disponibile'] : []),
      ...(knowledgeUnavailable ? ['Indice della Conoscenza temporaneamente non disponibile'] : []),
    ],
  })

  if (!lessonBundle) return blockedPreparation(preparation)

  const manifest = buildLessonPreparationManifest({
    preparation,
    lessonContext: lessonBundle.context,
    projection: lessonBundle.projection,
    extensions: lessonBundle.extensions,
    renderingCapabilities: [...INTERNAL_LESSON_RENDERING_CAPABILITIES],
  })

  return {
    preparation,
    manifest,
    rendering: buildInternalLessonMaterialRenderBundle({
      manifestResult: manifest,
      projection: lessonBundle.projection,
      extensions: lessonBundle.extensions,
      continuity: preparation.continuity,
    }),
  }
}

function blockedPreparation(preparation: NextLessonPreparation): LoadedNextLessonPreparation {
  const manifest = buildLessonPreparationManifest({
    preparation,
    lessonContext: null,
    projection: null,
  })

  return {
    preparation,
    manifest,
    rendering: buildInternalLessonMaterialRenderBundle({
      manifestResult: manifest,
      projection: null,
    }),
  }
}
