import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import {
  filterProgettaItemsByFocus,
  filterProgettaItemsByGrade,
  filterProgettaItemsBySectionContext,
} from '@/app/progetta/progetta-model'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle } from '@/core/presentation/product-language'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import LessonWorkspaceClient, { type LessonKnowledgeSuggestion, type LessonWorkspaceMode } from './lesson-workspace-client'
import './lesson-workspace.css'
import './lesson-workspace-maturity.css'
import './lesson-design-tools.css'

export const dynamic = 'force-dynamic'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const
const GRADE_QUERY = { PRIMA: 'prima', SECONDA: 'seconda', TERZA: 'terza' } as const
const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export default async function LessonWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; blockId: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { sectionId, blockId: rawBlockId } = await params
  const blockId = rawBlockId.toUpperCase()
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const repository = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await repository.list(context.workspace.id, context.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()

  const grade = GRADE_UI[section.grade]
  const blocks = buildBlocks(grade)
  const block = blocks.find((item) => item.id === blockId)
  if (!block) notFound()

  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection) {
    const gradeQuery = GRADE_QUERY[section.grade]
    redirect(`/progetta?grade=${gradeQuery}&section=${encodeURIComponent(section.id)}&block=${encodeURIComponent(block.id)}&uda=${encodeURIComponent(block.uda)}&pack=${encodeURIComponent(block.pack)}#focus-operativo`)
  }

  const source = CANONICAL_PLAN_SOURCES[grade]
  const designContext = {
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: section.id,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId: block.id,
    projectionId: projection.projectionId,
  }
  const [extensions, knowledgeItems] = await Promise.all([
    new SupabaseLessonDesignRepository().list(designContext),
    new SupabaseKnowledgeRepository().listRecent(context.workspace.id, 100),
  ])

  const progress = snapshot.progress.find((entry) =>
    entry.sectionId === section.id &&
    entry.canonicalGenerationId === source.generationId &&
    entry.blockId === block.id,
  ) ?? null
  const udaBlocks = blocks.filter((item) => item.uda === block.uda)
  const udaProgress = snapshot.progress.filter((entry) =>
    entry.sectionId === section.id &&
    entry.canonicalGenerationId === source.generationId &&
    udaBlocks.some((item) => item.id === entry.blockId) &&
    COMPLETE_STATUSES.has(entry.status),
  ).length

  const compactSectionLabel = `${GRADE_NUMBER[section.grade]}${section.sectionCode}`
  const knowledgeSuggestions = buildKnowledgeSuggestions({
    items: knowledgeItems,
    grade: GRADE_QUERY[section.grade],
    compactSectionLabel,
    blockId: block.id,
    uda: block.uda,
    pack: block.pack,
    excludedAssetIds: new Set(
      extensions.flatMap((extension) => extension.sourceRef?.startsWith('knowledge:')
        ? [extension.sourceRef.slice('knowledge:'.length)]
        : []),
    ),
  })

  const mode = asMode((await searchParams).mode)
  const sectionLabel = `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="lessonWorkspaceSurface"
    >
      <LessonWorkspaceClient
        sectionId={section.id}
        sectionLabel={sectionLabel}
        block={block}
        projection={projection}
        initialMode={mode}
        extensions={extensions}
        knowledgeSuggestions={knowledgeSuggestions}
        progress={{
          status: progress?.status ?? 'PIANIFICATO',
          executedOn: progress?.executedOn ?? null,
          evidenceNote: progress?.evidenceNote ?? null,
        }}
        udaProgress={{ completed: udaProgress, total: udaBlocks.length }}
      />
    </AppShell>
  )
}

function buildKnowledgeSuggestions(input: {
  items: Awaited<ReturnType<SupabaseKnowledgeRepository['listRecent']>>
  grade: 'prima' | 'seconda' | 'terza'
  compactSectionLabel: string
  blockId: string
  uda: string
  pack: string
  excludedAssetIds: Set<string>
}): LessonKnowledgeSuggestion[] {
  const gradeItems = filterProgettaItemsByGrade(input.items, input.grade)
  const scopedItems = filterProgettaItemsBySectionContext(gradeItems, input.compactSectionLabel)
  const focused = filterProgettaItemsByFocus(scopedItems, {
    blockId: input.blockId,
    uda: input.uda,
    pack: input.pack,
  })

  const rank: Record<string, number> = {
    TEACHING_RESOURCE: 0,
    ASSESSMENT: 1,
    UDA: 2,
    MODEL: 3,
    PROGRAMMING: 4,
  }

  return focused
    .filter(({ asset }) => !input.excludedAssetIds.has(asset.id))
    .sort((a, b) => (rank[a.asset.contentCategory] ?? 9) - (rank[b.asset.contentCategory] ?? 9) || b.asset.capturedAt.localeCompare(a.asset.capturedAt))
    .slice(0, 4)
    .map(({ asset, document }) => ({
      assetId: asset.id,
      title: humanizeKnowledgeTitle(document?.title ?? asset.originalName),
      summary: document?.summary ?? 'Contenuto già presente nella Conoscenza e collegato a questa fase.',
      category: asset.contentCategory,
    }))
}

function asMode(value: string | undefined): LessonWorkspaceMode {
  if (value === 'teach' || value === 'observe' || value === 'record') return value
  return 'prepare'
}
