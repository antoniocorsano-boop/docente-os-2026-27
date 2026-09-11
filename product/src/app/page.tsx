import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildClassWorkspaceLearningFocus } from '@/app/classi/class-workspace-model'
import { buildBlocks, GRADE_UI } from '@/app/piano-annuale/model'
import { projectTemporalDay } from '@/core/application/temporal-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveHomeDailyContext, type HomeDailyContext, type HomeDailyLesson } from '@/core/presentation/home-daily-context'
import { buildLessonWorkspaceHref, resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'

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

  const year = context.academicYear
  const moment = currentRomeMoment()
  const timetableReader = new SupabaseTimetableProjectionReadRepository()
  const calendarReader = new SupabaseCalendarProjectionReadRepository()

  const [teacherSettings, tasks, timetableProjection, calendarProjection, annualSnapshot, sessions] = await Promise.all([
    year
      ? new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, year.id)
      : Promise.resolve(null),
    new SupabasePlannerRepository().listByWorkspace(context.workspace.id),
    year
      ? timetableReader.read(context.workspace.id, year.id)
      : Promise.resolve({ versions: [], slots: [] }),
    year
      ? calendarReader.read(context.workspace.id, year.id)
      : Promise.resolve({ days: [], events: [] }),
    year
      ? new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, year.id)
      : Promise.resolve(null),
    year
      ? new SupabaseTeachingSessionRepository().listByDay(context.workspace.id, year.id, moment.date)
      : Promise.resolve([]),
  ])

  const projectedDay = projectTemporalDay({
    localDate: moment.date,
    timetableVersions: timetableProjection.versions,
    timetableSlots: timetableProjection.slots,
    calendarDays: calendarProjection.days,
    calendarEvents: calendarProjection.events,
  })
  const dailyContext = resolveHomeDailyContext({
    localDate: moment.date,
    minuteOfDay: moment.minutes,
    projectedDay,
    timetableVersions: timetableProjection.versions,
    timetableSlots: timetableProjection.slots,
    sessions,
  })

  const priorityTask = selectPriorityTask(tasks, moment.date)
  const dailyPrimary = resolveDailyPrimary(dailyContext, annualSnapshot)
  const primary = dailyPrimary
    ?? (priorityTask
      ? {
          kind: 'PLANNER' as const,
          eyebrow: 'ADESSO · ATTIVITÀ',
          title: priorityTask.title,
          description: taskReason(priorityTask, moment.date),
          href: '/planner',
          action: 'Apri Oggi',
          meta: [priorityLabel(priorityTask.priority), priorityTask.dueAt ? `Scade ${formatShortDate(priorityTask.dueAt)}` : 'Attività pianificata'],
        }
      : dailyContext.lessonCount > 0
        ? {
            kind: 'DAY_CLOSED' as const,
            eyebrow: 'GIORNATA DIDATTICA',
            title: 'Le lezioni di oggi sono registrate',
            description: 'Non risultano lezioni da chiudere. Puoi passare alle altre attività della giornata oppure preparare il lavoro successivo.',
            href: '/planner',
            action: 'Apri Oggi',
            meta: ['Registrazioni in ordine'],
          }
        : {
            kind: 'FALLBACK' as const,
            eyebrow: 'RIPARTI DA QUI',
            title: 'Organizza il prossimo passo',
            description: 'Non c’è una lezione operativa da gestire né un’attività urgente. Parti da Oggi oppure apri l’Orario per orientarti.',
            href: '/planner',
            action: 'Apri Oggi',
            meta: ['Nessuna urgenza rilevata'],
          })

  const provisional = dailyContext.authority === 'PROVISIONAL_DRAFT'
  const showPendingReminder = primary.kind === 'LESSON'
    && primary.dailyKind === 'UPCOMING_LESSON'
    && dailyContext.pendingRegistrationCount > 0

  return (
    <AppShell active="home" academicYearLabel={context.academicYear?.label} workspaceName={teacherSettings?.schoolName || context.workspace.name} role={context.role} contentClassName="homeSurface">
      <section className="homeDailyHeader" aria-labelledby="home-day-title">
        <div>
          <p>{formatLongDate(moment.date)}</p>
          <h1 id="home-day-title">La tua giornata</h1>
          <span>{[teacherSettings?.teacherDisplayName || null, context.academicYear?.label ?? null].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="homeDailySummary" aria-label="Sintesi della giornata">
          <strong>{dailySummary(dailyContext)}</strong>
          {provisional ? <span>Orario provvisorio, non ancora attivato</span> : null}
        </div>
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

      {showPendingReminder ? (
        <aside className="homePendingReminder" aria-label="Lezioni da registrare">
          <div>
            <strong>{dailyContext.pendingRegistrationCount === 1 ? '1 lezione da registrare' : `${dailyContext.pendingRegistrationCount} lezioni da registrare`}</strong>
            <span>La prossima lezione resta prioritaria perché è vicina; la registrazione precedente non viene persa.</span>
          </div>
          <Link href="/classi">Apri classi</Link>
        </aside>
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

function resolveDailyPrimary(
  dailyContext: HomeDailyContext,
  annualSnapshot: Awaited<ReturnType<SupabaseAnnualPlanExecutionRepository['list']>> | null,
) {
  const primary = dailyContext.primary
  if (!primary) return null
  if (primary.kind === 'AMBIGUOUS') {
    return {
      kind: 'LESSON' as const,
      dailyKind: primary.kind,
      eyebrow: 'CONTESTO DA VERIFICARE',
      title: 'Controlla l’orario di oggi',
      description: 'Più impegni risultano compatibili nello stesso momento. DOCENTE OS non sceglie una classe al posto tuo.',
      href: '/orario',
      action: 'Controlla l’orario',
      meta: ['Nessuna classe indovinata'],
    }
  }

  const lesson = primary.lesson
  if (!lesson) return null
  const section = lesson.sectionId && annualSnapshot
    ? annualSnapshot.sections.find((item) => item.id === lesson.sectionId) ?? null
    : null
  const classLabel = section ? `${gradeNumber(section.grade)}ª ${section.sectionCode}` : lesson.title
  const lessonHref = section ? resolveLessonHref(section, annualSnapshot) : null
  const classHref = section ? `/classi/${encodeURIComponent(section.id)}` : '/orario'
  const time = lessonTime(lesson)
  const authorityMeta = lesson.authority === 'PROVISIONAL_DRAFT' ? 'Orario provvisorio' : 'Orario in vigore'

  if (primary.kind === 'CURRENT_LESSON') {
    return {
      kind: 'LESSON' as const,
      dailyKind: primary.kind,
      eyebrow: 'ADESSO · IN CORSO',
      title: classLabel,
      description: lessonHref
        ? `Sei nella fascia ${time}. Classe e percorso sono già contestualizzati: puoi continuare direttamente la lezione.`
        : `Sei nella fascia ${time}. Apri la classe senza ricostruire il contesto della giornata.`,
      href: lessonHref ?? classHref,
      action: lessonHref ? 'Continua la lezione' : section ? 'Apri la classe' : 'Apri l’orario',
      meta: [time, authorityMeta],
    }
  }

  if (primary.kind === 'PENDING_REGISTRATION') {
    return {
      kind: 'LESSON' as const,
      dailyKind: primary.kind,
      eyebrow: 'DA CHIUDERE',
      title: classLabel,
      description: `La fascia ${time} è terminata e non risulta ancora registrata. Apri la classe per chiudere la lezione senza perdere il contesto.`,
      href: classHref,
      action: section ? 'Apri la classe' : 'Controlla l’orario',
      meta: [time, 'Da registrare', authorityMeta],
    }
  }

  const imminent = primary.minutesUntilStart !== null && primary.minutesUntilStart <= 15
  return {
    kind: 'LESSON' as const,
    dailyKind: primary.kind,
    eyebrow: imminent ? 'ADESSO · PROSSIMA' : 'PROSSIMA LEZIONE',
    title: classLabel,
    description: imminent
      ? `Inizia tra ${primary.minutesUntilStart} min, nella fascia ${time}. Il contesto è pronto per entrare in classe.`
      : `È la prossima lezione di oggi, nella fascia ${time}. Puoi aprire ora il contesto oppure continuare con le altre attività.`,
    href: lessonHref ?? classHref,
    action: lessonHref ? 'Apri la lezione' : section ? 'Apri la classe' : 'Apri l’orario',
    meta: [time, authorityMeta],
  }
}

function resolveLessonHref(
  section: Awaited<ReturnType<SupabaseAnnualPlanExecutionRepository['list']>>['sections'][number],
  annualSnapshot: Awaited<ReturnType<SupabaseAnnualPlanExecutionRepository['list']>>,
) {
  const learningFocus = buildClassWorkspaceLearningFocus(section, annualSnapshot.progress, [])
  const grade = GRADE_UI[section.grade]
  const nextBlock = learningFocus.nextBlock
    ? buildBlocks(grade).find((item) => item.id === learningFocus.nextBlock?.id) ?? null
    : null
  if (!nextBlock || !resolveRuntimeHumanTaskLessonProjection(grade, nextBlock)) return null
  return buildLessonWorkspaceHref(section.id, nextBlock.id, 'teach')
}

function lessonTime(lesson: HomeDailyLesson) {
  return `${lesson.startAt.slice(11, 16)}–${lesson.endAt.slice(11, 16)}`
}

function dailySummary(context: HomeDailyContext) {
  if (context.authority === 'AMBIGUOUS') return 'Orario da verificare'
  if (context.authority === 'NONE') return 'Contesto orario non disponibile'
  if (context.lessonCount === 0) return 'Nessuna lezione prevista oggi'
  const lessons = context.lessonCount === 1 ? '1 lezione' : `${context.lessonCount} lezioni`
  if (context.pendingRegistrationCount === 0) return `${lessons} oggi`
  const pending = context.pendingRegistrationCount === 1 ? '1 da registrare' : `${context.pendingRegistrationCount} da registrare`
  return `${lessons} · ${pending}`
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
  return { date: `${value.year}-${value.month}-${value.day}`, minutes: Number(value.hour) * 60 + Number(value.minute) }
}

function gradeNumber(grade: 'PRIMA' | 'SECONDA' | 'TERZA') {
  return grade === 'PRIMA' ? '1' : grade === 'SECONDA' ? '2' : '3'
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

function formatLongDate(localDate: string) {
  const formatted = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  }).format(new Date(`${localDate}T12:00:00Z`))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
