import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MfaAccess } from './mfa-access'

export const dynamic = 'force-dynamic'

export default async function MfaPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) redirect('/login?error=session_required')

  return <MfaAccess />
}
