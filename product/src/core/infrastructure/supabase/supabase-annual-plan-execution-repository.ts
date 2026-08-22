import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import {
  asAnnualPlanBlockStatus,
  asAnnualPlanGrade,
  asAnnualPlanSectionStatus,
  type AnnualPlanBlockProgress,
  type AnnualPlanBlockStatus,
  type AnnualPlanExecutionSnapshot,
  type AnnualPlanGrade,
  type AnnualPlanSection,
  type AnnualPlanSectionStatus,
} from '@/core/domain/annual-plan-execution'

type SectionRow = Database['public']['Tables']['annual_plan_sections']['Row']
type ProgressRow = Database['public']['Tables']['annual_plan_block_progress']['Row']

type DefaultSectionInput = {
  grade: AnnualPlanGrade
  sectionCode: string
  status: AnnualPlanSectionStatus
  sourceNote: string
}

type SaveProgressInput = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  status: AnnualPlanBlockStatus
  executedOn: string | null
  evidenceNote: string | null
}

type AnnualPlanSnapshotPayload = {
  sections: SectionRow[]
  progress: ProgressRow[]
}

type AnnualPlanSnapshotRpcClient = {
  rpc: (
    name: 'annual_plan_execution_snapshot',
    args: { target_workspace_id: string; target_academic_year_id: string },
  ) => Promise<{ data: AnnualPlanSnapshotPayload | null; error: { message: string } | null }>
}

function toSection(row: SectionRow): AnnualPlanSection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    grade: asAnnualPlanGrade(row.grade),
    sectionCode: row.section_code,
    status: asAnnualPlanSectionStatus(row.status),
    sourceNote: row.source_note,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toProgress(row: ProgressRow): AnnualPlanBlockProgress {
  return {
    id: row.id,
    sectionId: row.section_id,
    canonicalPlanAssetId: row.canonical_plan_asset_id,
    canonicalGenerationId: row.canonical_generation_id,
    blockId: row.block_id,
    status: asAnnualPlanBlockStatus(row.status),
    executedOn: row.executed_on,
    evidenceNote: row.evidence_note,
    updatedAt: row.updated_at,
  }
}

export class SupabaseAnnualPlanExecutionRepository {
  async list(workspaceId: string, academicYearId: string): Promise<AnnualPlanExecutionSnapshot> {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as AnnualPlanSnapshotRpcClient).rpc(
      'annual_plan_execution_snapshot',
      { target_workspace_id: workspaceId, target_academic_year_id: academicYearId },
    )

    if (error) throw new Error(error.message)
    return {
      sections: (data?.sections ?? []).map(toSection),
      progress: (data?.progress ?? []).map(toProgress),
    }
  }

  async ensureDefaultSections(
    workspaceId: string,
    academicYearId: string,
    defaults: DefaultSectionInput[],
  ): Promise<void> {
    if (!defaults.length) return
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const rows: Database['public']['Tables']['annual_plan_sections']['Insert'][] = defaults.map((item) => ({
      workspace_id: workspaceId,
      academic_year_id: academicYearId,
      grade: item.grade,
      section_code: normalizeSectionCode(item.sectionCode),
      status: item.status,
      source_note: item.sourceNote,
      created_by: userId,
    }))

    const { error } = await supabase
      .from('annual_plan_sections')
      .upsert(rows, {
        onConflict: 'workspace_id,academic_year_id,grade,section_code',
        ignoreDuplicates: true,
      })

    if (error) throw new Error(error.message)
  }

  async addSection(
    workspaceId: string,
    academicYearId: string,
    grade: AnnualPlanGrade,
    sectionCode: string,
  ): Promise<AnnualPlanSection> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('annual_plan_sections')
      .insert({
        workspace_id: workspaceId,
        academic_year_id: academicYearId,
        grade,
        section_code: normalizeSectionCode(sectionCode),
        status: 'DA_CONFERMARE',
        source_note: 'Sezione inserita nel piano annuale; assegnazione da validare',
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toSection(data)
  }

  async setSectionStatus(
    workspaceId: string,
    academicYearId: string,
    sectionId: string,
    status: AnnualPlanSectionStatus,
  ): Promise<AnnualPlanSection> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('annual_plan_sections')
      .update({ status })
      .eq('id', sectionId)
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toSection(data)
  }

  async saveProgress(input: SaveProgressInput): Promise<AnnualPlanBlockProgress> {
    const supabase = await createClient()
    await assertSectionContext(supabase, input.sectionId, input.workspaceId, input.academicYearId)
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('annual_plan_block_progress')
      .upsert({
        section_id: input.sectionId,
        canonical_plan_asset_id: input.canonicalPlanAssetId,
        canonical_generation_id: input.canonicalGenerationId,
        block_id: input.blockId,
        status: input.status,
        executed_on: input.executedOn,
        evidence_note: input.evidenceNote,
        updated_by: userId,
      }, { onConflict: 'section_id,canonical_generation_id,block_id' })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toProgress(data)
  }

  async resetProgress(
    workspaceId: string,
    academicYearId: string,
    sectionId: string,
    canonicalGenerationId: string,
  ): Promise<void> {
    const supabase = await createClient()
    await assertSectionContext(supabase, sectionId, workspaceId, academicYearId)
    const { error } = await supabase
      .from('annual_plan_block_progress')
      .delete()
      .eq('section_id', sectionId)
      .eq('canonical_generation_id', canonicalGenerationId)

    if (error) throw new Error(error.message)
  }
}

async function authenticatedUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}

async function assertSectionContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sectionId: string,
  workspaceId: string,
  academicYearId: string,
) {
  const { data, error } = await supabase
    .from('annual_plan_sections')
    .select('id')
    .eq('id', sectionId)
    .eq('workspace_id', workspaceId)
    .eq('academic_year_id', academicYearId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Annual plan section is outside the active workspace/year')
}

function normalizeSectionCode(value: string) {
  const code = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 4)
  if (!code) throw new Error('Section code required')
  return code
}
