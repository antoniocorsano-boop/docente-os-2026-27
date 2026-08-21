import type { AssetContentPort } from '@/core/application/ports/knowledge-base'
import type { KnowledgeAsset } from '@/core/domain/knowledge'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'knowledge-assets'
const LOCATOR_PREFIX = `storage:${BUCKET}/`

export class SupabaseStorageKnowledgeContentPort implements AssetContentPort {
  async load(asset: KnowledgeAsset): Promise<{ text?: string | null; bytes?: Uint8Array | null }> {
    if (!asset.sourceLocator) throw new Error('Uploaded knowledge asset is missing source locator')

    const objectPath = asset.sourceLocator.startsWith(LOCATOR_PREFIX)
      ? asset.sourceLocator.slice(LOCATOR_PREFIX.length)
      : asset.sourceLocator

    const supabase = await createClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(objectPath)
    if (error) throw new Error(error.message)

    const bytes = new Uint8Array(await data.arrayBuffer())
    if (asset.mimeType?.startsWith('text/')) {
      return { text: new TextDecoder('utf-8').decode(bytes), bytes }
    }

    return { bytes }
  }
}
