import { createHash, randomBytes } from 'node:crypto'
import { GoogleOAuthConnectionRepository } from './google-oauth-connection-repository'

export const GOOGLE_DIARY_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/spreadsheets',
]

export function createGoogleOAuthRequest(returnTo: string) {
  const state = randomBytes(24).toString('base64url')
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', googleClientId())
  url.searchParams.set('redirect_uri', googleRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_DIARY_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return { url: url.toString(), state, verifier, returnTo: safeReturnTo(returnTo) }
}

export async function exchangeGoogleAuthorizationCode(code: string, verifier: string) {
  const body = new URLSearchParams({
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: googleRedirectUri(),
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const payload = await response.json() as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') throw new Error(`Google OAuth exchange failed: ${String(payload.error ?? response.status)}`)
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
    scopes: typeof payload.scope === 'string' ? payload.scope.split(/\s+/).filter(Boolean) : GOOGLE_DIARY_SCOPES,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  }
}

export async function googleAccountEmail(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = await response.json() as Record<string, unknown>
  return typeof payload.email === 'string' ? payload.email : null
}

export async function activeGoogleAccessToken(workspaceId: string) {
  const repository = new GoogleOAuthConnectionRepository()
  const connection = await repository.getActive(workspaceId)
  if (!connection) return null
  if (Date.parse(connection.expiresAt) > Date.now() + 60_000) return connection.accessToken
  if (!connection.refreshToken) return null

  const body = new URLSearchParams({
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    refresh_token: connection.refreshToken,
    grant_type: 'refresh_token',
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const payload = await response.json() as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') return null
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600
  const updated = await repository.updateAccessToken({
    workspaceId,
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  })
  return updated.accessToken
}

export function googleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY && process.env.NEXT_PUBLIC_APP_URL)
}

function googleClientId() {
  const value = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!value) throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured')
  return value
}

function googleClientSecret() {
  const value = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!value) throw new Error('GOOGLE_OAUTH_CLIENT_SECRET is not configured')
  return value
}

function googleRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  return new URL('/api/google/drive/callback', base).toString()
}

function safeReturnTo(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/classi'
}
