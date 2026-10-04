'use client'

// @trama-readonly — service-worker lifecycle maintenance; no user data write.

import { useEffect } from 'react'

export function PwaServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => registration.update())
      .catch((error) => {
        console.error('Docente OS service worker registration failed', error)
      })
  }, [])

  return null
}
