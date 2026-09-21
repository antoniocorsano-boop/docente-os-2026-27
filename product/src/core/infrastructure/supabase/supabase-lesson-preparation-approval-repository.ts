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

type LessonApprovalRpcClient = {
  rpc: (
    name: 'persist_eco02_lesson_preparation_receipt',
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>
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
    const supabase = await createClient()
    const { data: claims, error: claimsError } = await supabase.auth.getClaims()
    const actorId = claims?.claims?.sub
    if (claimsError || !actorId) throw new Error('Authenticated user required')
    if (actorId !== input.approvedBy) throw new Error('Lesson approval actor does not match authenticated user')

    const rpc = supabase as unknown as LessonApprovalRpcClient
    const { data, error } = await rpc.rpc('persist_eco02_lesson_preparation_receipt', {
      target_workspace_id: input.context.workspaceId,
      target_academic_year_id: input.context.academicYearId,
      target_section_id: input.context.sectionId,
      target_canonical_plan_asset_id: input.context.canonicalPlanAssetId,
      target_canonical_generation_id: input.context.canonicalGenerationId,
      target_block_id: input.context.blockId,
      target_projection_id: input.context.projectionId,
      target_curriculum_source_handoff_footprint_hash: input.curriculumBaseline.sourceHandoffFootprintHash,
      target_curriculum_baseline_fingerprint: baselineFingerprint,
      target_preparation_fingerprint: preparationFingerprint,
      target_approval_snapshot: snapshot,
    })
    if (error) throw new Error(error.message)
    return toReceipt(data as Row)

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

function isPersistedCurriculumReadyForLessonApproval(value: {
  curriculum_state: unknown
  alignment_authority: unknown
  requires_revalidation_on_approval: unknown
  curriculum_coverage: unknown
  curricular_context: unknown
}) {
  if (!isPlanningComplete(value.curricular_context)
    || !isTransitionUsableForPlanning(value.curricular_context)
    || !isCoverageSatisfied(value.curriculum_coverage)
    || coverageAuthority(value.curriculum_coverage) !== value.alignment_authority
    || coverageRequiresRevalidation(value.curriculum_coverage) !== value.requires_revalidation_on_approval) {
    return false
  }

  const approvedInstitutional = value.curriculum_state === 'APPROVED'
    && value.alignment_authority === 'APPROVED_INSTITUTIONAL'
    && value.requires_revalidation_on_approval === false

  const provisionalPlanningBaseline = value.curriculum_state === 'PROVISIONAL_COMPLETE'
    && value.alignment_authority === 'PROVISIONAL_BASELINE'
    && value.requires_revalidation_on_approval === true

  return approvedInstitutional || provisionalPlanningBaseline
}

function isTransitionUsableForPlanning(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const transition = (value as { transitionRemodulation?: unknown }).transitionRemodulation
  return Boolean(
    transition
    && typeof transition === 'object'
    && (transition as { usableForPlanning?: unknown }).usableForPlanning === true,
  )
}

function coverageAuthority(value: unknown) {
  return value && typeof value === 'object'
    ? (value as { authority?: unknown }).authority
    : undefined
}

function coverageRequiresRevalidation(value: unknown) {
  return value && typeof value === 'object'
    ? (value as { requiresRevalidationOnApproval?: unknown }).requiresRevalidationOnApproval
    : undefined
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
