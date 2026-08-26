'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { discoverMimTextbookAdoptions, type MimDiscoveryState } from './actions'

const INITIAL_STATE: MimDiscoveryState = { status: 'idle', message: '' }

export function MimDiscoveryForm({ schoolCode }: { schoolCode: string }) {
  const [state, action] = useActionState(discoverMimTextbookAdoptions, INITIAL_STATE)

  return (
    <form action={action} className="mimDiscoveryPanel">
      <div>
        <span>OPEN DATA MIM</span>
        <strong>Cerca le adozioni già pubblicate per {schoolCode}</strong>
        <p>
          DOCENTE OS usa automaticamente anno scolastico, classi, sezioni, discipline e Cattedra già presenti nelle Impostazioni. Le corrispondenze vengono aggiunte solo come proposte da controllare.
        </p>
      </div>
      <div className="mimDiscoveryAction">
        <DiscoveryButton />
        {state.message ? (
          <p className={`mimDiscoveryMessage ${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function DiscoveryButton() {
  const { pending } = useFormStatus()
  return (
    <button className="settingsPrimaryButton" type="submit" disabled={pending}>
      {pending ? 'Cerco nelle adozioni MIM…' : 'Cerca adozioni ufficiali MIM'}
    </button>
  )
}
