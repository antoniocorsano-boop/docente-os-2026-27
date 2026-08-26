'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { lookupTextbookByIsbn, type IsbnLookupState } from './actions'

const INITIAL_STATE: IsbnLookupState = { status: 'idle', message: '' }

export function IsbnLookupForm({ teachingAssignmentId }: { teachingAssignmentId: string }) {
  const [state, action] = useActionState(lookupTextbookByIsbn, INITIAL_STATE)

  return (
    <form action={action} className="textbookLookupForm">
      <input type="hidden" name="teachingAssignmentId" value={teachingAssignmentId} />
      <div className="textbookLookupFields">
        <label>
          <span>ISBN-13</span>
          <input
            name="isbn13"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Scansiona o inserisci l’ISBN"
            required
            aria-describedby={`isbn-help-${teachingAssignmentId}`}
          />
        </label>
        <label>
          <span>Uso</span>
          <select name="usageKind" defaultValue="ADOPTED">
            <option value="ADOPTED">Adottato</option>
            <option value="RECOMMENDED">Consigliato</option>
            <option value="OTHER">Altro testo</option>
          </select>
        </label>
      </div>
      <p id={`isbn-help-${teachingAssignmentId}`} className="textbookLookupHint">
        Inserisci solo il codice: titolo, autori ed editore vengono recuperati automaticamente. Nessuna compilazione manuale del catalogo.
      </p>
      {state.message ? (
        <p className={`textbookLookupMessage ${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>
          {state.message}
        </p>
      ) : null}
      <LookupButton />
    </form>
  )
}

function LookupButton() {
  const { pending } = useFormStatus()
  return (
    <button className="settingsSecondaryButton" type="submit" disabled={pending}>
      {pending ? 'Recupero dati…' : 'Recupera dati del libro'}
    </button>
  )
}
