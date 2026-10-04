'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './PwaInstallPrompt.module.css'
import {
  clearInstallPrompt,
  currentInstallPrompt,
  isPwaStandalone,
  rememberInstallPrompt,
  type BeforeInstallPromptEvent,
} from './pwa-install-state'

export function PwaInstallPrompt() {
  const pathname = usePathname()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const standaloneTimer = window.setTimeout(() => {
      setInstallEvent(currentInstallPrompt())
      setInstalled(isPwaStandalone())
      setReady(true)
    }, 0)

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const installPrompt = event as BeforeInstallPromptEvent
      rememberInstallPrompt(installPrompt)
      setInstallEvent(installPrompt)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
      clearInstallPrompt()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.clearTimeout(standaloneTimer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (pathname !== '/' || !ready || installed || dismissed) return null

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setDismissed(true)
    clearInstallPrompt()
    setInstallEvent(null)
  }

  return (
    <aside className={styles.prompt} aria-label="Installazione Docente OS">
      <div className={styles.copy}>
        <strong>Installa Docente OS</strong>
        <span>Aggiungilo al dispositivo per aprirlo come app e ricevere documenti dal menu Condividi.</span>
      </div>
      <div className={styles.actions}>
        {installEvent ? (
          <button type="button" className={styles.primary} onClick={() => void install()}>
            Installa
          </button>
        ) : (
          <a className={styles.primary} href="/impostazioni#installazione">
            Come installare
          </a>
        )}
        <button type="button" className={styles.secondary} onClick={() => setDismissed(true)} aria-label="Nascondi indicazione di installazione">
          Non ora
        </button>
      </div>
    </aside>
  )
}
