import { buildClassWorkspaceLearningFocus } from '@/app/classi/class-workspace-model'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import type { HomeDailyContext } from '@/core/presentation/home-daily-context'
import {
  buildNextLessonPreparation,
  selectNextLessonForPreparation,
  type NextLessonPreparation,
} from '@/core/presentation/next-lesson-preparation'
import { loadAuthoritativeLessonCopilotContext } from './lesson-context-loader'

export async function loadNextLessonPreparation(input: {
  workspaceId: string
  academicYearId: string
  homeDaily: HomeDailyContext
  minuteOfDay: number
}): Promise<NextLessonPreparation | null> {
  const lesson = selectNextLessonForPreparation(input.homeDaily, input.minuteOfDay)
  if (!lesson) return null

  if (!lesson.sectionId) {
    return buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La prossima lezione non è associata a una sezione canonica'],
    })
  }

  if (!lesson.disciplineId) {
    return buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La prossima lezione non è associata a una disciplina canonica'],
    })
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
    return buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La sezione della prossima lezione non è presente nel registro canonico delle classi'],
    })
  }

  const confirmedAssignment = assignments.some((assignment) =>
    assignment.sectionId === lesson.sectionId
    && assignment.disciplineId === lesson.disciplineId
    && assignment.status === 'CONFIRMED',
  )
  if (!confirmedAssignment) {
    return buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: ['La cattedra non conferma il collegamento tra questa sezione e la disciplina della prossima lezione'],
    })
  }

  const focus = buildClassWorkspaceLearningFocus(section, snapshot.progress, knowledgeItems)
  if (!focus.nextBlock) {
    return buildNextLessonPreparation({
      lesson,
      lessonContext: null,
      missingInformation: [
        'Non risulta un prossimo blocco del Piano annuale da collegare alla lezione',
        ...(knowledgeUnavailable ? ['Indice della Conoscenza temporaneamente non disponibile'] : []),
      ],
    })
  }

  const lessonContext = await loadAuthoritativeLessonCopilotContext({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    sectionId: lesson.sectionId,
    blockId: focus.nextBlock.id,
  })

  return buildNextLessonPreparation({
    lesson,
    lessonContext,
    knowledgeResources: focus.materials,
    missingInformation: [
      ...(!lessonContext ? ['Il Lesson Brief canonico del prossimo blocco non è disponibile'] : []),
      ...(knowledgeUnavailable ? ['Indice della Conoscenza temporaneamente non disponibile'] : []),
    ],
  })
}
