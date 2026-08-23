import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { LessonExperienceFeedback } from '@/components/experience-feedback/experience-feedback'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import { allocatedMinutesByBlock, completionProposal, currentTeachingSessions } from '@/core/domain/teaching-session'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildLessonWorkspaceHref, resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildTaskAwareKnowledgeHref } from '@/core/presentation/task-continuity'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { buildClassWorkspaceLearningFocus, buildClassWorkspaceSummary, formatWeeklyMinutes } from '../class-workspace-model'
import { confirmTeachingBlockCompletion } from './actions'
import { TeachingSessionRecorder } from './TeachingSessionRecorder'
import '../classi.css'
import '../class-workspace-operational.css'

export const dynamic = 'force-dynamic'

const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export default async function ClassWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ recorded?: string; session?: string }>
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
  const teachingSessionRepository = new SupabaseTeachingSessionRepository()
  const temporalProjection = new TemporalProjectionService(
    new SupabaseTimetableProjectionReadRepository(),
    new SupabaseCalendarProjectionReadRepository(),
  )
  const today = currentRomeDate()
  const [snapshot, disciplines, assignments, settings, knowledgeItems, teachingSnapshot, temporalDay] = await Promise.all([
    annualRepository.list(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    assignmentReader.list(context.workspace.id, context.academicYear.id),
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    knowledgeRepository.listRecent(context.workspace.id, 100),
    teachingSessionRepository.listBySection(context.workspace.id, context.academicYear.id, sectionId),
    temporalProjection.projectDay({ workspaceId: context.workspace.id, academicYearId: context.academicYear.id, localDate: today }),
  ])

  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()

  const grade = GRADE_UI[section.grade]
  const blocks = buildBlocks(grade)
  const source = CANONICAL_PLAN_SOURCES[grade]
  const summary = buildClassWorkspaceSummary(section, assignments, disciplines, snapshot.progress)
  const learningFocus = buildClassWorkspaceLearningFocus(section, snapshot.progress, knowledgeItems)
  const currentSessions = currentTeachingSessions(teachingSnapshot)
  const allocationTotals = allocatedMinutesByBlock(teachingSnapshot, source.generationId)

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
  const sessionReceipt = query.session ? currentSessions.find((session) => session.id === query.session) ?? null : null

  const nextTitle = nextProjection?.title ?? learningFocus.nextBlock?.focus ?? null
  const nextContext = nextProjection
    ? `${nextProjection.udaTitle} · ${nextProjection.period}`
    : learningFocus.nextBlock?.period ?? null

  const nowMinutes = currentRomeMinutes()
  const recordedOccurrenceIds = new Set(currentSessions.map((session) => session.source.projectedOccurrenceLogicalId).filter((id): id is string => Boolean(id)))
  const eligibleOccurrence = temporalDay.occurrences
    .filter((occurrence) => occurrence.sectionId === sectionId && (occurrence.kind === 'LESSON' || occurrence.kind === 'CLASS_PRESENCE'))
    .filter((occurrence) => !recordedOccurrenceIds.has(occurrence.logicalId))
    .filter((occurrence) => occurrence.startAt ? timeMinutes(occurrence.startAt) <= nowMinutes : true)
    .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''))[0] ?? null

  const startIndex = nextCanonicalBlock ? Math.max(0, blocks.findIndex((block) => block.id === nextCanonicalBlock.id)) : 0
  const recorderBlocks = blocks.slice(startIndex, Math.min(blocks.length, startIndex + 5)).map((block) => ({
    id: block.id,
    title: resolveRuntimeHumanTaskLessonProjection(grade, block)?.title ?? block.title,
    allocatedMinutes: allocationTotals.get(block.id) ?? 0,
    plannedMinutes: block.hours * 60,
  }))
  const nextAllocatedMinutes = nextCanonicalBlock ? allocationTotals.get(nextCanonicalBlock.id) ?? 0 : 0
  const nextCompletion = nextCanonicalBlock
    ? completionProposal({ allocatedMinutes: nextAllocatedMinutes, plannedBlockMinutes: nextCanonicalBlock.hours * 60 })
    : null

  return (
    <AppShell active="classes" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="classesWorkspaceSurface">
      <section className="classWorkspaceHeader">
        <div><p>CLASSE · {summary.sectionStatusLabel.toUpperCase()}</p><h1>{summary.displayLabel}</h1><span>La prossima lezione, ciò che hai realmente svolto e i materiali utili, senza ricostruire il piano dai documenti.</span></div>
      </section>

      {sessionReceipt ? (
        <section className="classRecordFeedback" aria-label="Sessione registrata">
          <strong>Attività registrata.</strong>
          <span>{sessionReceipt.actualMinutes} minuti effettivi del {formatDate(sessionReceipt.localDate)} sono entrati nel registro di attuazione. Il Piano non viene segnato automaticamente come svolto.</span>
        </section>
      ) : null}

      {recordedBlock && recordedProgress ? (
        <section className="classRecordFeedback" aria-label="Lezione registrata">
          <strong>Lezione registrata come svolta.</strong>
          <span>{recordedProjection?.title ?? recordedBlock.focus}. Il prossimo passo qui sotto è stato ricalcolato dal Piano annuale reale della classe.</span>
          {recordedProjection ? <LessonExperienceFeedback sectionId={summary.sectionId} blockId={recordedBlock.id} /> : null}
        </section>
      ) : null}

      <section className="classLessonFocus" aria-label="Prossima lezione nel Piano annuale">
        {learningFocus.nextBlock && nextTitle ? (
          <div className="classLessonFocusMain">
            <p>PROSSIMA LEZIONE · {learningFocus.nextBlock.statusLabel.toUpperCase()}</p>
            <div className="classLessonFocusIdentity"><span aria-hidden>→</span><div><strong>{nextTitle}</strong><small>{nextContext}</small></div></div>
            <p className="classLessonFocusHint">È la prima lezione non ancora conclusa. DOCENTE OS distingue il tempo registrato dalla decisione professionale di considerarla svolta.</p>
          </div>
        ) : (
          <div className="classLessonFocusMain complete"><p>PIANO ANNUALE</p><div className="classLessonFocusIdentity"><span>✓</span><div><strong>Percorso annuale completato</strong><small>Tutte le lezioni attive risultano concluse o escluse.</small></div></div></div>
        )}
        <div className="classLessonFocusAside">
          <div className="classLessonProgress"><strong>{learningFocus.completedBlocks}/33</strong><span>lezioni concluse</span></div>
          <div className="classLessonFocusActions">{learningFocus.nextBlock ? <Link className="primary" href={prepareHref}>{modeledLessonHref ? 'Prepara la lezione' : 'Prepara questa fase'}</Link> : null}<Link href={annualPlanHref}>Registra / rivedi</Link></div>
        </div>
      </section>

      {nextCanonicalBlock ? (
        <section className="teachingSessionCard" aria-labelledby="teaching-session-title">
          <div className="teachingSessionHeading">
            <div><p>ATTUAZIONE REALE</p><h2 id="teaching-session-title">Registra ciò che hai svolto</h2></div>
            <span>{nextCanonicalBlock.id}: <strong>{nextAllocatedMinutes}/{nextCanonicalBlock.hours * 60} min</strong></span>
          </div>
          {eligibleOccurrence ? (
            <TeachingSessionRecorder
              sectionId={sectionId}
              localDate={eligibleOccurrence.localDate}
              occurrenceLogicalId={eligibleOccurrence.logicalId}
              plannedMinutes={eligibleOccurrence.startAt && eligibleOccurrence.endAt ? timeMinutes(eligibleOccurrence.endAt) - timeMinutes(eligibleOccurrence.startAt) : null}
              blocks={recorderBlocks}
            />
          ) : (
            <div className="teachingSessionEmpty">
              <strong>Nessuna lezione di oggi da registrare automaticamente.</strong>
              <span>{temporalDay.calendarState === 'UNDETERMINED' ? 'Il Calendario non ha ancora definito la giornata: DOCENTE OS non inventa una sessione.' : temporalDay.calendarState === 'NO_LESSONS' ? 'Il Calendario indica che oggi non si materializzano lezioni.' : 'Le lezioni già trascorse risultano registrate oppure non c’è un’occorrenza della classe in questa fascia.'}</span>
              <div><Link href="/calendario">Apri Calendario</Link><Link href="/orario">Apri Orario</Link></div>
            </div>
          )}

          {nextCompletion?.maySuggestCompletion ? (
            <div className="teachingCompletionProposal">
              <div><strong>Il monte minuti previsto è stato raggiunto.</strong><span>{nextAllocatedMinutes} minuti effettivi registrati su {nextCanonicalBlock.id}. Questo dato non certifica da solo il completamento didattico.</span></div>
              <form action={confirmTeachingBlockCompletion}>
                <input type="hidden" name="sectionId" value={sectionId} />
                <input type="hidden" name="blockId" value={nextCanonicalBlock.id} />
                <input type="hidden" name="note" value={`Completamento confermato dal docente dopo ${nextAllocatedMinutes} minuti effettivi registrati.`} />
                <button type="submit">Conferma come svolto</button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}

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

      <details className="technicalDetails"><summary><span><strong>Dettagli tecnici</strong><small>Provenienza e riferimenti canonici</small></span><b aria-hidden>＋</b></summary><div className="technicalDetailsBody"><p>Identificatore sezione: <strong>{summary.sectionId}</strong></p>{learningFocus.nextBlock ? <p>Prossimo riferimento: <strong>{learningFocus.nextBlock.id}</strong> · UDA {learningFocus.nextBlock.uda} · {learningFocus.nextBlock.pack}</p> : null}<p>Fonte sezione: {section.sourceNote ?? 'Registro delle classi dell’anno scolastico corrente.'}</p><p>Sessioni effettive correnti: <strong>{currentSessions.length}</strong>. Le sessioni sostituite restano nella storia e non contribuiscono ai totali correnti.</p></div></details>
    </AppShell>
  )
}

function currentRomeDate() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}` }
function currentRomeMinutes() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return Number(value.hour) * 60 + Number(value.minute) }
function timeMinutes(value: string) { const hhmm = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5); const [hours, minutes] = hhmm.split(':').map(Number); return hours * 60 + minutes }
function formatDate(value: string) { const [year, month, day] = value.split('-').map(Number); return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day))) }
