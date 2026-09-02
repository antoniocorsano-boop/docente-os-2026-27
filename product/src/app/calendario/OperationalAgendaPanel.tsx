'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent } from '@/core/domain/calendar'
import {
  createEventWorkspace,
  makeOperationalAgendaBackup,
  parseOperationalAgendaBackup,
  snapshotOperationalAgendaEvent,
  suggestOperationalPreparation,
  type OperationalAgendaDecisionStatus,
  type OperationalAgendaEventSnapshot,
  type OperationalAgendaState,
} from '@/core/domain/operational-agenda'
import { IndexedDbOperationalAgendaRepository } from '@/core/infrastructure/local/indexeddb-operational-agenda-repository'

type Props = {
  userId: string
  workspaceId: string
  academicYearId: string
  today: string
  events: CalendarEvent[]
}

type EventChoice = {
  event: OperationalAgendaEventSnapshot
  historical: boolean
  detached: boolean
}

const repository = new IndexedDbOperationalAgendaRepository()

export function OperationalAgendaPanel({ userId, workspaceId, academicYearId, today, events }: Props) {
  const activeEvents = useMemo(
    () => events
      .filter((event) => event.endsOn >= today)
      .sort((a, b) => `${a.startsOn}${a.startTime ?? ''}`.localeCompare(`${b.startsOn}${b.startTime ?? ''}`))
      .map((event) => snapshotOperationalAgendaEvent(event)),
    [events, today],
  )
  const [state, setState] = useState<OperationalAgendaState | null>(null)
  const [selectedEventId, setSelectedEventId] = useState(activeEvents[0]?.id ?? '')
  const [decisionTitle, setDecisionTitle] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importRevision, setImportRevision] = useState(0)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    repository.get(userId, workspaceId, academicYearId)
      .then((value) => {
        if (!cancelled) {
          setState(value)
          setError(null)
        }
      })
      .catch((reason: unknown) => { if (!cancelled) setError(humanError(reason)) })
    return () => { cancelled = true }
  }, [userId, workspaceId, academicYearId])

  const eventChoices = useMemo<EventChoice[]>(() => {
    const activeIds = new Set(activeEvents.map((event) => event.id))
    const canonicalById = new Map(events.map((event) => [event.id, event]))
    const active = activeEvents.map((event) => ({ event, historical: false, detached: false }))
    if (!state) return active

    const history = Object.values(state.eventWorkspaces)
      .filter((workspace) => !activeIds.has(workspace.eventId))
      .map((workspace): EventChoice | null => {
        const canonical = canonicalById.get(workspace.eventId)
        const event = canonical ? snapshotOperationalAgendaEvent(canonical) : workspace.eventSnapshot
        if (!event) return null
        return { event, historical: true, detached: !canonical }
      })
      .filter((choice): choice is EventChoice => choice !== null)
      .sort((a, b) => `${b.event.startsOn}${b.event.startTime ?? ''}`.localeCompare(`${a.event.startsOn}${a.event.startTime ?? ''}`))

    return [...active, ...history]
  }, [activeEvents, events, state])

  const selectedChoice = eventChoices.find((choice) => choice.event.id === selectedEventId) ?? eventChoices[0] ?? null
  const selectedEvent = selectedChoice?.event ?? null
  const eventWorkspace = selectedEvent && state ? state.eventWorkspaces[selectedEvent.id] ?? null : null
  const suggestions = selectedEvent ? suggestOperationalPreparation(selectedEvent) : []

  const persistMutation = async (
    mutation: (current: OperationalAgendaState) => OperationalAgendaState,
    successMessage?: string,
  ) => {
    try {
      setError(null)
      const next = await repository.mutate(userId, workspaceId, academicYearId, mutation)
      setState(next)
      if (successMessage) setMessage(successMessage)
    } catch (reason) {
      setError(humanError(reason))
    }
  }

  const addSuggestion = async (suggestionId: string) => {
    if (!selectedEvent) return
    const suggestion = suggestions.find((item) => item.id === suggestionId)
    if (!suggestion) return
    const event = selectedEvent
    await persistMutation((current) => {
      const now = new Date().toISOString()
      const workspace = ensureEventWorkspace(current, event, now)
      if (workspace.checklist.some((item) => item.suggestionId === suggestion.id)) return current
      return {
        ...current,
        eventWorkspaces: {
          ...current.eventWorkspaces,
          [event.id]: {
            ...workspace,
            checklist: [
              ...workspace.checklist,
              {
                id: localId('task'),
                eventId: event.id,
                suggestionId: suggestion.id,
                title: suggestion.title,
                done: false,
                createdAt: now,
                updatedAt: now,
              },
            ],
            updatedAt: now,
          },
        },
        updatedAt: now,
      }
    }, 'Attività aggiunta alla preparazione locale.')
  }

  const toggleChecklist = async (itemId: string, done: boolean) => {
    if (!selectedEvent) return
    const event = selectedEvent
    await persistMutation((current) => {
      const currentWorkspace = current.eventWorkspaces[event.id]
      if (!currentWorkspace) return current
      const now = new Date().toISOString()
      return {
        ...current,
        eventWorkspaces: {
          ...current.eventWorkspaces,
          [event.id]: {
            ...currentWorkspace,
            eventSnapshot: currentWorkspace.eventSnapshot ?? snapshotOperationalAgendaEvent(event),
            checklist: currentWorkspace.checklist.map((item) => item.id === itemId ? { ...item, done, updatedAt: now } : item),
            updatedAt: now,
          },
        },
        updatedAt: now,
      }
    })
  }

  const saveNote = async (note: string) => {
    if (!selectedEvent) return
    const event = selectedEvent
    await persistMutation((current) => {
      const now = new Date().toISOString()
      const workspace = ensureEventWorkspace(current, event, now)
      return {
        ...current,
        eventWorkspaces: {
          ...current.eventWorkspaces,
          [event.id]: { ...workspace, note, updatedAt: now },
        },
        updatedAt: now,
      }
    }, 'Appunti salvati nel browser.')
  }

  const addDecision = async () => {
    const title = decisionTitle.trim()
    if (!title || !selectedEvent) return
    const event = selectedEvent
    setDecisionTitle('')
    await persistMutation((current) => {
      const now = new Date().toISOString()
      const workspace = ensureEventWorkspace(current, event, now)
      const decision = {
        id: localId('decision'),
        eventId: event.id,
        title,
        status: 'TO_ACQUIRE' as const,
        note: null,
        createdAt: now,
        updatedAt: now,
      }
      return {
        ...current,
        eventWorkspaces: {
          ...current.eventWorkspaces,
          [event.id]: { ...workspace, decisions: [...workspace.decisions, decision], updatedAt: now },
        },
        updatedAt: now,
      }
    }, 'Decisione registrata come da acquisire.')
  }

  const setDecisionStatus = async (decisionId: string, status: OperationalAgendaDecisionStatus) => {
    if (!selectedEvent) return
    const event = selectedEvent
    await persistMutation((current) => {
      const currentWorkspace = current.eventWorkspaces[event.id]
      if (!currentWorkspace) return current
      const now = new Date().toISOString()
      return {
        ...current,
        eventWorkspaces: {
          ...current.eventWorkspaces,
          [event.id]: {
            ...currentWorkspace,
            eventSnapshot: currentWorkspace.eventSnapshot ?? snapshotOperationalAgendaEvent(event),
            decisions: currentWorkspace.decisions.map((decision) => decision.id === decisionId ? { ...decision, status, updatedAt: now } : decision),
            updatedAt: now,
          },
        },
        updatedAt: now,
      }
    })
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
      const imported = parseOperationalAgendaBackup(raw, userId, workspaceId, academicYearId)
      await repository.replace(userId, workspaceId, academicYearId, imported)
      setState(imported)
      setImportRevision((revision) => revision + 1)
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
          <span>Proposte, appunti e decisioni restano in questo browser e sono separate per utente, spazio e anno scolastico finché non scegli di trasferirle in una superficie canonica.</span>
        </div>
        <span className="operationalLocalBadge">Solo locale</span>
      </div>

      {error ? <div className="operationalMessage error" role="alert">{error}</div> : null}
      {message ? <div className="operationalMessage" role="status">{message}</div> : null}

      {!state ? (
        <div className="calendarEmpty"><strong>Archivio locale non disponibile</strong><span>{error ? 'Puoi comunque importare un backup valido per ripristinare questo contesto.' : 'DOCENTE OS sta aprendo IndexedDB nel browser.'}</span></div>
      ) : !selectedEvent ? (
        <div className="calendarEmpty"><strong>Nessun impegno da aprire</strong><span>Puoi comunque esportare o importare il backup locale. Gli impegni futuri compariranno qui quando saranno registrati nel Calendario.</span></div>
      ) : (
        <>
          <label className="operationalEventPicker">
            <span>Impegno</span>
            <select value={selectedEvent.id} onChange={(event) => { setSelectedEventId(event.target.value); setMessage(null) }}>
              {eventChoices.map((choice) => (
                <option value={choice.event.id} key={choice.event.id}>
                  {formatEventOption(choice.event, choice.historical, choice.detached)}
                </option>
              ))}
            </select>
          </label>

          {selectedChoice?.historical ? (
            <div className="operationalMessage" role="status">
              {selectedChoice.detached
                ? 'Storico locale: l’impegno non è più presente nel Calendario, ma il lavoro preparatorio resta accessibile dal suo snapshot locale.'
                : 'Storico locale: questo impegno è concluso, ma appunti, attività e decisioni restano disponibili.'}
            </div>
          ) : null}

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
              <LocalNote key={`${selectedEvent.id}:${importRevision}`} initialValue={eventWorkspace?.note ?? ''} onSave={saveNote} />
            </article>
          </div>
        </>
      )}

      <div className="operationalBackup">
        <div><strong>Backup sempre accessibile</strong><span>Esporta periodicamente il lavoro locale o importa un backup valido. I controlli restano disponibili anche senza eventi futuri.</span></div>
        <div>
          <button type="button" onClick={exportBackup} disabled={!state}>Esporta backup</button>
          <button type="button" onClick={() => importRef.current?.click()}>Importa backup</button>
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file) }} />
        </div>
      </div>
    </section>
  )
}

function LocalNote({ initialValue, onSave }: { initialValue: string; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(initialValue)
  return <div className="operationalNote"><textarea value={value} onChange={(event) => setValue(event.target.value)} maxLength={8000} rows={7} placeholder="Annota decisioni, modifiche richieste, responsabilità, scadenze e punti da verificare…" /><button type="button" onClick={() => onSave(value)}>Salva appunti</button></div>
}

function ensureEventWorkspace(current: OperationalAgendaState, event: OperationalAgendaEventSnapshot, now: string) {
  const existing = current.eventWorkspaces[event.id]
  if (!existing) return createEventWorkspace(event.id, now, event)
  if (existing.eventSnapshot) return existing
  return { ...existing, eventSnapshot: snapshotOperationalAgendaEvent(event) }
}

function localId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}:${value}`
}

function formatEventOption(event: OperationalAgendaEventSnapshot, historical: boolean, detached: boolean) {
  const date = formatShortDate(event.startsOn)
  const time = event.allDay || !event.startTime ? '' : ` · ${event.startTime}`
  const prefix = historical ? (detached ? 'Storico locale · ' : 'Concluso · ') : ''
  return `${prefix}${date}${time} · ${event.title}`
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))
}

function humanError(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Operazione locale non riuscita'
}
