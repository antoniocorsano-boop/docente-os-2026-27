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
import { inspectFilenameForPilot } from '@/core/privacy/anonymization-guard'
import { createClient } from '@/lib/supabase/server'
import {
  buildKnowledgeObjectPath,
  isAllowedKnowledgeUploadMime,
  KNOWLEDGE_BUCKET,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
  RESUMABLE_KNOWLEDGE_UPLOAD_THRESHOLD_BYTES,
  validateKnowledgeUploadReference,
  type KnowledgeUploadReference,
} from './upload-policy'
import {
  resolveConfirmedTextbookMaterialContext,
  TEXTBOOK_MATERIAL_CONTEXT_COOKIE,
} from './textbook-material-context'

export type KnowledgeTransferMode = 'SAME_ORIGIN' | 'RESUMABLE_DIRECT'

export type KnowledgeUploadGrantResult =
  | { ok: true; objectPath: string; token: string; mimeType: string; resumableEndpoint: string }
  | { ok: false; code: 'missing' | 'too_large' | 'unsupported' | 'privacy_confirmation_required' | 'privacy_blocked' | 'authorization_failed' }

export type FinalizeKnowledgeUploadResult =
  | { ok: true; assetId: string }
  | { ok: false; code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' | 'invalid_pdf' | 'visual_unavailable' | 'parse_failed' }

export async function requestResumableKnowledgeUploadGrant(input: {
  originalName: string
  rawMimeType: string
  byteSize: number
  privacyConfirmed: boolean
  preflightMode: 'PDF_NATIVE_TEXT_LOCAL'
}): Promise<KnowledgeUploadGrantResult> {
  const originalName = input.originalName.trim()
  if (!originalName || !Number.isInteger(input.byteSize) || input.byteSize <= 0) return { ok: false, code: 'missing' }
  if (!input.privacyConfirmed) return { ok: false, code: 'privacy_confirmation_required' }
  if (!inspectFilenameForPilot(originalName).allowed) return { ok: false, code: 'privacy_blocked' }
  if (input.byteSize > MAX_KNOWLEDGE_UPLOAD_BYTES) return { ok: false, code: 'too_large' }
  if (input.byteSize <= RESUMABLE_KNOWLEDGE_UPLOAD_THRESHOLD_BYTES) return { ok: false, code: 'unsupported' }

  const mimeType = normalizeKnowledgeUploadMime(input.rawMimeType, originalName)
  if (!isAllowedKnowledgeUploadMime(mimeType) || mimeType !== 'application/pdf' || input.preflightMode !== 'PDF_NATIVE_TEXT_LOCAL') {
    return { ok: false, code: 'unsupported' }
  }

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return { ok: false, code: 'authorization_failed' }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) return { ok: false, code: 'authorization_failed' }

  const objectPath = buildKnowledgeObjectPath(context.workspace.id, userId, originalName, crypto.randomUUID())
  const { data, error } = await supabase.storage.from(KNOWLEDGE_BUCKET).createSignedUploadUrl(objectPath, { upsert: false })
  const resumableEndpoint = resumableEndpointFromProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')

  if (error || !data?.token || !resumableEndpoint) {
    console.error('Knowledge resumable upload grant failed', {
      message: error?.message ?? (!data?.token ? 'Missing signed upload token' : 'Missing resumable endpoint'),
      workspaceId: context.workspace.id,
      userId,
      bucket: KNOWLEDGE_BUCKET,
      objectPath,
    })
    return { ok: false, code: 'authorization_failed' }
  }

  return { ok: true, objectPath, token: data.token, mimeType, resumableEndpoint }
}

export async function finalizeKnowledgeFileUpload(
  input: Omit<KnowledgeUploadReference, 'workspaceId' | 'ownerUserId'> & { transferMode?: KnowledgeTransferMode },
): Promise<FinalizeKnowledgeUploadResult> {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return { ok: false, code: 'invalid_path' }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) return { ok: false, code: 'invalid_path' }

  const reference: KnowledgeUploadReference = {
    objectPath: input.objectPath,
    originalName: input.originalName,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    workspaceId: context.workspace.id,
    ownerUserId: userId,
  }
  const validation = validateKnowledgeUploadReference(reference)
  if (!validation.valid) return { ok: false, code: validation.code }

  const transferMode = input.transferMode ?? 'SAME_ORIGIN'
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
        captureMode: transferMode === 'RESUMABLE_DIRECT' ? 'resumable-storage-upload' : 'same-origin-storage-upload',
        storageBucket: KNOWLEDGE_BUCKET,
        storagePath: input.objectPath,
        storageOwnerUserId: userId,
        originalFilename: input.originalName,
        transferPath: transferMode === 'RESUMABLE_DIRECT'
          ? 'browser-to-supabase-storage-tus-after-local-pdf-preflight'
          : 'browser-to-docente-os-to-supabase-storage',
        privacyPreflight: transferMode === 'RESUMABLE_DIRECT' ? 'PDF_NATIVE_TEXT_LOCAL_BEFORE_STORAGE' : 'SERVER_BEFORE_STORAGE',
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
    console.error('Knowledge upload ingestion failed', error)
    if (error instanceof InvalidPdfContentError) return { ok: false, code: 'invalid_pdf' }
    if (error instanceof VisualExtractionUnavailableError) return { ok: false, code: 'visual_unavailable' }
    return { ok: false, code: 'parse_failed' }
  }
}

function resumableEndpointFromProjectUrl(projectUrl: string) {
  try {
    const url = new URL(projectUrl)
    const match = url.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)
    if (!match) return null
    return `${url.protocol}//${match[1]}.storage.supabase.co/storage/v1/upload/resumable`
  } catch {
    return null
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
