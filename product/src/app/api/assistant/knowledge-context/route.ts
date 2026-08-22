import { NextResponse } from 'next/server'
import { buildKnowledgeAssistantContext } from '@/core/presentation/assistant-context'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  contentCategoryLabel,
  humanizeKnowledgeTitle,
  knowledgeProcessingStatus,
  sourceProviderLabel,
} from '@/core/presentation/product-language'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const assetId = new URL(request.url).searchParams.get('assetId')?.trim()
  if (!assetId) return NextResponse.json({ error: 'missing_asset' }, { status: 400 })

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const repository = new SupabaseKnowledgeRepository()
  const bundle = await repository.getBundle(context.workspace.id, assetId)
  if (!bundle) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { asset, document, units } = bundle
  const processing = knowledgeProcessingStatus(asset.processingStatus)
  const assistantContext = buildKnowledgeAssistantContext({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? asset.academicYearId,
    assetId: asset.id,
    title: humanizeKnowledgeTitle(document?.title ?? asset.originalName),
    state: asset.processingStatus,
    category: contentCategoryLabel(asset.contentCategory),
    sourceLabel: sourceProviderLabel(asset.sourceProvider),
    statusLabel: processing.label,
    summary: document?.summary,
    excerpt: document?.normalizedText ?? asset.originalText,
    contextReviewed: asset.contextStatus === 'REVIEWED',
    hasOrganizedDocument: Boolean(document),
    actionProposalCount: units.filter((unit) => unit.unitType === 'ACTION').length,
    deadlineProposalCount: units.filter((unit) => unit.unitType === 'DEADLINE').length,
    disciplines: asset.disciplines,
    classLabels: asset.classLabels,
  })

  return NextResponse.json(assistantContext, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}
