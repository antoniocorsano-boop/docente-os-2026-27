import type { SupabaseClient } from '@supabase/supabase-js'
import type { LessonPreparationReceipt } from '@/core/domain/lesson-preparation'
import { createClient } from '@/lib/supabase/server'
import type { LessonDesignContext } from './supabase-lesson-design-repository'

type ReceiptRow = {
  id: string
  workspace_id: string
  academic_year_id: string
  section_id: string
  canonical_plan_asset_id: string
  canonical_generation_id: string
  block_id: string
  projection_id: string
  checklist_snapshot: unknown
  design_fingerprint: string
  confirmed_by: string
  confirmed_at: string
  created_at: string
  updated_at: string
}

type PreparationDatabase = {
  public: {
    Tables: {
      lesson_preparation_receipts: {
        Row: ReceiptRow
        Insert: {
          id?: string
          workspace_id: string
          academic_year_id: string
          section_id: string
          canonical_plan_asset_id: string
          canonical_generation_id: string
          block_id: string
          projection_id: string
          checklist_snapshot: string[]
          design_fingerprint: string
          confirmed_by: string
          confirmed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<PreparationDatabase['public']['Tables']['lesson_preparation_receipts']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export class SupabaseLessonPreparationRepository {
  async get(context: LessonDesignContext): Promise<LessonPreparationReceipt | null> {
    const supabase = await preparationClient()
    await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('lesson_preparation_receipts')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .eq('academic_year_id', context.academicYearId)
      .eq('section_id', context.sectionId)
      .eq('canonical_generation_id', context.canonicalGenerationId)
      .eq('block_id', context.blockId)
      .eq('projection_id', context.projectionId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? toReceipt(data) : null
  }

  async confirm(context: LessonDesignContext, input: { checklistSnapshot: string[]; designFingerprint: string }) {
    const supabase = await preparationClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('lesson_preparation_receipts')
      .upsert({
        workspace_id: context.workspaceId,
        academic_year_id: context.academicYearId,
        section_id: context.sectionId,
        canonical_plan_asset_id: context.canonicalPlanAssetId,
        canonical_generation_id: context.canonicalGenerationId,
        block_id: context.blockId,
        projection_id: context.projectionId,
        checklist_snapshot: input.checklistSnapshot,
        design_fingerprint: input.designFingerprint,
        confirmed_by: userId,
      }, {
        onConflict: 'workspace_id,academic_year_id,section_id,canonical_generation_id,block_id,projection_id',
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toReceipt(data)
  }

  async clear(context: LessonDesignContext) {
    const supabase = await preparationClient()
    await authenticatedUserId(supabase)
    const { error } = await supabase
      .from('lesson_preparation_receipts')
      .delete()
      .eq('workspace_id', context.workspaceId)
      .eq('academic_year_id', context.academicYearId)
      .eq('section_id', context.sectionId)
      .eq('canonical_generation_id', context.canonicalGenerationId)
      .eq('block_id', context.blockId)
      .eq('projection_id', context.projectionId)
    if (error) throw new Error(error.message)
  }
}

async function preparationClient() {
  return (await createClient()) as unknown as SupabaseClient<PreparationDatabase>
}

async function authenticatedUserId(supabase: SupabaseClient<PreparationDatabase>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}

function toReceipt(row: ReceiptRow): LessonPreparationReceipt {
  const checklist = Array.isArray(row.checklist_snapshot)
    ? row.checklist_snapshot.filter((item): item is string => typeof item === 'string')
    : []
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    sectionId: row.section_id,
    canonicalPlanAssetId: row.canonical_plan_asset_id,
    canonicalGenerationId: row.canonical_generation_id,
    blockId: row.block_id,
    projectionId: row.projection_id,
    checklistSnapshot: checklist,
    designFingerprint: row.design_fingerprint,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    updatedAt: row.updated_at,
  }
}
