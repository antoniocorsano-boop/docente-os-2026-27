import type { DriveDiaryProjection } from '@/core/domain/teaching-session-reflection'
import { createClient } from '@/lib/supabase/server'

type DbError = { message: string }
type InsertResult = Promise<{ data: { id: string } | null; error: DbError | null }>
type ListResult = { data: OutboxRow[] | null; error: DbError | null }
type RpcResult = Promise<{ data: null; error: DbError | null }>

type OutboxRow = {
  id: string
  session_id: string
  record_id: string
  projection: DriveDiaryProjection
  status: 'PENDING' | 'SYNCED' | 'FAILED'
  attempts: number
  last_error: string | null
  synced_at: string | null
  created_at: string
}

export type TeachingSessionDriveReceipt = {
  id: string
  sessionId: string
  recordId: string
  projection: DriveDiaryProjection
  status: 'PENDING' | 'SYNCED' | 'FAILED'
  attempts: number
  lastError: string | null
  syncedAt: string | null
  createdAt: string
}

interface OutboxInsertBuilder {
  select(columns: 'id'): { single(): InsertResult }
}

interface OutboxFilterBuilder extends PromiseLike<ListResult> {
  eq(column: string, value: string): OutboxFilterBuilder
  in(column: string, values: string[]): OutboxFilterBuilder
  order(column: string, options?: { ascending?: boolean }): OutboxFilterBuilder
  limit(value: number): OutboxFilterBuilder
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
  select(columns: string): OutboxFilterBuilder
}

interface OutboxClient {
  from(table: 'teaching_session_drive_outbox'): OutboxTable
  rpc(name: 'finish_teaching_session_drive_outbox', args: {
    target_outbox_id: string
    target_status: 'SYNCED' | 'FAILED'
    target_error: string | null
  }): RpcResult
}

const RECEIPT_COLUMNS = 'id,session_id,record_id,projection,status,attempts,last_error,synced_at,created_at'

export class SupabaseTeachingSessionDriveOutboxRepository {
  async queue(input: {
    sessionId: string
    workspaceId: string
    academicYearId: string
    sectionId: string
    recordId: string
    projection: DriveDiaryProjection
  }) {
    const { supabase, userId } = await authenticatedClient()
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
        created_by: userId,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Drive diary outbox receipt missing')
    return data.id
  }

  async listPending(workspaceId: string, limit = 20) {
    const { supabase, userId } = await authenticatedClient()
    const outbox = supabase as unknown as OutboxClient
    const { data, error } = await outbox
      .from('teaching_session_drive_outbox')
      .select(RECEIPT_COLUMNS)
      .eq('workspace_id', workspaceId)
      .eq('created_by', userId)
      .in('status', ['PENDING', 'FAILED'])
      .order('created_at', { ascending: true })
      .limit(Math.max(1, Math.min(50, limit)))

    if (error) throw new Error(error.message)
    return data ?? []
  }

  async listBySection(workspaceId: string, sectionId: string, limit = 100): Promise<TeachingSessionDriveReceipt[]> {
    const { supabase, userId } = await authenticatedClient()
    const outbox = supabase as unknown as OutboxClient
    const { data, error } = await outbox
      .from('teaching_session_drive_outbox')
      .select(RECEIPT_COLUMNS)
      .eq('workspace_id', workspaceId)
      .eq('section_id', sectionId)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(250, limit)))

    if (error) throw new Error(error.message)
    return (data ?? []).map(toReceipt)
  }

  async finish(outboxId: string, status: 'SYNCED' | 'FAILED', errorMessage: string | null = null) {
    const { supabase } = await authenticatedClient()
    const outbox = supabase as unknown as OutboxClient
    const { error } = await outbox.rpc('finish_teaching_session_drive_outbox', {
      target_outbox_id: outboxId,
      target_status: status,
      target_error: errorMessage,
    })
    if (error) throw new Error(error.message)
  }
}

function toReceipt(row: OutboxRow): TeachingSessionDriveReceipt {
  return {
    id: row.id,
    sessionId: row.session_id,
    recordId: row.record_id,
    projection: row.projection,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
  }
}

async function authenticatedClient() {
  const supabase = await createClient()
  const { data: userResult, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!userResult.user) throw new Error('Authenticated user required')
  return { supabase, userId: userResult.user.id }
}
