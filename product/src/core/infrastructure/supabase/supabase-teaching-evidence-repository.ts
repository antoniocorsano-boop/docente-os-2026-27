import type { TeachingSessionAllocationDraft, TeachingSessionDraft } from '@/core/domain/teaching-session'
import type { TeachingEvidenceReferenceDraft, TeachingObservationDraft } from '@/core/domain/teaching-evidence'
import type { TeachingSessionEvidenceWriterReceipt } from '@/core/application/record-teaching-session-with-evidence'
import { createClient } from '@/lib/supabase/server'

type DbError = { message: string }
type RpcResult<T> = Promise<{ data: T | null; error: DbError | null }>

type DbReceipt = {
  teaching_session_id: string
  observation_ids: string[]
  evidence_reference_ids: string[]
}

interface TeachingEvidenceRpcClient {
  rpc(name: 'record_teaching_session_with_evidence', args: {
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
    target_observations: Array<{
      draft_key: string
      scope: TeachingObservationDraft['scope']
      anonymous_group_key: string | null
      dimension_key: TeachingObservationDraft['dimensionKey']
      state: TeachingObservationDraft['state']
      note: string | null
      source: TeachingObservationDraft['source']
    }>
    target_evidence_references: Array<{
      kind: TeachingEvidenceReferenceDraft['kind']
      description: string
      observation_draft_keys: string[]
      knowledge_asset_id: string | null
      external_reference: string | null
    }>
  }): RpcResult<DbReceipt>
}

export class SupabaseTeachingEvidenceRepository {
  async record(input: {
    workspaceId: string
    academicYearId: string
    session: TeachingSessionDraft
    allocations: TeachingSessionAllocationDraft[]
    supersedesSessionId?: string | null
    observations: TeachingObservationDraft[]
    evidenceReferences: TeachingEvidenceReferenceDraft[]
  }): Promise<TeachingSessionEvidenceWriterReceipt> {
    const supabase = await createClient()
    const rpc = supabase as unknown as TeachingEvidenceRpcClient
    const { data, error } = await rpc.rpc('record_teaching_session_with_evidence', {
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
      target_observations: input.observations.map((observation) => ({
        draft_key: observation.draftKey,
        scope: observation.scope,
        anonymous_group_key: observation.anonymousGroupKey,
        dimension_key: observation.dimensionKey,
        state: observation.state,
        note: observation.note,
        source: observation.source,
      })),
      target_evidence_references: input.evidenceReferences.map((reference) => ({
        kind: reference.kind,
        description: reference.description,
        observation_draft_keys: reference.observationDraftKeys,
        knowledge_asset_id: reference.knowledgeAssetId,
        external_reference: reference.externalReference,
      })),
    })

    if (error) throw new Error(error.message)
    if (!data?.teaching_session_id) throw new Error('Teaching evidence receipt missing')

    return {
      teachingSessionId: data.teaching_session_id,
      observationIds: data.observation_ids ?? [],
      evidenceReferenceIds: data.evidence_reference_ids ?? [],
    }
  }
}

function timeOnly(value: string | null) {
  if (!value) return null
  const match = /T(\d{2}:\d{2})(?::\d{2})?$/.exec(value)
  if (!match) throw new Error(`Invalid local date-time: ${value}`)
  return match[1]
}
