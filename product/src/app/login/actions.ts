'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestEmailOtp(formData: FormData) {
  const email = normalizeEmail(formData.get('email'))

  if (!isValidEmail(email)) {
    redirect('/login?error=invalid_email')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.error('Email OTP request failed', error.code)
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
      redirect('/login?error=email_rate_limited')
    }
    redirect('/login?error=auth_request_failed')
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`)
}

export async function verifyEmailOtp(formData: FormData) {
  const email = normalizeEmail(formData.get('email'))
  const token = normalizeOtp(formData.get('token'))
  const retryUrl = `/login?sent=1&email=${encodeURIComponent(email)}`

  if (!isValidEmail(email)) {
    redirect('/login?error=invalid_email')
  }

  if (!/^\d{6}$/.test(token)) {
    redirect(`${retryUrl}&error=invalid_otp`)
  }

  const supabase = await createClient()
  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (otpError) {
    console.error('Email OTP verification failed', otpError.code)
    redirect(`${retryUrl}&error=invalid_otp`)
  }

  const { data: workspaceId, error: bootstrapError } = await supabase.rpc(
    'bootstrap_personal_workspace',
    { workspace_name: 'Il mio spazio docente' },
  )

  if (bootstrapError || !workspaceId) {
    await supabase.auth.signOut()
    redirect('/login?error=workspace_bootstrap_failed')
  }

  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .maybeSingle()

  if (!activeYear) {
    const { error: yearError } = await supabase.from('academic_years').insert({
      workspace_id: workspaceId,
      label: '2026/2027',
      starts_on: '2026-09-01',
      ends_on: '2027-08-31',
      is_active: true,
    })

    if (yearError) {
      await supabase.auth.signOut()
      redirect('/login?error=academic_year_bootstrap_failed')
    }
  }

  redirect('/workspace')
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeOtp(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.replace(/\s+/g, '') : ''
}

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email)
}
