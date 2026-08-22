import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requestEmailOtp, verifyEmailOtp } from './actions'

export const dynamic = 'force-dynamic'

type LoginPageProps = {
  searchParams: Promise<{ sent?: string; email?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) redirect('/workspace')

  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email.trim().toLowerCase() : ''
  const waitingForOtp = params.sent === '1' && /^\S+@\S+\.\S+$/.test(email)

  const message = params.error === 'email_rate_limited'
    ? 'Sono stati richiesti troppi codici in poco tempo. Attendi qualche minuto prima di richiederne uno nuovo.'
    : params.error === 'invalid_otp'
      ? 'Il codice non è valido oppure è scaduto. Controlla le sei cifre e riprova.'
      : params.error === 'workspace_bootstrap_failed' || params.error === 'academic_year_bootstrap_failed'
        ? 'Accesso verificato, ma non è stato possibile preparare lo spazio docente. Riprova tra poco.'
        : params.error
          ? 'Non è stato possibile avviare l’accesso. Controlla i dati e riprova.'
          : waitingForOtp
            ? `Codice inviato a ${email}. Inserisci qui le sei cifre ricevute.`
            : null

  return (
    <main className="shell">
      <section className="panel auth-card">
        <p className="eyebrow">DOCENTE OS 2026/27</p>
        <h1>Accedi al tuo spazio docente</h1>
        <p className="muted">
          Accesso con codice monouso a 6 cifre. Non devi aprire collegamenti esterni: inserisci qui il codice ricevuto via email.
          L’autorizzazione a Gmail, Drive e Calendar resterà separata dall’identità DOCENTE OS.
        </p>

        {message ? <p role="status" className="notice">{message}</p> : null}

        {waitingForOtp ? (
          <div className="stack">
            <form action={verifyEmailOtp} className="stack">
              <input type="hidden" name="email" value={email} />
              <label htmlFor="token">Codice di accesso</label>
              <input
                id="token"
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                placeholder="000000"
                required
                autoFocus
              />
              <button type="submit">Entra in Docente OS</button>
            </form>

            <form action={requestEmailOtp}>
              <input type="hidden" name="email" value={email} />
              <button type="submit" className="secondary">Invia un nuovo codice</button>
            </form>

            <Link href="/login">Usa un altro indirizzo email</Link>
          </div>
        ) : (
          <form action={requestEmailOtp} className="stack">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
            <button type="submit">Invia codice di accesso</button>
          </form>
        )}
      </section>
    </main>
  )
}
