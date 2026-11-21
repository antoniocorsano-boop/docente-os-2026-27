/**
 * Reverse proxies may expose 0.0.0.0:PORT as the internal request origin.
 * Render automatically supplies the public RENDER_EXTERNAL_URL.
 */
export function googleOAuthPublicOrigin(config: {
  renderExternalUrl?: string | null
  appUrl?: string | null
} = {
  renderExternalUrl: process.env.RENDER_EXTERNAL_URL,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
}): string | null {
  for (const raw of [config.renderExternalUrl, config.appUrl]) {
    if (!raw?.trim()) continue
    try {
      const candidate = new URL(raw.trim())
      if (candidate.username || candidate.password || candidate.hostname === '0.0.0.0') continue
      const localHttp = candidate.protocol === 'http:'
        && (candidate.hostname === 'localhost' || candidate.hostname === '127.0.0.1')
      if (candidate.protocol !== 'https:' && !localHttp) continue
      return candidate.origin
    } catch {
      // Invalid configured origins must never be used as redirect targets.
    }
  }
  return null
}

export function safeGoogleOAuthReturnTo(value: string): string {
  return value.startsWith('/') && !value.startsWith('//')
    && !value.includes('\\') && !/[\u0000-\u001f]/.test(value)
    ? value : '/classi'
}

export function googleOAuthResultUrl(
  returnTo: string,
  state: string,
  synced = 0,
  origin: string | null = googleOAuthPublicOrigin(),
): URL | null {
  if (!origin) return null
  const target = new URL(safeGoogleOAuthReturnTo(returnTo), origin)
  if (target.origin !== origin) return null
  target.searchParams.set('google', state)
  if (synced > 0) target.searchParams.set('driveSynced', String(synced))
  return target
}
