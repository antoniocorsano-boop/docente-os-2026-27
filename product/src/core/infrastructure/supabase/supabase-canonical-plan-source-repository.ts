import { createClient } from '@/lib/supabase/server'

export type CanonicalPlanRuntimeSource = {
  code: string
  assetId: string
  generationId: string
}

export type CanonicalPlanSourceLookup = {
  workspaceId: string
  academicYearId: string
  code: string
}

export class SupabaseCanonicalPlanSourceRepository {
  async resolve(input: CanonicalPlanSourceLookup): Promise<CanonicalPlanRuntimeSource | null> {
    const code = input.code.trim().toUpperCase()
    if (!code) throw new Error('Canonical plan source code is required')

    const supabase = await createClient()
    const { data: binding, error: bindingError } = await supabase
      .from('canonical_plan_runtime_bindings')
      .select('asset_id,generation_id')
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .eq('canonical_plan_code', code)
      .maybeSingle()

    if (bindingError) throw new Error(bindingError.message)
    if (!binding) return null

    const { data: asset, error: assetError } = await supabase
      .from('knowledge_assets')
      .select('id,workspace_id,academic_year_id')
      .eq('id', binding.asset_id)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .maybeSingle()

    if (assetError) throw new Error(assetError.message)
    if (!asset) return null

    const { data: generation, error: generationError } = await supabase
      .from('knowledge_processing_generations')
      .select('id,asset_id,workspace_id,status')
      .eq('id', binding.generation_id)
      .eq('asset_id', asset.id)
      .eq('workspace_id', input.workspaceId)
      .eq('status', 'SUCCEEDED')
      .maybeSingle()

    if (generationError) throw new Error(generationError.message)
    if (!generation) return null

    return {
      code,
      assetId: asset.id,
      generationId: generation.id,
    }
  }
}
