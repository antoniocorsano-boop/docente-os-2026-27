'use client'

import { useMemo, useState } from 'react'
import styles from './planner-create-task-action.module.css'

type Proposal = {
  proposalId: string
  status: 'PREVIEW_READY'
  summary: string
  rationale: string | null
  effectPreview: {
    changes: string[]
    doesNotChange: string[]
  }
  payload: {
    title: string
    notes: string | null
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    plannedFor: string | null
    dueAt: string | null
  }
  reversible: true
  requiresConfirmation: true
}

type Stage =
  | { kind: 'compose' }
  | { kind: 'preview'; proposal: Proposal }
  | { kind: 'executed'; proposal: Proposal; taskId: string }
  | { kind: 'rejected' }
  | { kind: 'undone'; taskId: string }

export function PlannerCreateTaskAction({ localDate }: { localDate: string }) {
  const [stage, setStage] = useState<Stage>({ kind: 'compose' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tomorrow = useMemo(() => addDays(localDate, 1), [localDate])

  async function prepare(formData: FormData) {
    setPending(true)
    setError(null)
    try {
      const destination = String(formData.get('destination') ?? 'today')
      const plannedFor = destination === 'tomorrow'
        ? tomorrow
        : destination === 'undated'
          ? null
          : localDate
      const response = await postWrite({
        action: 'prepare',
        title: String(formData.get('title') ?? ''),
        notes: String(formData.get('notes') ?? ''),
        priority: String(formData.get('priority') ?? 'NORMAL'),
        plannedFor,
        dueAt: null,
      })
      setStage({ kind: 'preview', proposal: response as Proposal })
    } catch (cause) {
      setError(messageFrom(cause))
    } finally {
      setPending(false)
    }
  }

  async function execute(proposal: Proposal) {
    setPending(true)
    setError(null)
    try {
      const response = await postWrite({ action: 'execute', proposalId: proposal.proposalId }) as { taskId: string }
      setStage({ kind: 'executed', proposal, taskId: response.taskId })
    } catch (cause) {
      setError(messageFrom(cause))
    } finally {
      setPending(false)
    }
  }

  async function reject(proposal: Proposal) {
    setPending(true)
    setError(null)
    try {
      await postWrite({ action: 'reject', proposalId: proposal.proposalId })
      setStage({ kind: 'rejected' })
    } catch (cause) {
      setError(messageFrom(cause))
    } finally {
      setPending(false)
    }
  }

  async function undo(proposal: Proposal) {
    setPending(true)
    setError(null)
    try {
      const response = await postWrite({ action: 'undo', proposalId: proposal.proposalId }) as { taskId: string }
      setStage({ kind: 'undone', taskId: response.taskId })
    } catch (cause) {
      setError(messageFrom(cause))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={`${styles.root} dosAssistantWrite`} aria-labelledby="assistant-write-title">
      <div className="dosAssistantWriteHeading">
        <div>
          <span className="panelEyebrow">AZIONE CON CONFERMA</span>
          <strong id="assistant-write-title">Crea un’attività nel Planner</strong>
        </div>
        <span className="dosAssistantWriteBadge">Reversibile</span>
      </div>

      {stage.kind === 'compose' ? (
        <form action={prepare} className="dosAssistantWriteForm">
          <label>
            <span>Attività</span>
            <input name="title" maxLength={240} required placeholder="Es. Preparare i materiali per la 2ª A" />
          </label>
          <label>
            <span>Nota facoltativa</span>
            <textarea name="notes" maxLength={4000} rows={2} placeholder="Informazioni utili per ricordare il contesto" />
          </label>
          <div className="dosAssistantWriteGrid">
            <label>
              <span>Quando</span>
              <select name="destination" defaultValue="today">
                <option value="today">Oggi</option>
                <option value="tomorrow">Domani</option>
                <option value="undated">Senza data</option>
              </select>
            </label>
            <label>
              <span>Priorità</span>
              <select name="priority" defaultValue="NORMAL">
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
                <option value="LOW">Bassa</option>
              </select>
            </label>
          </div>
          <p className="dosAssistantWriteHint">Prima vedrai l’effetto. Nulla viene creato finché non confermi.</p>
          <button className="dosAssistantWritePrimary" type="submit" disabled={pending}>{pending ? 'Preparo l’anteprima…' : 'Mostra anteprima'}</button>
        </form>
      ) : null}

      {stage.kind === 'preview' ? (
        <div className="dosAssistantWritePreview" role="region" aria-label="Anteprima dell’azione">
          <strong>{stage.proposal.summary}</strong>
          <dl>
            <div><dt>Quando</dt><dd>{stage.proposal.payload.plannedFor ? humanDate(stage.proposal.payload.plannedFor) : 'Senza data'}</dd></div>
            <div><dt>Priorità</dt><dd>{priorityLabel(stage.proposal.payload.priority)}</dd></div>
          </dl>
          {stage.proposal.payload.notes ? <p>{stage.proposal.payload.notes}</p> : null}
          <div className="dosAssistantEffectGrid">
            <div><strong>Cosa cambia</strong>{stage.proposal.effectPreview.changes.map((item) => <p key={item}>• {item}</p>)}</div>
            <div><strong>Cosa resta invariato</strong>{stage.proposal.effectPreview.doesNotChange.map((item) => <p key={item}>• {item}</p>)}</div>
          </div>
          <p className="dosAssistantConfirmNote">Confermando autorizzi solo questa attività, con questi dati. La conferma non vale per altre azioni.</p>
          <div className="dosAssistantWriteActions">
            <button className="dosAssistantWritePrimary" type="button" disabled={pending} onClick={() => void execute(stage.proposal)}>{pending ? 'Creo…' : 'Conferma e crea'}</button>
            <button type="button" disabled={pending} onClick={() => void reject(stage.proposal)}>Non creare</button>
          </div>
        </div>
      ) : null}

      {stage.kind === 'executed' ? (
        <div className="dosAssistantWriteResult" role="status">
          <strong>Attività creata nel Planner</strong>
          <p>La ricevuta conserva proposta, conferma e attività risultante. Puoi annullare questa creazione finché l’attività non viene completata.</p>
          <div className="dosAssistantWriteActions">
            <a href="/planner">Apri il Planner</a>
            <button type="button" disabled={pending} onClick={() => void undo(stage.proposal)}>{pending ? 'Annullamento…' : 'Annulla creazione'}</button>
          </div>
        </div>
      ) : null}

      {stage.kind === 'rejected' ? (
        <div className="dosAssistantWriteResult neutral" role="status">
          <strong>Proposta annullata</strong>
          <p>Non è stata creata alcuna attività.</p>
          <button type="button" onClick={() => setStage({ kind: 'compose' })}>Prepara un’altra attività</button>
        </div>
      ) : null}

      {stage.kind === 'undone' ? (
        <div className="dosAssistantWriteResult neutral" role="status">
          <strong>Creazione annullata</strong>
          <p>L’attività è stata ritirata dal lavoro attivo; la traccia dell’operazione resta conservata.</p>
          <button type="button" onClick={() => setStage({ kind: 'compose' })}>Prepara un’altra attività</button>
        </div>
      ) : null}

      {error ? <p className="dosAssistantWriteError" role="alert">{error}</p> : null}
    </section>
  )
}

async function postWrite(payload: Record<string, unknown>) {
  const response = await fetch('/api/assistant/planner-write', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({})) as { error?: string; message?: string }
  if (!response.ok) throw new Error(data.message || data.error || 'Azione non completata')
  return data
}

function messageFrom(cause: unknown) {
  if (cause instanceof Error && cause.message) return cause.message
  return 'Non sono riuscito a completare l’azione. I dati esistenti non sono stati modificati.'
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function humanDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

function priorityLabel(priority: Proposal['payload']['priority']) {
  if (priority === 'URGENT') return 'Urgente'
  if (priority === 'HIGH') return 'Alta'
  if (priority === 'LOW') return 'Bassa'
  return 'Normale'
}
