import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buildClassWorkspaceLearningFocus } from '@/app/classi/class-workspace-model'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { AppShell } from '@/components/app-shell/app-shell'
import { TemporalProjectionService, type ProjectedDay, type ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import { parseKnowledgeTaskSourceRef } from '@/core/domain/knowledge-task-source'
import { resolveLessonPreparationState } from '@/core/domain/lesson-preparation'
import type { PlannerTask } from '@/core/domain/planner-task'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseLessonPreparationRepository } from '@/core/infrastructure/supabase/supabase-lesson-preparation-repository'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildDailyLessonPreparationView, type DailyLessonPreparationView } from '@/core/presentation/daily-lesson-preparation'
import { buildDailyTeacherBrief, type TeacherDayPhase } from '@/core/presentation/daily-teacher-brief'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import {
  completePlannerTask,
  createPlannerTask,
  movePlannerTaskToday,
  movePlannerTaskTomorrow,
  movePlannerTaskWeek,
  reopenPlannerTask,
  unschedulePlannerTask,
  waitPlannerTask,
} from './actions'
import { TemporalTodayPanel } from './TemporalTodayPanel'

export const dynamic = 'force-dynamic'

type SectionKey = 'now' | 'today' | 'week' | 'waiting' | 'undated'

type ActiveContext = NonNullable<Awaited<ReturnType<SupabaseWorkspaceRepository['getCurrentContext']>>>

const sourceLabels: Record<PlannerTask['sourceKind'], string> = {
  MANUAL: 'Inserita da te',
  COMMUNICATION: 'Comunicazione',
  CALENDAR: 'Dal calendario',
  TEACHING: 'Didattica',
  DOCUMENT: 'Documento',
  SYSTEM: 'DOCENTE OS',
}

export default async function PlannerPage() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')

  const today = currentRomeDate()
  const nowMinutes = currentRomeMinutes()
  const temporalProjection = context.academicYear
    ? new TemporalProjectionService(
        new SupabaseTimetableProjectionReadRepository(),
        new SupabaseCalendarProjectionReadRepository(),
      )
    : null

  const [tasks, temporalDay] = await Promise.all([
    new SupabasePlannerRepository().listByWorkspace(context.workspace.id),
    temporalProjection && context.academicYear
      ? temporalProjection.projectDay({
          workspaceId: context.workspace.id,
          academicYearId: context.academicYear.id,
          localDate: today,
        })
      : Promise.resolve(null),
  ])
  const lessonViews = await buildTodayLessonViews(context, temporalDay)

  const sections = groupTasks(tasks, today)
  const openTasks = tasks.filter((task) => task.status === 'OPEN')
  const overdueCount = openTasks.filter((task) => task.dueAt && task.dueAt.slice(0, 10) < today).length
  const todayCount = sections.now.length + sections.today.length
  const dailyBrief = buildDailyTeacherBrief({ day: temporalDay, tasks, localDate: today, nowMinutes })
  const focusedLesson = dailyBrief.temporalFocus?.kind === 'LESSON' && dailyBrief.temporalFocus.sectionId
    ? lessonViews.get(dailyBrief.temporalFocus.sectionId) ?? null
    : null
  const focusTask = dailyBrief.focus?.kind === 'TASK'
    ? dailyBrief.attentionTasks[0] ?? dailyBrief.todayTasks[0] ?? null
    : null
  const humanDate = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  const remaining = removeFocusedTask(sections, focusTask?.id ?? null)

  return (
    <AppShell
      active="today"
      academicYearLabel={context.academicYear?.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="plannerSurface"
    >
      <section className="plannerHeader plannerHeaderClarified">
        <div>
          <p className="contextLine">{capitalize(humanDate)}</p>
          <h1>Oggi</h1>
          <p className="plannerPurpose">Prima la giornata reale: lezioni e impegni con un orario preciso. Attività e scadenze restano visibili senza nascondere ciò che devi fare adesso.</p>
        </div>
      </section>

      {dailyBrief.focus ? (
        <section className="humanTaskFocus" aria-labelledby="today-focus-title">
          <p className="humanTaskFocusEyebrow">{dailyBrief.focus.eyebrow}</p>
          <h2 id="today-focus-title">{dailyBrief.focus.title}</h2>
          {focusedLesson ? (
            <>
              <p><strong>{focusedLesson.lessonTitle}</strong> · {focusedLesson.statusLabel}. {focusedLesson.statusReason}</p>
              <div className="humanTaskMeta">
                {dailyBrief.focus.meta.map((item) => <span key={item}>{item}</span>)}
                <span>{focusedLesson.udaTitle}</span>
                <span>Preparazione: {focusedLesson.statusLabel}</span>
              </div>
              {focusedLesson.materials.length ? (
                <details className="humanTaskSecondary">
                  <summary>Cosa predisporre · {focusedLesson.materials.length}</summary>
                  <div className="humanTaskSecondaryBody">
                    <ul>{focusedLesson.materials.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </details>
              ) : null}
            </>
          ) : (
            <>
              <p>{dailyBrief.focus.description}</p>
              <div className="humanTaskMeta">{dailyBrief.focus.meta.map((item) => <span key={item}>{item}</span>)}</div>
            </>
          )}
          <div className="humanTaskActions">
            {focusedLesson ? (
              <Link className="primary" href={focusedLesson.href}>{focusedLesson.actionLabel}</Link>
            ) : dailyBrief.focus.kind === 'TEMPORAL' ? (
              <Link className="primary" href={dailyBrief.focus.href}>{dailyBrief.focus.actionLabel}</Link>
            ) : focusTask ? (
              <form action={completePlannerTask}>
                <input type="hidden" name="taskId" value={focusTask.id} />
                <button className="primary" type="submit">Segna completata</button>
              </form>
            ) : null}
            {dailyBrief.focus.kind === 'TASK' && focusTask && parseKnowledgeTaskSourceRef(focusTask.sourceRef) ? (
              <Link href={`/knowledge/${parseKnowledgeTaskSourceRef(focusTask.sourceRef)!.assetId}`}>Apri la fonte</Link>
            ) : dailyBrief.attentionTasks.length ? (
              <a href="#attivita-di-oggi">{dailyBrief.attentionTasks.length} {dailyBrief.attentionTasks.length === 1 ? 'attività richiede' : 'attività richiedono'} attenzione</a>
            ) : (
              <Link href="/orario">Vedi l’orario completo</Link>
            )}
          </div>
        </section>
      ) : (
        <section className="humanTaskFocus">
          <p className="humanTaskFocusEyebrow">OGGI</p>
          <h2>Non risultano impegni o attività che richiedono attenzione immediata</h2>
          <p>Puoi controllare l’Orario, preparare una classe o anticipare un’attività senza dover attraversare più viste.</p>
          <div className="humanTaskActions"><Link className="primary" href="/orario">Guarda l’orario</Link><Link href="/classi">Apri le classi</Link></div>
        </section>
      )}

      {temporalDay?.calendarState === 'SCHOOL_DAY' ? (
        <DailyTimeline day={temporalDay} phase={dailyBrief.phase} nowMinutes={nowMinutes} lessonViews={lessonViews} />
      ) : temporalDay ? (
        <TemporalTodayPanel day={temporalDay} nowMinutes={nowMinutes} />
      ) : null}

      <div className="humanTaskCompactStats" aria-label="Riepilogo attività">
        <span><strong>{openTasks.length}</strong> aperte</span>
        <span><strong>{overdueCount}</strong> scadute</span>
        <span><strong>{todayCount}</strong> per oggi</span>
      </div>

      <details className="humanTaskSecondary" id="attivita-di-oggi">
        <summary>Attività e scadenze</summary>
        <div className="humanTaskSecondaryBody taskSections">
          <TaskSection title="Oggi" tasks={remaining.today} today={today} />
          <TaskSection title="Questa settimana" tasks={remaining.week} today={today} />
          <TaskSection title="In attesa" tone="waiting" tasks={remaining.waiting} today={today} />
          <TaskSection title="Senza data" tone="muted" tasks={remaining.undated} today={today} />
          {remaining.now.length ? <TaskSection title="Richiede attenzione" tone="critical" tasks={remaining.now} today={today} /> : null}
        </div>
      </details>

      <details className="humanTaskSecondary">
        <summary>Aggiungi un’attività</summary>
        <div className="humanTaskSecondaryBody">
          <form action={createPlannerTask} className="quickCapture advancedCapture">
            <div className="captureMain">
              <span className="capturePlus" aria-hidden>＋</span>
              <label className="srOnly" htmlFor="new-task">Nuova attività</label>
              <input id="new-task" name="title" type="text" maxLength={240} placeholder="Che cosa devi fare?" required />
              <button type="submit">Aggiungi</button>
            </div>
            <div className="captureOptions" aria-label="Opzioni nuova attività">
              <label><span>Quando</span><select name="destination" defaultValue="today"><option value="today">Oggi</option><option value="tomorrow">Domani</option><option value="week">Questa settimana</option><option value="undated">Senza data</option></select></label>
              <label><span>Priorità</span><select name="priority" defaultValue="NORMAL"><option value="NORMAL">Normale</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option><option value="LOW">Bassa</option></select></label>
            </div>
          </form>
        </div>
      </details>
    </AppShell>
  )
}

async function buildTodayLessonViews(context: ActiveContext, day: ProjectedDay | null) {
  const result = new Map<string, DailyLessonPreparationView>()
  if (!context.academicYear || !day) return result

  const sectionIds = Array.from(new Set(
    day.occurrences
      .filter((item) => item.kind === 'LESSON' && item.sectionId)
      .map((item) => item.sectionId as string),
  ))
  if (!sectionIds.length) return result

  const snapshot = await new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id)
  const designRepository = new SupabaseLessonDesignRepository()
  const preparationRepository = new SupabaseLessonPreparationRepository()

  await Promise.all(sectionIds.map(async (sectionId) => {
    const section = snapshot.sections.find((item) => item.id === sectionId)
    if (!section) return
    const focus = buildClassWorkspaceLearningFocus(section, snapshot.progress, [])
    if (!focus.nextBlock) return

    const grade = GRADE_UI[section.grade]
    const block = buildBlocks(grade).find((item) => item.id === focus.nextBlock!.id)
    if (!block) return
    const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
    if (!projection) return

    const source = CANONICAL_PLAN_SOURCES[grade]
    const designContext = {
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear!.id,
      sectionId,
      canonicalPlanAssetId: source.assetId,
      canonicalGenerationId: source.generationId,
      blockId: block.id,
      projectionId: projection.projectionId,
    }
    const [extensions, receipt] = await Promise.all([
      designRepository.list(designContext),
      preparationRepository.get(designContext),
    ])
    const preparationState = resolveLessonPreparationState({
      projectionId: projection.projectionId,
      preparation: projection.preparation,
      extensions,
      receipt,
    })
    result.set(sectionId, buildDailyLessonPreparationView({
      sectionId,
      blockId: block.id,
      projection,
      preparationState,
    }))
  }))

  return result
}

function DailyTimeline({
  day,
  phase,
  nowMinutes,
  lessonViews,
}: {
  day: ProjectedDay
  phase: TeacherDayPhase
  nowMinutes: number
  lessonViews: Map<string, DailyLessonPreparationView>
}) {
  const entries = [...day.occurrences, ...day.events].sort(compareTimeline)
  const shouldOpen = phase === 'BEFORE_SCHOOL' || phase === 'BETWEEN_ACTIVITIES'

  return (
    <details className="humanTaskSecondary" open={shouldOpen}>
      <summary>Programma di oggi · {entries.length} {entries.length === 1 ? 'impegno' : 'impegni'}</summary>
      <div className="humanTaskSecondaryBody">
        {entries.length ? entries.map((item) => {
          const current = isTimelineCurrent(item, nowMinutes)
          const lesson = item.kind === 'LESSON' && item.sectionId ? lessonViews.get(item.sectionId) ?? null : null
          return (
            <p key={item.logicalId}>
              <strong>{itemTimeLabel(item)} · {item.title}</strong>
              {current ? ' — Adesso' : ''}
              {' · '}{timelineSourceLabel(item)}
              {lesson ? <> · <Link href={lesson.href}>{lesson.statusLabel}</Link></> : null}
            </p>
          )
        }) : <p>Il Calendario indica un giorno di lezione, ma non risultano impegni temporali materializzati per oggi.</p>}
        <div className="humanTaskActions"><Link href="/orario">Apri l’Orario</Link><Link href="/calendario">Apri il Calendario</Link></div>
      </div>
    </details>
  )
}

function TaskSection({ title, tasks, today, tone = 'default' }: { title: string; tasks: PlannerTask[]; today: string; tone?: 'default' | 'critical' | 'waiting' | 'muted' }) {
  return (
    <section className={`taskSection ${tone}`}>
      <div className="sectionHeading"><h2>{title}</h2><span>{tasks.length}</span></div>
      {tasks.length ? <div className="taskList">{tasks.map((task) => <TaskRow key={task.id} task={task} today={today} />)}</div> : <p className="emptyLine">Nessuna attività in questa sezione.</p>}
    </section>
  )
}

function TaskRow({ task, today }: { task: PlannerTask; today: string }) {
  const dateLabel = task.dueAt ? `Scade ${formatShortDate(task.dueAt)}` : task.plannedFor ? formatPlannedDate(task.plannedFor) : null
  const tomorrow = addDays(today, 1)
  const knowledgeSource = parseKnowledgeTaskSourceRef(task.sourceRef)
  return (
    <article className="taskRow">
      <form action={task.status === 'WAITING' ? reopenPlannerTask : completePlannerTask}>
        <input type="hidden" name="taskId" value={task.id} />
        <button className="completeButton" type="submit" aria-label={task.status === 'WAITING' ? `Riapri ${task.title}` : `Completa ${task.title}`}>{task.status === 'WAITING' ? '↺' : '✓'}</button>
      </form>
      <div className="taskBody">
        <h3>{task.title}</h3>
        <div className="taskMeta">
          <span className="sourceChip">{sourceLabels[task.sourceKind]}</span>
          {dateLabel ? <span className="dateChip">{dateLabel}</span> : null}
          {task.priority === 'URGENT' ? <span className="priorityChip urgent">Urgente</span> : null}
          {task.priority === 'HIGH' ? <span className="priorityChip high">Alta</span> : null}
          {task.status === 'WAITING' ? <span className="waitingChip">In attesa</span> : null}
          {knowledgeSource ? <Link className="knowledgeSourceChip" href={`/knowledge/${knowledgeSource.assetId}`}>Fonte nella Conoscenza</Link> : null}
        </div>
        {task.status === 'OPEN' ? (
          <div className="taskInlineActions" aria-label={`Azioni per ${task.title}`}>
            {task.plannedFor !== today ? <MoveButton action={movePlannerTaskToday} taskId={task.id} label="Oggi" /> : null}
            {task.plannedFor !== tomorrow ? <MoveButton action={movePlannerTaskTomorrow} taskId={task.id} label="Domani" /> : null}
            <MoveButton action={movePlannerTaskWeek} taskId={task.id} label="Settimana" />
            {task.plannedFor ? <MoveButton action={unschedulePlannerTask} taskId={task.id} label="Senza data" /> : null}
            <MoveButton action={waitPlannerTask} taskId={task.id} label="Metti in attesa" />
          </div>
        ) : null}
      </div>
    </article>
  )
}

function MoveButton({ action, taskId, label }: { action: (formData: FormData) => Promise<void>; taskId: string; label: string }) {
  return <form action={action}><input type="hidden" name="taskId" value={taskId} /><button className="inlineAction" type="submit">{label}</button></form>
}

function removeFocusedTask(sections: Record<SectionKey, PlannerTask[]>, focusId: string | null) {
  return Object.fromEntries(Object.entries(sections).map(([key, values]) => [key, values.filter((task) => task.id !== focusId)])) as Record<SectionKey, PlannerTask[]>
}

function groupTasks(tasks: PlannerTask[], today: string): Record<SectionKey, PlannerTask[]> {
  const result: Record<SectionKey, PlannerTask[]> = { now: [], today: [], week: [], waiting: [], undated: [] }
  const horizon = addDays(today, 7)
  for (const task of tasks) {
    if (task.status === 'DONE' || task.status === 'CANCELLED') continue
    if (task.status === 'WAITING') { result.waiting.push(task); continue }
    const dueDate = task.dueAt?.slice(0, 10) ?? null
    const planned = task.plannedFor
    const overdue = Boolean(dueDate && dueDate < today)
    const urgentDueNow = task.priority === 'URGENT' && Boolean(dueDate && dueDate <= today)
    if (overdue || urgentDueNow) result.now.push(task)
    else if (planned === today || dueDate === today) result.today.push(task)
    else if ((planned && planned > today && planned <= horizon) || (dueDate && dueDate > today && dueDate <= horizon)) result.week.push(task)
    else if (!planned && !dueDate) result.undated.push(task)
    else result.week.push(task)
  }
  for (const key of Object.keys(result) as SectionKey[]) result[key].sort(compareTasks)
  return result
}

function compareTasks(a: PlannerTask, b: PlannerTask) {
  const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const
  const byPriority = priorityRank[a.priority] - priorityRank[b.priority]
  if (byPriority !== 0) return byPriority
  const aDate = a.dueAt?.slice(0, 10) ?? a.plannedFor ?? '9999-12-31'
  const bDate = b.dueAt?.slice(0, 10) ?? b.plannedFor ?? '9999-12-31'
  return aDate.localeCompare(bDate) || a.createdAt.localeCompare(b.createdAt)
}

function compareTimeline(a: ProjectedOccurrence, b: ProjectedOccurrence) {
  const aKey = a.startAt ?? `${a.localDate}T00:00:00`
  const bKey = b.startAt ?? `${b.localDate}T00:00:00`
  return aKey.localeCompare(bKey) || a.logicalId.localeCompare(b.logicalId)
}

function isTimelineCurrent(item: ProjectedOccurrence, nowMinutes: number) {
  if (!item.startAt || !item.endAt) return false
  return timeMinutes(item.startAt) <= nowMinutes && timeMinutes(item.endAt) > nowMinutes
}

function itemTimeLabel(item: ProjectedOccurrence) {
  if (!item.startAt || !item.endAt) return 'Tutto il giorno'
  return `${item.startAt.slice(11, 16)}–${item.endAt.slice(11, 16)}`
}

function timelineSourceLabel(item: ProjectedOccurrence) {
  return item.kind === 'CALENDAR_EVENT' ? 'Calendario' : 'Orario'
}

function timeMinutes(value: string) {
  const [hours, minutes] = value.slice(11, 16).split(':').map(Number)
  return hours * 60 + minutes
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function currentRomeMinutes() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(value.hour) * 60 + Number(value.minute)
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(new Date(value))
}

function formatPlannedDate(value: string) {
  return `Da fare ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
