import Link from 'next/link'
import type { ProjectedDay, ProjectedOccurrence } from '@/core/application/temporal-projection-service'

export function TemporalTodayPanel({ day, nowMinutes }: { day: ProjectedDay; nowMinutes: number }) {
  if (day.calendarState === 'UNDETERMINED') {
    return (
      <details className="humanTaskSecondary">
        <summary>Tempo di oggi · Calendario da definire</summary>
        <div className="humanTaskSecondaryBody">
          <p>L’orario settimanale resta intatto, ma DOCENTE OS non lo trasforma in una lezione reale finché il Calendario non sa se oggi è un giorno di lezione, una sospensione o una chiusura.</p>
          <div className="humanTaskMeta"><span>Nessuna inferenza automatica</span><span>Orario e Calendario restano separati</span></div>
          <div className="humanTaskActions"><Link className="primary" href="/calendario">Definisci il giorno</Link><Link href="/orario">Vedi l’orario</Link></div>
        </div>
      </details>
    )
  }

  if (day.calendarState === 'NO_LESSONS') {
    return (
      <details className="humanTaskSecondary" open>
        <summary>Tempo di oggi · {day.calendarLabel ?? 'Niente lezioni'}</summary>
        <div className="humanTaskSecondaryBody">
          <p>L’orario ricorrente non viene cancellato: per questa data il Calendario impedisce soltanto la materializzazione delle lezioni.</p>
          <div className="humanTaskMeta"><span>Lezioni non materializzate</span>{day.events.length ? <span>{day.events.length} {day.events.length === 1 ? 'evento' : 'eventi'} oggi</span> : null}</div>
          <div className="humanTaskActions"><Link className="primary" href="/calendario">Apri il Calendario</Link></div>
          {day.events.length ? <EventList events={day.events} /> : null}
        </div>
      </details>
    )
  }

  const temporalFocus = selectTemporalFocus(day.occurrences, day.events, nowMinutes)
  const current = temporalFocus ? isCurrent(temporalFocus, nowMinutes) : false
  return (
    <details className="humanTaskSecondary" open={current}>
      <summary>{temporalFocus ? `${current ? 'Adesso' : 'Prossimo'} · ${temporalFocus.title}` : 'Tempo di oggi · Giorno di lezione'}</summary>
      <div className="humanTaskSecondaryBody">
        <p>{temporalFocus ? temporalDescription(temporalFocus, nowMinutes) : day.timetableState === 'UNAVAILABLE' ? 'Il Calendario conferma un giorno di lezione, ma non c’è un Orario in uso valido per questa data.' : 'Non risultano lezioni o impegni temporali per oggi.'}</p>
        <div className="humanTaskMeta">
          <span>{day.calendarLabel ?? 'Giorno di lezione'}</span>
          {temporalFocus?.startAt && temporalFocus.endAt ? <span>{timeLabel(temporalFocus.startAt)}–{timeLabel(temporalFocus.endAt)}</span> : null}
          {day.events.length ? <span>{day.events.length} {day.events.length === 1 ? 'evento' : 'eventi'} nel Calendario</span> : null}
        </div>
        <div className="humanTaskActions">
          {temporalFocus?.sectionId ? <Link className="primary" href={`/classi/${encodeURIComponent(temporalFocus.sectionId)}`}>Apri la classe</Link> : <Link className="primary" href="/orario">Apri l’orario</Link>}
          <Link href="/calendario">Apri il Calendario</Link>
        </div>
        {day.events.length ? <EventList events={day.events} /> : null}
      </div>
    </details>
  )
}

function EventList({ events }: { events: ProjectedOccurrence[] }) {
  return (
    <details>
      <summary>Eventi di oggi</summary>
      <div>
        {events.map((event) => (
          <p key={event.logicalId}><strong>{event.title}</strong>{event.startAt && event.endAt ? ` · ${timeLabel(event.startAt)}–${timeLabel(event.endAt)}` : ' · Tutto il giorno'}</p>
        ))}
      </div>
    </details>
  )
}

function selectTemporalFocus(occurrences: ProjectedOccurrence[], events: ProjectedOccurrence[], nowMinutes: number) {
  const timed = [...occurrences, ...events].filter((item) => item.startAt && item.endAt)
  const current = timed.find((item) => isCurrent(item, nowMinutes))
  if (current) return current
  const next = timed.filter((item) => minutes(item.startAt!) > nowMinutes).sort((a, b) => a.startAt!.localeCompare(b.startAt!))[0]
  if (next) return next
  return events.find((event) => !event.startAt) ?? occurrences[0] ?? null
}

function isCurrent(item: ProjectedOccurrence, nowMinutes: number) {
  return Boolean(item.startAt && item.endAt && minutes(item.startAt) <= nowMinutes && minutes(item.endAt) > nowMinutes)
}

function temporalDescription(item: ProjectedOccurrence, nowMinutes: number) {
  if (!item.startAt || !item.endAt) return 'È un evento valido per l’intera giornata.'
  if (isCurrent(item, nowMinutes)) return 'È l’impegno temporale in corso secondo la composizione di Orario e Calendario.'
  return 'È il prossimo impegno temporale della giornata secondo la composizione di Orario e Calendario.'
}

function minutes(value: string) {
  const hhmm = value.slice(11, 16)
  const [hours, mins] = hhmm.split(':').map(Number)
  return hours * 60 + mins
}

function timeLabel(value: string) {
  return value.slice(11, 16)
}
