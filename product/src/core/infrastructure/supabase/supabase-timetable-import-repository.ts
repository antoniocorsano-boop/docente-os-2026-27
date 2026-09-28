import { createClient } from '@/lib/supabase/server'

export type TimetableImportReviewCandidate = Readonly<{
  id: string
  sourceLabel: string
  sourceFingerprint: string
  effectiveFrom: string | null
  state: string
  revision: number
  sourceScope: string
  rows: readonly TimetableImportReviewRow[]
}>

export type TimetableImportReviewRow = Readonly<{
  id: string
  rowKey: string
  weekday: number | null
  ordinal: number | null
  startTime: string | null
  endTime: string | null
  sourceClassLabel: string | null
  resolvedSectionId: string | null
  resolvedAssignmentId: string | null
  reviewState: string
  confidence: string
  evidenceRef: string | null
}>

export type TimetableImportApplyReceipt = Readonly<{
  id: string
  draftVersionId: string
  expectedDraftRevision: number
  resultingDraftRevision: number
  appliedAt: string
}>

export class SupabaseTimetableImportRepository {
  async findByFingerprint(input: {
    workspaceId: string
    academicYearId: string
    sourceFingerprint: string
  }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('timetable_import_candidates')
      .select('id,state,revision')
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .eq('source_fingerprint', input.sourceFingerprint)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  async createCandidate(input: {
    workspaceId: string
    academicYearId: string
    sourceFingerprint: string
    sourceLabel: string
    sourceRef: string
    effectiveFrom: string
    parserVersion: string
  }) {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('timetable_import_candidates')
      .insert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        source_fingerprint: input.sourceFingerprint,
        source_kind: 'INSTITUTION_DOCUMENT',
        source_label: input.sourceLabel.slice(0, 240),
        source_ref: input.sourceRef.slice(0, 1000),
        effective_from_candidate: input.effectiveFrom,
        source_is_provisional: true,
        source_scope: 'TEACHER_COMPLETE',
        state: 'DRAFT',
        parser_version: input.parserVersion.slice(0, 160),
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async insertRows(input: {
    candidateId: string
    candidateRevision: number
    rows: readonly {
      rowKey: string
      weekday: number | null
      ordinal: number | null
      startTime: string | null
      endTime: string | null
      sourceClassLabel: string
      resolvedSectionId: string | null
      resolvedAssignmentId: string | null
      confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED'
      reviewState: 'AUTO_RESOLVED' | 'REVIEW_REQUIRED'
      evidenceRef: string | null
      warnings: readonly string[]
    }[]
  }) {
    if (!input.rows.length) throw new Error('Timetable candidate requires at least one row')
    const supabase = await createClient()
    const { error } = await supabase
      .from('timetable_import_candidate_rows')
      .insert(input.rows.map((row) => ({
        candidate_id: input.candidateId,
        candidate_revision: input.candidateRevision,
        row_key: row.rowKey.slice(0, 160),
        weekday: row.weekday,
        ordinal: row.ordinal,
        start_time: row.startTime,
        end_time: row.endTime,
        source_class_label: row.sourceClassLabel.slice(0, 120),
        resolved_section_id: row.resolvedSectionId,
        resolved_assignment_id: row.resolvedAssignmentId,
        proposed_slot_kind: 'LESSON',
        confidence: row.confidence,
        review_state: row.reviewState,
        evidence_ref: row.evidenceRef,
        warnings: [...row.warnings],
      })))

    if (error) throw new Error(error.message)
  }

  async getReview(input: {
    candidateId: string
    workspaceId: string
    academicYearId: string
  }): Promise<TimetableImportReviewCandidate | null> {
    const supabase = await createClient()
    const { data: candidate, error: candidateError } = await supabase
      .from('timetable_import_candidates')
      .select('*')
      .eq('id', input.candidateId)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .maybeSingle()

    if (candidateError) throw new Error(candidateError.message)
    if (!candidate) return null

    const { data: rows, error: rowsError } = await supabase
      .from('timetable_import_candidate_rows')
      .select('*')
      .eq('candidate_id', candidate.id)
      .eq('candidate_revision', candidate.revision)
      .order('weekday')
      .order('ordinal')
      .order('row_key')

    if (rowsError) throw new Error(rowsError.message)

    return {
      id: candidate.id,
      sourceLabel: candidate.source_label,
      sourceFingerprint: candidate.source_fingerprint,
      effectiveFrom: candidate.effective_from_candidate,
      state: candidate.state,
      revision: candidate.revision,
      sourceScope: candidate.source_scope,
      rows: rows.map((row) => ({
        id: row.id,
        rowKey: row.row_key,
        weekday: row.weekday,
        ordinal: row.ordinal,
        startTime: row.start_time?.slice(0, 5) ?? null,
        endTime: row.end_time?.slice(0, 5) ?? null,
        sourceClassLabel: row.source_class_label,
        resolvedSectionId: row.resolved_section_id,
        resolvedAssignmentId: row.resolved_assignment_id,
        reviewState: row.review_state,
        confidence: row.confidence,
        evidenceRef: row.evidence_ref,
      })),
    }
  }

  async updateRow(input: {
    candidateId: string
    rowId: string
    assignmentId: string
    weekday: number
    ordinal: number
    startTime: string
    endTime: string
  }) {
    const supabase = await createClient()

    const { data: candidate, error: candidateError } = await supabase
      .from('timetable_import_candidates')
      .select('id,state,revision,workspace_id,academic_year_id')
      .eq('id', input.candidateId)
      .single()
    if (candidateError) throw new Error(candidateError.message)
    if (candidate.state !== 'DRAFT') throw new Error('Candidate is no longer editable')

    const { data: assignment, error: assignmentError } = await supabase
      .from('teaching_assignments')
      .select('id,section_id,workspace_id,academic_year_id')
      .eq('id', input.assignmentId)
      .eq('workspace_id', candidate.workspace_id)
      .eq('academic_year_id', candidate.academic_year_id)
      .single()
    if (assignmentError) throw new Error(assignmentError.message)

    const { error } = await supabase
      .from('timetable_import_candidate_rows')
      .update({
        weekday: normalizeWeekday(input.weekday),
        ordinal: normalizeOrdinal(input.ordinal),
        start_time: normalizeTime(input.startTime),
        end_time: normalizeTime(input.endTime),
        resolved_section_id: assignment.section_id,
        resolved_assignment_id: assignment.id,
        proposed_slot_kind: 'LESSON',
        confidence: 'HIGH',
        review_state: 'CONFIRMED',
        warnings: [],
      })
      .eq('id', input.rowId)
      .eq('candidate_id', candidate.id)
      .eq('candidate_revision', candidate.revision)

    if (error) throw new Error(error.message)
    await this.promoteIfComplete(candidate.id, candidate.revision)
  }

  async promoteIfComplete(candidateId: string, candidateRevision: number) {
    const supabase = await createClient()
    const { data: rows, error } = await supabase
      .from('timetable_import_candidate_rows')
      .select('weekday,ordinal,start_time,end_time,resolved_assignment_id,proposed_slot_kind,review_state')
      .eq('candidate_id', candidateId)
      .eq('candidate_revision', candidateRevision)

    if (error) throw new Error(error.message)
    if (!rows.length) return false

    const complete = rows.every((row) =>
      row.weekday !== null
      && row.ordinal !== null
      && row.start_time !== null
      && row.end_time !== null
      && row.resolved_assignment_id !== null
      && row.proposed_slot_kind === 'LESSON'
      && (row.review_state === 'AUTO_RESOLVED' || row.review_state === 'CONFIRMED'),
    )

    if (!complete) return false

    const { error: updateError } = await supabase
      .from('timetable_import_candidates')
      .update({ state: 'READY_TO_CONFIRM' })
      .eq('id', candidateId)
      .eq('revision', candidateRevision)
      .eq('state', 'DRAFT')

    if (updateError) throw new Error(updateError.message)
    return true
  }

  async readDraftRevisionToken(versionId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc(
      'read_timetable_draft_revision_token',
      { p_version_id: versionId },
    )
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Draft revision token unavailable')
    return data
  }

  async apply(input: {
    candidateId: string
    candidateRevision: number
    draftVersionId: string
    expectedDraftToken: string
    confirmationRequestId: string
  }): Promise<TimetableImportApplyReceipt> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc(
      'apply_confirmed_timetable_import_v1',
      {
        p_candidate_id: input.candidateId,
        p_candidate_revision: String(input.candidateRevision),
        p_expected_draft_version_id: input.draftVersionId,
        p_expected_draft_token: input.expectedDraftToken,
        p_confirmation_request_id: input.confirmationRequestId,
      },
    )

    if (error) throw new Error(error.message)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Timetable apply returned no receipt')
    }

    const receipt = data as Record<string, unknown>
    if (
      typeof receipt.id !== 'string'
      || typeof receipt.draft_version_id !== 'string'
      || typeof receipt.expected_draft_revision !== 'number'
      || typeof receipt.resulting_draft_revision !== 'number'
      || typeof receipt.applied_at !== 'string'
    ) {
      throw new Error('Timetable apply receipt is malformed')
    }

    return {
      id: receipt.id,
      draftVersionId: receipt.draft_version_id,
      expectedDraftRevision: receipt.expected_draft_revision,
      resultingDraftRevision: receipt.resulting_draft_revision,
      appliedAt: receipt.applied_at,
    }
  }
}

async function authenticatedUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}

function normalizeWeekday(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error('Weekday out of range')
  return value
}

function normalizeOrdinal(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 20) throw new Error('Ordinal out of range')
  return value
}

function normalizeTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid time')
  return value
}
