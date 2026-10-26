import Link from 'next/link'
import { SourceProvenance } from '@/components/source-provenance/source-provenance'
import { buildTodayProjection } from '@/core/application/today-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'
import { parseKnowledgeTaskSourceRef } from '@/core/domain/knowledge-task-source'
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

export function PlannerTaskBoard({ tasks, today }: { tasks: PlannerTask[]; today: string }) {
  const planner = buildTodayProjection({ localDate: today, nowMinutes: 0, temporalDay: null, tasks }).planner
  const sections = [
    { title: 'Scadute', tasks: planner.overdue },
    { title: 'Oggi', tasks: planner.today },
    { title: 'Questa settimana', tasks: planner.week },
    { title: 'In attesa', tasks: planner.waiting },
    { title: 'Senza data', tasks: planner.undated },
  ].filter((section) => section.tasks.length)

  return (
    <>
      <form action={createPlannerTask} className="activityCapture" aria-label="Aggiungi attività">
        <label className="srOnly" htmlFor="activity-title">Nuova attività</label>
        <input id="activity-title" name="title" type="text" maxLength={240} placeholder="Che cosa devi fare?" required />
        <label className="srOnly" htmlFor="activity-when">Quando</label>
        <select id="activity-when" name="destination" defaultValue="today">
          <option value="today">Oggi</option>
          <option value="tomorrow">Domani</option>
          <option value="week">Questa settimana</option>
          <option value="undated">Senza data</option>
        </select>
        <button type="submit">Aggiungi</button>
      </form>

      {sections.length ? (
        <div className="activityBuckets">
          {sections.map((section) => (
            <section className="activityBucket" key={section.title}>
              <header><h2>{section.title}</h2><span>{section.tasks.length}</span></header>
              <div className="activityList">
                {section.tasks.map((task) => <TaskRow task={task} today={today} key={task.id} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="activitiesEmpty"><strong>Nessuna attività aperta.</strong><p>Aggiungi qui le attività professionali che non appartengono alla lezione corrente.</p></div>
      )}
    </>
  )
}

function TaskRow({ task, today }: { task: PlannerTask; today: string }) {
  const tomorrow = addDays(today, 1)
  const knowledgeSource = parseKnowledgeTaskSourceRef(task.sourceRef)
  const dateLabel = task.dueAt
    ? `Scade ${formatDate(task.dueAt)}`
    : task.plannedFor
      ? `Da fare ${formatPlannedDate(task.plannedFor)}`
      : null

  return (
    <article className="activityRow">
      <form action={task.status === 'WAITING' ? reopenPlannerTask : completePlannerTask}>
        <input type="hidden" name="taskId" value={task.id} />
        <button className="activityDone" type="submit" aria-label={task.status === 'WAITING' ? `Riapri ${task.title}` : `Completa ${task.title}`}>
          {task.status === 'WAITING' ? '↺' : '✓'}
        </button>
      </form>
      <div className="activityBody">
        <h3>{task.title}</h3>
        <div className="activityMeta">
          <SourceProvenance plannerSource={task.sourceKind} />
          {dateLabel ? <span>{dateLabel}</span> : null}
          <span>{priorityLabel(task.priority)}</span>
          {knowledgeSource ? <Link href={`/knowledge/${knowledgeSource.assetId}`}>Apri la fonte</Link> : null}
        </div>
        {task.status === 'OPEN' ? (
          <div className="activityActions" aria-label={`Azioni per ${task.title}`}>
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
  return <form action={action}><input type="hidden" name="taskId" value={taskId} /><button type="submit">{label}</button></form>
}

function priorityLabel(priority: PlannerTask['priority']) {
  if (priority === 'URGENT') return 'Urgente'
  if (priority === 'HIGH') return 'Priorità alta'
  if (priority === 'LOW') return 'Priorità bassa'
  return 'Priorità normale'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(new Date(value))
}

function formatPlannedDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
