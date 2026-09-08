import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import LessonPrepareClient from './lesson-prepare-client'
import LessonLiveClient from './lesson-live-client'
import LessonObserveClient from './lesson-observe-client'
import LessonCloseClient from './lesson-close-client'
import { buildLessonMaterialSuggestions } from './lesson-material-suggestions'
import './lesson-workspace.css'
import './lesson-design-tools.css'

export const dynamic = 'force-dynamic'

type LessonWorkspaceMode = 'prepare' | 'teach' | 'observe' | 'record'

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
  const [extensions, knowledgeItems, assignments, textbookAdoptions] = await Promise.all([
    new SupabaseLessonDesignRepository().list(designContext),
    new SupabaseKnowledgeRepository().listRecent(context.workspace.id, 100),
    new SupabaseTeachingAssignmentReader().list(context.workspace.id, context.academicYear.id),
    new SupabaseTextbookRepository().list(context.workspace.id, context.academicYear.id),
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

  const sectionAssignmentIds = new Set(
    assignments.filter((assignment) => assignment.sectionId === section.id).map((assignment) => assignment.id),
  )
  const confirmedTextbooks = Array.from(new Map(
    textbookAdoptions
      .filter((adoption) => adoption.status === 'CONFIRMED' && sectionAssignmentIds.has(adoption.teachingAssignmentId))
      .map((adoption) => [adoption.textbook.id, { id: adoption.textbook.id, title: adoption.textbook.title }]),
  ).values())

  const compactSectionLabel = `${GRADE_NUMBER[section.grade]}${section.sectionCode}`
  const knowledgeSuggestions = buildLessonMaterialSuggestions({
    items: knowledgeItems,
    grade: GRADE_QUERY[section.grade],
    compactSectionLabel,
    blockId: block.id,
    uda: block.uda,
    pack: block.pack,
    lessonTitle: projection.title,
    objective: projection.objective,
    confirmedTextbooks,
    excludedAssetIds: new Set(
      extensions.flatMap((extension) => extension.sourceRef?.startsWith('knowledge:')
        ? [extension.sourceRef.slice('knowledge:'.length)]
        : []),
    ),
  })

  const mode = asMode((await searchParams).mode)
  const sectionLabel = `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`
  const progressView = {
    status: progress?.status ?? 'PIANIFICATO',
    executedOn: progress?.executedOn ?? null,
    evidenceNote: progress?.evidenceNote ?? null,
  }
  const udaProgressView = { completed: udaProgress, total: udaBlocks.length }

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="lessonWorkspaceSurface"
    >
      {mode === 'teach' ? (
        <LessonLiveClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
          extensions={extensions}
          progress={progressView}
          udaProgress={udaProgressView}
        />
      ) : mode === 'observe' ? (
        <LessonObserveClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
        />
      ) : mode === 'record' ? (
        <LessonCloseClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
          progress={progressView}
        />
      ) : (
        <LessonPrepareClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
          extensions={extensions}
          knowledgeSuggestions={knowledgeSuggestions}
          progress={progressView}
          udaProgress={udaProgressView}
        />
      )}
    </AppShell>
  )
}

function asMode(value: string | undefined): LessonWorkspaceMode {
  if (value === 'teach' || value === 'observe' || value === 'record') return value
  return 'prepare'
}
