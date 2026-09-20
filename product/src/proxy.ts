import { NextResponse, type NextRequest } from 'next/server'
import {
  buildContentSecurityPolicy,
  createContentSecurityPolicyNonce,
} from './core/security/content-security-policy'
import {
  isApplicationApiPath,
  mfaRedirectPath,
  requiresMfa,
} from './core/security/mfa-access-policy'
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

  const isPublicEco02Demo =
    request.nextUrl.pathname === '/demo/eco02-p1' ||
    request.nextUrl.pathname.startsWith('/demo/eco02-p1/')

  if (isPublicEco02Demo) {
    const headers = new Headers(request.headers)
    requestHeaders.forEach((value, key) => headers.set(key, value))
    const response = NextResponse.next({ request: { headers } })
    response.headers.set('Content-Security-Policy', contentSecurityPolicy)
    return response
  }

  const session = await updateSession(request, requestHeaders)
  let response = session.response

  if (requiresMfa(request.nextUrl.pathname, session.claims)) {
    if (isApplicationApiPath(request.nextUrl.pathname)) {
      response = NextResponse.json({ ok: false, code: 'mfa_required' }, { status: 403 })
    } else {
      response = NextResponse.redirect(
        new URL(mfaRedirectPath(request.nextUrl.pathname, request.nextUrl.search), request.url),
      )
    }

    for (const cookie of session.response.cookies.getAll()) response.cookies.set(cookie)
  }

  response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  return response
}

export const config = {
  matcher: ['/((?!api/build-info|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
