import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isIsolatedMfaPreview } from '@/lib/supabase/mfa-isolated-preview'
import { MfaAccess } from './mfa-access'

export const dynamic = 'force-dynamic'

type MfaPageProps = {
  searchParams: Promise<{ return?: string }>
}

export default async function MfaPage({ searchParams }: MfaPageProps) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) redirect('/login?error=session_required')

  const params = await searchParams
  // Never accept arbitrary return URLs from request parameters.
  // Password recovery is the only supported privileged return path.
  const returnTo = params.return === 'password'
    ? '/imposta-password?source=mfa'
    : '/workspace'

  return <MfaAccess returnTo={returnTo} isTestPreview={isIsolatedMfaPreview()} />
}
