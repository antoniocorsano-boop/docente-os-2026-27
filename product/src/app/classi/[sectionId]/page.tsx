import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildClassWorkspaceSummary, formatWeeklyMinutes } from '../class-workspace-model'
import '../classi.css'

export const dynamic = 'force-dynamic'

export default async function ClassWorkspacePage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const assignmentReader = new SupabaseTeachingAssignmentReader()
  const [snapshot, disciplines, assignments, settings] = await Promise.all([
    annualRepository.list(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    assignmentReader.list(context.workspace.id, context.academicYear.id),
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
  ])

  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()
  const summary = buildClassWorkspaceSummary(section, assignments, disciplines, snapshot.progress)

  return (
    <AppShell active="classes" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="classesWorkspaceSurface">
      <section className="classWorkspaceHeader">
        <div><p>CLASSE · {summary.sectionStatusLabel.toUpperCase()}</p><h1>{summary.displayLabel}</h1><span>Il punto di accesso alla didattica di questa sezione. I dati restano nei rispettivi registri: qui li ritrovi senza duplicarli.</span></div>
        <div className="classWorkspaceActions"><Link className="primary" href={`/piano-annuale?section=${encodeURIComponent(summary.sectionId)}`}>Piano annuale</Link><Link href={`/progetta?grade=${summary.gradeQuery}&section=${encodeURIComponent(summary.sectionId)}`}>Progetta</Link></div>
      </section>

      <section className="classWorkspaceGrid">
        <article className="classWorkspaceCard">
          <div><h2>Cattedra</h2><p>Quello che insegni in questa classe e il carico settimanale previsto.</p></div>
          {summary.assignments.length ? <div className="classAssignmentList">{summary.assignments.map((assignment) => <div className="classAssignmentItem" key={assignment.id}><div><strong>{assignment.discipline}</strong><span>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'}</span></div><small>{formatWeeklyMinutes(assignment.weeklyMinutes)}</small></div>)}</div> : <div className="classesEmpty"><strong>Questa classe non è ancora nella tua cattedra.</strong><Link href="/impostazioni#cattedra">Gestisci cattedra</Link></div>}
        </article>

        <article className="classWorkspaceCard">
          <div><h2>Piano annuale</h2><p>Avanzamento didattico registrato per questa sezione.</p></div>
          <div className="classProgressHero"><strong>{summary.completedBlocks}/33</strong><span>blocchi completati</span></div>
          <Link className="secondaryButton" href={`/piano-annuale?section=${encodeURIComponent(summary.sectionId)}`}>Apri avanzamento</Link>
        </article>
      </section>

      <section className="classWorkspaceCard">
        <div><h2>Continua il lavoro</h2><p>Scegli la superficie giusta senza perdere il contesto della classe.</p></div>
        <div className="classQuickLinks">
          <Link href={`/piano-annuale?section=${encodeURIComponent(summary.sectionId)}`}><strong>Piano annuale</strong><span>Cosa insegnare e cosa hai svolto.</span></Link>
          <Link href={`/progetta?grade=${summary.gradeQuery}&section=${encodeURIComponent(summary.sectionId)}`}><strong>Progetta</strong><span>Programmazione, UDA e materiali del grado.</span></Link>
          <Link href={`/knowledge?classLabel=${encodeURIComponent(summary.compactLabel)}`}><strong>Conoscenza</strong><span>Fonti e materiali collegati alla classe.</span></Link>
          <Link href="/orario"><strong>Orario</strong><span>Torna alla mappa della settimana.</span></Link>
        </div>
      </section>

      <details className="technicalDetails"><summary><span><strong>Dettagli della sezione</strong><small>Provenienza e identificatore canonico</small></span><b aria-hidden>＋</b></summary><div className="technicalDetailsBody"><p>Identificatore: <strong>{summary.sectionId}</strong></p><p>Fonte: {section.sourceNote ?? 'Registro delle classi dell’anno scolastico corrente.'}</p></div></details>
    </AppShell>
  )
}
