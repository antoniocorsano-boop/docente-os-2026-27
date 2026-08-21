'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestMagicLink(formData: FormData) {
  const rawEmail = formData.get('email')
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirect('/login?error=invalid_email')
  }

  const headerStore = await headers()
  const origin = headerStore.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL

  if (!origin) {
    throw new Error('NEXT_PUBLIC_APP_URL is required when request origin is unavailable')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.error('Magic-link request failed', error.code)
    redirect('/login?error=auth_request_failed')
  }

  redirect('/login?sent=1')
}
