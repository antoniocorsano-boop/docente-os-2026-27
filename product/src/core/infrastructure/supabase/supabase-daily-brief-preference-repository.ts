import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeDailyBriefTime, type DailyBriefPreference } from '@/core/domain/daily-brief-preference'
import { createClient } from '@/lib/supabase/server'

type PreferenceRow = {
  id: string
  workspace_id: string
  academic_year_id: string
  user_id: string
  enabled: boolean
  local_time: string
  created_at: string
  updated_at: string
}

type PreferenceInsert = {
  id?: string
  workspace_id: string
  academic_year_id: string
  user_id: string
  enabled: boolean
  local_time: string
  created_at?: string
  updated_at?: string
}

type DailyBriefDatabase = {
  public: {
    Tables: {
      daily_brief_preferences: {
        Row: PreferenceRow
        Insert: PreferenceInsert
        Update: Partial<PreferenceInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export class SupabaseDailyBriefPreferenceRepository {
  async getOrCreate(workspaceId: string, academicYearId: string): Promise<DailyBriefPreference> {
    const supabase = await dailyBriefClient()
    const userId = await authenticatedUserId(supabase)
    const { data: existing, error: existingError } = await supabase
      .from('daily_brief_preferences')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)
    if (existing) return toPreference(existing)

    const { data, error } = await supabase
      .from('daily_brief_preferences')
      .insert({
        workspace_id: workspaceId,
        academic_year_id: academicYearId,
        user_id: userId,
        enabled: false,
        local_time: '07:00',
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toPreference(data)
  }

  async save(input: { workspaceId: string; academicYearId: string; enabled: boolean; localTime: string }) {
    const supabase = await dailyBriefClient()
    const userId = await authenticatedUserId(supabase)
    const localTime = normalizeDailyBriefTime(input.localTime)
    const { data, error } = await supabase
      .from('daily_brief_preferences')
      .upsert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        user_id: userId,
        enabled: input.enabled,
        local_time: localTime,
      }, { onConflict: 'workspace_id,academic_year_id,user_id' })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toPreference(data)
  }
}

async function dailyBriefClient() {
  return (await createClient()) as unknown as SupabaseClient<DailyBriefDatabase>
}

async function authenticatedUserId(supabase: SupabaseClient<DailyBriefDatabase>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}

function toPreference(row: PreferenceRow): DailyBriefPreference {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    userId: row.user_id,
    enabled: row.enabled,
    localTime: row.local_time.slice(0, 5),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
