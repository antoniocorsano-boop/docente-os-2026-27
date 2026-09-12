'use server'

import { redirect } from 'next/navigation'
import { hasAal2, mfaRedirectPath } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'

type PasswordSetupSource = 'email' | 'recovery' | 'account' | ''

export async function setPassword(formData: FormData) {
  const password = readString(formData.get('password'))
  const confirmPassword = readString(formData.get('confirm_password'))
  const source = normalizeSetupSource(readString(formData.get('source')))

  if (password.length < 10) {
    redirect(passwordSetupErrorPath(source, 'weak_password'))
  }

  if (password !== confirmPassword) {
    redirect(passwordSetupErrorPath(source, 'password_mismatch'))
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/login?error=session_required')
  }

  if (source === 'recovery' && !hasAal2(data.claims)) {
    redirect(mfaRedirectPath('/imposta-password', '?source=recovery'))
  }

  if (source === 'account' && !hasAal2(data.claims)) {
    redirect(mfaRedirectPath('/imposta-password', '?source=account'))
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('Password update failed', error.code)
    redirect(passwordSetupErrorPath(source, 'password_update_failed'))
  }

  redirect(source === 'account' ? '/account?password=updated' : '/workspace')
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}

function normalizeSetupSource(value: string): PasswordSetupSource {
  return value === 'recovery' || value === 'email' || value === 'account' ? value : ''
}

function passwordSetupErrorPath(source: PasswordSetupSource, error: string) {
  const params = new URLSearchParams({ error })
  if (source) params.set('source', source)
  return `/imposta-password?${params.toString()}`
}
