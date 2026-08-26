'use server'

import { revalidatePath } from 'next/cache'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { filterProgettaItemsByFocus } from '@/app/progetta/progetta-model'
import {
  buildLessonActivationQuestionProposal,
  LESSON_ACTIVATION_QUESTION_TOOL_ID,
} from '@/core/application/lesson-activation-question-tool'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import {
  SupabaseLessonDesignRepository,
  type LessonDesignContext,
} from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle } from '@/core/presentation/product-language'
import { resolveHumanTaskLessonProjection } from '@/core/presentation/human-task-content'

export async function acceptLessonDesignExtension(formData: FormData) {
  const lesson = await requireLessonContext(formData)
  const extensionId = requiredText(formData, 'extensionId')
  await new SupabaseLessonDesignRepository().accept(lesson.designContext, extensionId)
  revalidateLesson(lesson.sectionId, lesson.blockId)
}

export async function removeLessonDesignExtension(formData: FormData) {
  const lesson = await requireLessonContext(formData)
  const extensionId = requiredText(formData, 'extensionId')
  await new SupabaseLessonDesignRepository().remove(lesson.designContext, extensionId)
  revalidateLesson(lesson.sectionId, lesson.blockId)
}

export async function proposeLessonActivationQuestion(formData: FormData) {
  const lesson = await requireLessonContext(formData)
  const repository = new SupabaseLessonDesignRepository()
  const current = await repository.list(lesson.designContext)
  const alreadyPresent = current.some((extension) =>
    extension.projectionId === lesson.designContext.projectionId &&
    extension.payload.toolId === LESSON_ACTIVATION_QUESTION_TOOL_ID,
  )

  if (!alreadyPresent) {
    await repository.addProposal(
      lesson.designContext,
      buildLessonActivationQuestionProposal({
        sectionId: lesson.sectionId,
        canonicalPlanAssetId: lesson.designContext.canonicalPlanAssetId,
        canonicalGenerationId: lesson.designContext.canonicalGenerationId,
        blockId: lesson.blockId,
        projectionId: lesson.designContext.projectionId,
        lessonTitle: lesson.projection.title,
        objective: lesson.projection.objective,
      }),
    )
  }

  revalidateLesson(lesson.sectionId, lesson.blockId)
}

export async function attachKnowledgeResourceToLesson(formData: FormData) {
  const lesson = await requireLessonContext(formData)
  const assetId = requiredText(formData, 'assetId')
  const knowledgeRepository = new SupabaseKnowledgeRepository()
  const bundle = await knowledgeRepository.getBundle(lesson.designContext.workspaceId, assetId)
  if (!bundle) throw new Error('Knowledge resource not found in the active workspace')

  const focused = filterProgettaItemsByFocus(
    [{ asset: bundle.asset, document: bundle.document }],
    { blockId: lesson.blockId, uda: lesson.uda, pack: lesson.pack },
  )
  if (!focused.length) throw new Error('Knowledge resource is not explicitly linked to this lesson focus')

  const title = humanizeKnowledgeTitle(bundle.document?.title ?? bundle.asset.originalName)
  const repository = new SupabaseLessonDesignRepository()
  const proposal = await repository.addProposal(lesson.designContext, {
    sectionId: lesson.sectionId,
    canonicalPlanAssetId: lesson.designContext.canonicalPlanAssetId,
    canonicalGenerationId: lesson.designContext.canonicalGenerationId,
    blockId: lesson.blockId,
    projectionId: lesson.designContext.projectionId,
    kind: 'TEACHER_RESOURCE',
    insertionPosition: 'START',
    anchorStepId: null,
    title,
    body: bundle.document?.summary?.trim() || 'Materiale della Conoscenza collegato esplicitamente a questa fase.',
    cue: null,
    minutes: null,
    sourceKind: 'KNOWLEDGE',
    sourceRef: `knowledge:${bundle.asset.id}`,
    sourceLabel: title,
    payload: {
      assetId: bundle.asset.id,
      documentId: bundle.document?.id ?? null,
      contentCategory: bundle.asset.contentCategory,
    },
  })

  // The button is an explicit teacher action (“Aggiungi alla lezione”), so the
  // same human action may promote the newly-created proposal through the
  // acceptance boundary. AI/tool-generated proposals never call this path.
  await repository.accept(lesson.designContext, proposal.id)
  revalidateLesson(lesson.sectionId, lesson.blockId)
}

async function requireLessonContext(formData: FormData) {
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
  const projection = resolveHumanTaskLessonProjection(grade, block)
  if (!projection || projection.projectionId !== projectionId) {
    throw new Error('Lesson projection has changed; reload before modifying the lesson design')
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

  return {
    designContext,
    sectionId,
    blockId,
    uda: block.uda,
    pack: block.pack,
    projection,
  }
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}

function revalidateLesson(sectionId: string, blockId: string) {
  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)
}
