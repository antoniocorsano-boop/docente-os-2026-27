import { redirect } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { requestMagicLink, requestPasswordRecovery, signInWithPassword } from './actions'

export const dynamic = 'force-dynamic'

type LoginPageProps = {
  searchParams: Promise<{ sent?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) redirect('/workspace')

  const params = await searchParams
  const message = params.sent === 'recovery'
    ? 'Se l’indirizzo appartiene a un account esistente, riceverai un collegamento per scegliere una nuova password.'
    : params.sent === 'setup'
      ? 'Controlla la posta: ti abbiamo inviato un collegamento monouso per configurare l’accesso.'
      : params.error === 'email_rate_limited'
        ? 'Il servizio email di Supabase ha raggiunto il limite temporaneo. L’accesso con password continua a funzionare normalmente.'
        : params.error === 'invalid_credentials'
          ? 'Email o password non corrette.'
          : params.error === 'workspace_bootstrap_failed' || params.error === 'academic_year_bootstrap_failed'
            ? 'Accesso riuscito, ma non è stato possibile preparare lo spazio docente. Riprova tra poco.'
            : params.error
              ? 'Non è stato possibile completare l’accesso. Riprova.'
              : null

  const alertVariant = params.error ? 'warning' : 'info'

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <header className="grid gap-2 px-1">
          <p className="m-0 text-xs font-bold tracking-[0.14em] text-primary">DOCENTE OS · 2026/27</p>
          <h1 className="m-0 max-w-2xl text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Il tuo spazio docente, pronto quando serve.</h1>
          <p className="m-0 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Accedi con la password. Configurazione iniziale e recupero credenziali restano percorsi distinti e intenzionali.
          </p>
        </header>

        <Card className="overflow-hidden shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <CardHeader className="border-b border-border bg-card">
            <p className="m-0 text-xs font-semibold text-primary">ACCESSO ORDINARIO</p>
            <CardTitle>Accedi a DOCENTE OS</CardTitle>
            <CardDescription>Usa le credenziali del tuo spazio personale. Nessun messaggio viene inviato durante l’accesso con password.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6 pt-6">
            {message ? <Alert variant={alertVariant}><AlertDescription>{message}</AlertDescription></Alert> : null}

            <form action={signInWithPassword} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold" htmlFor="email">
                Email
                <input className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15" id="email" name="email" type="email" autoComplete="email" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="password">
                Password
                <input className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15" id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
              </label>
              <Button className="mt-1 w-full" type="submit" size="lg">Entra nel tuo spazio docente</Button>
            </form>

            <Separator />

            <details className="group rounded-[var(--radius-sm)] border border-border bg-muted/45 p-4">
              <summary className="cursor-pointer font-semibold text-foreground">Problemi di accesso?</summary>
              <div className="grid gap-5 pt-4">
                <section className="grid gap-3">
                  <div className="grid gap-1">
                    <p className="m-0 text-sm font-semibold">Ho dimenticato la password</p>
                    <p className="m-0 text-sm leading-6 text-muted-foreground">Invia un collegamento di recupero. Questo percorso non crea nuovi account e non conferma se un indirizzo è registrato.</p>
                  </div>
                  <form action={requestPasswordRecovery} className="grid gap-3">
                    <label className="grid gap-2 text-sm font-semibold" htmlFor="recovery-email">
                      Email
                      <input className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15" id="recovery-email" name="email" type="email" autoComplete="email" required />
                    </label>
                    <Button variant="secondary" type="submit">Invia collegamento di recupero</Button>
                  </form>
                </section>

                <Separator />

                <section className="grid gap-3">
                  <div className="grid gap-1">
                    <p className="m-0 text-sm font-semibold">Prima configurazione</p>
                    <p className="m-0 text-sm leading-6 text-muted-foreground">Usa il collegamento monouso soltanto per attivare per la prima volta il tuo spazio docente.</p>
                  </div>
                  <form action={requestMagicLink} className="grid gap-3">
                    <label className="grid gap-2 text-sm font-semibold" htmlFor="setup-email">
                      Email
                      <input className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15" id="setup-email" name="email" type="email" autoComplete="email" required />
                    </label>
                    <Button variant="outline" type="submit">Invia collegamento di configurazione</Button>
                  </form>
                </section>
              </div>
            </details>
          </CardContent>
        </Card>

        <p className="m-0 px-1 text-xs leading-5 text-muted-foreground">
          DOCENTE OS mantiene separati autenticazione, dati del tuo workspace e integrazioni esterne. Le autorizzazioni applicative restano governate da Supabase e RLS.
        </p>
      </div>
    </main>
  )
}
