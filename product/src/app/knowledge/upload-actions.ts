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
import {
  KNOWLEDGE_BUCKET,
  validateKnowledgeUploadReference,
  type KnowledgeUploadReference,
} from './upload-policy'

export type FinalizeKnowledgeUploadResult =
  | { ok: true; assetId: string }
  | { ok: false; code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' | 'parse_failed' }

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
        captureMode: 'direct-storage-upload',
        storageBucket: KNOWLEDGE_BUCKET,
        storagePath: input.objectPath,
        originalFilename: input.originalName,
        transferPath: 'browser-to-supabase-storage',
      },
    })

    revalidatePath('/knowledge')
    return { ok: true, assetId: asset.id }
  } catch (error) {
    console.error('Knowledge direct-upload ingestion failed', error)
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
