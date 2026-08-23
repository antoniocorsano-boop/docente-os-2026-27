import {
  canonicalCodeFromOriginalName,
  type HumanTaskContentSourcePort,
  type HumanTaskPipelineSource,
} from '@/core/application/human-task-content-pipeline'
import { createClient } from '@/lib/supabase/server'

export class SupabaseHumanTaskContentSourceRepository implements HumanTaskContentSourcePort {
  async getCurrentByCanonicalCode(workspaceId: string, code: string): Promise<HumanTaskPipelineSource | null> {
    const supabase = await createClient()
    const { data: assets, error } = await supabase
      .from('knowledge_assets')
      .select('id, original_name, current_generation_id, processing_status, captured_at')
      .eq('workspace_id', workspaceId)
      .eq('processing_status', 'INDEXED')
      .ilike('original_name', `${code}%`)
      .not('current_generation_id', 'is', null)
      .order('captured_at', { ascending: false })
      .limit(3)

    if (error) throw new Error(error.message)
    const exact = (assets ?? []).filter((asset) => canonicalCodeFromOriginalName(asset.original_name) === code)
    if (!exact.length) return null
    if (exact.length > 1) throw new Error(`Ambiguous canonical Knowledge source: ${code}`)

    const asset = exact[0]
    if (!asset.current_generation_id) return null
    const { data: document, error: documentError } = await supabase
      .from('knowledge_documents')
      .select('title, normalized_text, generation_id')
      .eq('workspace_id', workspaceId)
      .eq('generation_id', asset.current_generation_id)
      .maybeSingle()

    if (documentError) throw new Error(documentError.message)
    if (!document?.normalized_text) return null

    return {
      code,
      assetId: asset.id,
      generationId: document.generation_id,
      title: document.title,
      normalizedText: document.normalized_text,
    }
  }
}
