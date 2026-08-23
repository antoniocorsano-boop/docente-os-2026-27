import type {
  TeachingSessionAllocationDraft,
  TeachingSessionAllocationRecord,
  TeachingSessionDraft,
  TeachingSessionRecord,
  TeachingSessionSnapshot,
} from '@/core/domain/teaching-session'
import { createClient } from '@/lib/supabase/server'

type DbError = { message: string }
type RpcResult<T> = Promise<{ data: T | null; error: DbError | null }>
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

interface TeachingSessionReadClient {
  from(table: 'teaching_sessions'): TableBuilder<SessionRow>
  from(table: 'teaching_session_allocations'): TableBuilder<AllocationRow>
}

interface TeachingSessionRpcClient {
  rpc(name: 'record_teaching_session', args: {
    target_workspace_id: string
    target_academic_year_id: string
    target_section_id: string
    target_discipline_id: string | null
    target_local_date: string
    target_planned_start_time: string | null
    target_planned_end_time: string | null
    target_planned_minutes: number | null
    target_actual_minutes: number
    target_evidence_note: string | null
    target_source_kind: TeachingSessionDraft['source']['sourceKind']
    target_projected_occurrence_logical_id: string | null
    target_source_timetable_version_id: string | null
    target_source_timetable_slot_id: string | null
    target_source_calendar_state: TeachingSessionDraft['source']['calendarState']
    target_source_provenance: string[]
    target_supersedes_session_id: string | null
    target_allocations: Array<{
      block_id: string
      minutes: number
      canonical_plan_asset_id: string
      canonical_generation_id: string
    }>
  }): RpcResult<string>
}

export class SupabaseTeachingSessionRepository {
  async record(input: {
    workspaceId: string
    academicYearId: string
    session: TeachingSessionDraft
    allocations: TeachingSessionAllocationDraft[]
    supersedesSessionId?: string | null
  }) {
    const supabase = await createClient()
    const rpc = supabase as unknown as TeachingSessionRpcClient
    const { data, error } = await rpc.rpc('record_teaching_session', {
      target_workspace_id: input.workspaceId,
      target_academic_year_id: input.academicYearId,
      target_section_id: input.session.sectionId,
      target_discipline_id: input.session.disciplineId,
      target_local_date: input.session.localDate,
      target_planned_start_time: timeOnly(input.session.plannedStartAt),
      target_planned_end_time: timeOnly(input.session.plannedEndAt),
      target_planned_minutes: input.session.plannedMinutes,
      target_actual_minutes: input.session.actualMinutes,
      target_evidence_note: input.session.evidenceNote,
      target_source_kind: input.session.source.sourceKind,
      target_projected_occurrence_logical_id: input.session.source.projectedOccurrenceLogicalId,
      target_source_timetable_version_id: input.session.source.timetableVersionId,
      target_source_timetable_slot_id: input.session.source.timetableSlotId,
      target_source_calendar_state: input.session.source.calendarState,
      target_source_provenance: input.session.source.provenance,
      target_supersedes_session_id: input.supersedesSessionId ?? null,
      target_allocations: input.allocations.map((allocation) => ({
        block_id: allocation.blockId,
        minutes: allocation.minutes,
        canonical_plan_asset_id: allocation.canonicalPlanAssetId,
        canonical_generation_id: allocation.canonicalGenerationId,
      })),
    })

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Teaching session receipt missing')
    return data
  }

  async listBySection(workspaceId: string, academicYearId: string, sectionId: string): Promise<TeachingSessionSnapshot> {
    const supabase = await createClient()
    const read = supabase as unknown as TeachingSessionReadClient
    const sessionQuery = read
      .from('teaching_sessions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .eq('section_id', sectionId)
      .order('local_date', { ascending: false })
      .order('recorded_at', { ascending: false })

    const { data: sessionRows, error: sessionError } = await sessionQuery
    if (sessionError) throw new Error(sessionError.message)
    const sessions = (sessionRows ?? []).map(toSession)
    const sessionIds = sessions.map((session) => session.id)
    if (!sessionIds.length) return { sessions: [], allocations: [] }

    const { data: allocationRows, error: allocationError } = await read
      .from('teaching_session_allocations')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true })

    if (allocationError) throw new Error(allocationError.message)
    return { sessions, allocations: (allocationRows ?? []).map(toAllocation) }
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

function timeOnly(value: string | null) {
  if (!value) return null
  const match = /T(\d{2}:\d{2})(?::\d{2})?$/.exec(value)
  if (!match) throw new Error(`Invalid local date-time: ${value}`)
  return match[1]
}
