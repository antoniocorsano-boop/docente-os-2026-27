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
    contentHighlights: buildAssistantHighlights(units),
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

type AssistantUnit = {
  unitType: string
  title?: string | null
  content: string
}

function buildAssistantHighlights(units: AssistantUnit[], maxItems = 10) {
  const readable = units.filter((unit) => unit.unitType !== 'ACTION' && unit.unitType !== 'DEADLINE' && unit.content.trim())
  if (readable.length === 0) return []

  const count = Math.min(maxItems, readable.length)
  const indexes = count === 1
    ? [0]
    : Array.from({ length: count }, (_, index) => Math.round(index * (readable.length - 1) / (count - 1)))

  const seenIndexes = [...new Set(indexes)]
  const seenText = new Set<string>()
  const highlights: string[] = []

  for (const index of seenIndexes) {
    const highlight = highlightFromUnit(readable[index])
    if (!highlight) continue
    const key = highlight.toLocaleLowerCase('it-IT')
    if (seenText.has(key)) continue
    seenText.add(key)
    highlights.push(highlight)
  }

  return highlights
}

function highlightFromUnit(unit: AssistantUnit) {
  const title = collapse(unit.title ?? '')
  const usefulTitle = title && !/^(?:pagina|page)\s+\d+$/i.test(title) ? title : ''
  const lines = unit.content
    .split(/\r?\n/)
    .map(collapse)
    .filter((line) => line && !/^\d+$/.test(line))

  const lead = lines
    .slice(0, 10)
    .map((line, index) => ({ line, index, score: salience(line, index) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.line ?? collapse(unit.content)

  const combined = usefulTitle && lead && !lead.toLocaleLowerCase('it-IT').startsWith(usefulTitle.toLocaleLowerCase('it-IT'))
    ? `${usefulTitle}: ${lead}`
    : usefulTitle || lead

  return combined.slice(0, 220)
}

function salience(line: string, index: number) {
  let score = Math.max(0, 10 - index) * 0.05
  if (line.includes(':')) score += 3
  if (/[.!?]$/.test(line)) score += 1
  if (line.length >= 20 && line.length <= 140) score += 2
  if (line.length >= 12 && line.length <= 90) score += 1
  if (line.length < 10) score -= 2
  return score
}

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
