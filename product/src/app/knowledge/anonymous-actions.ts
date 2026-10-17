'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { KnowledgeIngestionService } from '@/core/application/knowledge-ingestion-service'
import { PlainTextKnowledgeTransformer } from '@/core/infrastructure/knowledge/plain-text-transformer'
import { SchoolCommunicationEnrichment } from '@/core/infrastructure/knowledge/school-communication-enrichment'
import { NativeKnowledgeContentPort, SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { inspectFreeTextForPilot } from '@/core/privacy/anonymization-guard'
import { asKnowledgeTaskMode, sanitizeInternalReturnTo } from '@/core/presentation/task-continuity'
import { captureKnowledgeNote } from './actions'

export async function captureAnonymousKnowledgeNote(formData: FormData) {
  const titleValue = formData.get('title')
  const textValue = formData.get('text')
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  const text = typeof textValue === 'string' ? textValue.trim() : ''

  const combined = [title, text].filter(Boolean).join('\n')
  if (!inspectFreeTextForPilot(combined).allowed) {
    redirect('/knowledge?upload=privacy_blocked')
  }

  const postCaptureValue = formData.get('postCaptureQuery')
  const postCaptureQuery = typeof postCaptureValue === 'string' ? postCaptureValue.trim() : ''
  const taskQuery = sanitizeTaskPostCaptureQuery(postCaptureQuery)
  if (!taskQuery) return captureKnowledgeNote(formData)
  if (!text) return

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseKnowledgeRepository()
  const ingestion = new KnowledgeIngestionService(
    repository,
    repository,
    repository,
    new NativeKnowledgeContentPort(),
    [new PlainTextKnowledgeTransformer()],
    repository,
    new SchoolCommunicationEnrichment(),
  )
  const asset = await ingestion.ingest({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? null,
    assetKind: 'NOTE',
    sourceProvider: 'MANUAL',
    originalName: title || null,
    originalText: text,
    mimeType: 'text/plain',
    byteSize: new TextEncoder().encode(text).byteLength,
    sourceMetadata: { captureMode: 'knowledge-inbox' },
  })

  revalidatePath('/knowledge')
  redirect(`/knowledge/${asset.id}?${taskQuery}`)
}

function sanitizeTaskPostCaptureQuery(value: string) {
  if (!value) return null
  const params = new URLSearchParams(value)
  const mode = asKnowledgeTaskMode(params.get('mode'))
  if (!mode) return null

  const sectionId = params.get('section')?.trim() || null
  const blockId = params.get('block')?.trim() || null
  const fallback = mode === 'class' && sectionId
    ? `/classi/${encodeURIComponent(sectionId)}`
    : mode === 'prepare'
      ? '/progetta'
      : '/knowledge'
  const returnTo = sanitizeInternalReturnTo(params.get('returnTo'), fallback)

  const sanitized = new URLSearchParams({ mode, returnTo })
  if (sectionId) sanitized.set('section', sectionId)
  if (blockId) sanitized.set('block', blockId)
  return sanitized.toString()
}
