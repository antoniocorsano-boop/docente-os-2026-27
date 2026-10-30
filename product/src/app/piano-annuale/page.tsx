import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import AnnualPlanClient from './AnnualPlanClient'
import {
  CANONICAL_PLAN_SOURCES,
  DEFAULT_SECTION_SETS,
  GRADE_STORAGE,
  type CanonicalPlanRuntimeSources,
  type GradeKey,
} from './model'
import './annual-plan.css'
import './annual-plan-mobile-comfort.css'

export const dynamic = 'force-dynamic'

const GRADES: GradeKey[] = ['Prima', 'Seconda', 'Terza']

export default async function AnnualPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')
  const academicYear = context.academicYear

  const executionRepository = new SupabaseAnnualPlanExecutionRepository()
  await executionRepository.ensureDefaultSections(
    context.workspace.id,
    academicYear.id,
    GRADES.flatMap((grade) =>
      DEFAULT_SECTION_SETS[grade].map((section) => ({
        grade: GRADE_STORAGE[grade],
        sectionCode: section.code,
        status: section.status,
        sourceNote: section.source,
      })),
    ),
  )
  const initialSnapshot = await executionRepository.list(context.workspace.id, academicYear.id)

  const sourceRepository = new SupabaseCanonicalPlanSourceRepository()
  const [primaSource, secondaSource, terzaSource] = await Promise.all(
    GRADES.map((grade) => sourceRepository.resolve({
      workspaceId: context.workspace.id,
      academicYearId: academicYear.id,
      code: CANONICAL_PLAN_SOURCES[grade].code,
    })),
  )
  const runtimeSources: CanonicalPlanRuntimeSources = {
    Prima: primaSource,
    Seconda: secondaSource,
    Terza: terzaSource,
  }

  const requestedSectionId = (await searchParams).section ?? null
  const initialSectionId = requestedSectionId && initialSnapshot.sections.some((section) => section.id === requestedSectionId)
    ? requestedSectionId
    : null

  return (
    <AppShell
      active="annual-plan"
      academicYearLabel={academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="annualPlanSurface"
    >
      <AnnualPlanClient
        initialSnapshot={initialSnapshot}
        runtimeSources={runtimeSources}
        academicYearId={academicYear.id}
        initialSectionId={initialSectionId}
      />
    </AppShell>
  )
}
