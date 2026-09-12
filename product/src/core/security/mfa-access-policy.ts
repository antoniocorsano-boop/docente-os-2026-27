export type AuthClaimsLike = {
  sub?: unknown
  aal?: unknown
} | null | undefined

type ExternalOriginInput = {
  configuredOrigin?: string | null
  forwardedHost?: string | null
  forwardedProto?: string | null
  requestOrigin?: string | null
}

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
    if (isMfaExemptPath(url.pathname) && !isAllowedPasswordDestination(url)) {
      return DEFAULT_AUTHENTICATED_DESTINATION
    }
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

export function resolveExternalOrigin({
  configuredOrigin,
  forwardedHost,
  forwardedProto,
  requestOrigin,
}: ExternalOriginInput) {
  const configured = normalizeHttpOrigin(configuredOrigin)
  if (configured) return configured

  const host = firstProxyHeaderValue(forwardedHost)
  if (host) {
    const protocol = normalizeProxyProtocol(forwardedProto) ?? protocolFromOrigin(requestOrigin) ?? 'https'
    const forwarded = normalizeHttpOrigin(`${protocol}://${host}`)
    if (forwarded) return forwarded
  }

  const request = normalizeHttpOrigin(requestOrigin)
  if (request) return request

  throw new Error('A public application origin is required for auth redirects')
}

function isAllowedPasswordDestination(url: URL) {
  const entries = Array.from(url.searchParams.entries())
  if (url.pathname !== '/imposta-password' || entries.length !== 1 || entries[0]?.[0] !== 'source') return false
  return entries[0]?.[1] === 'recovery' || entries[0]?.[1] === 'email'
}

function normalizeHttpOrigin(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

function firstProxyHeaderValue(value: string | null | undefined) {
  const first = value?.split(',')[0]?.trim()
  return first || null
}

function normalizeProxyProtocol(value: string | null | undefined) {
  const protocol = firstProxyHeaderValue(value)?.toLowerCase()
  return protocol === 'http' || protocol === 'https' ? protocol : null
}

function protocolFromOrigin(value: string | null | undefined) {
  const origin = normalizeHttpOrigin(value)
  if (!origin) return null
  return origin.startsWith('http://') ? 'http' : 'https'
}
