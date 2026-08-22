import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import { asTeachingAssignmentStatus, type TeachingAssignment } from '@/core/domain/timetable'

type AssignmentRow = Database['public']['Tables']['teaching_assignments']['Row']

export class SupabaseTeachingAssignmentReader {
  async list(workspaceId: string, academicYearId: string): Promise<TeachingAssignment[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teaching_assignments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .order('created_at')

    if (error) throw new Error(error.message)
    return data.map(toTeachingAssignment)
  }
}

function toTeachingAssignment(row: AssignmentRow): TeachingAssignment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    sectionId: row.section_id,
    disciplineId: row.discipline_id,
    weeklyMinutes: row.weekly_minutes,
    status: asTeachingAssignmentStatus(row.status),
    sourceNote: row.source_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
