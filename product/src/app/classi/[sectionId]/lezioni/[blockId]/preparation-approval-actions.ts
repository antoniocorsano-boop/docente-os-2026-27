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
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseLessonPreparationApprovalRepository } from '@/core/infrastructure/supabase/supabase-lesson-preparation-approval-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildCanonicalLessonWorkspaceHref } from '@/core/presentation/lesson-workspace-route'
import { createClient } from '@/lib/supabase/server'

const TECHNOLOGY_DISCIPLINE_REF = 'technology'

export async function approveLessonPreparationAndProceed(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const expectedProjectionId = requiredText(formData, 'projectionId')
  const localDate = optionalText(formData, 'localDate')
  const occurrenceLogicalId = optionalText(formData, 'occurrenceLogicalId')

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
    redirect(preparationHref(sectionId, blockId, localDate, occurrenceLogicalId, 'changed'))
  }

  const runtimeSource = await new SupabaseCanonicalPlanSourceRepository().resolve({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
    code: CANONICAL_PLAN_SOURCES[grade].code,
  })
  if (!runtimeSource) throw new Error('Il piano annuale della classe non è ancora collegato alla sorgente canonica.')

  const context: LessonPreparationContext = {
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
    sectionId,
    canonicalPlanAssetId: runtimeSource.assetId,
    canonicalGenerationId: runtimeSource.generationId,
    canonicalAuthorityEpoch: runtimeSource.authorityEpoch,
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
    redirect(preparationHref(sectionId, blockId, localDate, occurrenceLogicalId, 'curricolo-required'))
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const approvedBy = claimsData?.claims?.sub
  if (claimsError || !approvedBy) redirect('/login')

  try {
    await new SupabaseLessonPreparationApprovalRepository().approve({
      context,
      curriculumBaseline,
      projection,
      extensions,
      approvedBy,
    })
  } catch {
    redirect(preparationHref(sectionId, blockId, localDate, occurrenceLogicalId, 'failed'))
  }

  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)
  redirect(buildCanonicalLessonWorkspaceHref(sectionId, blockId, { localDate, occurrenceLogicalId, intent: 'start' }))
}

function preparationHref(sectionId: string, blockId: string, localDate: string | null, occurrenceLogicalId: string | null, approval: string) {
  const href = buildCanonicalLessonWorkspaceHref(sectionId, blockId, { localDate, occurrenceLogicalId })
  return `${href}${href.includes('?') ? '&' : '?'}approval=${encodeURIComponent(approval)}`
}

function optionalText(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}
