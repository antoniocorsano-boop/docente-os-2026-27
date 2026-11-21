import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { synchronizePendingDriveDiary } from '@/core/infrastructure/google/google-drive-diary-sync'
import {
  exchangeGoogleAuthorizationCode,
  googleAccountEmail,
} from '@/core/infrastructure/google/google-oauth'
import { GoogleOAuthConnectionRepository } from '@/core/infrastructure/google/google-oauth-connection-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'
import { assessGoogleOAuthConnection } from '@/core/infrastructure/google/google-oauth-purpose'
import { googleOAuthResultUrl, safeGoogleOAuthReturnTo } from '@/core/infrastructure/google/google-oauth-public-url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const jar = await cookies()
  const expectedState = jar.get('docente_google_oauth_state')?.value ?? null
  const verifier = jar.get('docente_google_oauth_verifier')?.value ?? null
  const returnTo = safeGoogleOAuthReturnTo(jar.get('docente_google_oauth_return')?.value ?? '/classi')
  const expectedWorkspace = jar.get('docente_google_oauth_workspace')?.value ?? null
  const purpose = jar.get('docente_google_oauth_purpose')?.value ?? null
  clearOAuthCookies(jar)

  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')
  if (error || !state || !code || !expectedState || state !== expectedState || !verifier || !expectedWorkspace
    || (purpose !== 'diary' && purpose !== 'arena')) {
    return redirectWithGoogleState(returnTo, 'rejected')
  }

  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context || context.workspace.id !== expectedWorkspace) {
    return redirectWithGoogleState(returnTo, 'context-mismatch')
  }

  if (purpose === 'arena' && (context.workspace.kind !== 'PERSONAL'
    || context.role !== 'OWNER'
    || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/[/]$/, '') !== 'https://gnshgapmwyjamhmlikeg.supabase.co')) {
    return redirectWithGoogleState(returnTo, 'context-mismatch')
  }

  try {
    let signedInEmail: string | null = null
    if (purpose === 'arena') {
      const supabase = await createClient()
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || !data.user || data.user.is_anonymous === true
        || data.user.id !== context.workspace.ownerUserId) {
        return redirectWithGoogleState(returnTo, 'context-mismatch')
      }
      signedInEmail = data.user.email ?? null
    }

    const tokens = await exchangeGoogleAuthorizationCode(code, verifier)
    const accountEmail = await googleAccountEmail(tokens.accessToken)
    const repository = new GoogleOAuthConnectionRepository()
    const existing = await repository.getActive(context.workspace.id)
    const assessment = assessGoogleOAuthConnection({
      purpose,
      grantedScopes: tokens.scopes,
      accountEmail,
      signedInEmail,
      existingAccountEmail: existing?.accountEmail ?? null,
      existingScopes: existing?.scopes ?? [],
    })
    if (!assessment.allowed) {
      return redirectWithGoogleState(returnTo, assessment.reason)
    }
    await repository.save({
      workspaceId: context.workspace.id,
      accountEmail,
      scopes: tokens.scopes,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    })
    if (!assessment.synchronizeDiary) {
      return redirectWithGoogleState(returnTo, 'connected')
    }
    const sync = await synchronizePendingDriveDiary(context.workspace.id)
    return redirectWithGoogleState(returnTo, 'connected', sync.synced)
  } catch {
    return redirectWithGoogleState(returnTo, 'failed')
  }
}

function clearOAuthCookies(jar: Awaited<ReturnType<typeof cookies>>) {
  for (const name of [
    'docente_google_oauth_state',
    'docente_google_oauth_verifier',
    'docente_google_oauth_return',
    'docente_google_oauth_workspace',
    'docente_google_oauth_purpose',
  ]) {
    jar.delete(name)
  }
}

function redirectWithGoogleState(returnTo: string, state: string, synced = 0) {
  const target = googleOAuthResultUrl(returnTo, state, synced)
  return target ? NextResponse.redirect(target) : NextResponse.json(
    { error: 'Indirizzo pubblico di collegamento Google non configurato.' },
    { status: 503 },
  )
}
