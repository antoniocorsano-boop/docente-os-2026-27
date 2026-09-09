'use server'

import { revalidatePath } from 'next/cache'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { lessonDesignFingerprint } from '@/core/domain/lesson-preparation'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import {
  SupabaseLessonDesignRepository,
  type LessonDesignContext,
} from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseLessonPreparationRepository } from '@/core/infrastructure/supabase/supabase-lesson-preparation-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'

export async function confirmLessonPreparation(formData: FormData) {
  const lesson = await requirePreparationContext(formData)
  const extensions = await new SupabaseLessonDesignRepository().list(lesson.designContext)
  if (extensions.some((extension) => extension.status === 'PROPOSED')) {
    throw new Error('Controlla prima le proposte ancora in attesa per questa lezione')
  }

  await new SupabaseLessonPreparationRepository().confirm(lesson.designContext, {
    checklistSnapshot: lesson.projection.preparation,
    designFingerprint: lessonDesignFingerprint(extensions),
  })
  revalidatePreparation(lesson.sectionId, lesson.blockId)
}

export async function resetLessonPreparation(formData: FormData) {
  const lesson = await requirePreparationContext(formData)
  await new SupabaseLessonPreparationRepository().clear(lesson.designContext)
  revalidatePreparation(lesson.sectionId, lesson.blockId)
}

async function requirePreparationContext(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const projectionId = requiredText(formData, 'projectionId')

  const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspaceContext?.academicYear) throw new Error('Active academic year required')

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await annualRepository.list(workspaceContext.workspace.id, workspaceContext.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Section is outside the active annual plan')

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection || projection.projectionId !== projectionId) {
    throw new Error('Lesson projection has changed; reload before confirming preparation')
  }

  const source = CANONICAL_PLAN_SOURCES[grade]
  const designContext: LessonDesignContext = {
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
    sectionId,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId,
    projectionId,
  }

  return { sectionId, blockId, projection, designContext }
}

function revalidatePreparation(sectionId: string, blockId: string) {
  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)
  revalidatePath('/planner')
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}
