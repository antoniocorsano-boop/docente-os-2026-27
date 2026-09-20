'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import {
  isCurriculumBaselineReadyForLessonApproval,
  type LessonPreparationContext,
} from '@/core/application/lesson-preparation-approval'
import { SupabaseAnnualPlanCurriculumRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseLessonPreparationApprovalRepository } from '@/core/infrastructure/supabase/supabase-lesson-preparation-approval-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { createClient } from '@/lib/supabase/server'

const TECHNOLOGY_DISCIPLINE_REF = 'technology'

export async function approveLessonPreparationAndProceed(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const expectedProjectionId = requiredText(formData, 'projectionId')

  const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspaceContext?.academicYear) redirect('/workspace')

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const annualSnapshot = await annualRepository.list(
    workspaceContext.workspace.id,
    workspaceContext.academicYear.id,
  )
  const section = annualSnapshot.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Section is outside the active annual plan')

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')

  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection || projection.projectionId !== expectedProjectionId) {
    redirect(prepareHref(sectionId, blockId, 'changed'))
  }

  const source = CANONICAL_PLAN_SOURCES[grade]
  const context: LessonPreparationContext = {
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
    sectionId,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId,
    projectionId: projection.projectionId,
  }

  const [curriculumBaseline, extensions] = await Promise.all([
    new SupabaseAnnualPlanCurriculumRepository().currentBaseline({
      workspaceId: context.workspaceId,
      academicYearId: context.academicYearId,
      sectionId: context.sectionId,
      disciplineRef: TECHNOLOGY_DISCIPLINE_REF,
    }),
    new SupabaseLessonDesignRepository().list(context),
  ])

  if (!isCurriculumBaselineReadyForLessonApproval(curriculumBaseline)) {
    redirect(prepareHref(sectionId, blockId, 'curriculum-required'))
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const approvedBy = claimsData?.claims?.sub
  if (claimsError || !approvedBy) redirect('/login')

  await new SupabaseLessonPreparationApprovalRepository().approve({
    context,
    curriculumBaseline,
    projection,
    extensions,
    approvedBy,
  })

  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)
  redirect(`/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId)}?mode=teach`)
}

function prepareHref(sectionId: string, blockId: string, approval: string) {
  return `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId)}?mode=prepare&approval=${encodeURIComponent(approval)}`
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}
