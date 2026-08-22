'use server'

import { revalidatePath } from 'next/cache'
import { asAnnualPlanBlockStatus } from '@/core/domain/annual-plan-execution'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_STORAGE, type GradeKey } from './model'

export async function addAnnualPlanSection(gradeValue: string, sectionCode: string) {
  const grade = asGradeKey(gradeValue)
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  const section = await repository.addSection(
    context.workspace.id,
    context.academicYear.id,
    GRADE_STORAGE[grade],
    sectionCode,
  )
  revalidatePath('/piano-annuale')
  return section
}

export async function confirmAnnualPlanSection(sectionId: string) {
  if (!sectionId) throw new Error('Section id required')
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  const section = await repository.setSectionStatus(
    context.workspace.id,
    context.academicYear.id,
    sectionId,
    'CONFERMATA',
  )
  revalidatePath('/piano-annuale')
  return section
}

export async function saveAnnualPlanProgress(input: {
  grade: string
  sectionId: string
  blockId: string
  status: string
  date: string
  note: string
}) {
  const grade = asGradeKey(input.grade)
  const status = asAnnualPlanBlockStatus(input.status)
  const block = buildBlocks(grade).find((item) => item.id === input.blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  if (!input.sectionId) throw new Error('Section id required')

  const context = await requireContext()
  const source = CANONICAL_PLAN_SOURCES[grade]
  const repository = new SupabaseAnnualPlanExecutionRepository()
  const progress = await repository.saveProgress({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: input.sectionId,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId: block.id,
    status,
    executedOn: normalizeDate(input.date),
    evidenceNote: normalizeNote(input.note),
  })
  revalidatePath('/piano-annuale')
  return progress
}

export async function resetAnnualPlanProgress(gradeValue: string, sectionId: string) {
  const grade = asGradeKey(gradeValue)
  if (!sectionId) throw new Error('Section id required')
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  await repository.resetProgress(
    context.workspace.id,
    context.academicYear.id,
    sectionId,
    CANONICAL_PLAN_SOURCES[grade].generationId,
  )
  revalidatePath('/piano-annuale')
}

async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function asGradeKey(value: string): GradeKey {
  if (value === 'Prima' || value === 'Seconda' || value === 'Terza') return value
  throw new Error(`Unsupported annual plan grade: ${value}`)
}

function normalizeDate(value: string) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid execution date')
  return value
}

function normalizeNote(value: string) {
  const note = value.trim()
  if (!note) return null
  if (note.length > 4000) throw new Error('Evidence note exceeds 4000 characters')
  return note
}
