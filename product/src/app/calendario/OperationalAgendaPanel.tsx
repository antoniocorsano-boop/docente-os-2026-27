'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent } from '@/core/domain/calendar'
import {
  createEventWorkspace,
  makeOperationalAgendaBackup,
  parseOperationalAgendaBackup,
  suggestOperationalPreparation,
  type OperationalAgendaDecisionStatus,
  type OperationalAgendaState,
} from '@/core/domain/operational-agenda'
import { IndexedDbOperationalAgendaRepository } from '@/core/infrastructure/local/indexeddb-operational-agenda-repository'

type Props = {
  workspaceId: string
  academicYearId: string
  events: CalendarEvent[]
}

const repository = new IndexedDbOperationalAgendaRepository()

export function OperationalAgendaPanel({ workspaceId, academicYearId, events }: Props) {
  const today = currentRomeDate()
  const upcomingEvents = useMemo(
    () => events.filter((event) => event.endsOn >= today).sort((a, b) => `${a.startsOn}${a.startTime ?? ''}`.localeCompare(`${b.startsOn}${b.startTime ?? ''}`)),
    [events, today],
  )
  const [state, setState] = useState<OperationalAgendaState | null>(null)
  const [selectedEventId, setSelectedEventId] = useState(upcomingEvents[0]?.id ?? '')
  const [decisionTitle, setDecisionTitle] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    repository.get(workspaceId, academicYearId)
      .then((value) => { if (!cancelled) setState(value) })
      .catch((reason: unknown) => { if (!cancelled) setError(humanError(reason)) })
    return () => { cancelled = true }
  }, [workspaceId, academicYearId])

  useEffect(() => {
    if (!selectedEventId && upcomingEvents[0]) setSelectedEventId(upcomingEvents[0].id)
  }, [selectedEventId, upcomingEvents])

  const selectedEvent = upcomingEvents.find((event) => event.id === selectedEventId) ?? upcomingEvents[0] ?? null
  const eventWorkspace = selectedEvent && state ? state.eventWorkspaces[selectedEvent.id] ?? createEventWorkspace(selectedEvent.id) : null
  const suggestions = selectedEvent ? suggestOperationalPreparation(selectedEvent) : []

  const persist = async (next: OperationalAgendaState, successMessage?: string) => {
    try {
      setError(null)
      await repository.save(next)
      setState(next)
      if (successMessage) setMessage(successMessage)
    } catch (reason) {
      setError(humanError(reason))
    }
  }

  const addSuggestion = async (suggestionId: string) => {
    if (!state || !selectedEvent) return
    const suggestion = suggestions.find((item) => item.id === suggestionId)
    if (!suggestion) return
    const now = new Date().toISOString()
    const current = state.eventWorkspaces[selectedEvent.id] ?? createEventWorkspace(selectedEvent.id, now)
    if (current.checklist.some((item) => item.suggestionId === suggestion.id)) {
      setMessage('Questa proposta è già nelle attività locali.')
      return
    }
    const next = {
      ...state,
      eventWorkspaces: {
        ...state.eventWorkspaces,
        [selectedEvent.id]: {
          ...current,
          checklist: [...current.checklist, { id: localId('task'), eventId: selectedEvent.id, suggestionId: suggestion.id, title: suggestion.title, done: false, createdAt: now, updatedAt: now }],
          updatedAt: now,
        },
      },
      updatedAt: now,
    }
    await persist(next, 'Attività aggiunta alla preparazione locale.')
  }

  const toggleChecklist = async (itemId: string, done: boolean) => {
    if (!state || !selectedEvent || !eventWorkspace) return
    const now = new Date().toISOString()
    const next = {
      ...state,
      eventWorkspaces: {
        ...state.eventWorkspaces,
        [selectedEvent.id]: {
          ...eventWorkspace,
          checklist: eventWorkspace.checklist.map((item) => item.id === itemId ? { ...item, done, updatedAt: now } : item),
          updatedAt: now,
        },
      },
      updatedAt: now,
    }
    await persist(next)
  }

  const saveNote = async (note: string) => {
    if (!state || !selectedEvent) return
    const now = new Date().toISOString()
    const current = state.eventWorkspaces[selectedEvent.id] ?? createEventWorkspace(selectedEvent.id, now)
    const next = {
      ...state,
      eventWorkspaces: { ...state.eventWorkspaces, [selectedEvent.id]: { ...current, note, updatedAt: now } },
      updatedAt: now,
    }
    await persist(next, 'Appunti salvati nel browser.')
  }

  const addDecision = async () => {
    const title = decisionTitle.trim()
    if (!title || !state || !selectedEvent) return
    const now = new Date().toISOString()
    const current = state.eventWorkspaces[selectedEvent.id] ?? createEventWorkspace(selectedEvent.id, now)
    const decision = { id: localId('decision'), eventId: selectedEvent.id, title, status: 'TO_ACQUIRE' as const, note: null, createdAt: now, updatedAt: now }
    const next = {
      ...state,
      eventWorkspaces: { ...state.eventWorkspaces, [selectedEvent.id]: { ...current, decisions: [...current.decisions, decision], updatedAt: now } },
      updatedAt: now,
    }
    setDecisionTitle('')
    await persist(next, 'Decisione registrata come da acquisire.')
  }

  const setDecisionStatus = async (decisionId: string, status: OperationalAgendaDecisionStatus) => {
    if (!state || !selectedEvent || !eventWorkspace) return
    const now = new Date().toISOString()
    const next = {
      ...state,
      eventWorkspaces: {
        ...state.eventWorkspaces,
        [selectedEvent.id]: {
          ...eventWorkspace,
          decisions: eventWorkspace.decisions.map((decision) => decision.id === decisionId ? { ...decision, status, updatedAt: now } : decision),
          updatedAt: now,
        },
      },
      updatedAt: now,
    }
    await persist(next)
  }

  const exportBackup = () => {
    if (!state) return
    const backup = makeOperationalAgendaBackup(state)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `docente-os-agenda-${academicYearId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const imported = parseOperationalAgendaBackup(raw, workspaceId, academicYearId)
      await repository.replace(workspaceId, academicYearId, imported)
      setState(imported)
      setError(null)
      setMessage('Backup locale importato.')
    } catch (reason) {
      setError(humanError(reason))
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <section className="operationalAgenda" aria-labelledby="operational-agenda-title">
      <div className="operationalAgendaHeading">
        <div>
          <p>PREPARAZIONE LOCALE</p>
          <h2 id="operational-agenda-title">Dall’impegno a ciò che devi preparare</h2>
          <span>Proposte, appunti e decisioni restano in questo browser finché non scegli di trasferirli in una superficie canonica.</span>
        </div>
        <span className="operationalLocalBadge">Solo locale</span>
      </div>

      {error ? <div className="operationalMessage error" role="alert">{error}</div> : null}
      {message ? <div className="operationalMessage" role="status">{message}</div> : null}

      {!state ? (
        <div className="calendarEmpty"><strong>Preparazione dell’archivio locale…</strong><span>DOCENTE OS sta aprendo IndexedDB nel browser.</span></div>
      ) : !selectedEvent ? (
        <div className="calendarEmpty"><strong>Nessun impegno futuro da preparare</strong><span>Registra prima l’impegno nel Calendario; la preparazione locale non inventa date o riunioni.</span></div>
      ) : (
        <>
          <label className="operationalEventPicker">
            <span>Impegno</span>
            <select value={selectedEvent.id} onChange={(event) => { setSelectedEventId(event.target.value); setMessage(null) }}>
              {upcomingEvents.map((event) => <option value={event.id} key={event.id}>{formatEventOption(event)}</option>)}
            </select>
          </label>

          <div className="operationalGrid">
            <article className="operationalCard">
              <div className="operationalCardTitle"><span>01</span><div><h3>Cosa preparare</h3><p>Il motore usa soltanto titolo, nota e riferimento già registrati nell’impegno.</p></div></div>
              <div className="operationalSuggestions">
                {suggestions.map((suggestion) => {
                  const added = eventWorkspace?.checklist.some((item) => item.suggestionId === suggestion.id)
                  return (
                    <div className="operationalSuggestion" key={suggestion.id}>
                      <div><strong>{suggestion.title}</strong><p>{suggestion.description}</p>{suggestion.referenceHint ? <small>{suggestion.referenceHint}</small> : null}</div>
                      <button type="button" disabled={added} onClick={() => addSuggestion(suggestion.id)}>{added ? 'Aggiunta' : 'Aggiungi'}</button>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="operationalCard">
              <div className="operationalCardTitle"><span>02</span><div><h3>Attività locali</h3><p>Conferma solo ciò che ti serve davvero per questo impegno.</p></div></div>
              {eventWorkspace?.checklist.length ? (
                <div className="operationalChecklist">
                  {eventWorkspace.checklist.map((item) => (
                    <label key={item.id} className={item.done ? 'done' : ''}>
                      <input type="checkbox" checked={item.done} onChange={(event) => toggleChecklist(item.id, event.target.checked)} />
                      <span>{item.title}</span>
                    </label>
                  ))}
                </div>
              ) : <p className="operationalEmpty">Nessuna proposta è stata ancora trasformata in attività locale.</p>}
            </article>

            <article className="operationalCard">
              <div className="operationalCardTitle"><span>03</span><div><h3>Decisioni</h3><p>Una decisione nasce come “da acquisire”; sei tu a promuoverla quando è realmente confermata.</p></div></div>
              <div className="operationalDecisionCapture">
                <input value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} placeholder="Es. Modello UDA comune d’Istituto" maxLength={240} />
                <button type="button" onClick={addDecision} disabled={!decisionTitle.trim()}>Registra</button>
              </div>
              {eventWorkspace?.decisions.length ? <div className="operationalDecisionList">{eventWorkspace.decisions.map((decision) => (
                <div key={decision.id}><strong>{decision.title}</strong><select value={decision.status} onChange={(event) => setDecisionStatus(decision.id, event.target.value as OperationalAgendaDecisionStatus)}><option value="TO_ACQUIRE">Da acquisire</option><option value="PROPOSED">Proposta</option><option value="TO_VERIFY">Da verificare</option><option value="CONFIRMED">Confermata</option></select></div>
              ))}</div> : null}
            </article>

            <article className="operationalCard">
              <div className="operationalCardTitle"><span>04</span><div><h3>Appunti della riunione</h3><p>Bozza privata locale; non modifica Calendario, Planner o progettazione.</p></div></div>
              <LocalNote key={selectedEvent.id} initialValue={eventWorkspace?.note ?? ''} onSave={saveNote} />
            </article>
          </div>

          <div className="operationalBackup">
            <div><strong>Portabilità locale</strong><span>Esporta periodicamente un backup JSON. L’importazione è accettata solo per lo stesso spazio e anno scolastico.</span></div>
            <div><button type="button" onClick={exportBackup}>Esporta backup</button><button type="button" onClick={() => importRef.current?.click()}>Importa backup</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file) }} /></div>
          </div>
        </>
      )}
    </section>
  )
}

function LocalNote({ initialValue, onSave }: { initialValue: string; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(initialValue)
  return <div className="operationalNote"><textarea value={value} onChange={(event) => setValue(event.target.value)} maxLength={8000} rows={7} placeholder="Annota decisioni, modifiche richieste, responsabilità, scadenze e punti da verificare…" /><button type="button" onClick={() => onSave(value)}>Salva appunti</button></div>
}

function localId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${value}`
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function formatEventOption(event: CalendarEvent) {
  const date = formatShortDate(event.startsOn)
  const time = event.allDay || !event.startTime ? '' : ` · ${event.startTime}`
  return `${date}${time} · ${event.title}`
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}

function humanError(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Operazione locale non riuscita'
}
