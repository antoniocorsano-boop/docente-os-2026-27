'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { recoverableDocenteDrafts, resolveMfaStage, validTotpCode } from './mfa-state'

type View = 'loading' | 'setup' | 'enroll' | 'recover' | 'challenge' | 'ready'
type PendingEnrollment = { id: string; secret: string }

export function MfaAccess() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [view, setView] = useState<View>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingEnrollment | null>(null)
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        // The server route validates claims; validate the active browser user too.
        const user = await supabase.auth.getUser()
        if (!user.data.user || user.error) {
          router.replace('/login?error=session_required')
          return
        }
        const [level, factors] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ])
        if (level.error || factors.error || !level.data || !factors.data) {
          throw new Error('MFA status unavailable')
        }
        if (!active) return
        const verified = factors.data.totp.find((factor) => factor.status === 'verified')
        const recoverable = recoverableDocenteDrafts(factors.data.all)
        setDraftCount(recoverable.length)
        setFactorId(verified?.id ?? null)
        setView(resolveMfaStage(level.data.currentLevel, verified ? 1 : 0, recoverable.length))
      } catch {
        if (active) setError('Non è stato possibile verificare la sessione. Ricarica la pagina e riprova.')
      }
    }
    void load()
    return () => { active = false }
  }, [router, supabase])

  async function startEnrollment() {
    if (busy || view !== 'setup') return
    setError(null)
    setBusy(true)
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Docente OS',
      })
      if (enrollError || !data?.totp?.secret) throw new Error('MFA enrollment failed')
      // The secret exists only in this component's memory, never in URLs or logs.
      setPending({ id: data.id, secret: data.totp.secret })
      setSecretRevealed(false)
      setView('enroll')
    } catch {
      setError('Impossibile avviare la configurazione. Riprova oppure verifica le impostazioni MFA di Supabase.')
    } finally {
      setBusy(false)
    }
  }

  async function cancelEnrollment() {
    if (busy || !pending || view !== 'enroll') return
    setBusy(true)
    setError(null)
    try {
      // Only the unverified factor initiated on this page may be canceled.
      const { error: cancelError } = await supabase.auth.mfa.unenroll({ factorId: pending.id })
      if (cancelError) throw new Error('MFA cancel failed')
      setPending(null)
      setSecretRevealed(false)
      setCode('')
      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error || !factors.data) throw new Error('Failed to reload factors')
      const leftovers = recoverableDocenteDrafts(factors.data.all)
      setDraftCount(leftovers.length)
      setView(leftovers.length ? 'recover' : 'setup')
    } catch {
      setError('Impossibile annullare la configurazione. Conserva l’accesso a questa schermata e riprova.')
    } finally {
      setBusy(false)
    }
  }

  async function discardInterruptedDraft() {
    if (busy || view !== 'recover') return
    setBusy(true)
    setError(null)
    try {
      // Re-fetch immediately before deletion. NEVER delete a verified factor.
      const latest = await supabase.auth.mfa.listFactors()
      if (latest.error || !latest.data) throw new Error('MFA factor refresh failed')
      const verified = latest.data.totp.find((factor) => factor.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setView('challenge')
        return
      }
      const [draft] = recoverableDocenteDrafts(latest.data.all)
      if (!draft) {
        setDraftCount(0)
        setView('setup')
        return
      }
      const result = await supabase.auth.mfa.unenroll({ factorId: draft.id })
      if (result.error) throw new Error('MFA draft removal failed')
      const after = await supabase.auth.mfa.listFactors()
      if (after.error || !after.data) throw new Error('MFA factor refresh failed')
      const remaining = recoverableDocenteDrafts(after.data.all)
      setDraftCount(remaining.length)
      setView(remaining.length ? 'recover' : 'setup')
    } catch {
      setError('Non è stato possibile rimuovere il tentativo incompleto. Nessun fattore già verificato è stato modificato.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = pending?.id ?? factorId
    if (busy || !id || (view !== 'enroll' && view !== 'challenge')) return
    if (!validTotpCode(code)) {
      setError('Inserisci le sei cifre mostrate dall’app di autenticazione.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: id,
        code,
      })
      if (verifyError) throw new Error('MFA challenge failed')
      setCode('')
      const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (level.error || level.data?.currentLevel !== 'aal2') {
        throw new Error('MFA assurance level not confirmed')
      }
      setPending(null)
      setSecretRevealed(false)
      setFactorId(id)
      setView('ready')
      router.refresh()
    } catch {
      setCode('')
      setError('Verifica non riuscita. Controlla il codice e riprova; la sessione non è ancora confermata.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-14">
      <div className="mx-auto grid w-full max-w-xl gap-5">
        <header className="grid gap-2">
          <p className="m-0 text-xs font-bold tracking-[0.12em] text-primary">DOCENTE OS · SICUREZZA</p>
          <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Verifica in due passaggi</h1>
          <p className="m-0 text-sm leading-6 text-muted-foreground">
            Proteggi l’accesso ai materiali privati con un codice generato da un’app di autenticazione.
          </p>
        </header>

        <section className="grid gap-5 rounded-[var(--radius-sm)] border border-border bg-card p-4 shadow-sm sm:p-6" aria-busy={busy}>
          {error ? <Alert variant="warning"><AlertDescription>{error}</AlertDescription></Alert> : null}

          {view === 'loading' ? <p role="status">Verifica della sessione in corso…</p> : null}

          {view === 'setup' ? (
            <>
              <h2 className="m-0 text-lg font-semibold">Attiva il secondo fattore</h2>
              <p className="m-0 text-sm leading-6">
                Prima di iniziare, prepara un’app di autenticazione che permetta di inserire manualmente una chiave TOTP.
                Potrai completare l’operazione anche da questo stesso smartphone.
              </p>
              <p className="m-0 text-sm text-muted-foreground">
                Mantieni un metodo sicuro per recuperare l’accesso all’app di autenticazione se cambi dispositivo.
                Supabase non fornisce codici di recupero MFA nativi.
              </p>
              <Button size="lg" disabled={busy} onClick={() => void startEnrollment()}>
                {busy ? 'Configurazione in corso…' : 'Configura il secondo fattore'}
              </Button>
            </>
          ) : null}

          {view === 'enroll' && pending ? (
            <>
              <h2 className="m-0 text-lg font-semibold">Registra il codice nell’app</h2>
              <p className="m-0 text-sm leading-6">
                Apri la tua app di autenticazione, scegli l’aggiunta manuale di un account e inserisci questa chiave.
                Non fotografarla, non inviarla in chat e non inserirla nei documenti del progetto.
              </p>
              <div className="grid gap-3 rounded-[var(--radius-sm)] border border-border bg-muted/40 p-3">
                <p className="m-0 text-xs font-semibold">Chiave di configurazione — riservata</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSecretRevealed((value) => !value)}
                  aria-expanded={secretRevealed}
                >
                  {secretRevealed ? 'Nascondi la chiave' : 'Mostra la chiave soltanto quando serve'}
                </Button>
                {secretRevealed ? (
                  <code className="block select-all break-all text-sm" aria-label="Chiave TOTP da inserire nell’app">
                    {pending.secret}
                  </code>
                ) : <p className="m-0 text-sm text-muted-foreground">Chiave nascosta.</p>}
              </div>
              <p className="m-0 text-sm leading-6">
                Una volta aggiunto l’account, inserisci qui il codice di sei cifre generato dall’app per completare l’attivazione.
              </p>
            </>
          ) : null}

          {view === 'recover' ? (
            <>
              <h2 className="m-0 text-lg font-semibold">Configurazione interrotta</h2>
              <p className="m-0 text-sm leading-6">
                {draftCount === 1
                  ? 'È presente un tentativo di registrazione non completato.'
                  : `Sono presenti ${draftCount} tentativi di registrazione non completati.`}
                {' '}Per sicurezza la vecchia chiave non viene recuperata dal browser.
                Puoi annullare un tentativo incompleto per volta e ricominciare.
              </p>
              <p className="m-0 text-sm text-muted-foreground">
                Questa azione non elimina i fattori già verificati e non accede ai materiali di Docente OS.
              </p>
              <Button size="lg" disabled={busy} onClick={() => void discardInterruptedDraft()}>
                {busy ? 'Verifica in corso…' : 'Annulla un tentativo incompleto'}
              </Button>
            </>
          ) : null}

          {view === 'challenge' ? (
            <>
              <h2 className="m-0 text-lg font-semibold">Conferma la tua identità</h2>
              <p className="m-0 text-sm leading-6">
                Il secondo fattore risulta già registrato. Inserisci il codice aggiornato della tua app di autenticazione.
              </p>
            </>
          ) : null}

          {(view === 'challenge' || view === 'enroll') ? (
            <form className="grid gap-3" onSubmit={(event) => void verifyCode(event)}>
              <label className="text-sm font-semibold" htmlFor="totp-code">Codice di verifica</label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3 text-lg tracking-[0.15em] outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
                required
                disabled={busy}
              />
              <Button type="submit" size="lg" disabled={busy || !validTotpCode(code)}>
                {busy ? 'Verifica in corso…' : 'Verifica il codice'}
              </Button>
              {view === 'enroll' ? (
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void cancelEnrollment()}>
                  Annulla la configurazione
                </Button>
              ) : null}
            </form>
          ) : null}

          {view === 'ready' ? (
            <>
              <Alert variant="success"><AlertDescription>Secondo fattore verificato: sessione autenticata con livello aal2.</AlertDescription></Alert>
              <p className="m-0 text-sm leading-6">
                La sessione è pronta per le operazioni consentite dalle politiche di accesso. Questa verifica
                non avvia alcun backup e non prova ancora la leggibilità dei nove allegati.
              </p>
              <Link href="/workspace" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-semibold text-primary-foreground">
                Continua nello spazio docente
              </Link>
            </>
          ) : null}
        </section>

        <Link href="/impostazioni" className="text-sm font-semibold text-primary underline underline-offset-4">
          Torna alle impostazioni
        </Link>
      </div>
    </main>
  )
}
