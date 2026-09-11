'use server'

import { revalidatePath } from 'next/cache'
import { SupabaseDailyBriefPreferenceRepository } from '@/core/infrastructure/supabase/supabase-daily-brief-preference-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function saveDailyBriefPreference(formData: FormData) {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context?.academicYear) throw new Error('Active academic year required')

  const enabled = formData.get('enabled') === 'on'
  const localTime = formData.get('localTime')
  if (typeof localTime !== 'string') throw new Error('Daily brief time required')

  await new SupabaseDailyBriefPreferenceRepository().save({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    enabled,
    localTime,
  })

  revalidatePath('/impostazioni/riepilogo-giornata')
  revalidatePath('/planner')
}
