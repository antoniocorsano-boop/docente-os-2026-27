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
    ? 'Controlla la posta: ti abbiamo inviato il link di accesso.'
    : params.error
      ? 'Non è stato possibile avviare l’accesso. Controlla l’indirizzo e riprova.'
      : null

  return (
    <main className="shell">
      <section className="panel auth-card">
        <p className="eyebrow">DOCENTE OS 2026/27</p>
        <h1>Accedi al tuo spazio docente</h1>
        <p className="muted">
          Accesso senza password. L’autorizzazione a Gmail, Drive e Calendar resterà separata dall’identità DOCENTE OS.
        </p>
        {message ? <p role="status" className="notice">{message}</p> : null}
        <form action={requestMagicLink} className="stack">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <button type="submit">Invia link di accesso</button>
        </form>
      </section>
    </main>
  )
}
