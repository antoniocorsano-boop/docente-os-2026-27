'use server'

import { revalidatePath } from 'next/cache'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import type { TextbookSourceKind, TextbookUsageKind } from '@/core/domain/textbook-adoption'

export async function addTextbookProposal(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTextbookRepository()
  await repository.addProposal({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    draft: {
      teachingAssignmentId: text(formData, 'teachingAssignmentId'),
      isbn13: text(formData, 'isbn13'),
      title: text(formData, 'title'),
      subtitle: nullableText(formData, 'subtitle'),
      authors: nullableText(formData, 'authors'),
      publisher: text(formData, 'publisher'),
      editionLabel: nullableText(formData, 'editionLabel'),
      volumeLabel: nullableText(formData, 'volumeLabel'),
      officialUrl: nullableText(formData, 'officialUrl'),
      publisherProductRef: nullableText(formData, 'publisherProductRef'),
      usageKind: usageKind(text(formData, 'usageKind')),
      sourceKind: sourceKind(text(formData, 'sourceKind')),
      sourceRef: nullableText(formData, 'sourceRef'),
    },
  })
  revalidateTextbooks()
}

export async function confirmTextbookAdoption(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTextbookRepository()
  await repository.confirm(
    context.workspace.id,
    context.academicYear.id,
    text(formData, 'adoptionId'),
  )
  revalidateTextbooks()
}

export async function removeTextbookAdoption(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTextbookRepository()
  await repository.remove(
    context.workspace.id,
    context.academicYear.id,
    text(formData, 'adoptionId'),
  )
  revalidateTextbooks()
}

async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function revalidateTextbooks() {
  revalidatePath('/impostazioni')
  revalidatePath('/impostazioni/libri-di-testo')
  revalidatePath('/classi')
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') throw new Error(`${key} required`)
  return value
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key).trim()
  return value || null
}

function usageKind(value: string): TextbookUsageKind {
  if (value === 'ADOPTED' || value === 'RECOMMENDED' || value === 'OTHER') return value
  throw new Error('Invalid textbook usage kind')
}

function sourceKind(value: string): TextbookSourceKind {
  if (value === 'MANUAL' || value === 'MIM_OPEN_DATA') return value
  throw new Error('Invalid textbook source kind')
}
