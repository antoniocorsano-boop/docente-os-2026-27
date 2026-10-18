import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react'
import { loadCurrentTodayOperationalContext } from '@/app/api/assistant/today-context-loader'
import { AppShell } from '@/components/app-shell/app-shell'
import { LocalTeacherGreeting } from '@/components/local-user-profile/local-user-profile'
import { SourceProvenance } from '@/components/source-provenance/source-provenance'
import {
  buildTodayProjection,
  type TodayFocus,
  type TodayProjection,
  type TodayTemporalItem,
} from '@/core/application/today-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'
import { parseKnowledgeTaskSourceRef } from '@/core/domain/knowledge-task-source'
import { buildTodayTeachingFocus } from '@/core/presentation/today-teaching-focus'
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
import { TodayTeachingFocusCard } from './today-teaching-focus-card'
import './today-home.css'

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const operational = await loadCurrentTodayOperationalContext()
  if (!operational) redirect('/login')

  const context = operational.workspaceContext
  const today = operational.localDate
  const nowMinutes = operational.minuteOfDay
  const projection = buildTodayProjection({
    localDate: today,
    nowMinutes,
    temporalDay: operational.projectedDay,
    tasks: operational.tasks,
  })
  const teachingFocus = buildTodayTeachingFocus({
    preparation: operational.preparation?.preparation ?? null,
    localDate: today,
    minuteOfDay: nowMinutes,
  })
  const humanDate = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${today}T12:00:00Z`))
  const plannerFocusId = !teachingFocus && projection.focus?.kind === 'PLANNER' ? projection.focus.task.id : null
  const remainingPlanner = withoutFocusedPlannerTask(projection.planner, plannerFocusId)
  const openCount = operational.tasks.filter((task) => task.status === 'OPEN').length
  const todayTaskCount = projection.planner.overdue.length + projection.planner.today.length
  const materialsAvailable = Boolean(operational.preparation?.rendering?.bundle)
  const teachingSectionId = operational.preparation?.preparation.lesson.sectionId ?? null

  return (
    <AppShell
      active="today"
      academicYearLabel={context.academicYear?.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="plannerSurface"
    >
      <section className="plannerHeader plannerHeaderClarified todayHomeHeader">
        <div className="todayHomeHeaderMain">
          <div>
            <p className="todayHomeDate">{capitalize(humanDate)}</p>
            <p className="todayHomeGreeting"><LocalTeacherGreeting /></p>
            <h1>Oggi</h1>
            <p className="plannerPurpose">La tua giornata professionale, già ricomposta.</p>
          </div>
          <Link className="todayCalendarLink" href="/calendario"><CalendarDays size={17} aria-hidden /> Calendario</Link>
        </div>
        <div className="todayHomeSummary" aria-label="Sintesi della giornata">
          <span><CalendarDays size={15} aria-hidden />{projection.timeline.length} {projection.timeline.length === 1 ? 'impegno' : 'impegni'}</span>
          <span><Clock3 size={15} aria-hidden />{todayTaskCount} attività da fare</span>
        </div>
      </section>

      {teachingFocus ? (
        <>
          <TodayTeachingFocusCard focus={teachingFocus} />
          <TodayQuickActions materialsAvailable={materialsAvailable} sectionId={teachingSectionId} />
        </>
      ) : (
        <TodayFocusCard focus={projection.focus} moment={projection.moment} today={today} nowMinutes={nowMinutes} />
      )}

      <div className={teachingFocus ? 'todaySecondaryWork' : undefined}>
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
      </div>
    </AppShell>
  )
}

function TodayQuickActions({ materialsAvailable, sectionId }: { materialsAvailable: boolean; sectionId: string | null }) {
  if (!materialsAvailable && !sectionId) return null

  return (
    <section className="todayQuickActions" aria-labelledby="today-quick-actions-title">
      <div className="todayQuickActionsHeading">
        <h2 id="today-quick-actions-title">Azioni rapide</h2>
        <span>Solo percorsi già disponibili</span>
      </div>
      <div className="todayQuickActionGrid">
        {sectionId ? (
          <Link href={`/classi/${encodeURIComponent(sectionId)}`}>
            <strong>Apri la classe</strong>
            <span>Entra nel contesto della sezione</span>
          </Link>
        ) : null}
        {materialsAvailable ? (
          <Link href="/materiali/prossima">
            <strong>Materiali della prossima lezione</strong>
            <span>Apri ciò che è già pronto</span>
          </Link>
        ) : null}
      </div>
    </section>
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
      <section className="humanTaskFocus todayFocusCard">
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
      <section className="humanTaskFocus todayFocusCard" aria-labelledby="today-focus-title">
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
    <section className="humanTaskFocus todayFocusCard" aria-labelledby="today-focus-title">
      <p className="humanTaskFocusEyebrow">{current ? 'ADESSO' : focusLabel(moment)}</p>
      <h2 id="today-focus-title">{focus.title}</h2>
      <p>{temporalFocusDescription(focus, current)}</p>
      <div className="humanTaskMeta">
        <span>{temporalSourceLabel(focus)}</span>
        {focus.startAt && focus.endAt ? <span>{timeLabel(focus.startAt)}–{timeLabel(focus.endAt)}</span> : <span>Tutto il giorno</span>}
      </div>
      <div className="humanTaskActions todayFocusActions">
        {focus.sectionId
          ? <Link className="primary" href={`/classi/${encodeURIComponent(focus.sectionId)}`}>Apri la classe <ArrowUpRight size={17} aria-hidden /></Link>
          : <Link className="primary" href="/calendario">Apri il Calendario <ArrowUpRight size={17} aria-hidden /></Link>}
        {focus.sectionId ? <Link href="/orario">Apri l’orario</Link> : null}
      </div>
    </section>
  )
}

function TodayTimeline({ items, nowMinutes }: { items: TodayTemporalItem[]; nowMinutes: number }) {
  return (
    <details className="humanTaskSecondary todayTimelineCard" open>
      <summary>La mia giornata <span className="todaySectionCount">{items.length}</span></summary>
      <div className="humanTaskSecondaryBody">
        <div className="todayTimelineList">
          {items.map((item) => {
            const current = isCurrentTemporal(item, nowMinutes)
            return (
              <article className={`todayTimelineRow ${current ? 'current' : ''}`} key={item.id}>
                <div className="todayTimelineTime">
                  <strong>{item.startAt ? timeLabel(item.startAt) : '—'}</strong>
                  {item.endAt ? <span>{timeLabel(item.endAt)}</span> : <span>Tutto il giorno</span>}
                </div>
                <div className="todayTimelineContent">
                  <h3>{item.title}</h3>
                  <div className="todayTimelineMeta">
                    <span>{temporalSourceLabel(item)}</span>
                    {current ? <span className="todayNowBadge">In corso</span> : null}
                  </div>
                </div>
                {item.sectionId
                  ? <Link className="todayTimelineAction" href={`/classi/${encodeURIComponent(item.sectionId)}`} aria-label={`Apri ${item.title}`}>
                      <ArrowUpRight size={17} aria-hidden />
                    </Link>
                  : null}
              </article>
            )
          })}
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
      <details className="humanTaskSecondary todayQuietSection">
        <summary>Da fare <span className="todaySectionStatus">Niente di urgente</span></summary>
        <div className="humanTaskSecondaryBody">
          <p>Non hai attività aggiuntive aperte per oggi.</p>
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
