import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react'
import { loadCurrentTodayOperationalContext } from '@/app/api/assistant/today-context-loader'
import { loadTodayLessonBindings } from '@/app/api/assistant/today-lesson-binding-loader'
import { AppShell } from '@/components/app-shell/app-shell'
import { LocalTeacherGreeting } from '@/components/local-user-profile/local-user-profile'
import type { HomeDailyLesson } from '@/core/presentation/home-daily-context'
import {
  buildTodayIAProjection,
  type TodayIALessonProjection,
} from '@/core/presentation/today-ia-projection'
import './today-home.css'

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const operational = await loadCurrentTodayOperationalContext({ includePreparation: false })
  if (!operational) redirect('/login')

  const context = operational.workspaceContext
  const baseProjection = buildTodayIAProjection({
    homeDaily: operational.homeDaily,
    minuteOfDay: operational.minuteOfDay,
    calendarEvents: operational.projectedDay?.events ?? [],
    lessonBundles: [],
  })
  const selectedLessons = uniqueSelectedLessons([
    baseProjection.pendingLesson?.lesson ?? null,
    baseProjection.nextLesson?.lesson ?? null,
  ])
  const lessonBundles = context.academicYear
    ? await resolveSelectedLessonBindings({
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
        lessons: selectedLessons,
      })
    : []
  const projection = buildTodayIAProjection({
    homeDaily: operational.homeDaily,
    minuteOfDay: operational.minuteOfDay,
    calendarEvents: operational.projectedDay?.events ?? [],
    lessonBundles,
  })
  const humanDate = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${operational.localDate}T12:00:00Z`))
  const isLegitimatelyEmpty = !projection.fallback
    && !projection.pendingLesson
    && !projection.nextLesson
    && projection.calendarCommitments.length === 0

  return (
    <AppShell
      active="today"
      academicYearLabel={context.academicYear?.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="plannerSurface"
    >
      <header className="todayHomeHeader">
        <div>
          <p className="todayHomeDate">{capitalize(humanDate)}</p>
          <p className="todayHomeGreeting"><LocalTeacherGreeting hour={Math.floor(operational.minuteOfDay / 60)} /></p>
          <h1>Oggi</h1>
        </div>
        <Link className="todayCalendarLink" href="/calendario" aria-label="Calendario">
          <CalendarDays size={18} aria-hidden />
          <span>Calendario</span>
        </Link>
      </header>

      {projection.fallback ? (
        <section className="todayFallback" aria-labelledby="today-fallback-title">
          <p className="todayCardEyebrow">ORARIO DA VERIFICARE</p>
          <h2 id="today-fallback-title">Non posso individuare una sola lezione con sufficiente certezza</h2>
          <p>Controlla l’orario: Oggi non sceglie una classe o un blocco didattico quando il contesto è ambiguo.</p>
          <Link className="todayPrimaryAction" href={projection.fallback.href}>
            Apri l’orario <ArrowUpRight size={17} aria-hidden />
          </Link>
        </section>
      ) : (
        <>
          {projection.pendingLesson ? (
            <TodayLessonCard
              item={projection.pendingLesson}
              eyebrow="LEZIONE DA REGISTRARE"
              actionLabel="Apri la lezione"
            />
          ) : null}

          {projection.nextLesson ? (
            <TodayLessonCard
              item={projection.nextLesson}
              eyebrow={isCurrentLesson(projection.nextLesson.lesson, operational.minuteOfDay) ? 'LEZIONE IN CORSO' : 'PROSSIMA LEZIONE'}
              actionLabel="Apri la lezione"
            />
          ) : null}
        </>
      )}

      {isLegitimatelyEmpty ? (
        <section className="todayEmptyState" aria-labelledby="today-empty-title">
          <div className="todayFallback">
            <p className="todayCardEyebrow">NESSUNA ATTIVITÀ IMMEDIATA</p>
            <h2 id="today-empty-title">Nessuna lezione o impegno da mostrare adesso</h2>
            <p>Puoi controllare l’orario per vedere la prossima lezione.</p>
            <Link className="todayPrimaryAction" href="/orario">
              Apri l’orario <ArrowUpRight size={17} aria-hidden />
            </Link>
          </div>
        </section>
      ) : null}

      {projection.calendarCommitments.length ? (
        <section className="todayCalendarCommitments" aria-labelledby="today-calendar-title">
          <div className="todaySectionHeading">
            <h2 id="today-calendar-title">Impegni</h2>
            <Link href="/calendario">Calendario</Link>
          </div>
          <div className="todayCommitmentList">
            {projection.calendarCommitments.map((commitment) => (
              <Link className="todayCommitment" href={commitment.href} key={commitment.id}>
                <Clock3 size={16} aria-hidden />
                <span className="todayCommitmentTime">{commitmentTime(commitment.startAt, commitment.endAt)}</span>
                <strong>{commitment.title}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  )
}

function TodayLessonCard({
  item,
  eyebrow,
  actionLabel,
}: {
  item: TodayIALessonProjection
  eyebrow: string
  actionLabel: string
}) {
  const fallback = item.routeKind !== 'LESSON'
  return (
    <section className="todayLessonCard">
      <div className="todayLessonTopline">
        <p className="todayCardEyebrow">{eyebrow}</p>
        <span>{clock(item.lesson.startAt)}–{clock(item.lesson.endAt)}</span>
      </div>
      <h2>{item.lesson.title}</h2>
      {item.lesson.authority === 'PROVISIONAL_DRAFT' ? <p className="todayLessonNotice">Collocazione da orario provvisorio.</p> : null}
      {fallback ? (
        <p className="todayLessonNotice">Il blocco didattico non è risolto con sufficiente certezza; apro il contesto più sicuro disponibile.</p>
      ) : null}
      <Link className="todayPrimaryAction" href={item.href}>
        {fallback ? fallbackActionLabel(item.routeKind) : actionLabel} <ArrowUpRight size={17} aria-hidden />
      </Link>
    </section>
  )
}

async function resolveSelectedLessonBindings(input: {
  workspaceId: string
  academicYearId: string
  lessons: HomeDailyLesson[]
}) {
  if (!input.lessons.length) return []
  try {
    return await loadTodayLessonBindings({
      workspaceId: input.workspaceId,
      academicYearId: input.academicYearId,
      lessons: input.lessons,
    })
  } catch {
    console.warn('[DOCENTE OS] Selected lesson bindings unavailable; Oggi uses safe class/orario fallback.')
    return []
  }
}

function uniqueSelectedLessons(candidates: Array<HomeDailyLesson | null>) {
  const seen = new Set<string>()
  return candidates.filter((lesson): lesson is HomeDailyLesson => {
    if (!lesson || seen.has(lesson.logicalId)) return false
    seen.add(lesson.logicalId)
    return true
  })
}

function isCurrentLesson(lesson: HomeDailyLesson, minuteOfDay: number) {
  return lessonMinute(lesson.startAt) <= minuteOfDay && lessonMinute(lesson.endAt) > minuteOfDay
}

function fallbackActionLabel(routeKind: TodayIALessonProjection['routeKind']) {
  if (routeKind === 'CLASS') return 'Apri la classe'
  return 'Apri l’orario'
}

function commitmentTime(startAt: string | null, endAt: string | null) {
  if (!startAt) return 'Tutto il giorno'
  return endAt ? `${clock(startAt)}–${clock(endAt)}` : clock(startAt)
}

function lessonMinute(value: string) {
  const [hour, minute] = value.slice(11, 16).split(':').map(Number)
  return hour * 60 + minute
}

function clock(value: string) {
  return value.slice(11, 16)
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase('it-IT') + value.slice(1)
}
