import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveHumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import LessonWorkspaceClient, { type LessonWorkspaceMode } from './lesson-workspace-client'
import './lesson-workspace.css'

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

  const projection = resolveHumanTaskLessonProjection(grade, block)
  if (!projection) {
    const gradeQuery = GRADE_QUERY[section.grade]
    redirect(`/progetta?grade=${gradeQuery}&section=${encodeURIComponent(section.id)}&block=${encodeURIComponent(block.id)}&uda=${encodeURIComponent(block.uda)}&pack=${encodeURIComponent(block.pack)}#focus-operativo`)
  }

  const source = CANONICAL_PLAN_SOURCES[grade]
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

function asMode(value: string | undefined): LessonWorkspaceMode {
  if (value === 'teach' || value === 'observe' || value === 'record') return value
  return 'prepare'
}
