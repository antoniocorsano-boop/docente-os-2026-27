import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { mayConsultProvisionalTechnology } from '@/core/domain/cml-provisional-technology-reference'
import { readProvisionalArenaReferenceForClass } from '@/core/server/cml-provisional-arena-release'
import { ArenaProvisionalGradePreviewClient } from './arena-provisional-grade-preview-client'
import '../../classi.css'
import '../../class-workspace-operational.css'

export const dynamic = 'force-dynamic'

/**
 * Un'unica consultazione del curricolo per ogni classe autorizzata.
 * The section ID scopes access; the grade selects the Arena segment.
 * Historical records are read on demand through the same archive route
 * per tutte le classi, senza un secondo procedimento curricolare.
 */
export default async function CurriculumArenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ accepted?: string }>
}) {
  const { sectionId } = await params
  const query = await searchParams
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const snapshot = await new SupabaseAnnualPlanExecutionRepository().list(
    context.workspace.id,
    context.academicYear.id,
  )
  const section = snapshot.sections.find((candidate) => candidate.id === sectionId)
  if (!section) notFound()

  const [assignments, disciplines] = await Promise.all([
    new SupabaseTeachingAssignmentReader().list(context.workspace.id, context.academicYear.id),
    new SupabaseTeacherSettingsRepository().listDisciplines(context.workspace.id, context.academicYear.id),
  ])
  const readScope = {
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    schoolYearRef: context.academicYear.label,
    grade: section.grade,
    assignments,
    disciplines,
  }

  if (!mayConsultProvisionalTechnology(readScope)) notFound()
  // Compatibility of historic form redirects, identical for every section.
  if (query.accepted === 'known' || query.accepted === '1') {
    redirect(`/classi/${encodeURIComponent(sectionId)}/curricolo-arena/storico?accepted=${query.accepted}`)
  }
  const arenaSource = await readProvisionalArenaReferenceForClass(readScope)
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const sectionLabel = `${gradeNumber(section.grade)}ª ${section.sectionCode}`

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="classesWorkspaceSurface"
    >
      <section className="classWorkspaceHeader">
        <div>
          <p>CLASSE · CURRICOLO DI RIFERIMENTO</p>
          <h1>{sectionLabel}</h1>
          <span>
            Consulta il segmento pertinente del curricolo provvisorio di Tecnologia.
            La fonte è comune; programmazione, attività e registrazioni restano della classe.
          </span>
        </div>
      </section>

      <section aria-label="Consultazione curricolare provvisoria">
        <ArenaProvisionalGradePreviewClient
          section={{
            grade: section.grade,
            sectionCode: section.sectionCode,
            schoolYearRef: context.academicYear.label,
          }}
          serverReference={arenaSource.reference}
          sourceStatus={arenaSource.status}
        />
      </section>

      <p>
        <Link href={`${classHref}/curricolo-arena/storico`}>
          Registrazioni e riferimenti già acquisiti
        </Link>
      </p>
      <Link href={classHref}>← Torna alla classe</Link>
    </AppShell>
  )
}

function gradeNumber(grade: 'PRIMA' | 'SECONDA' | 'TERZA') {
  if (grade === 'PRIMA') return '1'
  if (grade === 'SECONDA') return '2'
  return '3'
}
