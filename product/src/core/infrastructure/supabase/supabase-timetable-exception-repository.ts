import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import {
  asTimetableActivityKind,
  type TimetableActivityKind,
  type TimetableException,
  type TimetableExceptionSourceKind,
} from '@/core/domain/timetable'

type ExceptionRow = Database['public']['Tables']['timetable_exceptions']['Row']

export class SupabaseTimetableExceptionRepository {
  async listByDate(workspaceId: string, academicYearId: string, localDate: string): Promise<TimetableException[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('timetable_exceptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .eq('local_date', localDate)

    if (error) throw new Error(error.message)
    return data.map(toException)
  }

  async list(workspaceId: string, academicYearId: string): Promise<TimetableException[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('timetable_exceptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .order('local_date')
      .order('created_at')

    if (error) throw new Error(error.message)
    return data.map(toException)
  }

  async setActivityKind(input: {
    timetableSlotId: string
    localDate: string
    activityKind: TimetableActivityKind | null
  }): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.rpc('set_timetable_occurrence_activity_kind', {
      p_timetable_slot_id: input.timetableSlotId,
      p_local_date: input.localDate,
      p_activity_kind: input.activityKind,
    })
    if (error) throw new Error(error.message)
  }
}

function toException(row: ExceptionRow): TimetableException {
  const activityKind = asTimetableActivityKind(row.activity_kind)
  if (!activityKind) throw new Error('Timetable activity exception requires activity kind')
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    localDate: row.local_date,
    timetableVersionId: row.timetable_version_id,
    timetableSlotId: row.timetable_slot_id,
    kind: 'ACTIVITY_KIND_CHANGED',
    activityKind,
    sourceKind: asSourceKind(row.source_kind),
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function asSourceKind(value: string): TimetableExceptionSourceKind {
  if (value === 'TEACHER' || value === 'INSTITUTION' || value === 'IMPORT') return value
  throw new Error(`Unsupported timetable exception source kind: ${value}`)
}
