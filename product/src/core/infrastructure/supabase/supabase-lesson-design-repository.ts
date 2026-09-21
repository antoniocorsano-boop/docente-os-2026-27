import type { SupabaseClient } from '@supabase/supabase-js'
import {
  validateLessonDesignExtensionDraft,
  validateLessonDesignExtensionRevision,
  type LessonDesignDecision,
  type LessonDesignExtension,
  type LessonDesignExtensionDraft,
  type LessonDesignExtensionRevision,
} from '@/core/domain/lesson-design-extension'
import { createClient } from '@/lib/supabase/server'

type LessonDesignExtensionRow = {
  id: string
  workspace_id: string
  academic_year_id: string
  section_id: string
  canonical_plan_asset_id: string
  canonical_generation_id: string
  block_id: string
  projection_id: string
  kind: string
  status: string
  insertion_position: string
  anchor_step_id: string | null
  title: string
  body: string
  cue: string | null
  minutes: number | null
  source_kind: string
  source_ref: string | null
  source_label: string | null
  payload: Record<string, unknown>
  revision: number
  decision_history: unknown
  modified_by: string | null
  modified_at: string | null
  accepted_by: string | null
  accepted_at: string | null
  dismissed_by: string | null
  dismissed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

type LessonDesignDatabase = {
  public: {
    Tables: {
      lesson_design_extensions: {
        Row: LessonDesignExtensionRow
        Insert: Omit<LessonDesignExtensionRow, 'id' | 'revision' | 'decision_history' | 'modified_by' | 'modified_at' | 'accepted_by' | 'accepted_at' | 'dismissed_by' | 'dismissed_at' | 'created_at' | 'updated_at'> & {
          id?: string
          revision?: number
          decision_history?: unknown
          modified_by?: string | null
          modified_at?: string | null
          accepted_by?: string | null
          accepted_at?: string | null
          dismissed_by?: string | null
          dismissed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_lesson_design_extension: { Args: { target_extension_id: string }; Returns: undefined }
      revise_lesson_design_extension: { Args: { target_extension_id: string; new_insertion_position: string; new_anchor_step_id: string | null; new_title: string; new_body: string; new_cue: string | null; new_minutes: number | null }; Returns: undefined }
      dismiss_lesson_design_extension: { Args: { target_extension_id: string }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type LessonDesignInsert = LessonDesignDatabase['public']['Tables']['lesson_design_extensions']['Insert']

export type LessonDesignContext = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
}

export class SupabaseLessonDesignRepository {
  async list(context: LessonDesignContext): Promise<LessonDesignExtension[]> {
    const supabase = await lessonDesignClient()
    await authenticatedUserId(supabase)
    const { data, error } = await supabase.from('lesson_design_extensions').select('*').eq('workspace_id', context.workspaceId).eq('academic_year_id', context.academicYearId).eq('section_id', context.sectionId).eq('canonical_plan_asset_id', context.canonicalPlanAssetId).eq('canonical_generation_id', context.canonicalGenerationId).eq('block_id', context.blockId).eq('projection_id', context.projectionId).order('created_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toExtension)
  }

  async addProposal(context: LessonDesignContext, input: LessonDesignExtensionDraft): Promise<LessonDesignExtension> {
    const draft = validateLessonDesignExtensionDraft(input)
    assertDraftContext(context, draft)
    const supabase = await lessonDesignClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase.from('lesson_design_extensions').insert(toProposalInsert(context, draft, userId)).select('*').single()
    if (error) throw new Error(error.message)
    return toExtension(data)
  }

  async addToolProposalOnce(context: LessonDesignContext, input: LessonDesignExtensionDraft, dedupeKey: string): Promise<LessonDesignExtension> {
    const draft = validateLessonDesignExtensionDraft(input)
    assertDraftContext(context, draft)
    const normalizedDedupeKey = dedupeKey.trim()
    if (!normalizedDedupeKey || draft.payload.dedupeKey !== normalizedDedupeKey) throw new Error('Lesson design tool proposal requires a matching dedupe key')
    const supabase = await lessonDesignClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase.from('lesson_design_extensions').insert(toProposalInsert(context, draft, userId)).select('*').single()
    if (!error) return toExtension(data)
    if (error.code !== '23505') throw new Error(error.message)
    const { data: existing, error: existingError } = await supabase.from('lesson_design_extensions').select('*').eq('workspace_id', context.workspaceId).eq('academic_year_id', context.academicYearId).eq('section_id', context.sectionId).eq('canonical_plan_asset_id', context.canonicalPlanAssetId).eq('canonical_generation_id', context.canonicalGenerationId).eq('block_id', context.blockId).eq('projection_id', context.projectionId).contains('payload', { dedupeKey: normalizedDedupeKey }).neq('status', 'DISMISSED').limit(1).maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existing) throw new Error('Lesson design proposal uniqueness conflict could not be resolved')
    return toExtension(existing)
  }

  async accept(context: LessonDesignContext, extensionId: string): Promise<void> {
    const supabase = await lessonDesignClient(); await authenticatedUserId(supabase); await requireExtensionInContext(supabase, context, extensionId)
    const { error } = await supabase.rpc('accept_lesson_design_extension', { target_extension_id: extensionId }); if (error) throw new Error(error.message)
  }

  async revise(context: LessonDesignContext, extensionId: string, input: LessonDesignExtensionRevision): Promise<void> {
    const revision = validateLessonDesignExtensionRevision(input)
    const supabase = await lessonDesignClient(); await authenticatedUserId(supabase); await requireExtensionInContext(supabase, context, extensionId)
    const { error } = await supabase.rpc('revise_lesson_design_extension', { target_extension_id: extensionId, new_insertion_position: revision.insertionPosition, new_anchor_step_id: revision.anchorStepId, new_title: revision.title, new_body: revision.body, new_cue: revision.cue, new_minutes: revision.minutes }); if (error) throw new Error(error.message)
  }

  async dismiss(context: LessonDesignContext, extensionId: string): Promise<void> {
    const supabase = await lessonDesignClient(); await authenticatedUserId(supabase); await requireExtensionInContext(supabase, context, extensionId)
    const { error } = await supabase.rpc('dismiss_lesson_design_extension', { target_extension_id: extensionId }); if (error) throw new Error(error.message)
  }
}

function toProposalInsert(context: LessonDesignContext, draft: LessonDesignExtensionDraft, userId: string): LessonDesignInsert {
  return { workspace_id: context.workspaceId, academic_year_id: context.academicYearId, section_id: context.sectionId, canonical_plan_asset_id: context.canonicalPlanAssetId, canonical_generation_id: context.canonicalGenerationId, block_id: context.blockId, projection_id: context.projectionId, kind: draft.kind, status: 'PROPOSED', insertion_position: draft.insertionPosition, anchor_step_id: draft.anchorStepId, title: draft.title, body: draft.body, cue: draft.cue, minutes: draft.minutes, source_kind: draft.sourceKind, source_ref: draft.sourceRef, source_label: draft.sourceLabel, payload: draft.payload, created_by: userId }
}

function assertDraftContext(context: LessonDesignContext, draft: LessonDesignExtensionDraft) {
  if (draft.sectionId !== context.sectionId || draft.canonicalPlanAssetId !== context.canonicalPlanAssetId || draft.canonicalGenerationId !== context.canonicalGenerationId || draft.blockId !== context.blockId || draft.projectionId !== context.projectionId) throw new Error('Lesson design proposal is outside the active lesson context')
}

async function requireExtensionInContext(supabase: SupabaseClient<LessonDesignDatabase>, context: LessonDesignContext, extensionId: string) {
  const { data, error } = await supabase.from('lesson_design_extensions').select('id').eq('id', extensionId).eq('workspace_id', context.workspaceId).eq('academic_year_id', context.academicYearId).eq('section_id', context.sectionId).eq('canonical_plan_asset_id', context.canonicalPlanAssetId).eq('canonical_generation_id', context.canonicalGenerationId).eq('block_id', context.blockId).eq('projection_id', context.projectionId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Lesson design extension is outside the active lesson context')
}

async function lessonDesignClient() { return (await createClient()) as unknown as SupabaseClient<LessonDesignDatabase> }
async function authenticatedUserId(supabase: SupabaseClient<LessonDesignDatabase>) { const { data, error } = await supabase.auth.getClaims(); const userId = data?.claims?.sub; if (error || !userId) throw new Error('Authenticated user required'); return userId }

function toExtension(row: LessonDesignExtensionRow): LessonDesignExtension {
  if (!['HOOK_QUOTE', 'HOOK_EVENT', 'HOOK_VIDEO', 'HOOK_QUESTION', 'TEACHER_RESOURCE', 'STUDENT_RESOURCE', 'FORMATIVE_CHECK', 'TEACHING_ADJUSTMENT'].includes(row.kind)) throw new Error('Unsupported lesson design extension kind in storage')
  if (!['PROPOSED', 'MODIFIED', 'ACCEPTED', 'DISMISSED'].includes(row.status)) throw new Error('Unsupported lesson design extension status in storage')
  if (!['START', 'BEFORE_STEP', 'AFTER_STEP', 'END'].includes(row.insertion_position)) throw new Error('Unsupported lesson design insertion position in storage')
  if (!['EDITORIAL_KNOWLEDGE', 'KNOWLEDGE', 'WEB', 'AI_TOOL', 'TEACHER'].includes(row.source_kind)) throw new Error('Unsupported lesson design source kind in storage')
  if (!Number.isInteger(row.revision) || row.revision < 1) throw new Error('Unsupported lesson design revision in storage')
  return { id: row.id, workspaceId: row.workspace_id, academicYearId: row.academic_year_id, sectionId: row.section_id, canonicalPlanAssetId: row.canonical_plan_asset_id, canonicalGenerationId: row.canonical_generation_id, blockId: row.block_id, projectionId: row.projection_id, kind: row.kind as LessonDesignExtension['kind'], status: row.status as LessonDesignExtension['status'], insertionPosition: row.insertion_position as LessonDesignExtension['insertionPosition'], anchorStepId: row.anchor_step_id, title: row.title, body: row.body, cue: row.cue, minutes: row.minutes, sourceKind: row.source_kind as LessonDesignExtension['sourceKind'], sourceRef: row.source_ref, sourceLabel: row.source_label, payload: row.payload ?? {}, revision: row.revision, decisionHistory: toDecisionHistory(row.decision_history), modifiedBy: row.modified_by, modifiedAt: row.modified_at, acceptedBy: row.accepted_by, acceptedAt: row.accepted_at, dismissedBy: row.dismissed_by, dismissedAt: row.dismissed_at, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at }
}

function toDecisionHistory(value: unknown): LessonDesignDecision[] {
  if (!Array.isArray(value)) throw new Error('Unsupported lesson design decision history in storage')
  return value.map((entry) => { if (!entry || typeof entry !== 'object') throw new Error('Invalid lesson design decision in storage'); const candidate = entry as Record<string, unknown>; if (!['MODIFIED', 'ACCEPTED', 'DISMISSED'].includes(String(candidate.action))) throw new Error('Invalid lesson design decision action in storage'); if (typeof candidate.actorId !== 'string' || !candidate.actorId) throw new Error('Invalid lesson design decision actor in storage'); if (typeof candidate.at !== 'string' || !candidate.at) throw new Error('Invalid lesson design decision timestamp in storage'); if (!Number.isInteger(candidate.revision) || Number(candidate.revision) < 1) throw new Error('Invalid lesson design decision revision in storage'); return { action: candidate.action as LessonDesignDecision['action'], actorId: candidate.actorId, at: candidate.at, revision: Number(candidate.revision) } })
}
