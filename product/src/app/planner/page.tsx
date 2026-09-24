import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SourceProvenance } from '@/components/source-provenance/source-provenance'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import {
  buildTodayProjection,
  type TodayFocus,
  type TodayProjection,
  type TodayTemporalItem,
} from '@/core/application/today-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'
import { parseKnowledgeTaskSourceRef } from '@/core/domain/knowledge-task-source'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
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

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const plannerRepository = new SupabasePlannerRepository()
  const today = currentRomeDate()
  const nowMinutes = currentRomeMinutes()
  const temporalProjection = context.academicYear
    ? new TemporalProjectionService(
        new SupabaseTimetableProjectionReadRepository(),
        new SupabaseCalendarProjectionReadRepository(),
      )
    : null

  const [tasks, temporalDay] = await Promise.all([
    plannerRepository.listByWorkspace(context.workspace.id),
    temporalProjection && context.academicYear
      ? temporalProjection.projectDay({
          workspaceId: context.workspace.id,
          academicYearId: context.academicYear.id,
          localDate: today,
        })
      : Promise.resolve(null),
  ])

  const projection = buildTodayProjection({
    localDate: today,
    nowMinutes,
    temporalDay,
    tasks,
  })
  const humanDate = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const plannerFocusId = projection.focus?.kind === 'PLANNER' ? projection.focus.task.id : null
  const remainingPlanner = withoutFocusedPlannerTask(projection.planner, plannerFocusId)
  const openCount = tasks.filter((task) => task.status === 'OPEN').length
  const todayTaskCount = projection.planner.overdue.length + projection.planner.today.length

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
          <p className="plannerPurpose">La tua giornata professionale: prima ciò che conta adesso, poi ciò che viene dopo.</p>
        </div>
      </section>

      <TodayFocusCard focus={projection.focus} moment={projection.moment} today={today} nowMinutes={nowMinutes} />

      {projection.timeline.length ? <TodayTimeline items={projection.timeline} nowMinutes={nowMinutes} /> : null}

      <PlannerToday
        projection={projection}
        remaining={remainingPlanner}
        today={today}
        openCount={openCount}
        todayTaskCount={todayTaskCount}
      />

      {context.academicYear ? (
        <details className="humanTaskSecondary">
          <summary>Chiudi la giornata e prepara domani</summary>
          <div className="humanTaskSecondaryBody">
            <p>Controlla lezioni concluse, registrazioni nel Diario, continuità emerse e materiali di domani.</p>
            <div className="humanTaskActions">
              <Link className="primary" href="/giornata/resoconto">Apri il resoconto</Link>
              <Link href="/materiali/domani">Materiali di domani</Link>
            </div>
          </div>
        </details>
      ) : null}

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
              <label>
                <span>Quando</span>
                <select name="destination" defaultValue="today">
                  <option value="today">Oggi</option>
                  <option value="tomorrow">Domani</option>
                  <option value="week">Questa settimana</option>
                  <option value="undated">Senza data</option>
                </select>
              </label>
              <label>
                <span>Priorità</span>
                <select name="priority" defaultValue="NORMAL">
                  <option value="NORMAL">Normale</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                  <option value="LOW">Bassa</option>
                </select>
              </label>
            </div>
          </form>
        </div>
      </details>
    </AppShell>
  )
}

function TodayFocusCard({
  focus,
  moment,
  today,
  nowMinutes,
}: {
  focus: TodayFocus | null
  moment: TodayProjection['moment']
  today: string
  nowMinutes: number
}) {
  if (!focus) {
    return (
      <section className="humanTaskFocus">
        <p className="humanTaskFocusEyebrow">OGGI</p>
        <h2>Nessun impegno o attività richiede attenzione adesso</h2>
        <p>La giornata non contiene ancora elementi operativi. Puoi aprire l’orario, le classi o aggiungere un’attività.</p>
        <div className="humanTaskActions">
          <Link className="primary" href="/orario">Apri l’orario</Link>
          <Link href="/classi">Apri le classi</Link>
        </div>
      </section>
    )
  }

  if (focus.kind === 'PLANNER') {
    const task = focus.task
    return (
      <section className="humanTaskFocus" aria-labelledby="today-focus-title">
        <p className="humanTaskFocusEyebrow">DA FARE ADESSO</p>
        <h2 id="today-focus-title">{task.title}</h2>
        <p>{taskFocusReason(task, today)}</p>
        <div className="humanTaskMeta">
          <SourceProvenance plannerSource={task.sourceKind} />
          {task.dueAt ? <span>Scade {formatShortDate(task.dueAt)}</span> : null}
          <span>{priorityLabel(task.priority)}</span>
        </div>
        <div className="humanTaskActions">
          <form action={completePlannerTask}>
            <input type="hidden" name="taskId" value={task.id} />
            <button className="primary" type="submit">Segna completata</button>
          </form>
          {parseKnowledgeTaskSourceRef(task.sourceRef)
            ? <Link href={`/knowledge/${parseKnowledgeTaskSourceRef(task.sourceRef)!.assetId}`}>Apri la fonte</Link>
            : null}
        </div>
      </section>
    )
  }

  const current = isCurrentTemporal(focus, nowMinutes)
  return (
    <section className="humanTaskFocus" aria-labelledby="today-focus-title">
      <p className="humanTaskFocusEyebrow">{current ? 'ADESSO' : focusLabel(moment)}</p>
      <h2 id="today-focus-title">{focus.title}</h2>
      <p>{temporalFocusDescription(focus, current)}</p>
      <div className="humanTaskMeta">
        <span>{temporalSourceLabel(focus)}</span>
        {focus.startAt && focus.endAt ? <span>{timeLabel(focus.startAt)}–{timeLabel(focus.endAt)}</span> : <span>Tutto il giorno</span>}
      </div>
      <div className="humanTaskActions">
        {focus.sectionId
          ? <Link className="primary" href={`/classi/${encodeURIComponent(focus.sectionId)}`}>Apri la classe</Link>
          : <Link className="primary" href="/calendario">Apri il Calendario</Link>}
        {focus.sectionId ? <Link href="/orario">Apri l’orario</Link> : null}
      </div>
    </section>
  )
}

function TodayTimeline({ items, nowMinutes }: { items: TodayTemporalItem[]; nowMinutes: number }) {
  return (
    <details className="humanTaskSecondary" open>
      <summary>La mia giornata · {items.length} {items.length === 1 ? 'impegno' : 'impegni'}</summary>
      <div className="humanTaskSecondaryBody taskSections">
        <div className="taskList">
          {items.map((item) => (
            <article className="taskRow" key={item.id}>
              <div className="taskBody">
                <h3>{item.startAt ? timeLabel(item.startAt) : 'Tutto il giorno'} · {item.title}</h3>
                <div className="taskMeta">
                  <span>{temporalSourceLabel(item)}</span>
                  {item.startAt && item.endAt ? <span className="dateChip">{timeLabel(item.startAt)}–{timeLabel(item.endAt)}</span> : null}
                  {isCurrentTemporal(item, nowMinutes) ? <span className="priorityChip high">In corso</span> : null}
                </div>
                {item.sectionId
                  ? <div className="taskInlineActions"><Link className="knowledgeSourceChip" href={`/classi/${encodeURIComponent(item.sectionId)}`}>Apri la classe</Link></div>
                  : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </details>
  )
}

function PlannerToday({
  projection,
  remaining,
  today,
  openCount,
  todayTaskCount,
}: {
  projection: TodayProjection
  remaining: TodayProjection['planner']
  today: string
  openCount: number
  todayTaskCount: number
}) {
  const sections = [
    { title: 'Da fare oggi', tasks: remaining.today, tone: 'default' as const },
    { title: 'Scadute', tasks: remaining.overdue, tone: 'critical' as const },
    { title: 'Questa settimana', tasks: remaining.week, tone: 'default' as const },
    { title: 'In attesa', tasks: remaining.waiting, tone: 'waiting' as const },
    { title: 'Senza data', tasks: remaining.undated, tone: 'muted' as const },
  ].filter((section) => section.tasks.length)

  if (!openCount && !projection.planner.waiting.length) {
    return (
      <details className="humanTaskSecondary">
        <summary>Da fare · nessuna attività aggiuntiva</summary>
        <div className="humanTaskSecondaryBody">
          <p>Non ci sono attività Planner aperte. Le lezioni e gli eventi della giornata restano visibili sopra.</p>
        </div>
      </details>
    )
  }

  return (
    <>
      <div className="humanTaskCompactStats" aria-label="Riepilogo attività Planner">
        <span><strong>{openCount}</strong> attività aperte</span>
        <span><strong>{projection.planner.overdue.length}</strong> scadute</span>
        <span><strong>{todayTaskCount}</strong> per oggi</span>
      </div>
      <details className="humanTaskSecondary">
        <summary>Da fare e prossime attività</summary>
        <div className="humanTaskSecondaryBody taskSections">
          {sections.map((section) => (
            <TaskSection key={section.title} title={section.title} tasks={section.tasks} today={today} tone={section.tone} />
          ))}
        </div>
      </details>
    </>
  )
}

function TaskSection({
  title,
  tasks,
  today,
  tone = 'default',
}: {
  title: string
  tasks: PlannerTask[]
  today: string
  tone?: 'default' | 'critical' | 'waiting' | 'muted'
}) {
  return (
    <section className={`taskSection ${tone}`}>
      <div className="sectionHeading"><h2>{title}</h2><span>{tasks.length}</span></div>
      <div className="taskList">{tasks.map((task) => <TaskRow key={task.id} task={task} today={today} />)}</div>
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
          <SourceProvenance plannerSource={task.sourceKind} />
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

function withoutFocusedPlannerTask(planner: TodayProjection['planner'], focusId: string | null): TodayProjection['planner'] {
  if (!focusId) return planner
  return Object.fromEntries(
    Object.entries(planner).map(([key, values]) => [key, values.filter((task) => task.id !== focusId)]),
  ) as TodayProjection['planner']
}

function temporalSourceLabel(item: TodayTemporalItem) {
  return item.occurrenceKind === 'CALENDAR_EVENT' ? 'Calendario' : 'Orario'
}

function temporalFocusDescription(item: TodayTemporalItem, current: boolean) {
  if (item.occurrenceKind === 'CALENDAR_EVENT') {
    return current ? 'È un impegno del Calendario in corso.' : 'È il prossimo impegno del Calendario nella tua giornata.'
  }
  return current
    ? 'È l’impegno in corso secondo l’orario che vale oggi.'
    : 'È il prossimo impegno previsto dall’orario che vale oggi.'
}

function focusLabel(moment: TodayProjection['moment']) {
  if (moment === 'END_OF_DAY') return 'DA RIPRENDERE'
  return 'PROSSIMO'
}

function isCurrentTemporal(item: TodayTemporalItem, nowMinutes: number) {
  if (!item.startAt || !item.endAt) return false
  const start = minutes(item.startAt)
  const end = minutes(item.endAt)
  return start <= nowMinutes && end > nowMinutes
}

function taskFocusReason(task: PlannerTask, today: string) {
  const due = task.dueAt?.slice(0, 10) ?? null
  if (due && due < today) return 'È scaduta: viene prima delle attività non urgenti.'
  if (due === today) return 'Scade oggi: è il prossimo elemento da chiudere o ripianificare.'
  return 'È la prima attività pianificata per oggi secondo priorità e scadenza.'
}

function priorityLabel(priority: PlannerTask['priority']) {
  if (priority === 'URGENT') return 'Urgente'
  if (priority === 'HIGH') return 'Priorità alta'
  if (priority === 'LOW') return 'Priorità bassa'
  return 'Priorità normale'
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function currentRomeMinutes() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(value.hour) * 60 + Number(value.minute)
}

function minutes(value: string) {
  const [hours, mins] = value.slice(11, 16).split(':').map(Number)
  return hours * 60 + mins
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

function timeLabel(value: string) {
  return value.slice(11, 16)
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
