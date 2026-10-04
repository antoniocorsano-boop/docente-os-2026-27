'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  clearInstallPrompt,
  currentInstallPrompt,
  isPwaStandalone,
  PWA_INSTALL_CLEARED_EVENT,
  PWA_INSTALL_READY_EVENT,
  type BeforeInstallPromptEvent,
} from './pwa-install-state'

export function PwaInstallControl() {
  const [installed, setInstalled] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const refreshPrompt = () => setInstallEvent(currentInstallPrompt())
    const onInstalled = () => {
      clearInstallPrompt()
      setInstalled(true)
      setInstallEvent(null)
      setMessage('Docente OS è installato su questo dispositivo.')
    }

    setInstalled(isPwaStandalone())
    refreshPrompt()
    window.addEventListener(PWA_INSTALL_READY_EVENT, refreshPrompt)
    window.addEventListener(PWA_INSTALL_CLEARED_EVENT, refreshPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener(PWA_INSTALL_READY_EVENT, refreshPrompt)
      window.removeEventListener(PWA_INSTALL_CLEARED_EVENT, refreshPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installEvent) return
    setMessage(null)
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    clearInstallPrompt()
    setInstallEvent(null)
    if (choice.outcome === 'accepted') {
      setMessage('Installazione avviata. Quando termina, Docente OS comparirà tra le app del dispositivo.')
    } else {
      setMessage('Installazione non completata. Puoi riprovare dal menu di Chrome.')
    }
  }, [installEvent])

  if (installed) {
    return (
      <div className="settingsInlineSuccess" role="status" aria-live="polite">
        <strong>Docente OS è installato.</strong>
        <span>Puoi aprirlo come app e usarlo come destinazione dal menu Condividi del dispositivo.</span>
      </div>
    )
  }

  return (
    <div className="settingsFormBlock" aria-live="polite">
      {installEvent ? (
        <div className="settingsActionRow">
          <span>Il dispositivo è pronto per installare Docente OS.</span>
          <button className="settingsPrimaryButton" type="button" onClick={() => void install()}>
            Installa Docente OS
          </button>
        </div>
      ) : (
        <div className="settingsInlineHint">
          In Chrome apri il menu <strong>⋮</strong> e scegli <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.
        </div>
      )}
      {message ? <div className="settingsInlineSuccess" role="status">{message}</div> : null}
    </div>
  )
}
