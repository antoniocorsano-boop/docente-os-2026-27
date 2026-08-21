import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function WorkspacePage() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims?.sub) redirect('/login')

  const userId = claimsData.claims.sub
  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role, workspaces(id, name, kind)')
    .eq('user_id', userId)

  if (membershipError || !memberships?.length) redirect('/login?error=workspace_missing')

  const workspaceId = memberships[0].workspace_id
  const { data: year } = await supabase
    .from('academic_years')
    .select('label, starts_on, ends_on')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .maybeSingle()

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">DOCENTE OS</p>
        <h1>{memberships[0].workspaces?.name ?? 'Il mio spazio docente'}</h1>
        <p className="muted">Workspace personale autenticato e protetto da Row Level Security.</p>
        <dl className="facts">
          <div><dt>Ruolo</dt><dd>{memberships[0].role}</dd></div>
          <div><dt>Anno scolastico</dt><dd>{year?.label ?? 'Da configurare'}</dd></div>
        </dl>
        <form action="/auth/signout" method="post">
          <button type="submit">Esci</button>
        </form>
      </section>
    </main>
  )
}
