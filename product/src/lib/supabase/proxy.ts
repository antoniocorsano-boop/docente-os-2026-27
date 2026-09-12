import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

function createResponse(request: NextRequest, requestHeaderOverrides?: Headers) {
  if (!requestHeaderOverrides) return NextResponse.next({ request })

  const headers = new Headers(request.headers)
  requestHeaderOverrides.forEach((value, key) => headers.set(key, value))

  return NextResponse.next({
    request: {
      headers,
    },
  })
}

export async function updateSession(request: NextRequest, requestHeaderOverrides?: Headers) {
  let response = createResponse(request, requestHeaderOverrides)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = createResponse(request, requestHeaderOverrides)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Validate/refresh the JWT at the request boundary. Do not use getSession()
  // for authorization decisions on the server.
  const { data, error } = await supabase.auth.getClaims()

  return {
    response,
    claims: error ? null : data?.claims ?? null,
  }
}
