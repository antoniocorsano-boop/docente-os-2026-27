'use server'

import { revalidatePath } from 'next/cache'
import { KnowledgeIngestionService } from '@/core/application/knowledge-ingestion-service'
import { DocxKnowledgeTransformer, ImageKnowledgeTransformer, PdfKnowledgeTransformer } from '@/core/infrastructure/knowledge/file-transformers'
import { OpenAiVisualExtraction } from '@/core/infrastructure/knowledge/openai-visual-extraction'
import { PlainTextKnowledgeTransformer } from '@/core/infrastructure/knowledge/plain-text-transformer'
import { SchoolCommunicationEnrichment } from '@/core/infrastructure/knowledge/school-communication-enrichment'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseStorageKnowledgeContentPort } from '@/core/infrastructure/supabase/supabase-storage-knowledge-content-port'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'
import {
  buildKnowledgeObjectPath,
  isAllowedKnowledgeUploadMime,
  KNOWLEDGE_BUCKET,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
  validateKnowledgeUploadReference,
  type KnowledgeUploadReference,
} from './upload-policy'

export type KnowledgeUploadGrantResult =
  | { ok: true; objectPath: string; token: string; mimeType: string }
  | { ok: false; code: 'missing' | 'too_large' | 'unsupported' | 'authorization_failed' }

export type FinalizeKnowledgeUploadResult =
  | { ok: true; assetId: string }
  | { ok: false; code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' | 'parse_failed' }

export async function requestKnowledgeUploadGrant(input: {
  originalName: string
  rawMimeType: string
  byteSize: number
}): Promise<KnowledgeUploadGrantResult> {
  const originalName = input.originalName.trim()
  if (!originalName || !Number.isInteger(input.byteSize) || input.byteSize <= 0) {
    return { ok: false, code: 'missing' }
  }
  if (input.byteSize > MAX_KNOWLEDGE_UPLOAD_BYTES) {
    return { ok: false, code: 'too_large' }
  }

  const mimeType = normalizeKnowledgeUploadMime(input.rawMimeType, originalName)
  if (!isAllowedKnowledgeUploadMime(mimeType)) {
    return { ok: false, code: 'unsupported' }
  }

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return { ok: false, code: 'authorization_failed' }

  const objectPath = buildKnowledgeObjectPath(context.workspace.id, originalName, crypto.randomUUID())
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .createSignedUploadUrl(objectPath, { upsert: false })

  if (error || !data?.token) {
    console.error('Knowledge signed upload grant failed', {
      message: error?.message ?? 'Missing signed upload token',
      workspaceId: context.workspace.id,
      bucket: KNOWLEDGE_BUCKET,
      objectPath,
    })
    return { ok: false, code: 'authorization_failed' }
  }

  return { ok: true, objectPath, token: data.token, mimeType }
}

export async function finalizeKnowledgeFileUpload(
  input: Omit<KnowledgeUploadReference, 'workspaceId'>,
): Promise<FinalizeKnowledgeUploadResult> {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return { ok: false, code: 'invalid_path' }

  const reference: KnowledgeUploadReference = {
    ...input,
    workspaceId: context.workspace.id,
  }
  const validation = validateKnowledgeUploadReference(reference)
  if (!validation.valid) return { ok: false, code: validation.code }

  const repository = new SupabaseKnowledgeRepository()
  const ingestion = buildFileIngestion(repository)

  try {
    const asset = await ingestion.ingest({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear?.id ?? null,
      assetKind: 'FILE',
      sourceProvider: 'UPLOAD',
      sourceLocator: `storage:${KNOWLEDGE_BUCKET}/${input.objectPath}`,
      originalName: input.originalName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      sourceMetadata: {
        captureMode: 'signed-storage-upload',
        storageBucket: KNOWLEDGE_BUCKET,
        storagePath: input.objectPath,
        originalFilename: input.originalName,
        transferPath: 'server-authorized-browser-to-supabase-storage',
      },
    })

    revalidatePath('/knowledge')
    return { ok: true, assetId: asset.id }
  } catch (error) {
    console.error('Knowledge signed-upload ingestion failed', error)
    return { ok: false, code: 'parse_failed' }
  }
}

function buildFileIngestion(repository: SupabaseKnowledgeRepository) {
  const visualExtraction = new OpenAiVisualExtraction()
  return new KnowledgeIngestionService(
    repository,
    repository,
    repository,
    new SupabaseStorageKnowledgeContentPort(),
    [
      new PlainTextKnowledgeTransformer(),
      new PdfKnowledgeTransformer(visualExtraction),
      new DocxKnowledgeTransformer(),
      new ImageKnowledgeTransformer(visualExtraction),
    ],
    repository,
    new SchoolCommunicationEnrichment(),
  )
}
