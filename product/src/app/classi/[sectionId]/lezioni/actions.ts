'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveHumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'

const RECORDABLE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export async function recordLessonExecution(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const status = requiredText(formData, 'status').toUpperCase()
  const evidenceNote = optionalNote(formData.get('evidenceNote'))

  if (!RECORDABLE_STATUSES.has(status)) throw new Error('Unsupported lesson outcome')

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context?.academicYear) throw new Error('Active academic year required')

  const repository = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await repository.list(context.workspace.id, context.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Section is outside the active annual plan')

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  if (!resolveHumanTaskLessonProjection(grade, block)) throw new Error('Human-task lesson projection is not available for this block')

  const source = CANONICAL_PLAN_SOURCES[grade]
  await repository.saveProgress({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId,
    status: status as 'SVOLTO' | 'RECUPERATO' | 'RIMODULATO',
    executedOn: currentRomeDate(),
    evidenceNote,
  })

  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)
  revalidatePath('/piano-annuale')
  redirect(`/classi/${encodeURIComponent(sectionId)}?recorded=${encodeURIComponent(blockId)}`)
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}

function optionalNote(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null
  const note = value.trim()
  if (!note) return null
  if (note.length > 2000) throw new Error('Evidence note exceeds 2000 characters')
  return note
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
