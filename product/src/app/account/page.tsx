import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'
import { signOutOtherSessions } from './actions'

export const dynamic = 'force-dynamic'

type AccountPageProps = {
  searchParams: Promise<{ password?: string; sessions?: string; error?: string }>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createClient()
  const [{ data: userData }, factorsResult, assuranceResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ])

  const user = userData.user
  if (!user) redirect('/login?error=session_required')

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const params = await searchParams
  const factors = factorsResult.data?.totp ?? []
  const assurance = assuranceResult.data?.currentLevel ?? 'aal1'
  const notice = params.password === 'updated'
    ? 'Password aggiornata correttamente.'
    : params.sessions === 'revoked'
      ? 'Le altre sessioni sono state revocate.'
      : params.error === 'session_revocation_failed'
        ? 'Non è stato possibile revocare le altre sessioni. Riprova.'
        : null

  return (
    <AppShell
      active="account"
      academicYearLabel={context.academicYear?.label ?? null}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="mx-auto w-full max-w-5xl"
    >
      <div className="grid gap-6 py-2 sm:py-4">
        <header className="grid gap-2">
          <p className="m-0 text-xs font-semibold text-primary">ACCOUNT E SICUREZZA</p>
          <h1 className="m-0 text-3xl font-bold tracking-[-0.03em]">Il tuo account</h1>
          <p className="m-0 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Qui gestisci accesso, password, secondo fattore e sessioni. Le impostazioni didattiche e professionali restano separate.
          </p>
        </header>

        {notice ? (
          <p role="status" className="m-0 rounded-[var(--radius-sm)] border border-border bg-muted/40 px-4 py-3 text-sm">{notice}</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Identità di accesso</CardTitle>
              <CardDescription>L’indirizzo associato all’account autenticato.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-1">
                <span className="text-xs font-semibold text-muted-foreground">EMAIL</span>
                <strong className="break-all text-sm">{user.email ?? 'Email non disponibile'}</strong>
              </div>
              <p className="m-0 text-xs leading-5 text-muted-foreground">L’identità è gestita da Supabase Auth; Docente OS non mostra né conserva la password in chiaro.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Secondo fattore</CardTitle>
              <CardDescription>Protezione MFA richiesta per le superfici operative.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1">
                <strong>{factors.length > 0 ? 'MFA attiva' : 'MFA da configurare'}</strong>
                <span className="text-sm text-muted-foreground">
                  {factors.length > 0
                    ? `${factors.length} autenticatore${factors.length === 1 ? '' : 'i'} TOTP verificato${factors.length === 1 ? '' : 'i'} · sessione ${assurance.toUpperCase()}`
                    : 'Nessun autenticatore TOTP verificato.'}
                </span>
              </div>
              <Button asChild variant="secondary"><Link href="/account/mfa">Gestisci MFA</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Cambia la password mantenendo la sessione ad alta affidabilità.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="m-0 text-sm leading-6 text-muted-foreground">Il cambio password richiede una sessione MFA valida e non espone mai la credenziale corrente.</p>
              <Button asChild><Link href="/imposta-password?source=account">Cambia password</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessioni</CardTitle>
              <CardDescription>Controlla dove resta valido l’accesso.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <form action={signOutOtherSessions}>
                <Button className="w-full" type="submit" variant="secondary">Revoca le altre sessioni</Button>
              </form>
              <form action="/auth/signout" method="post">
                <Button className="w-full" type="submit" variant="ghost">Esci da questa sessione</Button>
              </form>
              <p className="m-0 text-xs leading-5 text-muted-foreground">La revoca delle altre sessioni mantiene attiva quella corrente.</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="ghost"><Link href="/impostazioni">Impostazioni professionali</Link></Button>
        </div>
      </div>
    </AppShell>
  )
}
