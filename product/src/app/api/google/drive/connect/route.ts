import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createGoogleOAuthRequest, googleOAuthConfigured } from '@/core/infrastructure/google/google-oauth'
import { googleOAuthPublicOrigin, googleOAuthResultUrl } from '@/core/infrastructure/google/google-oauth-public-url'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/classi'
  const publicOrigin = googleOAuthPublicOrigin()
  if (!publicOrigin) {
    return NextResponse.json({ error: 'Indirizzo pubblico di collegamento Google non configurato.' }, { status: 503 })
  }
  if (!googleOAuthConfigured()) return redirectWithGoogleState(returnTo, 'not-configured')

  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) return NextResponse.redirect(new URL('/login', publicOrigin))

  const purpose = request.nextUrl.searchParams.get('purpose') === 'arena' ? 'arena' : 'diary'
  if (purpose === 'arena' && (context.workspace.kind !== 'PERSONAL'
    || context.role !== 'OWNER'
    || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/[/]$/, '') !== 'https://gnshgapmwyjamhmlikeg.supabase.co')) {
    return redirectWithGoogleState(returnTo, 'context-mismatch')
  }
  const oauth = createGoogleOAuthRequest(returnTo, purpose)
  const jar = await cookies()
  const options = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 }
  jar.set('docente_google_oauth_state', oauth.state, options)
  jar.set('docente_google_oauth_verifier', oauth.verifier, options)
  jar.set('docente_google_oauth_return', oauth.returnTo, options)
  jar.set('docente_google_oauth_workspace', context.workspace.id, options)
  jar.set('docente_google_oauth_purpose', purpose, options)
  return NextResponse.redirect(oauth.url)
}

function redirectWithGoogleState(returnTo: string, state: string) {
  const target = googleOAuthResultUrl(returnTo, state)
  return target ? NextResponse.redirect(target) : NextResponse.json(
    { error: 'Indirizzo pubblico di collegamento Google non configurato.' },
    { status: 503 },
  )
}
