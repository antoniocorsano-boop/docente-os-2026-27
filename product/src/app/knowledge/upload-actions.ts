'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { KnowledgeIngestionService } from '@/core/application/knowledge-ingestion-service'
import { VisualExtractionUnavailableError } from '@/core/application/ports/knowledge-base'
import { DocxKnowledgeTransformer, ImageKnowledgeTransformer, InvalidPdfContentError, PdfKnowledgeTransformer } from '@/core/infrastructure/knowledge/file-transformers'
import { OpenAiVisualExtraction } from '@/core/infrastructure/knowledge/openai-visual-extraction'
import { PlainTextKnowledgeTransformer } from '@/core/infrastructure/knowledge/plain-text-transformer'
import { SchoolCommunicationEnrichment } from '@/core/infrastructure/knowledge/school-communication-enrichment'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseStorageKnowledgeContentPort } from '@/core/infrastructure/supabase/supabase-storage-knowledge-content-port'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'
import {
  KNOWLEDGE_BUCKET,
  validateKnowledgeUploadReference,
  type KnowledgeUploadReference,
} from './upload-policy'
import {
  resolveConfirmedTextbookMaterialContext,
  TEXTBOOK_MATERIAL_CONTEXT_COOKIE,
} from './textbook-material-context'

export type FinalizeKnowledgeUploadResult =
  | { ok: true; assetId: string }
  | { ok: false; code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' | 'invalid_pdf' | 'visual_unavailable' | 'parse_failed' }

export async function finalizeKnowledgeFileUpload(
  input: Omit<KnowledgeUploadReference, 'workspaceId' | 'ownerUserId'>,
): Promise<FinalizeKnowledgeUploadResult> {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return { ok: false, code: 'invalid_path' }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) return { ok: false, code: 'invalid_path' }

  const reference: KnowledgeUploadReference = {
    ...input,
    workspaceId: context.workspace.id,
    ownerUserId: userId,
  }
  const validation = validateKnowledgeUploadReference(reference)
  if (!validation.valid) return { ok: false, code: validation.code }

  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const cookieTextbookId = cookieStore.get(TEXTBOOK_MATERIAL_CONTEXT_COOKIE)?.value?.trim() ?? ''
  const handoffTextbookId = textbookIdFromKnowledgeReferer(requestHeaders.get('referer'))
  const contextualTextbookId = cookieTextbookId && cookieTextbookId === handoffTextbookId
    ? cookieTextbookId
    : ''
  const textbookContext = contextualTextbookId
    ? await resolveConfirmedTextbookMaterialContext(contextualTextbookId)
    : null

  if (handoffTextbookId && (!contextualTextbookId || !textbookContext)) {
    if (cookieTextbookId) clearTextbookMaterialContext(cookieStore)
    return { ok: false, code: 'invalid_path' }
  }

  if (cookieTextbookId && !handoffTextbookId) {
    clearTextbookMaterialContext(cookieStore)
  }

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
        captureMode: 'same-origin-storage-upload',
        storageBucket: KNOWLEDGE_BUCKET,
        storagePath: input.objectPath,
        storageOwnerUserId: userId,
        originalFilename: input.originalName,
        transferPath: 'browser-to-docente-os-to-supabase-storage',
        ...(textbookContext ? {
          materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
          acquisitionMode: 'USER_PROVIDED_LEGITIMATE_COPY',
          textbook: {
            id: textbookContext.textbook.id,
            isbn13: textbookContext.textbook.isbn13,
            title: textbookContext.textbook.title,
            publisher: textbookContext.textbook.publisher,
          },
        } : {}),
      },
    })

    if (textbookContext) {
      await repository.link({
        workspaceId: context.workspace.id,
        assetId: asset.id,
        relationType: 'MATERIAL_FOR',
        targetType: 'TEXTBOOK',
        targetRef: textbookContext.textbook.id,
        metadata: {
          isbn13: textbookContext.textbook.isbn13,
          title: textbookContext.textbook.title,
          publisher: textbookContext.textbook.publisher,
          materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
          acquisitionMode: 'USER_PROVIDED_LEGITIMATE_COPY',
        },
      })
      clearTextbookMaterialContext(cookieStore)
    }

    revalidatePath('/knowledge')
    revalidatePath('/impostazioni/libri-di-testo')
    return { ok: true, assetId: asset.id }
  } catch (error) {
    console.error('Knowledge same-origin ingestion failed', error)
    if (error instanceof InvalidPdfContentError) return { ok: false, code: 'invalid_pdf' }
    if (error instanceof VisualExtractionUnavailableError) return { ok: false, code: 'visual_unavailable' }
    return { ok: false, code: 'parse_failed' }
  }
}

function textbookIdFromKnowledgeReferer(referer: string | null) {
  if (!referer) return ''
  try {
    const url = new URL(referer)
    if (url.pathname !== '/knowledge') return ''
    if (url.searchParams.get('capture') !== 'file') return ''
    if (url.searchParams.get('source') !== 'textbook') return ''
    return url.searchParams.get('textbookId')?.trim() ?? ''
  } catch {
    return ''
  }
}

function clearTextbookMaterialContext(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(TEXTBOOK_MATERIAL_CONTEXT_COOKIE, '', {
    maxAge: 0,
    path: '/knowledge',
  })
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
