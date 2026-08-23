import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import {
  calendarDayKindLabel,
  calendarEventKindLabel,
  type CalendarDay,
  type CalendarEvent,
} from '@/core/domain/calendar'
import { SupabaseCalendarRepository } from '@/core/infrastructure/supabase/supabase-calendar-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  createCalendarEvent,
  deleteCalendarDay,
  deleteCalendarEvent,
  saveCalendarDay,
} from './actions'
import './calendar.css'

export const dynamic = 'force-dynamic'

type CalendarFocus = {
  date: string
  eyebrow: string
  title: string
  description: string
  meta: string[]
}

export default async function CalendarPage() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const [settings, snapshot] = await Promise.all([
    new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id),
    new SupabaseCalendarRepository().list(context.workspace.id, context.academicYear.id),
  ])

  const today = currentRomeDate()
  const focus = selectFocus(snapshot.days, snapshot.events, today)
  const upcomingDays = snapshot.days.filter((day) => day.localDate >= today).slice(0, 12)
  const previousDays = snapshot.days.filter((day) => day.localDate < today).reverse().slice(0, 8)
  const upcomingEvents = snapshot.events.filter((event) => event.endsOn >= today).slice(0, 12)
  const previousEvents = snapshot.events.filter((event) => event.endsOn < today).reverse().slice(0, 8)

  return (
    <AppShell
      active="calendar"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="calendarSurface"
    >
      <section className="calendarHero">
        <div>
          <p>CALENDARIO · {context.academicYear.label}</p>
          <h1>Le date reali dell’anno scolastico</h1>
          <span>Qui registri ciò che accade in una data precisa. L’Orario resta lo schema ricorrente della settimana: i due domini non si sovrascrivono.</span>
        </div>
      </section>

      {focus ? (
        <section className="humanTaskFocus" aria-labelledby="calendar-focus-title">
          <p className="humanTaskFocusEyebrow">{focus.eyebrow}</p>
          <h2 id="calendar-focus-title">{focus.title}</h2>
          <p>{focus.description}</p>
          <div className="humanTaskMeta">{focus.meta.map((item) => <span key={item}>{item}</span>)}</div>
        </section>
      ) : (
        <section className="humanTaskFocus">
          <p className="humanTaskFocusEyebrow">CALENDARIO DA COSTRUIRE</p>
          <h2>Nessuna data è stata ancora registrata</h2>
          <p>DOCENTE OS non presume festività, sospensioni o giorni di lezione. Registra una data quando hai una fonte o una decisione concreta; ciò che manca resta esplicitamente non determinato.</p>
        </section>
      )}

      <section className="calendarGrid" aria-label="Calendario operativo">
        <article className="calendarCard">
          <div className="calendarCardHeading">
            <div><span>01</span><h2>Giorni che cambiano la scuola</h2></div>
            <p>Lezione, sospensione, festività o chiusura: una sola classificazione esplicita per data.</p>
          </div>
          {upcomingDays.length ? (
            <div className="calendarList">{upcomingDays.map((day) => <CalendarDayRow day={day} key={day.id} />)}</div>
          ) : (
            <div className="calendarEmpty"><strong>Nessun giorno futuro registrato</strong><span>Non viene applicata nessuna regola implicita.</span></div>
          )}
          {previousDays.length ? <details className="calendarHistory"><summary>Vedi giorni precedenti</summary><div className="calendarList">{previousDays.map((day) => <CalendarDayRow day={day} key={day.id} />)}</div></details> : null}
        </article>

        <article className="calendarCard">
          <div className="calendarCardHeading">
            <div><span>02</span><h2>Impegni e scadenze</h2></div>
            <p>Riunioni, attività d’istituto, formazione e scadenze con data reale.</p>
          </div>
          {upcomingEvents.length ? (
            <div className="calendarList">{upcomingEvents.map((event) => <CalendarEventRow event={event} key={event.id} />)}</div>
          ) : (
            <div className="calendarEmpty"><strong>Nessun impegno futuro registrato</strong><span>Puoi aggiungerlo senza trasformarlo in una lezione dell’Orario.</span></div>
          )}
          {previousEvents.length ? <details className="calendarHistory"><summary>Vedi impegni precedenti</summary><div className="calendarList">{previousEvents.map((event) => <CalendarEventRow event={event} key={event.id} />)}</div></details> : null}
        </article>
      </section>

      <details className="calendarAdd" open={!snapshot.days.length && !snapshot.events.length}>
        <summary>Aggiungi una data o un impegno</summary>
        <div className="calendarAddBody">
          <section>
            <h2>Registra un giorno</h2>
            <p>Usa questa voce quando la data cambia il normale svolgimento scolastico o quando vuoi documentare esplicitamente un giorno di lezione.</p>
            <form action={saveCalendarDay} className="calendarForm">
              <label><span>Data</span><input name="localDate" type="date" min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label>
              <label><span>Cosa succede</span><select name="dayKind" defaultValue="SUSPENSION"><option value="SCHOOL_DAY">Giorno di lezione</option><option value="SUSPENSION">Lezioni sospese</option><option value="HOLIDAY">Festività</option><option value="CLOSURE">Chiusura</option></select></label>
              <label className="wide"><span>Titolo umano</span><input name="label" maxLength={160} placeholder="Es. Sospensione per festività patronale" required /></label>
              <label><span>Fonte</span><select name="sourceKind" defaultValue="INSTITUTION_DOCUMENT"><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="MANUAL">Inserimento manuale</option><option value="IMPORT">Importazione</option></select></label>
              <label><span>Riferimento</span><input name="sourceRef" maxLength={1000} placeholder="Circolare, delibera, file…" /></label>
              <label className="wide"><span>Nota</span><textarea name="note" maxLength={1000} rows={3} /></label>
              <button type="submit">Registra il giorno</button>
            </form>
          </section>

          <section>
            <h2>Registra un impegno</h2>
            <p>L’impegno appartiene al Calendario e conserva la propria natura; non genera automaticamente ore di lezione.</p>
            <form action={createCalendarEvent} className="calendarForm">
              <label className="wide"><span>Titolo</span><input name="title" maxLength={200} placeholder="Es. Collegio docenti" required /></label>
              <label><span>Tipo</span><select name="eventKind" defaultValue="INSTITUTION"><option value="INSTITUTION">Istituto</option><option value="MEETING">Riunione</option><option value="DEADLINE">Scadenza</option><option value="TRAINING">Formazione</option><option value="OTHER">Altro</option></select></label>
              <label><span>Durata</span><select name="timing" defaultValue="ALL_DAY"><option value="ALL_DAY">Intera giornata / senza orario</option><option value="TIMED">Con orario</option></select></label>
              <label><span>Dal</span><input name="startsOn" type="date" min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label>
              <label><span>Al</span><input name="endsOn" type="date" min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label>
              <label><span>Ora inizio</span><input name="startTime" type="time" defaultValue="08:00" /></label>
              <label><span>Ora fine</span><input name="endTime" type="time" defaultValue="09:00" /></label>
              <label><span>Fonte</span><select name="sourceKind" defaultValue="MANUAL"><option value="MANUAL">Inserimento manuale</option><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="IMPORT">Importazione</option></select></label>
              <label><span>Riferimento</span><input name="sourceRef" maxLength={1000} placeholder="Circolare, email, file…" /></label>
              <label className="wide"><span>Nota</span><textarea name="note" maxLength={2000} rows={3} /></label>
              <button type="submit">Registra l’impegno</button>
            </form>
          </section>
        </div>
      </details>

      <aside className="calendarBoundary">
        <strong>Confine intenzionale</strong>
        <span>Calendario conosce date, sospensioni ed eventi. Orario conosce la settimana ricorrente. La loro composizione arriverà nella wave T3C e sarà una proiezione in lettura, non un accoppiamento nascosto.</span>
      </aside>
    </AppShell>
  )
}

function CalendarDayRow({ day }: { day: CalendarDay }) {
  return (
    <div className="calendarRow">
      <time dateTime={day.localDate}>{formatLongDate(day.localDate)}</time>
      <div><strong>{day.label}</strong><span>{calendarDayKindLabel(day.dayKind)}{day.sourceRef ? ` · ${day.sourceRef}` : ''}</span>{day.note ? <small>{day.note}</small> : null}</div>
      <details><summary>Gestisci</summary><form action={deleteCalendarDay}><input type="hidden" name="dayId" value={day.id} /><button type="submit">Rimuovi</button></form></details>
    </div>
  )
}

function CalendarEventRow({ event }: { event: CalendarEvent }) {
  return (
    <div className="calendarRow">
      <time dateTime={event.startsOn}>{formatEventDate(event)}</time>
      <div><strong>{event.title}</strong><span>{calendarEventKindLabel(event.eventKind)} · {event.allDay ? 'Senza orario' : `${event.startTime}–${event.endTime}`}{event.sourceRef ? ` · ${event.sourceRef}` : ''}</span>{event.note ? <small>{event.note}</small> : null}</div>
      <details><summary>Gestisci</summary><form action={deleteCalendarEvent}><input type="hidden" name="eventId" value={event.id} /><button type="submit">Rimuovi</button></form></details>
    </div>
  )
}

function selectFocus(days: CalendarDay[], events: CalendarEvent[], today: string): CalendarFocus | null {
  const candidates: Array<CalendarFocus & { sortDate: string }> = []
  for (const day of days) {
    if (day.localDate < today) continue
    candidates.push({
      sortDate: day.localDate,
      date: day.localDate,
      eyebrow: 'PROSSIMA DATA REGISTRATA',
      title: day.label,
      description: calendarDayKindLabel(day.dayKind),
      meta: [formatLongDate(day.localDate), sourceLabel(day.sourceKind)],
    })
  }
  for (const event of events) {
    if (event.endsOn < today) continue
    const effectiveDate = event.startsOn < today ? today : event.startsOn
    candidates.push({
      sortDate: effectiveDate,
      date: effectiveDate,
      eyebrow: event.startsOn <= today && event.endsOn >= today ? 'IN CORSO' : 'PROSSIMO IMPEGNO',
      title: event.title,
      description: event.note || calendarEventKindLabel(event.eventKind),
      meta: [formatEventDate(event), event.allDay ? 'Senza orario' : `${event.startTime}–${event.endTime}`, sourceLabel(event.sourceKind)],
    })
  }
  return candidates.sort((a, b) => a.sortDate.localeCompare(b.sortDate))[0] ?? null
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function formatLongDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}

function formatEventDate(event: CalendarEvent) {
  if (event.startsOn === event.endsOn) return formatLongDate(event.startsOn)
  return `${formatLongDate(event.startsOn)} → ${formatLongDate(event.endsOn)}`
}

function sourceLabel(sourceKind: CalendarDay['sourceKind']) {
  if (sourceKind === 'INSTITUTION_DOCUMENT') return 'Fonte istituzionale'
  if (sourceKind === 'IMPORT') return 'Importato'
  return 'Registrato manualmente'
}
