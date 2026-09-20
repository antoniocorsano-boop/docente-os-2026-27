import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  LessonPreparationApprovalSnapshot,
  LessonPreparationContext,
} from '@/core/application/lesson-preparation-approval'
import { createClient } from '@/lib/supabase/server'

export type LessonPreparationApprovalReceipt = {
  id: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
  curriculumSourceHandoffFootprintHash: string
  curriculumBaselineFingerprint: string
  preparationFingerprint: string
  snapshot: LessonPreparationApprovalSnapshot
  approvedBy: string
  approvedAt: string
}

type Row = {
  id: string
  workspace_id: string
  academic_year_id: string
  section_id: string
  canonical_plan_asset_id: string
  canonical_generation_id: string
  block_id: string
  projection_id: string
  curriculum_source_handoff_footprint_hash: string
  curriculum_baseline_fingerprint: string
  preparation_fingerprint: string
  snapshot: unknown
  approved_by: string
  approved_at: string
}

type Database = {
  public: {
    Tables: {
      lesson_preparation_approvals: {
        Row: Row
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      approve_lesson_preparation: {
        Args: {
          target_workspace_id: string
          target_academic_year_id: string
          target_section_id: string
          target_canonical_plan_asset_id: string
          target_canonical_generation_id: string
          target_block_id: string
          target_projection_id: string
          target_curriculum_source_handoff_footprint_hash: string
          target_curriculum_baseline_fingerprint: string
          target_preparation_fingerprint: string
          target_snapshot: LessonPreparationApprovalSnapshot
        }
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export class SupabaseLessonPreparationApprovalRepository {
  async latest(context: LessonPreparationContext): Promise<LessonPreparationApprovalReceipt | null> {
    const supabase = await client()
    await requireAuthenticated(supabase)
    const { data, error } = await supabase
      .from('lesson_preparation_approvals')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .eq('academic_year_id', context.academicYearId)
      .eq('section_id', context.sectionId)
      .eq('canonical_plan_asset_id', context.canonicalPlanAssetId)
      .eq('canonical_generation_id', context.canonicalGenerationId)
      .eq('block_id', context.blockId)
      .eq('projection_id', context.projectionId)
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? toReceipt(data) : null
  }

  async approve(input: {
    context: LessonPreparationContext
    curriculumSourceHandoffFootprintHash: string
    curriculumBaselineFingerprint: string
    preparationFingerprint: string
    snapshot: LessonPreparationApprovalSnapshot
  }): Promise<LessonPreparationApprovalReceipt> {
    const supabase = await client()
    await requireAuthenticated(supabase)
    const { data, error } = await supabase.rpc('approve_lesson_preparation', {
      target_workspace_id: input.context.workspaceId,
      target_academic_year_id: input.context.academicYearId,
      target_section_id: input.context.sectionId,
      target_canonical_plan_asset_id: input.context.canonicalPlanAssetId,
      target_canonical_generation_id: input.context.canonicalGenerationId,
      target_block_id: input.context.blockId,
      target_projection_id: input.context.projectionId,
      target_curriculum_source_handoff_footprint_hash: input.curriculumSourceHandoffFootprintHash,
      target_curriculum_baseline_fingerprint: input.curriculumBaselineFingerprint,
      target_preparation_fingerprint: input.preparationFingerprint,
      target_snapshot: input.snapshot,
    })
    if (error) throw new Error(error.message)
    return toReceipt(data)
  }
}

async function client() {
  return (await createClient()) as unknown as SupabaseClient<Database>
}

async function requireAuthenticated(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) throw new Error('Authenticated user required')
}

function toReceipt(value: unknown): LessonPreparationApprovalReceipt {
  if (!value || typeof value !== 'object') throw new Error('Invalid lesson preparation approval receipt')
  const row = value as Row
  if (!row.id || !row.preparation_fingerprint || !row.approved_by || !row.approved_at) {
    throw new Error('Invalid lesson preparation approval receipt')
  }
  if (!row.snapshot || typeof row.snapshot !== 'object') {
    throw new Error('Invalid lesson preparation approval snapshot')
  }
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    sectionId: row.section_id,
    canonicalPlanAssetId: row.canonical_plan_asset_id,
    canonicalGenerationId: row.canonical_generation_id,
    blockId: row.block_id,
    projectionId: row.projection_id,
    curriculumSourceHandoffFootprintHash: row.curriculum_source_handoff_footprint_hash,
    curriculumBaselineFingerprint: row.curriculum_baseline_fingerprint,
    preparationFingerprint: row.preparation_fingerprint,
    snapshot: row.snapshot as LessonPreparationApprovalSnapshot,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
  }
}
