'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setPassword(formData: FormData) {
  const password = readString(formData.get('password'))
  const confirmPassword = readString(formData.get('confirm_password'))

  if (password.length < 10) {
    redirect('/imposta-password?error=weak_password')
  }

  if (password !== confirmPassword) {
    redirect('/imposta-password?error=password_mismatch')
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/login?error=session_required')
  }

  // A session with an already enrolled MFA factor may not change the
  // account password until the second factor has actually been verified.
  // Verify BEFORE updateUser; checking afterwards permits an aal1 mutation.
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (
    assurance.error ||
    !assurance.data ||
    (assurance.data.currentLevel !== 'aal2' && assurance.data.nextLevel === 'aal2')
  ) {
    redirect('/sicurezza/mfa')
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('Password update failed', error.code)
    redirect('/imposta-password?error=password_update_failed')
  }

  redirect('/workspace')
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}
