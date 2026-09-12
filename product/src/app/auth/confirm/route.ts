import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveExternalOrigin } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null
  const isRecovery = request.nextUrl.searchParams.get('recovery') === '1' || type === 'recovery'
  const origin = resolveExternalOrigin({
    configuredOrigin: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    requestOrigin: request.nextUrl.origin,
  })
  const redirectTo = new URL('/auth/confirm', origin)

  const supabase = await createClient()

  let authError: Error | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    authError = error
  } else {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set('error', 'missing_token')
    return NextResponse.redirect(redirectTo)
  }

  if (authError) {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set('error', 'invalid_token')
    return NextResponse.redirect(redirectTo)
  }

  // Email verification/recovery establishes only an authenticated AAL1 session.
  // Every password mutation must complete MFA before reaching the password form;
  // workspace bootstrap remains deferred until AAL2.
  redirectTo.pathname = '/mfa'
  redirectTo.searchParams.set(
    'next',
    `/imposta-password?source=${isRecovery ? 'recovery' : 'email'}`,
  )
  return NextResponse.redirect(redirectTo)
}
