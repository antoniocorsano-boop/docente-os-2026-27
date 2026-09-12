import Link from 'next/link'
import { redirect } from 'next/navigation'
import { hasAal2, mfaRedirectPath } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'
import { setPassword } from './actions'

export const dynamic = 'force-dynamic'

type PasswordSetupPageProps = {
  searchParams: Promise<{ error?: string; source?: string }>
}

export default async function PasswordSetupPage({ searchParams }: PasswordSetupPageProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  if (!claims) redirect('/login?error=session_required')

  const params = await searchParams
  const isRecovery = params.source === 'recovery'
  const isAccountChange = params.source === 'account'

  if (isRecovery && !hasAal2(claims)) {
    redirect(mfaRedirectPath('/imposta-password', '?source=recovery'))
  }

  if (isAccountChange && !hasAal2(claims)) {
    redirect(mfaRedirectPath('/imposta-password', '?source=account'))
  }

  const message = params.error === 'weak_password'
    ? 'La password deve contenere almeno 10 caratteri.'
    : params.error === 'password_mismatch'
      ? 'Le due password non coincidono.'
      : params.error === 'password_update_failed'
        ? 'Non è stato possibile salvare la password. Riprova.'
        : isRecovery
          ? 'Identità verificata. Scegli una nuova password per completare il recupero dell’account.'
          : isAccountChange
            ? 'Sessione MFA verificata. Scegli una nuova password per il tuo account.'
            : params.source === 'email'
              ? 'Accesso verificato. Imposta ora una password: da questo momento gli accessi ordinari non richiederanno più email.'
              : null

  const formSource = isRecovery ? 'recovery' : isAccountChange ? 'account' : params.source === 'email' ? 'email' : ''
  const title = isRecovery ? 'Scegli una nuova password' : isAccountChange ? 'Cambia password' : 'Imposta la password'
  const submitLabel = isRecovery ? 'Salva la nuova password' : isAccountChange ? 'Aggiorna password' : 'Salva password e continua'

  return (
    <main className="shell">
      <section className="panel auth-card">
        <p className="eyebrow">DOCENTE OS 2026/27</p>
        <h1>{title}</h1>
        <p className="muted">
          Questa password resta gestita da Supabase Auth. Docente OS non la salva in chiaro e gli accessi successivi non richiederanno l’invio di email.
        </p>

        {message ? <p role="status" className="notice">{message}</p> : null}

        <form action={setPassword} className="stack">
          <input type="hidden" name="source" value={formSource} />
          <label htmlFor="password">Nuova password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <label htmlFor="confirm_password">Conferma password</label>
          <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={10} required />
          <button type="submit">{submitLabel}</button>
        </form>

        {isAccountChange
          ? <Link href="/account">Torna ad Account e sicurezza</Link>
          : !isRecovery
            ? <Link href="/workspace">Continua senza modificare la password</Link>
            : null}
      </section>
    </main>
  )
}
