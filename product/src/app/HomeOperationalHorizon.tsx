'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '@/core/domain/calendar'
import type { OperationalAgendaState } from '@/core/domain/operational-agenda'
import { IndexedDbOperationalAgendaRepository } from '@/core/infrastructure/local/indexeddb-operational-agenda-repository'
import { buildDailyOperationalHorizon } from './home-operational-horizon'

type LocalAgendaStatus = 'LOADING' | 'READY' | 'ERROR'

export function HomeOperationalHorizon({
  userId,
  workspaceId,
  academicYearId,
  today,
  events,
}: {
  userId: string
  workspaceId: string
  academicYearId: string
  today: string
  events: CalendarEvent[]
}) {
  const [state, setState] = useState<OperationalAgendaState | null>(null)
  const [localStatus, setLocalStatus] = useState<LocalAgendaStatus>('LOADING')

  useEffect(() => {
    let active = true
    const repository = new IndexedDbOperationalAgendaRepository()

    repository.get(userId, workspaceId, academicYearId)
      .then((next) => {
        if (!active) return
        setState(next)
        setLocalStatus('READY')
      })
      .catch(() => {
        if (!active) return
        setLocalStatus('ERROR')
      })

    return () => {
      active = false
    }
  }, [academicYearId, userId, workspaceId])

  const horizon = useMemo(
    () => buildDailyOperationalHorizon(events, state, today),
    [events, state, today],
  )

  if (!horizon) {
    return (
      <section className="homeOperationalHorizon homeOperationalHorizonEmpty" aria-labelledby="home-operational-horizon">
        <div>
          <p className="homeOperationalEyebrow">ORIZZONTE OPERATIVO</p>
          <h2 id="home-operational-horizon">Nessun impegno da preparare</h2>
          <p>Il Calendario non contiene prossimi impegni e l’Agenda locale non conserva lavoro ancora aperto.</p>
        </div>
        <Link href="/calendario">Apri il Calendario</Link>
      </section>
    )
  }

  return (
    <section className="homeOperationalHorizon" aria-labelledby="home-operational-horizon">
      <div className="homeOperationalHeading">
        <div>
          <p className="homeOperationalEyebrow">{horizon.historical ? 'DA CHIUDERE' : 'PROSSIMO IMPEGNO'}</p>
          <h2 id="home-operational-horizon">{horizon.event.title}</h2>
          <p>{formatEventTiming(horizon.event, today)}</p>
        </div>
        <span className={horizon.localStarted ? 'isStarted' : undefined}>
          {horizon.localStarted ? 'Preparazione avviata' : 'Da preparare'}
        </span>
      </div>

      <div className="homeOperationalGrid">
        <article>
          <span>COSA PREPARARE</span>
          <strong>{horizon.preparationTitle ?? 'Rileggi l’impegno e verifica ciò che occorre portare.'}</strong>
          {horizon.pendingChecklistCount > 0 && <small>{horizon.pendingChecklistCount} attività locali ancora aperte</small>}
        </article>
        <article>
          <span>DECISIONI</span>
          <strong>{horizon.decisionTitle ?? 'Nessuna decisione da acquisire rilevata.'}</strong>
          {horizon.openDecisionCount > 0 && <small>{horizon.openDecisionCount} decisioni non ancora confermate</small>}
        </article>
        <article>
          <span>FONTE</span>
          <strong>{horizon.event.sourceRef ?? 'Nessun riferimento fonte associato'}</strong>
          <small>{horizon.event.sourceRef ? 'Riferimento conservato con l’impegno' : 'Verifica la fonte prima di trasformare l’impegno in lavoro'}</small>
        </article>
      </div>

      <div className="homeOperationalActions">
        <Link className="primary" href="/calendario">Apri la preparazione</Link>
        <span aria-live="polite">
          {localStatus === 'LOADING' && 'Lettura dell’Agenda locale…'}
          {localStatus === 'ERROR' && 'Il prossimo impegno è visibile; l’Agenda locale non è disponibile in questo browser.'}
          {localStatus === 'READY' && (horizon.localStarted ? 'Stato locale aggiornato.' : 'Nessuna preparazione locale ancora registrata.')}
        </span>
      </div>
    </section>
  )
}

function formatEventTiming(
  event: { startsOn: string; endsOn: string; allDay: boolean; startTime: string | null; endTime: string | null },
  today: string,
) {
  const dateLabel = event.startsOn === today
    ? 'Oggi'
    : new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
      .format(new Date(`${event.startsOn}T12:00:00.000Z`))
  const rangeLabel = event.endsOn !== event.startsOn ? ` – ${formatShortDate(event.endsOn)}` : ''
  if (event.allDay || !event.startTime) return `${capitalize(dateLabel)}${rangeLabel} · giornata intera`
  const timeLabel = event.endTime
    ? `${event.startTime.slice(0, 5)}–${event.endTime.slice(0, 5)}`
    : event.startTime.slice(0, 5)
  return `${capitalize(dateLabel)}${rangeLabel} · ${timeLabel}`
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
    .format(new Date(`${value}T12:00:00.000Z`))
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
