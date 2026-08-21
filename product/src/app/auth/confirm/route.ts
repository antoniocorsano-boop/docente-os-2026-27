import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null
  const redirectTo = request.nextUrl.clone()
  redirectTo.search = ''

  const supabase = await createClient()

  let authError: Error | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    authError = error
  } else {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set('error', 'missing_token')
    return NextResponse.redirect(redirectTo)
  }

  if (authError) {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set('error', 'invalid_token')
    return NextResponse.redirect(redirectTo)
  }

  const { data: workspaceId, error: bootstrapError } = await supabase.rpc(
    'bootstrap_personal_workspace',
    { workspace_name: 'Il mio spazio docente' },
  )

  if (bootstrapError || !workspaceId) {
    redirectTo.pathname = '/login'
    redirectTo.searchParams.set('error', 'workspace_bootstrap_failed')
    return NextResponse.redirect(redirectTo)
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
      redirectTo.pathname = '/login'
      redirectTo.searchParams.set('error', 'academic_year_bootstrap_failed')
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = '/workspace'
  return NextResponse.redirect(redirectTo)
}
