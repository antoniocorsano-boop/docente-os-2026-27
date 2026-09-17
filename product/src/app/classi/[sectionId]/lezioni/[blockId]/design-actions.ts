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
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle } from '@/core/presentation/product-language'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { textbookMaterialId } from './lesson-material-suggestions'

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
  await repository.addToolProposalOnce(
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
    LESSON_ACTIVATION_QUESTION_TOOL_ID,
  )

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
  const focusLinked = focused.length > 0
  const editorialTextbookId = textbookMaterialId(bundle.asset.sourceMetadata)
  const editorialAllowed = editorialTextbookId
    ? await isConfirmedTextbookForSection(lesson.designContext, lesson.sectionId, editorialTextbookId)
    : false

  if (!focusLinked && !editorialAllowed) {
    throw new Error('Knowledge resource is neither linked to this lesson focus nor to a confirmed textbook for this class')
  }

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
    body: bundle.document?.summary?.trim() || (
      editorialAllowed
        ? 'Materiale editoriale del libro confermato per questa classe, proposto come supporto alla lezione.'
        : 'Materiale della Conoscenza collegato esplicitamente a questa fase.'
    ),
    cue: null,
    minutes: null,
    sourceKind: editorialAllowed ? 'EDITORIAL_KNOWLEDGE' : 'KNOWLEDGE',
    sourceRef: `knowledge:${bundle.asset.id}`,
    sourceLabel: editorialAllowed ? `Dal libro · ${title}` : title,
    payload: {
      assetId: bundle.asset.id,
      documentId: bundle.document?.id ?? null,
      contentCategory: bundle.asset.contentCategory,
      linkage: focusLinked ? 'LESSON_FOCUS' : 'CONFIRMED_TEXTBOOK',
      textbookId: editorialAllowed ? editorialTextbookId : null,
      materialRole: editorialAllowed ? 'TEXTBOOK_TEACHER_MATERIAL' : null,
    },
  })

  // Il bottone è una scelta esplicita del docente (“Usa in questa lezione”):
  // questa stessa azione può attraversare il confine PROPOSED → ACCEPTED.
  // Le proposte generate autonomamente da strumenti o AI non usano questo percorso.
  await repository.accept(lesson.designContext, proposal.id)
  revalidateLesson(lesson.sectionId, lesson.blockId)
}

async function isConfirmedTextbookForSection(
  context: LessonDesignContext,
  sectionId: string,
  textbookId: string,
) {
  const [assignments, adoptions] = await Promise.all([
    new SupabaseTeachingAssignmentReader().list(context.workspaceId, context.academicYearId),
    new SupabaseTextbookRepository().list(context.workspaceId, context.academicYearId),
  ])
  const sectionAssignmentIds = new Set(
    assignments.filter((assignment) => assignment.sectionId === sectionId).map((assignment) => assignment.id),
  )
  return adoptions.some((adoption) =>
    adoption.status === 'CONFIRMED'
    && adoption.textbook.id === textbookId
    && sectionAssignmentIds.has(adoption.teachingAssignmentId),
  )
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
  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
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
