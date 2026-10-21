import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { LessonExperienceFeedback } from '@/components/experience-feedback/experience-feedback'
import { buildClassMaterialAcceptanceEvidenceV1 } from '@/core/application/class-material-acceptance-evidence'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import { allocatedMinutesByBlock, completionProposal, currentTeachingSessions } from '@/core/domain/teaching-session'
import { parseTeachingSessionEvidenceNote } from '@/core/domain/teaching-session-reflection'
import { bindArenaDisciplineRefToDocenteOs, isEco02PilotClass } from '@/core/domain/cml-discipline-binding'
import { eco02PilotIdentityFromEnv } from '@/core/server/eco02-pilot-config'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseMaterialContentReadPortV1 } from '@/core/infrastructure/supabase/supabase-material-content-read-port'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildCanonicalLessonWorkspaceHref } from '@/core/presentation/lesson-workspace-route'
import { buildTaskAwareKnowledgeHref, buildTaskAwareKnowledgeListHref } from '@/core/presentation/task-continuity'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { buildClassWorkspaceLearningFocus, buildClassWorkspaceSummary, formatWeeklyMinutes, selectPreparedClassMaterials } from '../class-workspace-model'
import { isCurrentDaySessionReceipt, presentClassRecorderEmptyState, presentClassTaskState, resolveClassTaskDecision } from './class-task-state'
import { SessionReplanningReceipt } from './session-replanning-receipt'
import { ClassSecondaryTools } from './class-secondary-tools'
import '../classi.css'
import '../class-workspace-operational.css'

export const dynamic = 'force-dynamic'

const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export default async function ClassWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ recorded?: string; session?: string; replanning?: string }>
}) {
  const { sectionId } = await params
  const query = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')
  const academicYearId = context.academicYear.id

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
    annualRepository.list(context.workspace.id, academicYearId),
    settingsRepository.listDisciplines(context.workspace.id, academicYearId),
    assignmentReader.list(context.workspace.id, academicYearId),
    settingsRepository.getOrCreate(context.workspace.id, academicYearId),
    knowledgeRepository.listRecent(context.workspace.id, 100),
    teachingSessionRepository.listBySection(context.workspace.id, academicYearId, sectionId),
    temporalProjection.projectDay({ workspaceId: context.workspace.id, academicYearId, localDate: today }),
    temporalProjection.projectDay({ workspaceId: context.workspace.id, academicYearId, localDate: previousDate }),
  ])

  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()

  const grade = GRADE_UI[section.grade]
  const blocks = buildBlocks(grade)
  const source = await new SupabaseCanonicalPlanSourceRepository().resolve({
    workspaceId: context.workspace.id,
    academicYearId,
    code: CANONICAL_PLAN_SOURCES[grade].code,
  })
  const canonicalGenerationId = source?.generationId ?? null
  const summary = buildClassWorkspaceSummary(section, assignments, disciplines, snapshot.progress, canonicalGenerationId)
  const showArenaPilotIntake = isEco02PilotClass({
    workspaceId: context.workspace.id,
    academicYearId,
    sectionId: section.id,
    grade: section.grade,
    sectionCode: section.sectionCode,
  }, eco02PilotIdentityFromEnv()) && summary.assignments.some(
    (assignment) => bindArenaDisciplineRefToDocenteOs(assignment.discipline) === 'technology',
  )
  const learningFocus = buildClassWorkspaceLearningFocus(section, snapshot.progress, canonicalGenerationId, knowledgeItems)
  const currentSessions = currentTeachingSessions(teachingSnapshot)
  const allocationTotals = source
    ? allocatedMinutesByBlock(teachingSnapshot, source.generationId)
    : new Map<string, number>()

  const nextCanonicalBlock = learningFocus.nextBlock
    ? blocks.find((item) => item.id === learningFocus.nextBlock?.id) ?? null
    : null
  const advancedBlockId = nextCanonicalBlock?.id ?? null
  const nextProjection = nextCanonicalBlock
    ? resolveRuntimeHumanTaskLessonProjection(grade, nextCanonicalBlock)
    : null
  const preparedMaterialsForEvidence = selectPreparedClassMaterials(section, knowledgeItems, today)
  const preparedMaterialAssetIds = new Set(preparedMaterialsForEvidence.map((material) => material.assetId))
  const preparedMaterialBlockIds = new Set(
    knowledgeItems.flatMap(({ asset }) => {
      if (!preparedMaterialAssetIds.has(asset.id)) return []
      const canonicalBlockId = asset.sourceMetadata.canonicalBlockId
      return typeof canonicalBlockId === 'string' && canonicalBlockId.trim().length > 0
        ? [canonicalBlockId.trim()]
        : []
    }),
  )
  const lessonDesignRepository = new SupabaseLessonDesignRepository()
  const acceptanceExtensions = source
    ? (
        await Promise.all(
          blocks
            .filter((block) => preparedMaterialBlockIds.has(block.id))
            .map(async (block) => {
              const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
              if (!projection) return []
              return lessonDesignRepository.list({
                workspaceId: context.workspace.id,
                academicYearId,
                sectionId: section.id,
                canonicalPlanAssetId: source.assetId,
                canonicalGenerationId: source.generationId,
                blockId: block.id,
                projectionId: projection.projectionId,
              })
            }),
        )
      ).flat()
    : []
  const acceptanceEvidence = await buildClassMaterialAcceptanceEvidenceV1({
    workspaceId: context.workspace.id,
    extensions: acceptanceExtensions,
    readPort: new SupabaseMaterialContentReadPortV1(),
  })
  const preparedMaterials = selectPreparedClassMaterials(section, knowledgeItems, today, acceptanceEvidence)

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
  const recordedProgress = source && recordedBlock
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
  const nextCompletion = nextCanonicalBlock && source
    ? completionProposal({ allocatedMinutes: nextAllocatedMinutes, plannedBlockMinutes: nextCanonicalBlock.hours * 60 })
    : null
  const latestSession = [...currentSessions].sort((left, right) => {
    const leftKey = left.plannedEndAt ?? left.plannedStartAt ?? `${left.localDate}T23:59:59`
    const rightKey = right.plannedEndAt ?? right.plannedStartAt ?? `${right.localDate}T23:59:59`
    return rightKey.localeCompare(leftKey) || right.recordedAt.localeCompare(left.recordedAt)
  })[0] ?? null
  const latestEvidence = parseTeachingSessionEvidenceNote(latestSession?.evidenceNote ?? null)
  const latestAllocation = latestSession && source
    ? teachingSnapshot.allocations.find((allocation) => (
        allocation.sessionId === latestSession.id
        && allocation.canonicalGenerationId === source.generationId
      )) ?? null
    : null
  const latestBlock = latestAllocation
    ? blocks.find((block) => block.id === latestAllocation.blockId) ?? null
    : null
  const latestProjection = latestBlock
    ? resolveRuntimeHumanTaskLessonProjection(grade, latestBlock)
    : null
  const lastActualWork = latestEvidence?.reflection.activityDone || latestProjection?.title || (latestSession ? 'Lezione registrata' : 'Nessun lavoro registrato')
  const nextActivity = latestEvidence?.reflection.nextActivity || nextTitle || 'Nessuna prossima attività registrata'
  const recentContext = latestSession
    ? `${formatDate(latestSession.localDate)} · ${latestSession.actualMinutes} minuti effettivi${preparedMaterials.length ? ` · ${preparedMaterials.length} ${preparedMaterials.length === 1 ? 'materiale predisposto' : 'materiali predisposti'}` : ''}`
    : preparedMaterials.length
      ? `${preparedMaterials.length} ${preparedMaterials.length === 1 ? 'materiale predisposto' : 'materiali predisposti'} per la prossima lezione.`
      : 'Nessuna sessione effettiva o materiale predisposto recente.'
  const occurrenceEnded = eligibleOccurrence?.endAt ? timeMinutes(eligibleOccurrence.endAt) <= nowMinutes : false
  const taskDecision = resolveClassTaskDecision({
    hasNextBlock: Boolean(nextCanonicalBlock),
    hasModeledLesson: Boolean(source && nextProjection && learningFocus.nextBlock),
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
  const taskOccurrence = taskDecision.state === 'CATCH_UP'
    ? pendingPastOccurrence
    : taskDecision.state === 'TEACH' || taskDecision.state === 'RECORD'
      ? eligibleOccurrence
      : null
  const taskHref = taskDecision.focusCompletion || taskDecision.useInlineRecorder
    ? '#altro-della-classe'
    : source && taskDecision.useModeledLesson && nextProjection && learningFocus.nextBlock
      ? buildCanonicalLessonWorkspaceHref(summary.sectionId, learningFocus.nextBlock.id, {
          localDate: taskOccurrence?.localDate ?? null,
          occurrenceLogicalId: taskOccurrence?.logicalId ?? null,
        })
      : focusPlanningHref

  return (
    <AppShell active="classes" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="classesWorkspaceSurface">
      <section className="classWorkspaceHeader">
        <div><p>CLASSE · {summary.sectionStatusLabel.toUpperCase()}</p><h1>{summary.displayLabel}</h1><span>Qui trovi il lavoro da fare adesso. Il resto si apre solo quando serve.</span></div>
      </section>

      {!source ? (
        <section className="classRecordFeedback" role="status" aria-live="polite">
          <strong>Piano annuale non ancora collegato.</strong>
          <span>Le attività che registrano avanzamento restano disabilitate finché {CANONICAL_PLAN_SOURCES[grade].code} non è associato alla sorgente canonica di questo spazio.</span>
        </section>
      ) : null}

      <section className="classLessonFocus" aria-label="Lavoro della classe adesso" data-testid="class-continuity-primary">
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
          <div className="classLessonFocusActions">
            {taskDecision.label ? <Link className="primary" href={taskHref}>{taskDecision.label}</Link> : null}
          </div>
        </div>
      </section>

      <section className="classWorkspaceGrid" aria-label="Continuità della classe">
        <article className="classWorkspaceCard">
          <div><h2>Ultimo lavoro</h2><p>{lastActualWork}</p></div>
          <small>{latestSession ? `${formatDate(latestSession.localDate)} · ${latestSession.actualMinutes} minuti effettivi` : 'La continuità partirà dalla prima lezione registrata.'}</small>
        </article>
        <article className="classWorkspaceCard">
          <div><h2>Prossima attività</h2><p>{nextActivity}</p></div>
          <small>{latestEvidence?.reflection.nextActivity ? 'Ripresa dall’ultima registrazione reale.' : nextTitle ? 'Derivata dal prossimo passo disponibile del Piano annuale.' : 'Da definire quando sarà disponibile un prossimo passo attendibile.'}</small>
        </article>
        <article className="classWorkspaceCard">
          <div><h2>Avanzamento</h2><p>{learningFocus.completedBlocks}/33 lezioni concluse</p></div>
          <small>{nextCanonicalBlock ? `${nextAllocatedMinutes}/${nextCanonicalBlock.hours * 60} minuti effettivi registrati sul lavoro corrente.` : 'Percorso annuale completato.'}</small>
        </article>
        <article className="classWorkspaceCard">
          <div><h2>Contesto recente</h2><p>{recentContext}</p></div>
          <small>Solo dati già presenti nella classe: sessioni effettive, avanzamento e materiali predisposti.</small>
        </article>
      </section>

      <Link className="classDiaryAction" href={`${classHref}/diario`}>Apri Diario</Link>

      {recordedBlock && recordedProgress ? (
        <section className="classRecordFeedback" aria-label="Ultimo aggiornamento" role="status" aria-live="polite">
          <strong>Lezione registrata come svolta.</strong>
          <span>{recordedProjection?.title ?? recordedBlock.focus}. Il prossimo passo sopra è stato ricalcolato dal Piano annuale reale della classe.</span>
          {recordedProjection ? <LessonExperienceFeedback sectionId={summary.sectionId} blockId={recordedBlock.id} /> : null}
        </section>
      ) : sessionReceipt ? (
        <section className="classRecordFeedback" aria-label="Ultimo aggiornamento">
          <SessionReplanningReceipt
            sectionId={sectionId}
            session={sessionReceipt}
            allocations={teachingSnapshot.allocations}
            promoted={Boolean(query.replanning)}
          />
        </section>
      ) : null}

      <ClassSecondaryTools
        open={taskDecision.useInlineRecorder || taskDecision.focusCompletion}
        advanced={source && nextCanonicalBlock && advancedBlockId ? {
          focusCompletion: taskDecision.focusCompletion,
          state: taskDecision.state,
          sectionId,
          blockId: advancedBlockId,
          allocatedMinutes: nextAllocatedMinutes,
          plannedMinutes: nextCanonicalBlock.hours * 60,
          recorder: recordingOccurrence ? {
            sectionId,
            localDate: recordingOccurrence.localDate,
            occurrenceLogicalId: recordingOccurrence.logicalId,
            plannedMinutes: recordingOccurrence.startAt && recordingOccurrence.endAt ? timeMinutes(recordingOccurrence.endAt) - timeMinutes(recordingOccurrence.startAt) : null,
            blocks: recorderBlocks,
          } : null,
          fallbackRecorder: {
            sectionId,
            localDate: previousDate,
            occurrenceLogicalId: null,
            plannedMinutes: null,
            allowDateSelection: true,
            maxLocalDate: today,
            blocks: recorderBlocks,
          },
          emptyPresentation: recorderEmptyPresentation,
          maySuggestCompletion: Boolean(nextCompletion?.maySuggestCompletion),
        } : null}
        preparedMaterials={preparedMaterials.map((material) => ({
          ...material,
          targetDateLabel: material.targetDate ? formatDate(material.targetDate) : null,
        }))}
        linkedMaterials={learningFocus.materials.map((material) => ({
          ...material,
          href: buildTaskAwareKnowledgeHref(material.assetId, {
            mode: 'class',
            returnTo: classHref,
            sectionId: summary.sectionId,
            blockId: learningFocus.nextBlock?.id,
          }),
        }))}
        knowledgeHref={knowledgeHref}
        assignments={summary.assignments.map((assignment) => ({
          ...assignment,
          statusLabel: assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare',
          weeklyMinutesLabel: formatWeeklyMinutes(assignment.weeklyMinutes),
        }))}
        toolLinks={[
          { href: annualPlanHref, title: 'Piano annuale', detail: 'Avanzamento e decisioni professionali.' },
          { href: planningHref, title: 'Progetta', detail: 'Esplora il nucleo del grado.' },
          { href: knowledgeHref, title: 'Materiali e fonti', detail: 'Fonti e materiali della classe.' },
          ...(showArenaPilotIntake ? [{ href: `/classi/${encodeURIComponent(summary.sectionId)}/curricolo-arena`, title: 'Curricolo Arena', detail: 'Acquisisci o controlla la baseline provvisoria.' }] : []),
          { href: '/orario', title: 'Orario', detail: 'Torna alla settimana.' },
        ]}
        technical={{
          sectionId: summary.sectionId,
          nextBlock: learningFocus.nextBlock,
          canonicalPlanCode: CANONICAL_PLAN_SOURCES[grade].code,
          canonicalGenerationId: source?.generationId ?? null,
          sourceNote: section.sourceNote ?? null,
          currentSessionCount: currentSessions.length,
        }}
      />
    </AppShell>
  )
}

function currentRomeDate() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}` }
function shiftLocalDate(value: string, days: number) { const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10) }
function currentRomeMinutes() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return Number(value.hour) * 60 + Number(value.minute) }
function timeMinutes(value: string) { const hhmm = value.includes('T') ? value.slice(11, 16) : value.slice(0, 5); const [hours, minutes] = hhmm.split(':').map(Number); return hours * 60 + minutes }
function formatDate(value: string) { const [year, month, day] = value.split('-').map(Number); return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day))) }