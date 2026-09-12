import type { NextRequest } from 'next/server'
import {
  buildContentSecurityPolicy,
  createContentSecurityPolicyNonce,
} from './core/security/content-security-policy'
import { updateSession } from './lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const nonce = createContentSecurityPolicyNonce()
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV !== 'production',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
  const requestHeaders = new Headers()
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)
  requestHeaders.set('x-nonce', nonce)

  const response = await updateSession(request, requestHeaders)
  response.headers.set('Content-Security-Policy', contentSecurityPolicy)

  return response
}

export const config = {
  matcher: ['/((?!api/build-info|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
