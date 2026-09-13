'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { recordTeachingSession } from '@/core/application/record-teaching-session'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveHumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'

export async function recordLessonExecution(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const localDate = requiredDate(formData, 'localDate')
  const actualMinutes = positiveInt(formData, 'actualMinutes')
  const evidenceNote = optionalNote(formData.get('evidenceNote'))

  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context?.academicYear) throw new Error('Active academic year required')

  const annual = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await annual.list(context.workspace.id, context.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Section is outside the active annual plan')

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  const projection = resolveHumanTaskLessonProjection(grade, block)
  if (!projection) throw new Error('Human-task lesson projection is not available for this block')

  const source = CANONICAL_PLAN_SOURCES[grade]
  const session: TeachingSessionDraft = {
    sectionId,
    disciplineId: null,
    localDate,
    plannedStartAt: null,
    plannedEndAt: null,
    plannedMinutes: projection.durationMinutes,
    actualMinutes,
    evidenceNote,
    source: {
      sourceKind: 'MANUAL',
      projectedOccurrenceLogicalId: null,
      timetableVersionId: null,
      timetableSlotId: null,
      calendarState: null,
      provenance: [
        `manual_session:${localDate}`,
        `section:${sectionId}`,
        `lesson_workspace:${sectionId}:${blockId}`,
        `canonical_generation:${source.generationId}`,
      ],
    },
  }

  const receipt = await recordTeachingSession({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    session,
    allocations: [{
      blockId,
      minutes: actualMinutes,
      canonicalPlanAssetId: source.assetId,
      canonicalGenerationId: source.generationId,
    }],
    allocationContext: {
      sectionId,
      canonicalPlanAssetId: source.assetId,
      canonicalGenerationId: source.generationId,
    },
  }, new SupabaseTeachingSessionRepository())

  revalidatePath('/planner')
  revalidatePath('/piano-annuale')
  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)
  redirect(`/classi/${encodeURIComponent(sectionId)}?session=${encodeURIComponent(receipt.teachingSessionId)}`)
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}

function requiredDate(formData: FormData, name: string) {
  const value = requiredText(formData, name)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} invalid`)
  return value
}

function positiveInt(formData: FormData, name: string) {
  const value = Number(requiredText(formData, name))
  if (!Number.isInteger(value) || value <= 0 || value > 1440) throw new Error(`${name} invalid`)
  return value
}

function optionalNote(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null
  const note = value.trim()
  if (!note) return null
  if (note.length > 4000) throw new Error('Evidence note exceeds 4000 characters')
  return note
}
