import type { DriveDiaryProjection } from '@/core/domain/teaching-session-reflection'
import { createClient } from '@/lib/supabase/server'

export class SupabaseTeachingSessionDriveOutboxRepository {
  async queue(input: {
    sessionId: string
    workspaceId: string
    academicYearId: string
    sectionId: string
    recordId: string
    projection: DriveDiaryProjection
  }) {
    const supabase = await createClient()
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError) throw new Error(userError.message)
    if (!userResult.user) throw new Error('Authenticated user required')

    const { data, error } = await supabase
      .from('teaching_session_drive_outbox')
      .insert({
        session_id: input.sessionId,
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        section_id: input.sectionId,
        record_id: input.recordId,
        projection: input.projection,
        status: 'PENDING',
        attempts: 0,
        created_by: userResult.user.id,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Drive diary outbox receipt missing')
    return data.id as string
  }
}
