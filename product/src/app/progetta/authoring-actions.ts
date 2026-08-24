'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SupabaseAuthoredDocumentRepository } from '@/core/infrastructure/supabase/supabase-authored-document-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function openUdaAuthoring(sourceAssetId: string) {
  if (!sourceAssetId) throw new Error('Source asset required')
  const context = await requireContext()
  const knowledge = new SupabaseKnowledgeRepository()
  const bundle = await knowledge.getBundle(context.workspace.id, sourceAssetId)
  if (!bundle || bundle.asset.contentCategory !== 'UDA') throw new Error('Only UDA sources can enter X5 authoring')
  const title = (bundle.document?.title ?? bundle.asset.originalName ?? 'Unità di apprendimento').trim()
  const body = bundle.document?.normalizedMarkdown ?? bundle.document?.normalizedText ?? bundle.asset.originalText ?? ''
  const repository = new SupabaseAuthoredDocumentRepository()
  const documentId = await repository.openUda({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sourceAssetId,
    initialTitle: title,
    initialBodyMarkdown: body,
  })
  redirect(`/progetta/documenti/${encodeURIComponent(documentId)}`)
}

export async function saveUdaAuthoring(input: {
  documentId: string
  expectedCurrentVersion: number
  title: string
  bodyMarkdown: string
}) {
  const context = await requireContext()
  const repository = new SupabaseAuthoredDocumentRepository()
  const snapshot = await repository.get(input.documentId)
  if (!snapshot || snapshot.document.workspaceId !== context.workspace.id) throw new Error('Document is outside the active workspace')
  const title = input.title.trim()
  if (!title || title.length > 300) throw new Error('Titolo non valido')
  if (input.bodyMarkdown.length > 250000) throw new Error('Documento troppo esteso')
  const versionNo = await repository.save({ ...input, title })
  revalidatePath(`/progetta/documenti/${input.documentId}`)
  return versionNo
}

async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}
