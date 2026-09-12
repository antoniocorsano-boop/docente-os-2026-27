import { redirect } from 'next/navigation'
import { DocenteOsLockup } from '@/components/brand/docente-os-brand'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { hasAal2, normalizeMfaNextPath } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'
import { MfaGate } from './mfa-gate'

export const dynamic = 'force-dynamic'

type MfaPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function MfaPage({ searchParams }: MfaPageProps) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = error ? null : data?.claims ?? null

  if (!claims?.sub) redirect('/login?error=session_required')

  const params = await searchParams
  const nextPath = normalizeMfaNextPath(params.next)
  if (hasAal2(claims)) redirect(nextPath)

  return (
    <main className="brandAuthSurface min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <header className="brandAuthHero">
          <DocenteOsLockup />
          <p className="brandPromise">Mantieni il filo.</p>
          <h1 className="m-0 max-w-2xl text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Conferma il secondo fattore.</h1>
          <p className="m-0 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Password o collegamento email verificano il primo fattore. Prima di entrare nelle superfici operative serve anche il codice temporaneo dell’autenticatore.
          </p>
        </header>

        <Card className="overflow-hidden shadow-[var(--shadow-float)]">
          <CardHeader className="border-b border-border bg-card">
            <p className="m-0 text-xs font-semibold text-primary">ACCESSO A DUE FATTORI</p>
            <CardTitle>Verifica MFA</CardTitle>
            <CardDescription>Docente OS accetta una sessione operativa solo dopo il passaggio ad AAL2.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <MfaGate nextPath={nextPath} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
