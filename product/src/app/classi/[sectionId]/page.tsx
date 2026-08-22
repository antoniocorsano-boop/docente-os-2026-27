import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildTaskAwareKnowledgeHref } from '@/core/presentation/task-continuity'
import { buildClassWorkspaceLearningFocus, buildClassWorkspaceSummary, formatWeeklyMinutes } from '../class-workspace-model'
import '../classi.css'
import '../class-workspace-operational.css'

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
  const knowledgeRepository = new SupabaseKnowledgeRepository()
  const [snapshot, disciplines, assignments, settings, knowledgeItems] = await Promise.all([
    annualRepository.list(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    assignmentReader.list(context.workspace.id, context.academicYear.id),
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    knowledgeRepository.listRecent(context.workspace.id, 100),
  ])

  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()
  const summary = buildClassWorkspaceSummary(section, assignments, disciplines, snapshot.progress)
  const learningFocus = buildClassWorkspaceLearningFocus(section, snapshot.progress, knowledgeItems)
  const planningHref = `/progetta?grade=${summary.gradeQuery}&section=${encodeURIComponent(summary.sectionId)}`
  const focusPlanningHref = learningFocus.nextBlock ? `${planningHref}&block=${encodeURIComponent(learningFocus.nextBlock.id)}&uda=${encodeURIComponent(learningFocus.nextBlock.uda)}&pack=${encodeURIComponent(learningFocus.nextBlock.pack)}#focus-operativo` : planningHref
  const annualPlanHref = `/piano-annuale?section=${encodeURIComponent(summary.sectionId)}`
  const knowledgeHref = `/knowledge?classLabel=${encodeURIComponent(summary.compactLabel)}`
  const classHref = `/classi/${encodeURIComponent(summary.sectionId)}`

  return (
    <AppShell active="classes" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="classesWorkspaceSurface">
      <section className="classWorkspaceHeader">
        <div><p>CLASSE · {summary.sectionStatusLabel.toUpperCase()}</p><h1>{summary.displayLabel}</h1><span>Il contesto operativo della sezione: prossimo tratto didattico e materiali pertinenti prima di tutto.</span></div>
      </section>

      <section className="classLessonFocus" aria-label="Posizione corrente nel Piano annuale">
        {learningFocus.nextBlock ? <div className="classLessonFocusMain"><p>PROSSIMO NEL PIANO · {learningFocus.nextBlock.statusLabel.toUpperCase()}</p><div className="classLessonFocusIdentity"><span>{learningFocus.nextBlock.id}</span><div><strong>{learningFocus.nextBlock.focus}</strong><small>UDA {learningFocus.nextBlock.uda} · {learningFocus.nextBlock.pack} · {learningFocus.nextBlock.period}</small></div></div><p className="classLessonFocusHint">È la prima fase non ancora completata. DOCENTE OS non presume che tu la stia già preparando.</p></div> : <div className="classLessonFocusMain complete"><p>PIANO ANNUALE</p><div className="classLessonFocusIdentity"><span>✓</span><div><strong>Percorso annuale completato</strong><small>Tutti i blocchi attivi risultano conclusi o esclusi.</small></div></div></div>}
        <div className="classLessonFocusAside"><div className="classLessonProgress"><strong>{learningFocus.completedBlocks}/33</strong><span>blocchi completati</span></div><div className="classLessonFocusActions">{learningFocus.nextBlock ? <Link className="primary" href={focusPlanningHref}>Prepara questa fase</Link> : null}<Link href={annualPlanHref}>Registra / rivedi</Link></div></div>
      </section>

      <article className="classWorkspaceCard classMaterialsCard">
        <div><h2>Materiali pertinenti</h2><p>Solo contenuti collegati esplicitamente alla fase corrente, al grado o a questa sezione.</p></div>
        {learningFocus.materials.length ? <div className="classMaterialList">{learningFocus.materials.map((material) => <Link href={buildTaskAwareKnowledgeHref(material.assetId, { mode: 'class', returnTo: classHref, sectionId: summary.sectionId, blockId: learningFocus.nextBlock?.id })} key={material.assetId}><div><strong>{material.title}</strong><span>{material.categoryLabel}</span></div><small>{material.relevanceLabel}</small></Link>)}</div> : <div className="classMaterialsEmpty"><span>Nessun materiale esplicitamente collegato a questa fase.</span><Link href={knowledgeHref}>Cerca nei materiali</Link></div>}
      </article>

      <details className="humanTaskSecondary">
        <summary>Contesto della classe e altri percorsi</summary>
        <div className="humanTaskSecondaryBody">
          <section className="classWorkspaceGrid">
            <article className="classWorkspaceCard"><div><h2>Cattedra</h2><p>Disciplina e carico settimanale previsto.</p></div>{summary.assignments.length ? <div className="classAssignmentList">{summary.assignments.map((assignment) => <div className="classAssignmentItem" key={assignment.id}><div><strong>{assignment.discipline}</strong><span>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'}</span></div><small>{formatWeeklyMinutes(assignment.weeklyMinutes)}</small></div>)}</div> : <div className="classesEmpty"><strong>Questa classe non è ancora nella tua cattedra.</strong><Link href="/impostazioni#cattedra">Gestisci cattedra</Link></div>}</article>
            <article className="classWorkspaceCard"><div><h2>Altri percorsi</h2><p>Usali quando devi uscire dal compito corrente.</p></div><div className="classQuickLinks"><Link href={annualPlanHref}><strong>Piano annuale</strong><span>Avanzamento e registrazione.</span></Link><Link href={planningHref}><strong>Progetta</strong><span>Esplora tutto il nucleo del grado.</span></Link><Link href={knowledgeHref}><strong>Conoscenza</strong><span>Fonti e materiali della classe.</span></Link><Link href="/orario"><strong>Orario</strong><span>Torna alla settimana.</span></Link></div></article>
          </section>
        </div>
      </details>

      <details className="technicalDetails"><summary><span><strong>Dettagli della sezione</strong><small>Provenienza e identificatore canonico</small></span><b aria-hidden>＋</b></summary><div className="technicalDetailsBody"><p>Identificatore: <strong>{summary.sectionId}</strong></p><p>Fonte: {section.sourceNote ?? 'Registro delle classi dell’anno scolastico corrente.'}</p></div></details>
    </AppShell>
  )
}
