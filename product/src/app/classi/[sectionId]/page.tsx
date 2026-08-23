import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { LessonExperienceFeedback } from '@/components/experience-feedback/experience-feedback'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildLessonWorkspaceHref, resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildTaskAwareKnowledgeHref } from '@/core/presentation/task-continuity'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { buildClassWorkspaceLearningFocus, buildClassWorkspaceSummary, formatWeeklyMinutes } from '../class-workspace-model'
import '../classi.css'
import '../class-workspace-operational.css'

export const dynamic = 'force-dynamic'

const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export default async function ClassWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ recorded?: string }>
}) {
  const { sectionId } = await params
  const query = await searchParams
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

  const grade = GRADE_UI[section.grade]
  const blocks = buildBlocks(grade)
  const source = CANONICAL_PLAN_SOURCES[grade]
  const summary = buildClassWorkspaceSummary(section, assignments, disciplines, snapshot.progress)
  const learningFocus = buildClassWorkspaceLearningFocus(section, snapshot.progress, knowledgeItems)

  const nextCanonicalBlock = learningFocus.nextBlock
    ? blocks.find((item) => item.id === learningFocus.nextBlock?.id) ?? null
    : null
  const nextProjection = nextCanonicalBlock
    ? resolveRuntimeHumanTaskLessonProjection(grade, nextCanonicalBlock)
    : null

  const planningHref = `/progetta?grade=${summary.gradeQuery}&section=${encodeURIComponent(summary.sectionId)}`
  const focusPlanningHref = learningFocus.nextBlock
    ? `${planningHref}&block=${encodeURIComponent(learningFocus.nextBlock.id)}&uda=${encodeURIComponent(learningFocus.nextBlock.uda)}&pack=${encodeURIComponent(learningFocus.nextBlock.pack)}#focus-operativo`
    : planningHref
  const modeledLessonHref = nextProjection && learningFocus.nextBlock
    ? buildLessonWorkspaceHref(summary.sectionId, learningFocus.nextBlock.id)
    : null
  const prepareHref = modeledLessonHref ?? focusPlanningHref
  const annualPlanHref = `/piano-annuale?section=${encodeURIComponent(summary.sectionId)}`
  const knowledgeHref = `/knowledge?classLabel=${encodeURIComponent(summary.compactLabel)}`
  const classHref = `/classi/${encodeURIComponent(summary.sectionId)}`

  const requestedRecordedId = query.recorded?.trim().toUpperCase() ?? null
  const recordedBlock = requestedRecordedId
    ? blocks.find((item) => item.id === requestedRecordedId) ?? null
    : null
  const recordedProgress = recordedBlock
    ? snapshot.progress.find((entry) =>
        entry.sectionId === section.id &&
        entry.canonicalGenerationId === source.generationId &&
        entry.blockId === recordedBlock.id &&
        COMPLETE_STATUSES.has(entry.status),
      ) ?? null
    : null
  const recordedProjection = recordedBlock && recordedProgress
    ? resolveRuntimeHumanTaskLessonProjection(grade, recordedBlock)
    : null

  const nextTitle = nextProjection?.title ?? learningFocus.nextBlock?.focus ?? null
  const nextContext = nextProjection
    ? `${nextProjection.udaTitle} · ${nextProjection.period}`
    : learningFocus.nextBlock?.period ?? null

  return (
    <AppShell active="classes" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="classesWorkspaceSurface">
      <section className="classWorkspaceHeader">
        <div><p>CLASSE · {summary.sectionStatusLabel.toUpperCase()}</p><h1>{summary.displayLabel}</h1><span>La prossima lezione e i materiali utili, senza dover ricostruire il piano dai documenti.</span></div>
      </section>

      {recordedBlock && recordedProgress ? (
        <section className="classRecordFeedback" aria-label="Lezione registrata">
          <strong>Lezione registrata.</strong>
          <span>{recordedProjection?.title ?? recordedBlock.focus}. Il prossimo passo qui sotto è stato ricalcolato dal Piano annuale reale della classe.</span>
          {recordedProjection ? <LessonExperienceFeedback sectionId={summary.sectionId} blockId={recordedBlock.id} /> : null}
        </section>
      ) : null}

      <section className="classLessonFocus" aria-label="Prossima lezione nel Piano annuale">
        {learningFocus.nextBlock && nextTitle ? (
          <div className="classLessonFocusMain">
            <p>PROSSIMA LEZIONE · {learningFocus.nextBlock.statusLabel.toUpperCase()}</p>
            <div className="classLessonFocusIdentity"><span aria-hidden>→</span><div><strong>{nextTitle}</strong><small>{nextContext}</small></div></div>
            <p className="classLessonFocusHint">È la prima lezione non ancora conclusa. DOCENTE OS non presume che tu l’abbia già preparata.</p>
          </div>
        ) : (
          <div className="classLessonFocusMain complete"><p>PIANO ANNUALE</p><div className="classLessonFocusIdentity"><span>✓</span><div><strong>Percorso annuale completato</strong><small>Tutte le lezioni attive risultano concluse o escluse.</small></div></div></div>
        )}
        <div className="classLessonFocusAside">
          <div className="classLessonProgress"><strong>{learningFocus.completedBlocks}/33</strong><span>lezioni concluse</span></div>
          <div className="classLessonFocusActions">{learningFocus.nextBlock ? <Link className="primary" href={prepareHref}>{modeledLessonHref ? 'Prepara la lezione' : 'Prepara questa fase'}</Link> : null}<Link href={annualPlanHref}>Registra / rivedi</Link></div>
        </div>
      </section>

      <article className="classWorkspaceCard classMaterialsCard">
        <div><h2>Materiali utili adesso</h2><p>Solo contenuti collegati alla prossima lezione, al grado o a questa sezione.</p></div>
        {learningFocus.materials.length ? <div className="classMaterialList">{learningFocus.materials.map((material) => <Link href={buildTaskAwareKnowledgeHref(material.assetId, { mode: 'class', returnTo: classHref, sectionId: summary.sectionId, blockId: learningFocus.nextBlock?.id })} key={material.assetId}><div><strong>{material.title}</strong><span>{material.categoryLabel}</span></div><small>{material.relevanceLabel}</small></Link>)}</div> : <div className="classMaterialsEmpty"><span>Nessun materiale esplicitamente collegato alla prossima lezione.</span><Link href={knowledgeHref}>Cerca nei materiali</Link></div>}
      </article>

      <details className="humanTaskSecondary">
        <summary>Contesto della classe e altri percorsi</summary>
        <div className="humanTaskSecondaryBody">
          <section className="classWorkspaceGrid">
            <article className="classWorkspaceCard"><div><h2>Cattedra</h2><p>Disciplina e carico settimanale previsto.</p></div>{summary.assignments.length ? <div className="classAssignmentList">{summary.assignments.map((assignment) => <div className="classAssignmentItem" key={assignment.id}><div><strong>{assignment.discipline}</strong><span>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'}</span></div><small>{formatWeeklyMinutes(assignment.weeklyMinutes)}</small></div>)}</div> : <div className="classesEmpty"><strong>Questa classe non è ancora nella tua cattedra.</strong><Link href="/impostazioni#cattedra">Gestisci cattedra</Link></div>}</article>
            <article className="classWorkspaceCard"><div><h2>Altri percorsi</h2><p>Usali quando devi uscire dal compito corrente.</p></div><div className="classQuickLinks"><Link href={annualPlanHref}><strong>Piano annuale</strong><span>Avanzamento e registrazione.</span></Link><Link href={planningHref}><strong>Progetta</strong><span>Esplora il nucleo del grado.</span></Link><Link href={knowledgeHref}><strong>Conoscenza</strong><span>Fonti e materiali della classe.</span></Link><Link href="/orario"><strong>Orario</strong><span>Torna alla settimana.</span></Link></div></article>
          </section>
        </div>
      </details>

      <details className="technicalDetails"><summary><span><strong>Dettagli tecnici</strong><small>Provenienza e riferimenti canonici</small></span><b aria-hidden>＋</b></summary><div className="technicalDetailsBody"><p>Identificatore sezione: <strong>{summary.sectionId}</strong></p>{learningFocus.nextBlock ? <p>Prossimo riferimento: <strong>{learningFocus.nextBlock.id}</strong> · UDA {learningFocus.nextBlock.uda} · {learningFocus.nextBlock.pack}</p> : null}<p>Fonte sezione: {section.sourceNote ?? 'Registro delle classi dell’anno scolastico corrente.'}</p></div></details>
    </AppShell>
  )
}
