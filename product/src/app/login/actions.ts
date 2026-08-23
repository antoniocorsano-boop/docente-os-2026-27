'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ensurePersonalWorkspace } from '@/app/auth/bootstrap-personal-workspace'
import { createClient } from '@/lib/supabase/server'

export async function signInWithPassword(formData: FormData) {
  const email = normalizeEmail(formData.get('email'))
  const password = normalizePassword(formData.get('password'))

  if (!isValidEmail(email) || password.length < 8) {
    redirect('/login?error=invalid_credentials')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('Password sign-in failed', error.code)
    redirect('/login?error=invalid_credentials')
  }

  const bootstrap = await ensurePersonalWorkspace(supabase)
  if (!bootstrap.ok) {
    await supabase.auth.signOut()
    redirect(`/login?error=${bootstrap.error}`)
  }

  redirect('/workspace')
}

export async function requestMagicLink(formData: FormData) {
  const email = normalizeEmail(formData.get('email'))

  if (!isValidEmail(email)) {
    redirect('/login?error=invalid_email')
  }

  const headerStore = await headers()
  const requestOrigin = safeOrigin(headerStore.get('origin'))
  const forwardedHost = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const forwardedProtocol = headerStore.get('x-forwarded-proto') ?? 'https'
  const proxyOrigin = forwardedHost ? safeOrigin(`${forwardedProtocol}://${forwardedHost}`) : null
  const configuredOrigin = safeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null)
  const appUrl = requestOrigin ?? proxyOrigin ?? configuredOrigin

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is required when request origin is unavailable')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl.replace(/\/$/, '')}/auth/confirm`,
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.error('Magic-link request failed', error.code)
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
      redirect('/login?error=email_rate_limited')
    }
    redirect('/login?error=auth_request_failed')
  }

  redirect('/login?sent=1')
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizePassword(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email)
}

function safeOrigin(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null
  } catch {
    return null
  }
}
