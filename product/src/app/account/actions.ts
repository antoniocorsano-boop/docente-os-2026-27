'use server'

import { redirect } from 'next/navigation'
import { hasAal2 } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'

export async function signOutOtherSessions() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) redirect('/login?error=session_required')
  if (!hasAal2(data.claims)) redirect('/mfa?next=%2Faccount')

  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) {
    console.error('Other session revocation failed', error.code)
    redirect('/account?error=session_revocation_failed')
  }

  redirect('/account?sessions=revoked')
}
