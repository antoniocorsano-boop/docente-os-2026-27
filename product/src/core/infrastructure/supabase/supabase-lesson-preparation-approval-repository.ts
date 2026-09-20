import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnnualPlanCurriculumBaselineSnapshot } from '@/core/domain/cml-curriculum-revalidation'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import {
  buildLessonPreparationApprovalSnapshot,
  curriculumBaselineFingerprint,
  isCurriculumBaselineReadyForLessonApproval,
  lessonPreparationFingerprint,
  type LessonPreparationApprovalSnapshot,
  type LessonPreparationContext,
} from '@/core/application/lesson-preparation-approval'
import { createAdminClient } from '@/lib/supabase/admin'
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
  checklist_snapshot: unknown
  design_fingerprint: string
  curriculum_source_handoff_footprint_hash?: string | null
  curriculum_baseline_fingerprint?: string | null
  preparation_fingerprint?: string | null
  approval_snapshot?: unknown
  confirmed_by: string
  confirmed_at: string
  created_at: string
  updated_at: string
}

type ReadDatabase = {
  public: {
    Tables: {
      lesson_preparation_receipts: {
        Row: Row
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export class SupabaseLessonPreparationApprovalRepository {
  async latest(context: LessonPreparationContext): Promise<LessonPreparationApprovalReceipt | null> {
    const supabase = (await createClient()) as unknown as SupabaseClient<ReadDatabase>
    const { data: claims, error: claimsError } = await supabase.auth.getClaims()
    if (claimsError || !claims?.claims?.sub) throw new Error('Authenticated user required')

    const { data, error } = await supabase
      .from('lesson_preparation_receipts')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .eq('academic_year_id', context.academicYearId)
      .eq('section_id', context.sectionId)
      .eq('canonical_plan_asset_id', context.canonicalPlanAssetId)
      .eq('canonical_generation_id', context.canonicalGenerationId)
      .eq('block_id', context.blockId)
      .eq('projection_id', context.projectionId)
      .order('confirmed_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)
    const current = (data ?? []).find(isExactStateRow)
    return current ? toReceipt(current) : null
  }

  async approve(input: {
    context: LessonPreparationContext
    curriculumBaseline: AnnualPlanCurriculumBaselineSnapshot
    projection: HumanTaskLessonProjection
    extensions: LessonDesignExtension[]
    approvedBy: string
  }): Promise<LessonPreparationApprovalReceipt> {
    if (!isCurriculumBaselineReadyForLessonApproval(input.curriculumBaseline)) {
      throw new Error('Current Arena curriculum baseline is not ready for lesson approval')
    }

    const snapshot = buildLessonPreparationApprovalSnapshot({
      context: input.context,
      curriculumBaseline: input.curriculumBaseline,
      projection: input.projection,
      extensions: input.extensions,
    })
    const baselineFingerprint = curriculumBaselineFingerprint(input.curriculumBaseline)
    const preparationFingerprint = lessonPreparationFingerprint(snapshot)
    const admin = createAdminClient()

    const { data: membership, error: membershipError } = await admin
      .from('workspace_memberships')
      .select('workspace_id,user_id')
      .eq('workspace_id', input.context.workspaceId)
      .eq('user_id', input.approvedBy)
      .maybeSingle()
    if (membershipError) throw new Error(membershipError.message)
    if (!membership) throw new Error('Approving teacher is not a member of the active workspace')

    const { data: section, error: sectionError } = await admin
      .from('annual_plan_sections')
      .select('id')
      .eq('id', input.context.sectionId)
      .eq('workspace_id', input.context.workspaceId)
      .eq('academic_year_id', input.context.academicYearId)
      .maybeSingle()
    if (sectionError) throw new Error(sectionError.message)
    if (!section) throw new Error('Lesson preparation section is outside the active workspace/year')

    const { data: asset, error: assetError } = await admin
      .from('knowledge_assets')
      .select('id,workspace_id,academic_year_id')
      .eq('id', input.context.canonicalPlanAssetId)
      .maybeSingle()
    if (assetError) throw new Error(assetError.message)
    if (!asset
      || asset.workspace_id !== input.context.workspaceId
      || (asset.academic_year_id && asset.academic_year_id !== input.context.academicYearId)) {
      throw new Error('Lesson preparation canonical plan asset is outside context')
    }

    const { data: generation, error: generationError } = await admin
      .from('knowledge_processing_generations')
      .select('id,asset_id,workspace_id,status')
      .eq('id', input.context.canonicalGenerationId)
      .maybeSingle()
    if (generationError) throw new Error(generationError.message)
    if (!generation
      || generation.status !== 'SUCCEEDED'
      || generation.asset_id !== input.context.canonicalPlanAssetId
      || generation.workspace_id !== input.context.workspaceId) {
      throw new Error('Lesson preparation canonical generation is not current and successful')
    }

    const { data: currentCurriculum, error: curriculumError } = await admin
      .from('annual_plan_curriculum_adoptions')
      .select('source_handoff_footprint_hash,curriculum_state,alignment_authority,requires_revalidation_on_approval,curriculum_coverage,curricular_context')
      .eq('section_id', input.context.sectionId)
      .eq('discipline_ref', 'technology')
      .order('accepted_at', { ascending: false })
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (curriculumError) throw new Error(curriculumError.message)
    if (!currentCurriculum) throw new Error('Current Arena curriculum baseline is required before lesson approval')
    if (currentCurriculum.source_handoff_footprint_hash !== input.curriculumBaseline.sourceHandoffFootprintHash) {
      throw new Error('Arena curriculum baseline changed; reload and revalidate before approval')
    }
    if (currentCurriculum.curriculum_state !== 'APPROVED'
      || currentCurriculum.alignment_authority !== 'APPROVED_INSTITUTIONAL'
      || currentCurriculum.requires_revalidation_on_approval !== false
      || !isPlanningComplete(currentCurriculum.curricular_context)
      || !isCoverageSatisfied(currentCurriculum.curriculum_coverage)) {
      throw new Error('Current Arena curriculum baseline requires approval or teacher revalidation before lesson approval')
    }

    const row = {
      workspace_id: input.context.workspaceId,
      academic_year_id: input.context.academicYearId,
      section_id: input.context.sectionId,
      canonical_plan_asset_id: input.context.canonicalPlanAssetId,
      canonical_generation_id: input.context.canonicalGenerationId,
      block_id: input.context.blockId,
      projection_id: input.context.projectionId,
      checklist_snapshot: [
        { key: 'curriculum', status: 'CONFIRMED', fingerprint: baselineFingerprint },
        { key: 'projection', status: 'CONFIRMED', projectionId: input.context.projectionId },
        {
          key: 'accepted-design',
          status: 'CONFIRMED',
          acceptedExtensionCount: snapshot.lesson.acceptedExtensions.length,
        },
      ],
      design_fingerprint: preparationFingerprint,
      curriculum_source_handoff_footprint_hash: input.curriculumBaseline.sourceHandoffFootprintHash,
      curriculum_baseline_fingerprint: baselineFingerprint,
      preparation_fingerprint: preparationFingerprint,
      approval_snapshot: snapshot,
      confirmed_by: input.approvedBy,
    }

    const { data: inserted, error: insertError } = await admin
      .from('lesson_preparation_receipts')
      .insert(row)
      .select('*')
      .maybeSingle()

    if (!insertError && inserted) return toReceipt(inserted as unknown as Row)
    if (insertError && insertError.code !== '23505') throw new Error(insertError.message)

    const { data: existing, error: existingError } = await admin
      .from('lesson_preparation_receipts')
      .select('*')
      .eq('workspace_id', input.context.workspaceId)
      .eq('academic_year_id', input.context.academicYearId)
      .eq('section_id', input.context.sectionId)
      .eq('canonical_generation_id', input.context.canonicalGenerationId)
      .eq('block_id', input.context.blockId)
      .eq('projection_id', input.context.projectionId)
      .eq('preparation_fingerprint', preparationFingerprint)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existing) throw new Error('Lesson preparation approval receipt was not persisted')

    const receipt = toReceipt(existing as unknown as Row)
    if (receipt.curriculumBaselineFingerprint !== baselineFingerprint
      || receipt.curriculumSourceHandoffFootprintHash !== input.curriculumBaseline.sourceHandoffFootprintHash) {
      throw new Error('Idempotency conflict for lesson preparation approval')
    }
    return receipt
  }
}

function isExactStateRow(row: Row): row is Row & {
  curriculum_source_handoff_footprint_hash: string
  curriculum_baseline_fingerprint: string
  preparation_fingerprint: string
  approval_snapshot: LessonPreparationApprovalSnapshot
} {
  return typeof row.curriculum_source_handoff_footprint_hash === 'string'
    && typeof row.curriculum_baseline_fingerprint === 'string'
    && typeof row.preparation_fingerprint === 'string'
    && Boolean(row.approval_snapshot && typeof row.approval_snapshot === 'object')
}

function isPlanningComplete(value: unknown) {
  return Boolean(value && typeof value === 'object' && (value as { completeForPlanning?: unknown }).completeForPlanning === true)
}

function isCoverageSatisfied(value: unknown) {
  return Boolean(value && typeof value === 'object' && (value as { status?: unknown }).status === 'SATISFIED')
}

function toReceipt(row: Row): LessonPreparationApprovalReceipt {
  if (!isExactStateRow(row) || !row.id || !row.confirmed_by || !row.confirmed_at) {
    throw new Error('Invalid lesson preparation approval receipt')
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
    snapshot: row.approval_snapshot,
    approvedBy: row.confirmed_by,
    approvedAt: row.confirmed_at,
  }
}
