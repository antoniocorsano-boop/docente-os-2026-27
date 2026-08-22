import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildClassWorkspaceSummary, formatWeeklyMinutes } from './class-workspace-model'
import './classi.css'

export const dynamic = 'force-dynamic'

export default async function ClassesPage() {
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

  const classes = snapshot.sections
    .map((section) => buildClassWorkspaceSummary(section, assignments, disciplines, snapshot.progress))
    .sort((a, b) => a.compactLabel.localeCompare(b.compactLabel, 'it', { numeric: true }))
  const confirmed = classes.filter((item) => item.sectionStatus === 'CONFERMATA').length
  const onChair = classes.filter((item) => item.assignments.length > 0).length

  return (
    <AppShell active="classes" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="classesWorkspaceSurface">
      <section className="classesHero">
        <div><p>CLASSI · {context.academicYear.label}</p><h1>Le tue classi</h1><span>Le sezioni del tuo contesto professionale. I documenti possono essere collegati alle classi, ma non decidono quali classi esistono.</span></div>
        <Link href="/impostazioni#classi" className="secondaryButton">Gestisci classi</Link>
      </section>

      <section className="classesSummary" aria-label="Riepilogo classi">
        <article><span>Sezioni</span><strong>{classes.length}</strong><small>nel contesto corrente</small></article>
        <article><span>Confermate</span><strong>{confirmed}</strong><small>sezioni confermate</small></article>
        <article><span>In cattedra</span><strong>{onChair}</strong><small>con almeno un insegnamento</small></article>
      </section>

      {classes.length ? (
        <section className="canonicalClassesGrid" aria-label="Sezioni canoniche">
          {classes.map((item) => (
            <Link className="canonicalClassCard" href={`/classi/${item.sectionId}`} key={item.sectionId}>
              <div className="canonicalClassCardTop"><span>CLASSE</span><small className={`classState state-${item.sectionStatus.toLowerCase()}`}>{item.sectionStatusLabel}</small></div>
              <h2>{item.displayLabel}</h2>
              {item.assignments.length ? (
                <div className="classChairSummary">{item.assignments.map((assignment) => <span key={assignment.id}><strong>{assignment.discipline}</strong><small>{formatWeeklyMinutes(assignment.weeklyMinutes)}</small></span>)}</div>
              ) : <p className="classNoChair">Non ancora associata alla tua cattedra.</p>}
              <div className="classProgressSummary"><span>{item.completedBlocks}/33 blocchi registrati</span><strong>Apri la classe <i aria-hidden>→</i></strong></div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="classesEmpty"><span>NESSUNA CLASSE CONFIGURATA</span><h2>Prima definiamo le classi con cui lavori.</h2><p>Le sezioni si configurano nelle Impostazioni. Dopo potrai associarle alla Cattedra e usarle in Orario, Piano annuale e progettazione.</p><Link href="/impostazioni#classi">Configura le classi</Link></section>
      )}
    </AppShell>
  )
}
