import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createGoogleOAuthRequest, googleOAuthConfigured } from '@/core/infrastructure/google/google-oauth'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/classi'
  if (!googleOAuthConfigured()) {
    const target = new URL(returnTo.startsWith('/') ? returnTo : '/classi', request.url)
    target.searchParams.set('google', 'not-configured')
    return NextResponse.redirect(target)
  }

  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) return NextResponse.redirect(new URL('/login', request.url))

  const oauth = createGoogleOAuthRequest(returnTo)
  const jar = await cookies()
  const options = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 }
  jar.set('docente_google_oauth_state', oauth.state, options)
  jar.set('docente_google_oauth_verifier', oauth.verifier, options)
  jar.set('docente_google_oauth_return', oauth.returnTo, options)
  jar.set('docente_google_oauth_workspace', context.workspace.id, options)
  return NextResponse.redirect(oauth.url)
}
