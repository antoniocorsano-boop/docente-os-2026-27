import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requestMagicLink } from './actions'

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
    ? 'Controlla la posta: ti abbiamo inviato il collegamento di accesso. Aprilo una sola volta.'
    : params.error === 'email_rate_limited'
      ? 'Sono stati richiesti troppi collegamenti in poco tempo. Attendi qualche minuto prima di richiederne uno nuovo.'
      : params.error
        ? 'Non è stato possibile avviare l’accesso. Controlla l’indirizzo e riprova.'
        : null

  return (
    <main className="shell">
      <section className="panel auth-card">
        <p className="eyebrow">DOCENTE OS 2026/27</p>
        <h1>Accedi al tuo spazio docente</h1>
        <p className="muted">
          Accesso senza password tramite collegamento monouso inviato via email. Il ritorno avviene su questa stessa pubblicazione di Docente OS.
          L’autorizzazione a Gmail, Drive e Calendar resterà separata dall’identità DOCENTE OS.
        </p>
        {message ? <p role="status" className="notice">{message}</p> : null}
        <form action={requestMagicLink} className="stack">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <button type="submit">Invia collegamento di accesso</button>
        </form>
      </section>
    </main>
  )
}
