import { redirect } from 'next/navigation'
import type { PlannerTask } from '@/core/domain/planner-task'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  completePlannerTask,
  createPlannerTask,
  reopenPlannerTask,
  waitPlannerTask,
} from './actions'

export const dynamic = 'force-dynamic'

type SectionKey = 'now' | 'today' | 'week' | 'waiting' | 'undated'

const sourceLabels: Record<PlannerTask['sourceKind'], string> = {
  MANUAL: 'Manuale',
  COMMUNICATION: 'Circolare',
  CALENDAR: 'Calendario',
  TEACHING: 'Didattica',
  DOCUMENT: 'Documento',
  SYSTEM: 'Sistema',
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
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup">
          <span className="brandMark">D</span>
          <div>
            <strong>DOCENTE OS</strong>
            <span>{context.academicYear?.label ?? 'Anno da configurare'}</span>
          </div>
        </div>
        <nav className="navList">
          <a className="navItem active" href="/planner"><span aria-hidden>◎</span> Oggi</a>
          <a className="navItem" href="/planner"><span aria-hidden>☷</span> Planner</a>
        </nav>
        <div className="navFooter">
          <span className="workspaceDot" aria-hidden />
          <div><strong>{context.workspace.name}</strong><span>{context.role}</span></div>
        </div>
      </aside>

      <main className="workSurface">
        <header className="mobileHeader">
          <div>
            <span className="mobileEyebrow">DOCENTE OS</span>
            <strong>{context.academicYear?.label ?? 'Anno scolastico'}</strong>
          </div>
          <form action="/auth/signout" method="post"><button className="iconButton" type="submit" aria-label="Esci">↗</button></form>
        </header>

        <section className="plannerHeader">
          <div>
            <p className="contextLine">{context.workspace.name} · {context.academicYear?.label ?? 'Anno scolastico'}</p>
            <h1>Oggi</h1>
            <p className="dayLine">{capitalize(humanDate)}</p>
          </div>
          <form action="/auth/signout" method="post" className="desktopSignout">
            <button className="secondaryButton" type="submit">Esci</button>
          </form>
        </section>

        <section className="workloadStrip" aria-label="Riepilogo operativo">
          <div><strong>{openTasks.length}</strong><span>aperte</span></div>
          <div className={overdueCount ? 'metricAlert' : ''}><strong>{overdueCount}</strong><span>scadute</span></div>
          <div><strong>{todayCount}</strong><span>per oggi</span></div>
          <p>{todayCount === 0 ? 'Giornata libera da attività pianificate.' : todayCount <= 5 ? 'Carico di oggi contenuto.' : 'Giornata densa: valuta cosa rinviare.'}</p>
        </section>

        <form action={createPlannerTask} className="quickCapture">
          <span className="capturePlus" aria-hidden>＋</span>
          <label className="srOnly" htmlFor="new-task">Nuova attività</label>
          <input id="new-task" name="title" type="text" maxLength={240} placeholder="Aggiungi un’attività per oggi…" required />
          <button type="submit">Aggiungi</button>
        </form>

        <div className="taskSections">
          <TaskSection title="Da fare ora" tone="critical" tasks={sections.now} />
          <TaskSection title="Oggi" tasks={sections.today} />
          <TaskSection title="Questa settimana" tasks={sections.week} />
          <TaskSection title="In attesa" tone="waiting" tasks={sections.waiting} />
          <TaskSection title="Senza data" tone="muted" tasks={sections.undated} />
        </div>
      </main>

      <nav className="bottomNav" aria-label="Navigazione mobile">
        <a className="active" href="/planner"><span aria-hidden>◎</span><small>Oggi</small></a>
        <a href="/planner"><span aria-hidden>☷</span><small>Planner</small></a>
        <button type="button" disabled aria-label="Inbox non ancora disponibile"><span aria-hidden>↓</span><small>Inbox</small></button>
        <button type="button" disabled aria-label="Documenti non ancora disponibili"><span aria-hidden>▤</span><small>Documenti</small></button>
      </nav>
    </div>
  )
}

function TaskSection({
  title,
  tasks,
  tone = 'default',
}: {
  title: string
  tasks: PlannerTask[]
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
          {tasks.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      ) : (
        <p className="emptyLine">Nessuna attività in questa sezione.</p>
      )}
    </section>
  )
}

function TaskRow({ task }: { task: PlannerTask }) {
  const dateLabel = task.dueAt
    ? `Scade ${formatShortDate(task.dueAt)}`
    : task.plannedFor
      ? formatPlannedDate(task.plannedFor)
      : null

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
        </div>
      </div>
      {task.status === 'OPEN' ? (
        <form action={waitPlannerTask}>
          <input type="hidden" name="taskId" value={task.id} />
          <button className="rowAction" type="submit">Attendi</button>
        </form>
      ) : null}
    </article>
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
  return `Pianificata ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
