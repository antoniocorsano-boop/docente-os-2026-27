'use server'

import { redirect } from 'next/navigation'
import { synchronizePendingDriveDiary } from '@/core/infrastructure/google/google-drive-diary-sync'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function retryPendingDriveDiary(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const assetId = requiredText(formData, 'assetId')
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context?.academicYear) throw new Error('Active academic year required')

  const result = await synchronizePendingDriveDiary(context.workspace.id)
  const state = result.failed > 0
    ? 'failed'
    : result.pending > 0
      ? 'pending'
      : 'synced'

  redirect(
    `/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}/registra?driveRetry=${state}&driveSynced=${result.synced}`,
  )
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}
