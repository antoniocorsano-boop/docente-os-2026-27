import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import type { PlannerTask } from '@/core/domain/planner-task'
import { timeToMinutes } from '@/core/domain/timetable'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarRepository } from '@/core/infrastructure/supabase/supabase-calendar-repository'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableLifecycleRepository } from '@/core/infrastructure/supabase/supabase-timetable-lifecycle-repository'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'
import { HomeOperationalHorizon } from './HomeOperationalHorizon'

export const dynamic = 'force-dynamic'

const entrances = [
  { href: '/planner', title: 'Oggi', description: 'Attività, priorità e cose da fare.' },
  { href: '/orario', title: 'Orario', description: 'Settimana tipo e lezioni.' },
  { href: '/classi', title: 'Classi', description: 'Contesto operativo delle sezioni.' },
  { href: '/progetta', title: 'Progetta', description: 'UDA e materiali da preparare.' },
  { href: '/piano-annuale', title: 'Piano annuale', description: 'Avanzamento e registrazione.' },
  { href: '/knowledge', title: 'Conoscenza', description: 'Fonti, documenti e materiali.' },
] as const

export default async function HomePage() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) redirect('/login')

  const year = context.academicYear
  const [teacherSettings, tasks, timetable, timetableLifecycle, annualSnapshot, calendarSnapshot] = await Promise.all([
    year
      ? new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, year.id)
      : Promise.resolve(null),
    new SupabasePlannerRepository().listByWorkspace(context.workspace.id),
    year
      ? new SupabaseTimetableRepository().list(context.workspace.id, year.id, year.startsOn)
      : Promise.resolve(null),
    year
      ? new SupabaseTimetableLifecycleRepository().read(context.workspace.id, year.id)
      : Promise.resolve(null),
    year
      ? new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, year.id)
      : Promise.resolve(null),
    year
      ? new SupabaseCalendarRepository().list(context.workspace.id, year.id)
      : Promise.resolve(null),
  ])

  const moment = currentRomeMoment()
  let currentLesson: { sectionId: string | null; label: string; time: string } | null = null
  const operationalSlots = timetableLifecycle?.activeVersion ? timetableLifecycle.activeSlots : timetable?.slots ?? []

  if (timetable && annualSnapshot) {
    const slot = operationalSlots.find((item) => item.weekday === moment.weekday && timeToMinutes(item.startTime) <= moment.minutes && timeToMinutes(item.endTime) > moment.minutes)
    if (slot) {
      const section = slot.sectionId ? annualSnapshot.sections.find((item) => item.id === slot.sectionId) ?? null : null
      currentLesson = {
        sectionId: section?.id ?? null,
        label: section ? `${gradeNumber(section.grade)}ª ${section.sectionCode}` : slot.manualClassLabel || presenceLabel(slot.slotKind),
        time: `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`,
      }
    }
  }

  const priorityTask = selectPriorityTask(tasks, moment.date)
  const primary = currentLesson
    ? {
        eyebrow: 'ADESSO · LEZIONE',
        title: currentLesson.label,
        description: `Sei nella fascia ${currentLesson.time}. DOCENTE OS mantiene il contesto della lezione senza chiederti di scegliere di nuovo classe e percorso.`,
        href: currentLesson.sectionId ? `/classi/${encodeURIComponent(currentLesson.sectionId)}` : '/orario',
        action: currentLesson.sectionId ? 'Apri la classe' : 'Apri l’orario',
        meta: [currentLesson.time, currentLesson.sectionId ? 'Contesto canonico' : 'Presenza in orario'],
      }
    : priorityTask
      ? {
          eyebrow: 'ADESSO · ATTIVITÀ',
          title: priorityTask.title,
          description: taskReason(priorityTask, moment.date),
          href: '/planner',
          action: 'Apri Oggi',
          meta: [priorityLabel(priorityTask.priority), priorityTask.dueAt ? `Scade ${formatShortDate(priorityTask.dueAt)}` : 'Attività pianificata'],
        }
      : {
          eyebrow: 'RIPARTI DA QUI',
          title: 'Organizza il prossimo passo',
          description: 'Non c’è un compito urgente né una lezione in corso. Parti da Oggi per decidere cosa affrontare oppure apri l’Orario per orientarti nella settimana.',
          href: '/planner',
          action: 'Apri Oggi',
          meta: ['Nessuna urgenza rilevata'],
        }

  return (
    <AppShell active="home" academicYearLabel={context.academicYear?.label} workspaceName={teacherSettings?.schoolName || context.workspace.name} role={context.role} contentClassName="homeSurface">
      <section className="homeHero">
        <div><p>{[teacherSettings?.teacherDisplayName || null, context.academicYear?.label ?? null].filter(Boolean).join(' · ')}</p><h1>Il prossimo passo, non tutto il sistema.</h1><span>DOCENTE OS restringe la vista quando conosce il tuo contesto. Puoi sempre tornare all’esplorazione completa.</span></div>
      </section>

      <section className="humanTaskFocus" aria-labelledby="home-next-action">
        <p className="humanTaskFocusEyebrow">{primary.eyebrow}</p>
        <h2 id="home-next-action">{primary.title}</h2>
        <p>{primary.description}</p>
        <div className="humanTaskMeta">{primary.meta.map((item) => <span key={item}>{item}</span>)}</div>
        <div className="humanTaskActions">
          <Link className="primary" href={primary.href}>{primary.action}</Link>
          {primary.href !== '/planner' ? <Link href="/planner">Vedi le attività</Link> : <Link href="/orario">Vedi l’orario</Link>}
        </div>
      </section>

      {year && calendarSnapshot ? (
        <HomeOperationalHorizon
          userId={userId}
          workspaceId={context.workspace.id}
          academicYearId={year.id}
          today={moment.date}
          events={calendarSnapshot.events}
        />
      ) : null}

      <details className="humanTaskSecondary">
        <summary>Esplora tutto lo spazio docente</summary>
        <div className="humanTaskSecondaryBody">
          <div className="entranceGrid">{entrances.map((entrance) => <Link className="entranceCard" href={entrance.href} key={entrance.title}><h3>{entrance.title}</h3><p>{entrance.description}</p><strong>Apri <i aria-hidden>→</i></strong></Link>)}</div>
        </div>
      </details>
    </AppShell>
  )
}

function selectPriorityTask(tasks: PlannerTask[], today: string) {
  const candidates = tasks.filter((task) => task.status === 'OPEN')
  const rank = (task: PlannerTask) => {
    const due = task.dueAt?.slice(0, 10) ?? null
    if (due && due < today) return 0
    if (task.priority === 'URGENT' && due && due <= today) return 1
    if (task.plannedFor === today || due === today) return 2
    if (task.priority === 'URGENT') return 3
    if (task.priority === 'HIGH') return 4
    return 5
  }
  return candidates.sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt))[0] ?? null
}

function currentRomeMoment() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[value.weekday] ?? 7
  return { date: `${value.year}-${value.month}-${value.day}`, weekday, minutes: Number(value.hour) * 60 + Number(value.minute) }
}

function gradeNumber(grade: 'PRIMA' | 'SECONDA' | 'TERZA') {
  return grade === 'PRIMA' ? '1' : grade === 'SECONDA' ? '2' : '3'
}

function presenceLabel(kind: string) {
  if (kind === 'DISPOSITION') return 'Disposizione'
  if (kind === 'RECEPTION') return 'Ricevimento'
  if (kind === 'CLASS_PRESENCE') return 'Presenza in classe'
  return 'Impegno in orario'
}

function taskReason(task: PlannerTask, today: string) {
  const due = task.dueAt?.slice(0, 10) ?? null
  if (due && due < today) return 'È scaduta e richiede attenzione prima delle attività non urgenti.'
  if (due === today) return 'Scade oggi: il sistema la porta in primo piano senza nascondere il resto della giornata.'
  if (task.plannedFor === today) return 'L’hai pianificata per oggi: è il prossimo elemento operativo da considerare.'
  return 'È l’attività aperta con la priorità più alta nel tuo contesto corrente.'
}

function priorityLabel(priority: PlannerTask['priority']) {
  if (priority === 'URGENT') return 'Urgente'
  if (priority === 'HIGH') return 'Priorità alta'
  if (priority === 'LOW') return 'Priorità bassa'
  return 'Priorità normale'
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(new Date(value))
}
