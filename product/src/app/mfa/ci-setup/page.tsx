import { redirect } from 'next/navigation'
import { DocenteOsLockup } from '@/components/brand/docente-os-brand'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { hasAal2 } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'
import { MfaCiFactorSetup } from './setup-client'

export const dynamic = 'force-dynamic'

export default async function MfaCiSetupPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = error ? null : data?.claims ?? null

  if (!claims?.sub) redirect('/login?error=session_required')
  if (!hasAal2(claims)) redirect('/mfa?next=%2Fmfa%2Fci-setup')

  return (
    <main className="brandAuthSurface min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <header className="brandAuthHero">
          <DocenteOsLockup />
          <p className="brandPromise">Configurazione temporanea di test.</p>
          <h1 className="m-0 max-w-2xl text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Prepara il fattore MFA per il gate CI.</h1>
          <p className="m-0 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Questa pagina è disponibile solo con sessione AAL2. Crea un secondo fattore TOTP dedicato al test automatico e mostra la chiave soltanto nel browser corrente.
          </p>
        </header>

        <Card className="overflow-hidden shadow-[var(--shadow-float)]">
          <CardHeader className="border-b border-border bg-card">
            <p className="m-0 text-xs font-semibold text-primary">SOLO TEST CI</p>
            <CardTitle>Docente OS CI</CardTitle>
            <CardDescription>Non usare questa chiave per l’accesso personale. Verrà rimossa dal prodotto prima della chiusura della PR.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <MfaCiFactorSetup />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
