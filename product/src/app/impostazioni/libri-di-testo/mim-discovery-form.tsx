'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { discoverMimTextbookAdoptions, type MimDiscoveryState } from './actions'
import './mim-discovery.css'

const INITIAL_STATE: MimDiscoveryState = { status: 'idle', message: '' }

export function MimDiscoveryForm({ schoolCode }: { schoolCode: string }) {
  const [state, action] = useActionState(discoverMimTextbookAdoptions, INITIAL_STATE)

  return (
    <form action={action} className="mimDiscoveryPanel">
      <div>
        <span>AUTOMATICO · DATI UFFICIALI</span>
        <strong>Parti dai libri già pubblicati per la tua scuola</strong>
        <p>Uso le classi e le discipline che hai già confermato. I risultati vengono soltanto proposti: sarai tu a decidere quali confermare.</p>
        <small>Scuola riconosciuta: {schoolCode}</small>
      </div>
      <div className="mimDiscoveryAction">
        <DiscoveryButton />
        {state.message ? (
          <>
            <p className={`mimDiscoveryMessage ${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>
              {state.message}
            </p>
            {state.status === 'error' ? (
              <a className="settingsSecondaryButton mimFallbackButton" href="#aggiungi-isbn">
                Usa ISBN o foto
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    </form>
  )
}

function DiscoveryButton() {
  const { pending } = useFormStatus()
  return (
    <button className="settingsPrimaryButton" type="submit" disabled={pending}>
      {pending ? 'Cerco i libri…' : 'Trova i libri della mia scuola'}
    </button>
  )
}
