import { validateCurriculumContextForClassV1, type CurriculumContextForClassV1 } from '@/core/domain/cml-local-handoff-v2'
import type {
  CurriculumFeedbackCategory,
  CurriculumFeedbackEnvelopeV1,
  CurriculumFeedbackSubmission,
} from '@/core/domain/cml-curriculum-feedback'
import type { CmlCanonicalRef } from '@/core/domain/cml-local-handoff'
import { createClient } from '@/lib/supabase/server'

export type CurriculumFeedbackRelayBaseline = {
  adoptionReceiptId: string
  curricularContextId: string
  disciplineRef: string
  curriculumVersionRef: CmlCanonicalRef
  sourceHandoffFootprintHash: string
  sourceFrameworkMessageId: string
  acceptedAt: string
  curricularContext: CurriculumContextForClassV1
}

export type CurriculumFeedbackOutboxReceipt = {
  id: string
  feedbackId: string
  submittedAt: string
}

type QueryError = { message: string }
type FeedbackOutboxRow = {
  id: string
  feedback_id: string
  submitted_at: string
}
type FeedbackOutboxClient = {
  from: (table: 'cml_curriculum_feedback_outbox') => {
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: FeedbackOutboxRow | null; error: QueryError | null }>
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Invalid curriculum feedback baseline: ${field}`)
  return value
}

function canonicalRef(value: unknown): CmlCanonicalRef {
  if (!isRecord(value)) throw new Error('Invalid curriculum feedback baseline: curriculumVersionRef')
  const namespace = requiredString(value.namespace, 'curriculumVersionRef.namespace')
  const entityType = requiredString(value.entityType, 'curriculumVersionRef.entityType')
  const entityId = requiredString(value.entityId, 'curriculumVersionRef.entityId')
  const versionId = value.versionId === undefined ? undefined : requiredString(value.versionId, 'curriculumVersionRef.versionId')
  return { namespace, entityType, entityId, ...(versionId ? { versionId } : {}) }
}

export class SupabaseCurriculumFeedbackRelayRepository {
  async currentBaseline(input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
  }): Promise<CurriculumFeedbackRelayBaseline | null> {
    const supabase = await createClient()
    const { data: section, error: sectionError } = await supabase
      .from('annual_plan_sections')
      .select('id')
      .eq('id', input.sectionId)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .maybeSingle()
    if (sectionError) throw new Error(sectionError.message)
    if (!section) throw new Error('La sezione non appartiene allo spazio e anno scolastico attivi')

    const { data, error } = await supabase
      .from('annual_plan_curriculum_adoptions')
      .select('id,curricular_context_id,discipline_ref,curriculum_version_ref,source_handoff_footprint_hash,source_framework_message_id,accepted_at,curricular_context')
      .eq('section_id', input.sectionId)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null

    const validation = validateCurriculumContextForClassV1(data.curricular_context)
    if (!validation.valid) throw new Error(`Il contesto curricolare salvato non è valido: ${validation.errors.join('; ')}`)

    return {
      adoptionReceiptId: requiredString(data.id, 'id'),
      curricularContextId: requiredString(data.curricular_context_id, 'curricularContextId'),
      disciplineRef: requiredString(data.discipline_ref, 'disciplineRef'),
      curriculumVersionRef: canonicalRef(data.curriculum_version_ref),
      sourceHandoffFootprintHash: requiredString(data.source_handoff_footprint_hash, 'sourceHandoffFootprintHash'),
      sourceFrameworkMessageId: requiredString(data.source_framework_message_id, 'sourceFrameworkMessageId'),
      acceptedAt: requiredString(data.accepted_at, 'acceptedAt'),
      curricularContext: validation.value,
    }
  }

  async persistSubmission(input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
    baseline: CurriculumFeedbackRelayBaseline
    category: CurriculumFeedbackCategory
    submission: CurriculumFeedbackSubmission
  }): Promise<CurriculumFeedbackOutboxReceipt> {
    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) throw new Error('Utente autenticato richiesto')

    const envelope: CurriculumFeedbackEnvelopeV1 = input.submission.envelope
    const outbox = supabase as unknown as FeedbackOutboxClient
    const { data, error } = await outbox
      .from('cml_curriculum_feedback_outbox')
      .insert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        section_id: input.sectionId,
        feedback_id: envelope.messageId,
        curricular_context_id: input.baseline.curricularContextId,
        curriculum_version_ref: envelope.payload.curriculumVersionRef,
        source_handoff_footprint_hash: input.baseline.sourceHandoffFootprintHash,
        source_framework_message_id: input.baseline.sourceFrameworkMessageId,
        category: input.category,
        envelope,
        idempotency_key: input.submission.idempotencyKey,
        submitted_by: userId,
        submitted_at: envelope.emittedAt,
      })
      .select('id,feedback_id,submitted_at')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('La ricevuta locale del feedback non è stata salvata')
    return { id: data.id, feedbackId: data.feedback_id, submittedAt: data.submitted_at }
  }
}
