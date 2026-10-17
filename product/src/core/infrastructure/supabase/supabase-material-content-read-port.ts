// @trama-readonly — exact-generation Knowledge reads and local storage download only; no persisted state mutation.
import { createHash } from 'node:crypto'
import type {
  KnowledgeGenerationMaterialRecordV1,
  MaterialContentReadPortV1,
} from '@/core/application/material-content-resolution'
import type { MaterialContentSnapshotV1 } from '@/core/application/material-content-digest'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

const STORAGE_PREFIX = 'storage:knowledge-assets/'
const STORAGE_BUCKET = 'knowledge-assets'

type AssetRow = {
  id: string
  current_generation_id: string | null
  source_locator: string | null
  original_text: string | null
  mime_type: string | null
  sha256: string | null
}

type GenerationRow = {
  id: string
  asset_id: string
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
}

type DocumentRow = {
  id: string
  asset_id: string
  generation_id: string | null
  title: string | null
  document_type: string
  language: string
  normalized_text: string | null
  normalized_markdown: string | null
  summary: string | null
  extracted_data: Json
}

type UnitRow = {
  document_id: string
  ordinal: number
  unit_type: string
  title: string | null
  content: string
  structured_data: Json
  source_page: number | null
  start_offset: number | null
  end_offset: number | null
}

export type MaterializeKnowledgeGenerationInputV1 = {
  asset: AssetRow
  generation: GenerationRow
  document: DocumentRow
  units: UnitRow[]
  localSourceBytes: Uint8Array | null
}

export class SupabaseMaterialContentReadPortV1 implements MaterialContentReadPortV1 {
  async readKnowledgeGeneration(input: {
    workspaceId: string
    assetId: string
    generationId: string
  }): Promise<KnowledgeGenerationMaterialRecordV1 | null> {
    const supabase = await createClient()

    const [{ data: asset, error: assetError }, { data: generation, error: generationError }] = await Promise.all([
      supabase
        .from('knowledge_assets')
        .select('id,current_generation_id,source_locator,original_text,mime_type,sha256')
        .eq('workspace_id', input.workspaceId)
        .eq('id', input.assetId)
        .maybeSingle(),
      supabase
        .from('knowledge_processing_generations')
        .select('id,asset_id,status')
        .eq('workspace_id', input.workspaceId)
        .eq('asset_id', input.assetId)
        .eq('id', input.generationId)
        .maybeSingle(),
    ])

    if (assetError) throw assetError
    if (generationError) throw generationError
    if (!asset || !generation) return null

    const { data: document, error: documentError } = await supabase
      .from('knowledge_documents')
      .select(
        'id,asset_id,generation_id,title,document_type,language,normalized_text,normalized_markdown,summary,extracted_data',
      )
      .eq('workspace_id', input.workspaceId)
      .eq('asset_id', input.assetId)
      .eq('generation_id', input.generationId)
      .maybeSingle()

    if (documentError) throw documentError
    if (!document) {
      return materializeUnavailableSnapshot(asset as AssetRow, generation as GenerationRow)
    }

    const { data: units, error: unitsError } = await supabase
      .from('knowledge_units')
      .select('document_id,ordinal,unit_type,title,content,structured_data,source_page,start_offset,end_offset')
      .eq('workspace_id', input.workspaceId)
      .eq('document_id', document.id)
      .order('ordinal', { ascending: true })

    if (unitsError) throw unitsError

    const localSourceBytes = await loadLocalSourceBytes(supabase, asset.source_locator)

    return materializeKnowledgeGenerationRecordV1({
      asset: asset as AssetRow,
      generation: generation as GenerationRow,
      document: document as DocumentRow,
      units: (units ?? []) as UnitRow[],
      localSourceBytes,
    })
  }
}

export function materializeKnowledgeGenerationRecordV1(
  input: MaterializeKnowledgeGenerationInputV1,
): KnowledgeGenerationMaterialRecordV1 {
  if (input.generation.asset_id !== input.asset.id) {
    throw new Error('Generation context does not match material asset')
  }
  if (input.document.asset_id !== input.asset.id || input.document.generation_id !== input.generation.id) {
    throw new Error('Document context does not match material generation')
  }
  for (const unit of input.units) {
    if (unit.document_id !== input.document.id) throw new Error('Unit context does not match material document')
  }

  const sourceIsImmutableLocal = Boolean(
    input.asset.source_locator?.startsWith(STORAGE_PREFIX) && input.localSourceBytes,
  )
  const sourceContentAvailable = input.asset.original_text !== null || input.localSourceBytes !== null
  const sourceSha256MatchesBytes = sourceShaMatches(input.asset.sha256, input.localSourceBytes)

  const referencedBinaryContent: MaterialContentSnapshotV1['referencedBinaryContent'] = []
  if (input.localSourceBytes && input.asset.source_locator) {
    referencedBinaryContent.push({
      ref: input.asset.source_locator,
      mimeType: input.asset.mime_type,
      bytes: input.localSourceBytes,
    })
  }

  return {
    assetId: input.asset.id,
    generationId: input.generation.id,
    generationStatus: input.generation.status,
    currentGenerationId: input.asset.current_generation_id,
    sourceLocator: input.asset.source_locator,
    sourceIsImmutableLocal,
    sourceContentAvailable,
    sourceSha256MatchesBytes,
    snapshot: {
      assetContent: {
        originalText: input.asset.original_text,
        mimeType: input.asset.mime_type,
        sourceSha256: input.asset.sha256,
      },
      document: {
        title: input.document.title,
        documentType: input.document.document_type,
        language: input.document.language,
        normalizedText: input.document.normalized_text,
        normalizedMarkdown: input.document.normalized_markdown,
        summary: input.document.summary,
        extractedData: jsonObject(input.document.extracted_data),
      },
      units: input.units.map((unit) => ({
        ordinal: unit.ordinal,
        unitType: unit.unit_type,
        title: unit.title,
        content: unit.content,
        structuredData: jsonObject(unit.structured_data),
        sourcePage: unit.source_page,
        startOffset: unit.start_offset,
        endOffset: unit.end_offset,
      })),
      referencedBinaryContent,
    },
  }
}

function materializeUnavailableSnapshot(
  asset: AssetRow,
  generation: GenerationRow,
): KnowledgeGenerationMaterialRecordV1 {
  return {
    assetId: asset.id,
    generationId: generation.id,
    generationStatus: generation.status,
    currentGenerationId: asset.current_generation_id,
    sourceLocator: asset.source_locator,
    sourceIsImmutableLocal: false,
    sourceContentAvailable: asset.original_text !== null,
    sourceSha256MatchesBytes: true,
    snapshot: null,
  }
}

async function loadLocalSourceBytes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceLocator: string | null,
): Promise<Uint8Array | null> {
  if (!sourceLocator?.startsWith(STORAGE_PREFIX)) return null
  const objectPath = sourceLocator.slice(STORAGE_PREFIX.length)
  if (!objectPath) throw new Error('Knowledge storage locator has no object path')

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(objectPath)
  if (error) throw error
  if (!data) return null
  return new Uint8Array(await data.arrayBuffer())
}

function sourceShaMatches(expected: string | null, bytes: Uint8Array | null) {
  if (!bytes || !expected) return true
  if (!/^[a-f0-9]{64}$/i.test(expected)) return false
  return createHash('sha256').update(bytes).digest('hex') === expected.toLowerCase()
}

function jsonObject(value: Json): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
