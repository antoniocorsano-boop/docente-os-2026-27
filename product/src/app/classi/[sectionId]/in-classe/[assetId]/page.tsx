import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { ClassroomSessionClient } from './ClassroomSessionClient'
import { buildClassroomSessionView } from './classroom-session-model'
import './classroom-session.css'

export const dynamic = 'force-dynamic'

export default async function ClassroomSessionPage({
  params,
}: {
  params: Promise<{ sectionId: string; assetId: string }>
}) {
  const { sectionId, assetId } = await params
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const [snapshot, bundle, settings] = await Promise.all([
    new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id),
    new SupabaseKnowledgeRepository().getBundle(context.workspace.id, assetId),
    new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id),
  ])

  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section || !bundle) notFound()
  const view = buildClassroomSessionView(section, bundle.asset)
  if (!view) notFound()

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="classroomSessionSurface"
    >
      <nav aria-label="Contesto della classe">
        <Link href={`/classi/${encodeURIComponent(sectionId)}`}>← Torna alla classe</Link>
      </nav>
      <ClassroomSessionClient view={view} />
      <section className="classroomRecordBar" aria-label="Chiusura della lezione">
        <div>
          <span>DOPO LA LEZIONE</span>
          <strong>Registra ciò che è realmente successo in classe.</strong>
        </div>
        <Link href={`/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}/registra`}>
          Registra la lezione
        </Link>
      </section>
    </AppShell>
  )
}
