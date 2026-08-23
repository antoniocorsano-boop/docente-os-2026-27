import type { createClient } from '@/lib/supabase/server'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function ensurePersonalWorkspace(supabase: ServerSupabaseClient) {
  const { data: workspaceId, error: bootstrapError } = await supabase.rpc(
    'bootstrap_personal_workspace',
    { workspace_name: 'Il mio spazio docente' },
  )

  if (bootstrapError || !workspaceId) {
    return { ok: false as const, error: 'workspace_bootstrap_failed' as const }
  }

  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .maybeSingle()

  if (!activeYear) {
    const { error: yearError } = await supabase.from('academic_years').insert({
      workspace_id: workspaceId,
      label: '2026/2027',
      starts_on: '2026-09-01',
      ends_on: '2027-08-31',
      is_active: true,
    })

    if (yearError) {
      return { ok: false as const, error: 'academic_year_bootstrap_failed' as const }
    }
  }

  return { ok: true as const, workspaceId }
}
