import { buildClassWorkspaceLearningFocus } from '@/app/classi/class-workspace-model'
import { selectLatestTeachingSessionContinuity } from '@/core/domain/teaching-session-reflection'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import type { HomeDailyContext, HomeDailyLesson } from '@/core/presentation/home-daily-context'
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

type SharedPreparationData = {
  snapshot: Awaited<ReturnType<SupabaseAnnualPlanExecutionRepository['list']>>
  assignments: Awaited<ReturnType<SupabaseTeachingAssignmentReader['list']>>
  knowledgeItems: Awaited<ReturnType<SupabaseKnowledgeRepository['listRecent']>>
  knowledgeUnavailable: boolean
  sessionRepository: SupabaseTeachingSessionRepository
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

  const shared = await loadSharedPreparationData(input.workspaceId, input.academicYearId)
  return loadLessonPreparationBundleWithShared({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    lesson,
    shared,
  })
}

export async function loadLessonPreparationBundlesForLessons(input: {
  workspaceId: string
  academicYearId: string
  lessons: HomeDailyLesson[]
}): Promise<Array<{ lesson: HomeDailyLesson; loaded: LoadedNextLessonPreparation }>> {
  if (!input.lessons.length) return []

  const shared = await loadSharedPreparationData(input.workspaceId, input.academicYearId)
  const loaded = await Promise.all(input.lessons.map(async (lesson) => ({
    lesson,
    loaded: await loadLessonPreparationBundleWithShared({
      workspaceId: input.workspaceId,
      academicYearId: input.academicYearId,
      lesson,
      shared,
    }),
  })))

  return loaded
}

async function loadSharedPreparationData(workspaceId: string, academicYearId: string): Promise<SharedPreparationData> {
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const assignmentReader = new SupabaseTeachingAssignmentReader()
  const knowledgeRepository = new SupabaseKnowledgeRepository()
  let knowledgeUnavailable = false

  const [snapshot, assignments, knowledgeItems] = await Promise.all([
    annualRepository.list(workspaceId, academicYearId),
    assignmentReader.list(workspaceId, academicYearId),
    knowledgeRepository.listRecent(workspaceId, 100).catch(() => {
      knowledgeUnavailable = true
      console.warn('[DOCENTE OS] Knowledge index unavailable; lesson preparation degraded to PARTIAL.')
      return []
    }),
  ])

  return {
    snapshot,
    assignments,
    knowledgeItems,
    knowledgeUnavailable,
    sessionRepository: new SupabaseTeachingSessionRepository(),
  }
}

async function loadLessonPreparationBundleWithShared(input: {
  workspaceId: string
  academicYearId: string
  lesson: HomeDailyLesson
  shared: SharedPreparationData
}): Promise<LoadedNextLessonPreparation> {
  const { lesson, shared } = input

  if (!lesson.sectionId) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La lezione non è associata a una sezione canonica'],
    }))
  }

  if (!lesson.disciplineId) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La lezione non è associata a una disciplina canonica'],
    }))
  }

  const section = shared.snapshot.sections.find((item) => item.id === lesson.sectionId)
  if (!section) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La sezione della lezione non è presente nel registro canonico delle classi'],
    }))
  }

  const confirmedAssignment = shared.assignments.some((assignment) =>
    assignment.sectionId === lesson.sectionId
    && assignment.disciplineId === lesson.disciplineId
    && assignment.status === 'CONFIRMED',
  )
  if (!confirmedAssignment) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La cattedra non conferma il collegamento tra questa sezione e la disciplina della lezione'],
    }))
  }

  const focus = buildClassWorkspaceLearningFocus(section, shared.snapshot.progress, shared.knowledgeItems)
  if (!focus.nextBlock) {
    return blockedPreparation(buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: [
        'Non risulta un prossimo blocco del Piano annuale da collegare alla lezione',
        ...(shared.knowledgeUnavailable ? ['Indice della Conoscenza temporaneamente non disponibile'] : []),
      ],
    }))
  }

  const [lessonBundle, teachingSessions] = await Promise.all([
    loadAuthoritativeLessonCopilotBundle({
      workspaceId: input.workspaceId,
      academicYearId: input.academicYearId,
      sectionId: lesson.sectionId,
      blockId: focus.nextBlock.id,
    }),
    shared.sessionRepository.listBySection(input.workspaceId, input.academicYearId, lesson.sectionId).catch(() => {
      console.warn('[DOCENTE OS] Teaching-session continuity unavailable; lesson preparation continues without Diary context.')
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
      ...(shared.knowledgeUnavailable ? ['Indice della Conoscenza temporaneamente non disponibile'] : []),
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
