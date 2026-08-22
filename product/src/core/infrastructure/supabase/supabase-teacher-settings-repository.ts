import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeSettingsText,
  normalizeWeekdays,
  type SaveTeacherWorkspaceSettingsInput,
  type TeacherWorkspaceSettings,
  type TeachingDiscipline,
} from '@/core/domain/teacher-settings'

type SettingsRow = Database['public']['Tables']['teacher_workspace_settings']['Row']
type DisciplineRow = Database['public']['Tables']['teaching_disciplines']['Row']

function toSettings(row: SettingsRow): TeacherWorkspaceSettings {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    userId: row.user_id,
    teacherDisplayName: row.teacher_display_name,
    schoolName: row.school_name,
    schoolCode: row.school_code,
    schoolCity: row.school_city,
    schoolType: row.school_type,
    dailyPeriodCount: row.daily_period_count,
    schoolDayStart: row.school_day_start.slice(0, 5),
    defaultPeriodMinutes: row.default_period_minutes,
    teachingWeekdays: row.teaching_weekdays,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDiscipline(row: DisciplineRow): TeachingDiscipline {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    name: row.name,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseTeacherSettingsRepository {
  async getOrCreate(workspaceId: string, academicYearId: string): Promise<TeacherWorkspaceSettings> {
    const supabase = await createClient()
    const { data: existing, error: existingError } = await supabase
      .from('teacher_workspace_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .limit(1)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)
    if (existing) return toSettings(existing)

    // The common read path above is protected by RLS and needs no explicit user lookup.
    // Resolve the authenticated user only on the first-run creation path.
    const userId = await authenticatedUserId(supabase)
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle()

    const { data, error } = await supabase
      .from('teacher_workspace_settings')
      .insert({
        workspace_id: workspaceId,
        academic_year_id: academicYearId,
        user_id: userId,
        teacher_display_name: profile?.display_name?.trim() ?? '',
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toSettings(data)
  }

  async save(input: SaveTeacherWorkspaceSettingsInput): Promise<TeacherWorkspaceSettings> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const dailyPeriodCount = asIntegerInRange(input.dailyPeriodCount, 4, 10, 'Daily period count')
    const defaultPeriodMinutes = asIntegerInRange(input.defaultPeriodMinutes, 30, 120, 'Default period minutes')
    const schoolDayStart = normalizeTime(input.schoolDayStart)

    const { data, error } = await supabase
      .from('teacher_workspace_settings')
      .upsert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        user_id: userId,
        teacher_display_name: normalizeSettingsText(input.teacherDisplayName, 160),
        school_name: normalizeSettingsText(input.schoolName, 240),
        school_code: normalizeNullable(input.schoolCode, 40),
        school_city: normalizeNullable(input.schoolCity, 120),
        school_type: normalizeRequired(input.schoolType, 160, 'School type'),
        daily_period_count: dailyPeriodCount,
        school_day_start: schoolDayStart,
        default_period_minutes: defaultPeriodMinutes,
        teaching_weekdays: normalizeWeekdays(input.teachingWeekdays),
      }, { onConflict: 'workspace_id,academic_year_id,user_id' })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toSettings(data)
  }

  async listDisciplines(workspaceId: string, academicYearId: string): Promise<TeachingDiscipline[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teaching_disciplines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .order('is_active', { ascending: false })
      .order('name')

    if (error) throw new Error(error.message)
    return data.map(toDiscipline)
  }

  async ensureDiscipline(workspaceId: string, academicYearId: string, name: string): Promise<void> {
    const normalized = normalizeRequired(name, 120, 'Discipline name')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teaching_disciplines')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .ilike('name', normalized)
      .limit(1)

    if (error) throw new Error(error.message)
    if (data.length) return
    await this.addDiscipline(workspaceId, academicYearId, normalized)
  }

  async addDiscipline(workspaceId: string, academicYearId: string, name: string): Promise<TeachingDiscipline> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const normalized = normalizeRequired(name, 120, 'Discipline name')
    const { data, error } = await supabase
      .from('teaching_disciplines')
      .insert({
        workspace_id: workspaceId,
        academic_year_id: academicYearId,
        name: normalized,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toDiscipline(data)
  }

  async setDisciplineActive(
    workspaceId: string,
    academicYearId: string,
    disciplineId: string,
    isActive: boolean,
  ): Promise<TeachingDiscipline> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teaching_disciplines')
      .update({ is_active: isActive })
      .eq('id', disciplineId)
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toDiscipline(data)
  }
}

async function authenticatedUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}

function normalizeNullable(value: string | null, maxLength: number) {
  const normalized = normalizeSettingsText(value ?? '', maxLength)
  return normalized || null
}

function normalizeRequired(value: string, maxLength: number, label: string) {
  const normalized = normalizeSettingsText(value, maxLength)
  if (!normalized) throw new Error(`${label} required`)
  return normalized
}

function normalizeTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid school day start')
  return value
}

function asIntegerInRange(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} out of range`)
  return value
}
