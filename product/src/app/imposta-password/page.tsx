import Link from 'next/link'
import { redirect } from 'next/navigation'
import { hasAal2, mfaRedirectPath } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'
import { setPassword } from './actions'

export const dynamic = 'force-dynamic'

type PasswordSetupPageProps = {
  searchParams: Promise<{ error?: string; source?: string }>
}

type PasswordSetupSource = 'email' | 'recovery'

export default async function PasswordSetupPage({ searchParams }: PasswordSetupPageProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  if (!claims) redirect('/login?error=session_required')

  const params = await searchParams
  const source = normalizeSetupSource(params.source)
  if (!source) redirect('/login?error=invalid_password_setup_source')

  if (!hasAal2(claims)) {
    redirect(mfaRedirectPath('/imposta-password', `?source=${source}`))
  }

  const isRecovery = source === 'recovery'
  const isEmailSetup = source === 'email'

  const message = params.error === 'weak_password'
    ? 'La password deve contenere almeno 10 caratteri.'
    : params.error === 'password_mismatch'
      ? 'Le due password non coincidono.'
      : params.error === 'password_update_failed'
        ? 'Non è stato possibile salvare la password. Riprova.'
        : isRecovery
          ? 'Identità e secondo fattore verificati. Scegli una nuova password per completare il recupero dell’account.'
          : 'Email e secondo fattore verificati. Imposta ora una password: da questo momento gli accessi ordinari non richiederanno più email.'

  return (
    <main className="shell">
      <section className="panel auth-card">
        <p className="eyebrow">DOCENTE OS 2026/27</p>
        <h1>{isRecovery ? 'Scegli una nuova password' : 'Imposta la password'}</h1>
        <p className="muted">
          Questa password resta gestita da Supabase Auth. Docente OS non la salva in chiaro e ogni modifica richiede una sessione MFA verificata.
        </p>

        <p role="status" className="notice">{message}</p>

        <form action={setPassword} className="stack">
          <input type="hidden" name="source" value={source} />
          <label htmlFor="password">Nuova password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <label htmlFor="confirm_password">Conferma password</label>
          <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={10} required />
          <button type="submit">{isRecovery ? 'Salva la nuova password' : 'Salva password e continua'}</button>
        </form>

        {isEmailSetup ? <Link href="/workspace">Continua senza impostare la password</Link> : null}
      </section>
    </main>
  )
}

function normalizeSetupSource(value: string | undefined): PasswordSetupSource | null {
  return value === 'recovery' || value === 'email' ? value : null
}
