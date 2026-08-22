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
