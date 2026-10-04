'use client'

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface Window {
    __docenteOsInstallPrompt?: BeforeInstallPromptEvent | null
  }
}

export const PWA_INSTALL_READY_EVENT = 'docente-os:pwa-install-ready'
export const PWA_INSTALL_CLEARED_EVENT = 'docente-os:pwa-install-cleared'

export function isPwaStandalone() {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function rememberInstallPrompt(event: BeforeInstallPromptEvent) {
  window.__docenteOsInstallPrompt = event
  window.dispatchEvent(new Event(PWA_INSTALL_READY_EVENT))
}

export function currentInstallPrompt() {
  if (typeof window === 'undefined') return null
  return window.__docenteOsInstallPrompt ?? null
}

export function clearInstallPrompt() {
  if (typeof window === 'undefined') return
  window.__docenteOsInstallPrompt = null
  window.dispatchEvent(new Event(PWA_INSTALL_CLEARED_EVENT))
}
