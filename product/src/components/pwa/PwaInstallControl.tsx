'use client'

import { useEffect, useState } from 'react'
import { isPwaStandalone } from './pwa-install-state'

export function PwaInstallControl() {
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const initialStateTimer = window.setTimeout(() => {
      setInstalled(isPwaStandalone())
    }, 0)
    const onInstalled = () => setInstalled(true)

    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.clearTimeout(initialStateTimer)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) {
    return (
      <div className="settingsInlineSuccess" role="status" aria-live="polite">
        <strong>Docente OS è installato.</strong>
        <span>Puoi aprirlo come app e usarlo come destinazione dal menu Condividi del dispositivo.</span>
      </div>
    )
  }

  return (
    <div className="settingsInlineHint">
      L’installazione è gestita dal browser. In Chrome apri il menu <strong>⋮</strong> e scegli <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.
    </div>
  )
}
