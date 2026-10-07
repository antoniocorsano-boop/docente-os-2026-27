import { AppShell } from '@/components/app-shell/app-shell'
import { buildBlocks, GRADE_UI } from '@/app/piano-annuale/model'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { redirect } from 'next/navigation'
import { AtlasMaterialReturnReview, type AtlasLessonOption } from './AtlasMaterialReturnReview'
import './atlas-material-return.css'

export const dynamic = 'force-dynamic'

type AtlasReturnSearchParams = {
  sectionId?: string
  uda?: string
  blockId?: string
}

export default async function AtlasMaterialReturnPage({
  searchParams,
}: {
  searchParams: Promise<AtlasReturnSearchParams>
}) {
  const query = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  let lessons: AtlasLessonOption[] = []
  let sectionId = ''
  const expectedUda = clean(query.uda)
  const requestedSectionId = clean(query.sectionId)
  const preferredBlockId = clean(query.blockId).toUpperCase()

  if (requestedSectionId && expectedUda) {
    const annualRepository = new SupabaseAnnualPlanExecutionRepository()
    const snapshot = await annualRepository.list(context.workspace.id, context.academicYear.id)
    const section = snapshot.sections.find((item) => item.id === requestedSectionId)
    if (section) {
      sectionId = section.id
      const grade = GRADE_UI[section.grade]
      lessons = buildBlocks(grade)
        .filter((block) => block.uda === expectedUda)
        .flatMap((block) => {
          const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
          return projection
            ? [{ blockId: block.id, title: projection.title, period: block.period }]
            : []
        })
    }
  }

  return (
    <AppShell active="design" academicYearLabel={context.academicYear.label} workspaceName={context.workspace.name} role={context.role} contentClassName="atlasMaterialReturnSurface">
      <AtlasMaterialReturnReview
        sectionId={sectionId}
        expectedUda={expectedUda}
        lessons={lessons}
        preferredBlockId={lessons.some((lesson) => lesson.blockId === preferredBlockId) ? preferredBlockId : ''}
      />
    </AppShell>
  )
}

function clean(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}
