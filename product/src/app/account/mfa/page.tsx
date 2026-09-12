import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { hasAal2 } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'
import { MfaManager } from './mfa-manager'

export const dynamic = 'force-dynamic'

export default async function AccountMfaPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  if (!claims?.sub) redirect('/login?error=session_required')
  if (!hasAal2(claims)) redirect('/mfa?next=%2Faccount%2Fmfa')

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  return (
    <AppShell
      active="account"
      academicYearLabel={context.academicYear?.label ?? null}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="mx-auto w-full max-w-4xl"
    >
      <div className="grid gap-6 py-2 sm:py-4">
        <header className="grid gap-2">
          <p className="m-0 text-xs font-semibold text-primary">ACCOUNT E SICUREZZA · MFA</p>
          <h1 className="m-0 text-3xl font-bold tracking-[-0.03em]">Gestisci il secondo fattore</h1>
          <p className="m-0 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Aggiungi un autenticatore prima di sostituire quello in uso. Docente OS impedisce la rimozione dell’ultimo fattore verificato.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Autenticatori TOTP</CardTitle>
            <CardDescription>La gestione è disponibile soltanto da una sessione già verificata ad AAL2.</CardDescription>
          </CardHeader>
          <CardContent>
            <MfaManager />
          </CardContent>
        </Card>

        <Link className={buttonVariants({ variant: 'ghost' })} href="/account">Torna ad Account e sicurezza</Link>
      </div>
    </AppShell>
  )
}
