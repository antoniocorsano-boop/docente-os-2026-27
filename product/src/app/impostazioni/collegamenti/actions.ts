'use server'

import { revalidatePath } from 'next/cache'
import {
  asWorkspacePinnedResourceKind,
  normalizeWorkspacePinnedResourceNote,
  normalizeWorkspacePinnedResourceTarget,
} from '@/core/domain/workspace-pinned-resource'
import { SupabaseWorkspacePinnedResourceRepository } from '@/core/infrastructure/supabase/supabase-workspace-pinned-resource-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function saveWorkspacePinnedResource(formData: FormData) {
  const context = await requireContext()
  const kind = asWorkspacePinnedResourceKind(text(formData, 'kind'))
  const rawTarget = text(formData, 'targetUrl').trim()
  const repository = new SupabaseWorkspacePinnedResourceRepository()

  if (!rawTarget) {
    await repository.remove(context.workspace.id, context.academicYear.id, kind)
  } else {
    await repository.save({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      kind,
      targetUrl: normalizeWorkspacePinnedResourceTarget(rawTarget),
      note: normalizeWorkspacePinnedResourceNote(nullableText(formData, 'note')),
    })
  }

  revalidatePath('/')
  revalidatePath('/impostazioni')
  revalidatePath('/impostazioni/collegamenti')
}

async function requireContext() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') throw new Error(`${key} required`)
  return value
}

function nullableText(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}
