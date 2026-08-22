import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import type { PlannerTask } from '@/core/domain/planner-task'
import { parseKnowledgeTaskSourceRef } from '@/core/domain/knowledge-task-source'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
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

type SectionKey = 'now' | 'today' | 'week' | 'waiting' | 'undated'

const sourceLabels: Record<PlannerTask['sourceKind'], string> = {
  MANUAL: 'Inserita da te',
  COMMUNICATION: 'Comunicazione',
  CALENDAR: 'Dal calendario',
  TEACHING: 'Didattica',
  DOCUMENT: 'Documento',
  SYSTEM: 'DOCENTE OS',
}

export default async function PlannerPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const plannerRepository = new SupabasePlannerRepository()
  const tasks = await plannerRepository.listByWorkspace(context.workspace.id)
  const today = currentRomeDate()
  const sections = groupTasks(tasks, today)
  const openTasks = tasks.filter((task) => task.status === 'OPEN')
  const overdueCount = openTasks.filter((task) => task.dueAt && task.dueAt.slice(0, 10) < today).length
  const todayCount = sections.now.length + sections.today.length
  const humanDate = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

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
          <p className="contextLine">Attività operative · {context.workspace.name}</p>
          <h1>Oggi</h1>
          <p className="dayLine">{capitalize(humanDate)}</p>
          <p className="plannerPurpose">Qui trovi le cose che devi fare. Una data o una scadenza organizza un’attività: non la trasforma automaticamente in un evento del Calendario.</p>
        </div>
        <form action="/auth/signout" method="post" className="desktopSignout">
          <button className="secondaryButton" type="submit">Esci</button>
        </form>
      </section>

      <section className="workObjectGuide" aria-label="Come si distinguono lavoro e tempo in DOCENTE OS">
        <div className="active"><span>QUI</span><strong>Attività</strong><small>Cose da fare e priorità.</small></div>
        <div><span>DIDATTICA</span><strong>Piano annuale</strong><small>Cosa insegnare e avanzamento.</small></div>
        <div><span>SETTIMANA</span><strong>Orario</strong><small>Quando insegni ricorrentemente.</small></div>
        <div className="future"><span>DATE REALI · T3</span><strong>Calendario</strong><small>Eventi e occorrenze effettive.</small></div>
      </section>

      <section className="workloadStrip" aria-label="Riepilogo operativo">
        <div><strong>{openTasks.length}</strong><span>aperte</span></div>
        <div className={overdueCount ? 'metricAlert' : ''}><strong>{overdueCount}</strong><span>scadute</span></div>
        <div><strong>{todayCount}</strong><span>per oggi</span></div>
        <p>{todayCount === 0 ? 'Non hai attività pianificate per oggi. Puoi dedicarti alla progettazione o anticipare qualcosa dalla settimana.' : todayCount <= 5 ? 'Il carico di oggi è contenuto: puoi procedere dalle attività più urgenti.' : 'La giornata è densa: valuta cosa è davvero prioritario e cosa può essere spostato.'}</p>
      </section>

      <form action={createPlannerTask} className="quickCapture advancedCapture">
        <div className="captureMain">
          <span className="capturePlus" aria-hidden>＋</span>
          <label className="srOnly" htmlFor="new-task">Nuova attività</label>
          <input id="new-task" name="title" type="text" maxLength={240} placeholder="Aggiungi un’attività da fare…" required />
          <button type="submit">Aggiungi</button>
        </div>
        <div className="captureOptions" aria-label="Opzioni nuova attività">
          <label>
            <span>Quando vuoi farla</span>
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

      <div className="taskSections">
        <TaskSection title="Da fare ora" tone="critical" tasks={sections.now} today={today} />
        <TaskSection title="Oggi" tasks={sections.today} today={today} />
        <TaskSection title="Questa settimana" tasks={sections.week} today={today} />
        <TaskSection title="In attesa" tone="waiting" tasks={sections.waiting} today={today} />
        <TaskSection title="Senza data" tone="muted" tasks={sections.undated} today={today} />
      </div>
    </AppShell>
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
      <div className="sectionHeading">
        <h2>{title}</h2>
        <span>{tasks.length}</span>
      </div>
      {tasks.length ? (
        <div className="taskList">
          {tasks.map((task) => <TaskRow key={task.id} task={task} today={today} />)}
        </div>
      ) : (
        <p className="emptyLine">Qui non ci sono attività. Le nuove attività compariranno automaticamente nella sezione corretta.</p>
      )}
    </section>
  )
}

function TaskRow({ task, today }: { task: PlannerTask; today: string }) {
  const dateLabel = task.dueAt
    ? `Scade ${formatShortDate(task.dueAt)}`
    : task.plannedFor
      ? formatPlannedDate(task.plannedFor)
      : null

  const tomorrow = addDays(today, 1)
  const knowledgeSource = parseKnowledgeTaskSourceRef(task.sourceRef)

  return (
    <article className="taskRow">
      <form action={task.status === 'WAITING' ? reopenPlannerTask : completePlannerTask}>
        <input type="hidden" name="taskId" value={task.id} />
        <button className="completeButton" type="submit" aria-label={task.status === 'WAITING' ? `Riapri ${task.title}` : `Completa ${task.title}`}>
          {task.status === 'WAITING' ? '↺' : '✓'}
        </button>
      </form>
      <div className="taskBody">
        <h3>{task.title}</h3>
        <div className="taskMeta">
          <span className="sourceChip">{sourceLabels[task.sourceKind]}</span>
          {dateLabel ? <span className="dateChip">{dateLabel}</span> : null}
          {task.priority === 'URGENT' ? <span className="priorityChip urgent">Urgente</span> : null}
          {task.priority === 'HIGH' ? <span className="priorityChip high">Alta</span> : null}
          {task.status === 'WAITING' ? <span className="waitingChip">In attesa</span> : null}
          {knowledgeSource ? <Link className="knowledgeSourceChip" href={`/knowledge/${knowledgeSource.assetId}`}>Fonte nella Conoscenza · versione {knowledgeSource.generationNo}</Link> : null}
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

function MoveButton({
  action,
  taskId,
  label,
}: {
  action: (formData: FormData) => Promise<void>
  taskId: string
  label: string
}) {
  return (
    <form action={action}>
      <input type="hidden" name="taskId" value={taskId} />
      <button className="inlineAction" type="submit">{label}</button>
    </form>
  )
}

function groupTasks(tasks: PlannerTask[], today: string): Record<SectionKey, PlannerTask[]> {
  const result: Record<SectionKey, PlannerTask[]> = { now: [], today: [], week: [], waiting: [], undated: [] }
  const horizon = addDays(today, 7)

  for (const task of tasks) {
    if (task.status === 'DONE' || task.status === 'CANCELLED') continue
    if (task.status === 'WAITING') {
      result.waiting.push(task)
      continue
    }

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
  if (aDate !== bDate) return aDate.localeCompare(bDate)
  return a.createdAt.localeCompare(b.createdAt)
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
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
