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
    const code = input.code.trim()
    if (!code) throw new Error('Canonical plan source code is required')

    const supabase = await createClient()
    const { data: assets, error: assetError } = await supabase
      .from('knowledge_assets')
      .select('id,workspace_id,academic_year_id,current_generation_id')
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .contains('source_metadata', { canonicalExecCode: code })
      .limit(2)

    if (assetError) throw new Error(assetError.message)
    if (!assets || assets.length === 0) return null
    if (assets.length > 1) throw new Error(`Canonical plan source ${code} is ambiguous in the active workspace`)

    const asset = assets[0]
    if (!asset.current_generation_id) return null

    const { data: generation, error: generationError } = await supabase
      .from('knowledge_processing_generations')
      .select('id,asset_id,workspace_id,status')
      .eq('id', asset.current_generation_id)
      .maybeSingle()

    if (generationError) throw new Error(generationError.message)
    if (!generation) return null
    if (
      generation.status !== 'SUCCEEDED' ||
      generation.workspace_id !== input.workspaceId ||
      generation.asset_id !== asset.id ||
      asset.workspace_id !== input.workspaceId ||
      asset.academic_year_id !== input.academicYearId
    ) {
      return null
    }

    return {
      code,
      assetId: asset.id,
      generationId: generation.id,
    }
  }
}
