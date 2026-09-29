'use client'

import { useEffect, useState } from 'react'
import styles from './PwaInstallPrompt.module.css'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setShowFallback(false)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    const fallbackTimer = window.setTimeout(() => {
      if (!isStandalone()) setShowFallback(true)
    }, 1800)

    return () => {
      window.clearTimeout(fallbackTimer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || dismissed || (!installEvent && !showFallback)) return null

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setDismissed(true)
    setInstallEvent(null)
  }

  return (
    <aside className={styles.prompt} aria-label="Installazione Docente OS">
      <div className={styles.copy}>
        <strong>{installEvent ? 'Installa Docente OS' : 'Usa Docente OS come app'}</strong>
        <span>
          {installEvent
            ? 'Aggiungilo al dispositivo per aprirlo come app e ricevere documenti dal menu Condividi.'
            : 'Se il pulsante di installazione non compare, apri il menu del browser e scegli “Installa app” o “Aggiungi a schermata Home”.'}
        </span>
      </div>
      <div className={styles.actions}>
        {installEvent ? (
          <button type="button" className={styles.primary} onClick={() => void install()}>
            Installa
          </button>
        ) : null}
        <button type="button" className={styles.secondary} onClick={() => setDismissed(true)} aria-label="Nascondi indicazione di installazione">
          Non ora
        </button>
      </div>
    </aside>
  )
}
