'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { KnowledgeIngestionService } from '@/core/application/knowledge-ingestion-service'
import { PlainTextKnowledgeTransformer } from '@/core/infrastructure/knowledge/plain-text-transformer'
import { NativeKnowledgeContentPort, SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function captureKnowledgeNote(formData: FormData) {
  const titleValue = formData.get('title')
  const textValue = formData.get('text')
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  const text = typeof textValue === 'string' ? textValue.trim() : ''
  if (!text) return

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseKnowledgeRepository()
  const ingestion = new KnowledgeIngestionService(
    repository,
    repository,
    new NativeKnowledgeContentPort(),
    [new PlainTextKnowledgeTransformer()],
    repository,
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
  redirect(`/knowledge/${asset.id}`)
}
