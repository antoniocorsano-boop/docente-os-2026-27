import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import AnnualPlanClient from './AnnualPlanClient'
import { DEFAULT_SECTION_SETS, GRADE_STORAGE, type GradeKey } from './model'
import './annual-plan.css'
import './annual-plan-mobile-comfort.css'

export const dynamic = 'force-dynamic'

export default async function AnnualPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const executionRepository = new SupabaseAnnualPlanExecutionRepository()
  let initialSnapshot = await executionRepository.list(context.workspace.id, context.academicYear.id)

  // Default sections are a first-run bootstrap, not work to repeat on every navigation.
  if (!initialSnapshot.sections.length) {
    await executionRepository.ensureDefaultSections(
      context.workspace.id,
      context.academicYear.id,
      (['Prima', 'Seconda', 'Terza'] as GradeKey[]).flatMap((grade) =>
        DEFAULT_SECTION_SETS[grade].map((section) => ({
          grade: GRADE_STORAGE[grade],
          sectionCode: section.code,
          status: section.status,
          sourceNote: section.source,
        })),
      ),
    )
    initialSnapshot = await executionRepository.list(context.workspace.id, context.academicYear.id)
  }

  const requestedSectionId = (await searchParams).section ?? null
  const initialSectionId = requestedSectionId && initialSnapshot.sections.some((section) => section.id === requestedSectionId)
    ? requestedSectionId
    : null

  return (
    <AppShell
      active="annual-plan"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="annualPlanSurface"
    >
      <AnnualPlanClient initialSnapshot={initialSnapshot} academicYearId={context.academicYear.id} initialSectionId={initialSectionId} />
    </AppShell>
  )
}
