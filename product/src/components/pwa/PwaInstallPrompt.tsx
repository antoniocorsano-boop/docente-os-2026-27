'use client'

import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const standaloneTimer = window.setTimeout(() => {
      setInstalled(isStandalone())
    }, 0)

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.clearTimeout(standaloneTimer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (pathname.startsWith('/orario') || installed || dismissed || !installEvent) return null

  const install = async () => {
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setDismissed(true)
    setInstallEvent(null)
  }

  return (
    <aside className={styles.prompt} aria-label="Installazione Docente OS">
      <div className={styles.copy}>
        <strong>Installa Docente OS</strong>
        <span>Aggiungilo al dispositivo per aprirlo come app e ricevere documenti dal menu Condividi.</span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => void install()}>
          Installa
        </button>
        <button type="button" className={styles.secondary} onClick={() => setDismissed(true)} aria-label="Nascondi indicazione di installazione">
          Non ora
        </button>
      </div>
    </aside>
  )
}
