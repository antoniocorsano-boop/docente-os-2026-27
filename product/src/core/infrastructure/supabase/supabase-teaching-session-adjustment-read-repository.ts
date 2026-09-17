import type {
  TeachingSessionAllocationRecord,
  TeachingSessionRecord,
  TeachingSessionSnapshot,
} from '@/core/domain/teaching-session'
import { createClient } from '@/lib/supabase/server'

type DbError = { message: string }
type QueryResult<T> = { data: T[] | null; error: DbError | null }

interface FilterBuilder<T> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: string): FilterBuilder<T>
  in(column: string, values: string[]): FilterBuilder<T>
  order(column: string, options?: { ascending?: boolean }): FilterBuilder<T>
}

interface TableBuilder<T> {
  select(columns: string): FilterBuilder<T>
}

type SessionRow = {
  id: string
  workspace_id: string
  academic_year_id: string
  section_id: string
  discipline_id: string | null
  local_date: string
  planned_start_time: string | null
  planned_end_time: string | null
  planned_minutes: number | null
  actual_minutes: number
  evidence_note: string | null
  source_kind: 'PROJECTED_OCCURRENCE' | 'MANUAL'
  projected_occurrence_logical_id: string | null
  source_timetable_version_id: string | null
  source_timetable_slot_id: string | null
  source_calendar_state: 'SCHOOL_DAY' | 'NO_LESSONS' | 'UNDETERMINED' | null
  source_provenance: string[]
  supersedes_session_id: string | null
  recorded_by: string
  recorded_at: string
}

type AllocationRow = {
  id: string
  session_id: string
  block_id: string
  minutes: number
  canonical_plan_asset_id: string
  canonical_generation_id: string
  created_at: string
}

interface ReadClient {
  from(table: 'teaching_sessions'): TableBuilder<SessionRow>
  from(table: 'teaching_session_allocations'): TableBuilder<AllocationRow>
}

/**
 * Narrow H8-B2 read boundary. Workspace/year predicates are deliberately part
 * of the query in addition to database RLS, so a caller cannot use a session
 * identifier to cross the active context boundary.
 */
export class SupabaseTeachingSessionAdjustmentReadRepository {
  async getById(
    workspaceId: string,
    academicYearId: string,
    teachingSessionId: string,
  ): Promise<TeachingSessionSnapshot | null> {
    const supabase = await createClient()
    const read = supabase as unknown as ReadClient
    const { data: rows, error } = await read
      .from('teaching_sessions')
      .select('*')
      .eq('id', teachingSessionId)
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)

    if (error) throw new Error(error.message)
    const row = rows?.[0]
    if (!row) return null

    const { data: allocationRows, error: allocationError } = await read
      .from('teaching_session_allocations')
      .select('*')
      .in('session_id', [row.id])
      .order('created_at', { ascending: true })

    if (allocationError) throw new Error(allocationError.message)
    return {
      sessions: [toSession(row)],
      allocations: (allocationRows ?? []).map(toAllocation),
    }
  }
}

function toSession(row: SessionRow): TeachingSessionRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    sectionId: row.section_id,
    disciplineId: row.discipline_id,
    localDate: row.local_date,
    plannedStartAt: row.planned_start_time ? `${row.local_date}T${row.planned_start_time.slice(0, 5)}:00` : null,
    plannedEndAt: row.planned_end_time ? `${row.local_date}T${row.planned_end_time.slice(0, 5)}:00` : null,
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    evidenceNote: row.evidence_note,
    source: {
      sourceKind: row.source_kind,
      projectedOccurrenceLogicalId: row.projected_occurrence_logical_id,
      timetableVersionId: row.source_timetable_version_id,
      timetableSlotId: row.source_timetable_slot_id,
      calendarState: row.source_calendar_state,
      provenance: [...row.source_provenance],
    },
    supersedesSessionId: row.supersedes_session_id,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
  }
}

function toAllocation(row: AllocationRow): TeachingSessionAllocationRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    blockId: row.block_id,
    minutes: row.minutes,
    canonicalPlanAssetId: row.canonical_plan_asset_id,
    canonicalGenerationId: row.canonical_generation_id,
    createdAt: row.created_at,
  }
}
