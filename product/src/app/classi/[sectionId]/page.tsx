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
import { buildTaskAwareKnowledgeHref, buildTaskAwareKnowledgeListHref } from '@/core/presentation/task-continuity'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { buildClassWorkspaceLearningFocus, buildClassWorkspaceSummary, formatWeeklyMinutes, selectPreparedClassMaterials } from '../class-workspace-model'
import { isCurrentDaySessionReceipt, presentClassRecorderEmptyState, presentClassTaskState, resolveClassTaskDecision } from './class-task-state'
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
  const previousDate = shiftLocalDate(today, -1)
  const [snapshot, disciplines, assignments, settings, knowledgeItems, teachingSnapshot, temporalDay, previousTemporalDay] = await Promise.all([
    annualRepository.list(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    assignmentReader.list(context.workspace.id, context.academicYear.id),
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    knowledgeRepository.listRecent(context.workspace.id, 100),
    teachingSessionRepository.listBySection(context.workspace.id, context.academicYear.id, sectionId),
    temporalProjection.projectDay({ workspaceId: context.workspace.id, academicYearId: context.academicYear.id, localDate: today }),
    temporalProjection.projectDay({ workspaceId: context.workspace.id, academicYearId: context.academicYear.id, localDate: previousDate }),
  ])

  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()

  const grade = GRADE_UI[section.grade]
  const blocks = buildBlocks(grade)
  const source = CANONICAL_PLAN_SOURCES[grade]
  const summary = buildClassWorkspaceSummary(section, assignments, disciplines, snapshot.progress)
  const learningFocus = buildClassWorkspaceLearningFocus(section, snapshot.progress, knowledgeItems)
  const preparedMaterials = selectPreparedClassMaterials(section, knowledgeItems, today)
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
  const annualPlanHref = `/piano-annuale?section=${encodeURIComponent(summary.sectionId)}`
  const classHref = `/classi/${encodeURIComponent(summary.sectionId)}`
  const knowledgeHref = buildTaskAwareKnowledgeListHref({
    mode: 'class',
    returnTo: classHref,
    sectionId: summary.sectionId,
    blockId: learningFocus.nextBlock?.id,
    classLabel: summary.compactLabel,
  })

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
  const hasTodaySessionReceipt = isCurrentDaySessionReceipt(sessionReceipt?.localDate, today)

  const nextTitle = nextProjection?.title ?? learningFocus.nextBlock?.focus ?? null
  const nextContext = nextProjection
    ? `${nextProjection.udaTitle} · ${nextProjection.period}`
    : learningFocus.nextBlock?.period ?? null

  const nowMinutes = currentRomeMinutes()
  const recordedOccurrenceIds = new Set(currentSessions.map((session) => session.source.projectedOccurrenceLogicalId).filter((id): id is string => Boolean(id)))
  const unrecordedOccurrences = temporalDay.occurrences
    .filter((occurrence) => occurrence.sectionId === sectionId && (occurrence.kind === 'LESSON' || occurrence.kind === 'CLASS_PRESENCE'))
    .filter((occurrence) => !recordedOccurrenceIds.has(occurrence.logicalId))
  const eligibleOccurrence = unrecordedOccurrences
    .filter((occurrence) => occurrence.startAt ? timeMinutes(occurrence.startAt) <= nowMinutes : true)
    .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''))[0] ?? null
  const hasFutureOccurrence = unrecordedOccurrences.some((occurrence) => occurrence.startAt ? timeMinutes(occurrence.startAt) > nowMinutes : false)
  const pendingPastOccurrence = previousTemporalDay.occurrences
    .filter((occurrence) => occurrence.sectionId === sectionId && (occurrence.kind === 'LESSON' || occurrence.kind === 'CLASS_PRESENCE'))
    .filter((occurrence) => !recordedOccurrenceIds.has(occurrence.logicalId))
    .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''))[0] ?? null
  const recordingOccurrence = eligibleOccurrence ?? pendingPastOccurrence

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
  const occurrenceEnded = eligibleOccurrence?.endAt ? timeMinutes(eligibleOccurrence.endAt) <= nowMinutes : false
  const taskDecision = resolveClassTaskDecision({
    hasNextBlock: Boolean(nextCanonicalBlock),
    hasModeledLesson: Boolean(nextProjection && learningFocus.nextBlock),
    hasSessionReceipt: hasTodaySessionReceipt,
    hasEligibleOccurrence: Boolean(eligibleOccurrence),
    hasPendingPastOccurrence: Boolean(pendingPastOccurrence),
    occurrenceEnded,
    maySuggestCompletion: Boolean(nextCompletion?.maySuggestCompletion),
  })
  const taskPresentation = presentClassTaskState(taskDecision.state)
  const recorderEmptyPresentation = presentClassRecorderEmptyState({
    calendarState: temporalDay.calendarState,
    hasSessionReceipt: hasTodaySessionReceipt,
    hasFutureOccurrence,
  })
  const taskHref = taskDecision.focusCompletion
    ? '#decisione-completamento'
    : taskDecision.useInlineRecorder
      ? '#registrazione-avanzata'
      : taskDecision.lessonMode && nextProjection && learningFocus.nextBlock
        ? buildLessonWorkspaceHref(summary.sectionId, learningFocus.nextBlock.id, taskDecision.lessonMode)
        : focusPlanningHref
  const advancedPanelId = taskDecision.focusCompletion ? 'decisione-completamento' : 'registrazione-avanzata'

  return (
    <AppShell active="classes" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="classesWorkspaceSurface">
      <section className="classWorkspaceHeader">
        <div><p>CLASSE · {summary.sectionStatusLabel.toUpperCase()}</p><h1>{summary.displayLabel}</h1><span>Qui trovi il lavoro da fare adesso. Il resto si apre solo quando serve.</span></div>
      </section>

      <section className="classLessonFocus" aria-label="Lavoro della classe adesso">
        {learningFocus.nextBlock && nextTitle ? (
          <div className="classLessonFocusMain">
            <p>{taskPresentation.eyebrow}</p>
            <div className="classLessonFocusIdentity"><span aria-hidden>→</span><div><strong>{nextTitle}</strong><small>{nextContext}</small></div></div>
            <p className="classLessonFocusHint">{taskPresentation.hint}</p>
            <p className="classLessonFocusHint">{taskPresentation.nextStep}</p>
          </div>
        ) : (
          <div className="classLessonFocusMain complete">
            <p>{taskPresentation.eyebrow}</p>
            <div className="classLessonFocusIdentity"><span>✓</span><div><strong>Percorso annuale completato</strong><small>{taskPresentation.hint}</small></div></div>
            <p className="classLessonFocusHint">{taskPresentation.nextStep}</p>
          </div>
        )}
        <div className="classLessonFocusAside">
          <div className="classLessonProgress"><strong>{learningFocus.completedBlocks}/33</strong><span>lezioni concluse</span></div>
          <div className="classLessonFocusActions">{taskDecision.label ? <Link className="primary" href={taskHref}>{taskDecision.label}</Link> : null}</div>
        </div>
      </section>

      {recordedBlock && recordedProgress ? (
        <section className="classRecordFeedback" aria-label="Ultimo aggiornamento">
          <strong>Lezione registrata come svolta.</strong>
          <span>{recordedProjection?.title ?? recordedBlock.focus}. Il prossimo passo sopra è stato ricalcolato dal Piano annuale reale della classe.</span>
          {recordedProjection ? <LessonExperienceFeedback sectionId={summary.sectionId} blockId={recordedBlock.id} /> : null}
        </section>
      ) : sessionReceipt ? (
        <section className="classRecordFeedback" aria-label="Ultimo aggiornamento">
          <strong>Attività registrata.</strong>
          <span>{sessionReceipt.actualMinutes} minuti effettivi del {formatDate(sessionReceipt.localDate)} sono entrati nel registro di attuazione. Il Piano non viene segnato automaticamente come svolto.</span>
        </section>
      ) : null}

      {nextCanonicalBlock ? (
        <details id={advancedPanelId} className="humanTaskSecondary" open={taskDecision.useInlineRecorder || taskDecision.focusCompletion}>
          <summary>{taskDecision.focusCompletion ? 'Valuta il completamento' : taskDecision.state === 'CATCH_UP' ? 'Registra la lezione precedente' : taskDecision.useInlineRecorder ? 'Registra questa lezione' : 'Decisioni e registrazione avanzata'}</summary>
          <div className="humanTaskSecondaryBody">
            <section className="teachingSessionCard" aria-labelledby="teaching-session-title">
              <div className="teachingSessionHeading">
                <div><p>{taskDecision.focusCompletion ? 'DECISIONE PROFESSIONALE' : 'ATTUAZIONE REALE'}</p><h2 id="teaching-session-title">{taskDecision.focusCompletion ? 'Valuta se il blocco è davvero concluso' : 'Registra ciò che hai svolto'}</h2></div>
                <span>{nextCanonicalBlock.id}: <strong>{nextAllocatedMinutes}/{nextCanonicalBlock.hours * 60} min</strong></span>
              </div>
              {!taskDecision.focusCompletion ? (
                recordingOccurrence ? (
                  <TeachingSessionRecorder
                    sectionId={sectionId}
                    localDate={recordingOccurrence.localDate}
                    occurrenceLogicalId={recordingOccurrence.logicalId}
                    plannedMinutes={recordingOccurrence.startAt && recordingOccurrence.endAt ? timeMinutes(recordingOccurrence.endAt) - timeMinutes(recordingOccurrence.startAt) : null}
                    blocks={recorderBlocks}
                  />
                ) : (
                  <>
                    <div className="teachingSessionEmpty">
                      <strong>{recorderEmptyPresentation.title}</strong>
                      <span>{recorderEmptyPresentation.detail}</span>
                      {recorderEmptyPresentation.showScheduleLinks ? <div><Link href="/calendario">Apri Calendario</Link><Link href="/orario">Apri Orario</Link></div> : null}
                    </div>
                    <details className="teachingSessionSplit" id="registrazione-retroattiva">
                      <summary>Registra una lezione precedente</summary>
                      <TeachingSessionRecorder
                        sectionId={sectionId}
                        localDate={previousDate}
                        occurrenceLogicalId={null}
                        plannedMinutes={null}
                        allowDateSelection
                        maxLocalDate={today}
                        blocks={recorderBlocks}
                      />
                    </details>
                  </>
                )
              ) : null}

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
          </div>
        </details>
      ) : null}

      <details className="humanTaskSecondary" data-testid="class-lesson-supports">
        <summary>Supporti per questa lezione</summary>
        <div className="humanTaskSecondaryBody">
          {preparedMaterials.length ? (
            <article className="classWorkspaceCard classMaterialsCard" aria-label="Materiale predisposto per la classe">
              <div><h2>Già predisposto</h2><p>Risorse pronte per il prossimo incontro, senza alterare automaticamente il Piano.</p></div>
              <div className="classMaterialList">
                {preparedMaterials.map((material) => (
                  <a href={material.href} key={material.assetId}>
                    <div>
                      <strong>{material.title}</strong>
                      <span>{material.resourceKindLabel} · {material.providerLabel}{material.targetDate ? ` · ${formatDate(material.targetDate)}` : ''}</span>
                      {material.canonicalBindingLabel ? <span>{material.canonicalBindingLabel}</span> : null}
                    </div>
                    <small>{material.stateLabel} · {material.audienceLabel}</small>
                  </a>
                ))}
              </div>
            </article>
          ) : null}

          <article className="classWorkspaceCard classMaterialsCard">
            <div><h2>Materiali collegati</h2><p>Contenuti pertinenti alla prossima lezione, al grado o a questa sezione.</p></div>
            {learningFocus.materials.length ? <div className="classMaterialList">{learningFocus.materials.map((material) => <Link href={buildTaskAwareKnowledgeHref(material.assetId, { mode: 'class', returnTo: classHref, sectionId: summary.sectionId, blockId: learningFocus.nextBlock?.id })} key={material.assetId}><div><strong>{material.title}</strong><span>{material.categoryLabel}</span></div><small>{material.relevanceLabel}</small></Link>)}</div> : <div className="classMaterialsEmpty"><span>Nessun materiale esplicitamente collegato alla prossima lezione.</span><Link href={knowledgeHref}>Cerca nei materiali</Link></div>}
          </article>
        </div>
      </details>

      <details className="humanTaskSecondary">
        <summary>Contesto della classe e altri percorsi</summary>
        <div className="humanTaskSecondaryBody">
          <section className="classWorkspaceGrid">
            <article className="classWorkspaceCard"><div><h2>Cattedra</h2><p>Disciplina e carico settimanale previsto.</p></div>{summary.assignments.length ? <div className="classAssignmentList">{summary.assignments.map((assignment) => <div className="classAssignmentItem" key={assignment.id}><div><strong>{assignment.discipline}</strong><span>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'}</span></div><small>{formatWeeklyMinutes(assignment.weeklyMinutes)}</small></div>)}</div> : <div className="classesEmpty"><strong>Questa classe non è ancora nella tua cattedra.</strong><Link href="/impostazioni#cattedra">Gestisci cattedra</Link></div>}</article>
            <article className="classWorkspaceCard"><div><h2>Altri percorsi</h2><p>Usali quando devi uscire dal compito corrente.</p></div><div className="classQuickLinks"><Link href={annualPlanHref}><strong>Piano annuale</strong><span>Avanzamento e decisioni professionali.</span></Link><Link href={planningHref}><strong>Progetta</strong><span>Esplora il nucleo del grado.</span></Link><Link href={knowledgeHref}><strong>Conoscenza</strong><span>Fonti e materiali della classe.</span></Link><Link href="/orario"><strong>Orario</strong><span>Torna alla settimana.</span></Link></div></article>
          </section>
        </div>
      </details>

      <details className="technicalDetails"><summary><span><strong>Dettagli tecnici</strong><small>Provenienza e riferimenti canonici</small></span><b aria-hidden>＋</b></summary><div className="technicalDetailsBody"><p>Identificatore sezione: <strong>{summary.sectionId}</strong></p>{learningFocus.nextBlock ? <p>Prossimo riferimento: <strong>{learningFocus.nextBlock.id}</strong> · UDA {learningFocus.nextBlock.uda} · {learningFocus.nextBlock.pack}</p> : null}<p>Fonte sezione: {section.sourceNote ?? 'Registro delle classi dell’anno scolastico corrente.'}</p><p>Sessioni effettive correnti: <strong>{currentSessions.length}</strong>. Le sessioni sostituite restano nella storia e non contribuiscono ai totali correnti.</p></div></details>
    </AppShell>
  )
}

function currentRomeDate() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}` }
function shiftLocalDate(value: string, days: number) { const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10) }
function currentRomeMinutes() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return Number(value.hour) * 60 + Number(value.minute) }
function timeMinutes(value: string) { const hhmm = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5); const [hours, minutes] = hhmm.split(':').map(Number); return hours * 60 + minutes }
function formatDate(value: string) { const [year, month, day] = value.split('-').map(Number); return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day))) }