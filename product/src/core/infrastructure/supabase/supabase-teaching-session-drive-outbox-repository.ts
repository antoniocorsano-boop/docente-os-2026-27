import type { DriveDiaryProjection } from '@/core/domain/teaching-session-reflection'
import { createClient } from '@/lib/supabase/server'

type DbError = { message: string }
type InsertResult = Promise<{ data: { id: string } | null; error: DbError | null }>

interface OutboxInsertBuilder {
  select(columns: 'id'): { single(): InsertResult }
}

interface OutboxTable {
  insert(value: {
    session_id: string
    workspace_id: string
    academic_year_id: string
    section_id: string
    record_id: string
    projection: DriveDiaryProjection
    status: 'PENDING'
    attempts: number
    created_by: string
  }): OutboxInsertBuilder
}

interface OutboxClient {
  from(table: 'teaching_session_drive_outbox'): OutboxTable
}

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

    const outbox = supabase as unknown as OutboxClient
    const { data, error } = await outbox
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
    return data.id
  }
}
