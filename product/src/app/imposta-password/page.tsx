import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setPassword } from './actions'

export const dynamic = 'force-dynamic'

type PasswordSetupPageProps = {
  searchParams: Promise<{ error?: string; source?: string }>
}

export default async function PasswordSetupPage({ searchParams }: PasswordSetupPageProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) redirect('/login?error=session_required')

  const params = await searchParams
  const message = params.error === 'weak_password'
    ? 'La password deve contenere almeno 10 caratteri.'
    : params.error === 'password_mismatch'
      ? 'Le due password non coincidono.'
      : params.error === 'password_update_failed'
        ? 'Non è stato possibile salvare la password. Riprova.'
        : params.source === 'email'
          ? 'Accesso verificato. Imposta ora una password: da questo momento gli accessi ordinari non richiederanno più email.'
          : null

  return (
    <main className="shell">
      <section className="panel auth-card">
        <p className="eyebrow">DOCENTE OS 2026/27</p>
        <h1>Imposta la password</h1>
        <p className="muted">
          Questa password resta gestita da Supabase Auth. Docente OS non la salva in chiaro e gli accessi successivi non richiederanno l’invio di email.
        </p>

        {message ? <p role="status" className="notice">{message}</p> : null}

        <form action={setPassword} className="stack">
          <label htmlFor="password">Nuova password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <label htmlFor="confirm_password">Conferma password</label>
          <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={10} required />
          <button type="submit">Salva password e continua</button>
        </form>

        <Link href="/workspace">Continua senza modificare la password</Link>
      </section>
    </main>
  )
}
