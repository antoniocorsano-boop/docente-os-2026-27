import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeGoogleAuthorizationCode,
  googleAccountEmail,
} from '@/core/infrastructure/google/google-oauth'
import { GoogleOAuthConnectionRepository } from '@/core/infrastructure/google/google-oauth-connection-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const jar = await cookies()
  const expectedState = jar.get('docente_google_oauth_state')?.value ?? null
  const verifier = jar.get('docente_google_oauth_verifier')?.value ?? null
  const returnTo = safeReturnTo(jar.get('docente_google_oauth_return')?.value ?? '/classi')
  const expectedWorkspace = jar.get('docente_google_oauth_workspace')?.value ?? null
  clearOAuthCookies(jar)

  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')
  if (error || !state || !code || !expectedState || state !== expectedState || !verifier || !expectedWorkspace) {
    return redirectWithGoogleState(request.url, returnTo, 'rejected')
  }

  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context || context.workspace.id !== expectedWorkspace) {
    return redirectWithGoogleState(request.url, returnTo, 'context-mismatch')
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code, verifier)
    const accountEmail = await googleAccountEmail(tokens.accessToken)
    await new GoogleOAuthConnectionRepository().save({
      workspaceId: context.workspace.id,
      accountEmail,
      scopes: tokens.scopes,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    })
    return redirectWithGoogleState(request.url, returnTo, 'connected')
  } catch {
    return redirectWithGoogleState(request.url, returnTo, 'failed')
  }
}

function clearOAuthCookies(jar: Awaited<ReturnType<typeof cookies>>) {
  for (const name of [
    'docente_google_oauth_state',
    'docente_google_oauth_verifier',
    'docente_google_oauth_return',
    'docente_google_oauth_workspace',
  ]) {
    jar.delete(name)
  }
}

function redirectWithGoogleState(baseUrl: string, returnTo: string, state: string) {
  const target = new URL(returnTo, baseUrl)
  target.searchParams.set('google', state)
  return NextResponse.redirect(target)
}

function safeReturnTo(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/classi'
}
