export type AuthClaimsLike = {
  sub?: unknown
  aal?: unknown
} | null | undefined

const DEFAULT_AUTHENTICATED_DESTINATION = '/planner'
const MFA_EXEMPT_EXACT_PATHS = new Set(['/login', '/mfa', '/imposta-password'])

export function isAuthenticatedClaims(claims: AuthClaimsLike) {
  return typeof claims?.sub === 'string' && claims.sub.length > 0
}

export function hasAal2(claims: AuthClaimsLike) {
  return isAuthenticatedClaims(claims) && claims?.aal === 'aal2'
}

export function isMfaExemptPath(pathname: string) {
  if (MFA_EXEMPT_EXACT_PATHS.has(pathname)) return true
  return pathname === '/auth' || pathname.startsWith('/auth/')
}

export function requiresMfa(pathname: string, claims: AuthClaimsLike) {
  return isAuthenticatedClaims(claims) && !hasAal2(claims) && !isMfaExemptPath(pathname)
}

export function isApplicationApiPath(pathname: string) {
  return pathname === '/api' || pathname.startsWith('/api/')
}

export function normalizeMfaNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_AUTHENTICATED_DESTINATION

  try {
    const url = new URL(value, 'https://docente-os.local')
    if (url.origin !== 'https://docente-os.local') return DEFAULT_AUTHENTICATED_DESTINATION
    if (isMfaExemptPath(url.pathname)) return DEFAULT_AUTHENTICATED_DESTINATION
    if (isApplicationApiPath(url.pathname)) return DEFAULT_AUTHENTICATED_DESTINATION
    return `${url.pathname}${url.search}`
  } catch {
    return DEFAULT_AUTHENTICATED_DESTINATION
  }
}

export function mfaRedirectPath(pathname: string, search: string) {
  const next = normalizeMfaNextPath(`${pathname}${search}`)
  return `/mfa?next=${encodeURIComponent(next)}`
}
