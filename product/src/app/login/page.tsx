import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requestMagicLink, signInWithPassword } from './actions'

export const dynamic = 'force-dynamic'

type LoginPageProps = {
  searchParams: Promise<{ sent?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) redirect('/workspace')

  const params = await searchParams
  const message = params.sent
    ? 'Controlla la posta: ti abbiamo inviato un collegamento monouso. Usalo per impostare o reimpostare la password.'
    : params.error === 'email_rate_limited'
      ? 'Il servizio email di Supabase ha raggiunto il limite temporaneo. L’accesso con password continua a funzionare normalmente.'
      : params.error === 'invalid_credentials'
        ? 'Email o password non corrette.'
        : params.error === 'workspace_bootstrap_failed' || params.error === 'academic_year_bootstrap_failed'
          ? 'Accesso riuscito, ma non è stato possibile preparare lo spazio docente. Riprova tra poco.'
          : params.error
            ? 'Non è stato possibile completare l’accesso. Riprova.'
            : null

  return (
    <main className="shell">
      <section className="panel auth-card">
        <p className="eyebrow">DOCENTE OS 2026/27</p>
        <h1>Accedi al tuo spazio docente</h1>
        <p className="muted">
          L’accesso ordinario usa email e password e non invia messaggi, quindi non consuma la quota email di Supabase.
          Il collegamento via email resta disponibile solo per la prima configurazione o il recupero della password.
        </p>

        {message ? <p role="status" className="notice">{message}</p> : null}

        <form action={signInWithPassword} className="stack">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
          <button type="submit">Entra in Docente OS</button>
        </form>

        <hr />

        <details>
          <summary>Prima configurazione o password dimenticata</summary>
          <p className="muted">
            Richiedi un collegamento monouso. Dopo il clic potrai impostare una password e da quel momento non serviranno più email per gli accessi ordinari.
          </p>
          <form action={requestMagicLink} className="stack">
            <label htmlFor="recovery-email">Email</label>
            <input id="recovery-email" name="email" type="email" autoComplete="email" required />
            <button type="submit" className="secondary">Invia collegamento di configurazione</button>
          </form>
        </details>
      </section>
    </main>
  )
}
