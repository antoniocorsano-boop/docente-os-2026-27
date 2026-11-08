'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { nextDocenteFactorName, recoverableDocenteDrafts, resolveMfaStage, validTotpCode } from './mfa-state'

type View = 'loading' | 'setup' | 'enroll' | 'recover' | 'challenge' | 'ready'
type PendingEnrollment = { id: string; secret: string }

export function MfaAccess() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [view, setView] = useState<View>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifiedFactors, setVerifiedFactors] = useState<{ id: string; label: string }[]>([])
  const [pending, setPending] = useState<PendingEnrollment | null>(null)
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUserId = useRef<string | null>(null)
  const authEpoch = useRef(0)

  function sameSession(epoch: number, userId: string | null): boolean {
    return userId !== null && currentUserId.current === userId && authEpoch.current === epoch
  }

  useEffect(() => {
    let active = true

    function resetSensitiveState() {
      authEpoch.current += 1
      currentUserId.current = null
      setPending(null)
      setSecretRevealed(false)
      setCode('')
      setFactorId(null)
      setVerifiedFactors([])
      setDraftCount(0)
      setError(null)
      setBusy(false)
      setView('loading')
    }

    async function load() {
      const epoch = authEpoch.current
      try {
        const user = await supabase.auth.getUser()
        if (!active || epoch !== authEpoch.current) return
        if (!user.data.user || user.error) {
          resetSensitiveState()
          router.replace('/login?error=session_required')
          return
        }
        currentUserId.current = user.data.user.id
        const [level, factors] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ])
        if (!active || epoch !== authEpoch.current || currentUserId.current !== user.data.user.id) return
        if (level.error || factors.error || !level.data || !factors.data) {
          throw new Error('MFA status unavailable')
        }
        const verified = factors.data.totp.filter((factor) => factor.status === 'verified')
        const recoverable = recoverableDocenteDrafts(factors.data.all)
        setVerifiedFactors(verified.map((factor, index) => ({
          id: factor.id,
          label: `App di autenticazione ${index + 1}`,
        })))
        setDraftCount(recoverable.length)
        setFactorId(verified[0]?.id ?? null)
        setView(resolveMfaStage(level.data.currentLevel, verified.length, recoverable.length))
      } catch {
        if (active && epoch === authEpoch.current) {
          setError('Non è stato possibile verificare la sessione. Ricarica la pagina e riprova.')
        }
      }
    }

    // This listener is synchronous: do not await Supabase calls inside the
    // callback. Invalidate sensitive state before navigation or future requests.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      const newId = session?.user?.id ?? null
      const oldId = currentUserId.current
      if (event === 'SIGNED_OUT' || (oldId !== null && oldId !== newId)) {
        resetSensitiveState()
        router.replace('/login?error=session_required')
        return
      }
      if (event === 'TOKEN_REFRESHED' && oldId !== null && newId === oldId) {
        // Recheck AAL if a refreshed JWT has a different assurance level.
        // A prior 'ready' screen must never survive a token downgrade.
        resetSensitiveState()
        Promise.resolve().then(() => { if (active) void load() })
      }
    })

    void load()
    return () => {
      active = false
      authEpoch.current += 1
      subscription.unsubscribe()
    }
  }, [router, supabase])

  async function startEnrollment() {
    if (busy || (view !== 'setup' && view !== 'ready')) return
    const userId = currentUserId.current
    const epoch = authEpoch.current
    if (!userId) return
    setError(null)
    setBusy(true)
    try {
      // Supabase forbids duplicate friendly names. Use an available name
      // across both verified and unfinished factors, including backups.
      const latest = await supabase.auth.mfa.listFactors()
      if (!sameSession(epoch, userId)) return
      if (latest.error || !latest.data) throw new Error('MFA factor refresh failed')
      const friendlyName = nextDocenteFactorName(latest.data.all)
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
      })
      if (!sameSession(epoch, userId)) return
      if (enrollError || !data?.totp?.secret) throw new Error('MFA enrollment failed')
      // The secret exists only in this component's memory, never in URLs or logs.
      setPending({ id: data.id, secret: data.totp.secret })
      setSecretRevealed(false)
      setView('enroll')
    } catch {
      if (sameSession(epoch, userId)) {
        setError('Impossibile avviare la configurazione. Riprova oppure verifica le impostazioni MFA di Supabase.')
      }
    } finally {
      if (sameSession(epoch, userId)) setBusy(false)
    }
  }

  async function cancelEnrollment() {
    if (busy || !pending || view !== 'enroll') return
    const userId = currentUserId.current
    const epoch = authEpoch.current
    if (!userId) return

    // Do not delete a factor from the enrollment screen. Its verification may
    // already have succeeded on the server while the response was lost.
    // Simply drop the secret from memory and refresh remote status. Actual
    // removal is an explicit, separately guarded action on unverified drafts.
    setPending(null)
    setSecretRevealed(false)
    setCode('')
    setView('loading')
    setBusy(true)
    setError(null)
    try {
      const [factors, level] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])
      if (!sameSession(epoch, userId)) return
      if (factors.error || !factors.data || level.error || !level.data) {
        throw new Error('MFA status refresh failed')
      }
      const verified = factors.data.totp.filter((factor) => factor.status === 'verified')
      const drafts = recoverableDocenteDrafts(factors.data.all)
      setVerifiedFactors(verified.map((factor, index) => ({
        id: factor.id,
        label: `App di autenticazione ${index + 1}`,
      })))
      setFactorId(verified[0]?.id ?? null)
      setDraftCount(drafts.length)
      setView(resolveMfaStage(level.data.currentLevel, verified.length, drafts.length))
    } catch {
      if (sameSession(epoch, userId)) {
        setError('Configurazione interrotta. Ricarica la pagina per controllare lo stato del fattore.')
      }
    } finally {
      if (sameSession(epoch, userId)) setBusy(false)
    }
  }

  async function discardInterruptedDraft() {
    if (busy || view !== 'recover') return
    const userId = currentUserId.current
    const epoch = authEpoch.current
    if (!userId) return
    setBusy(true)
    setError(null)
    try {
      // Re-fetch immediately before deletion. NEVER delete a verified factor.
      const latest = await supabase.auth.mfa.listFactors()
      if (!sameSession(epoch, userId)) return
      if (latest.error || !latest.data) throw new Error('MFA factor refresh failed')
      const verified = latest.data.totp.filter((factor) => factor.status === 'verified')
      if (verified.length) {
        setVerifiedFactors(verified.map((factor, index) => ({
          id: factor.id,
          label: `App di autenticazione ${index + 1}`,
        })))
        setFactorId(verified[0].id)
        setView('challenge')
        return
      }
      const [draft] = recoverableDocenteDrafts(latest.data.all)
      if (!draft) {
        setDraftCount(0)
        setView('setup')
        return
      }
      if (!sameSession(epoch, userId)) return
      const result = await supabase.auth.mfa.unenroll({ factorId: draft.id })
      if (!sameSession(epoch, userId)) return
      if (result.error) throw new Error('MFA draft removal failed')
      const after = await supabase.auth.mfa.listFactors()
      if (!sameSession(epoch, userId)) return
      if (after.error || !after.data) throw new Error('MFA factor refresh failed')
      const remaining = recoverableDocenteDrafts(after.data.all)
      setDraftCount(remaining.length)
      setView(remaining.length ? 'recover' : 'setup')
    } catch {
      if (sameSession(epoch, userId)) {
        setError('Non è stato possibile rimuovere il tentativo incompleto. Nessun fattore già verificato è stato modificato.')
      }
    } finally {
      if (sameSession(epoch, userId)) setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = pending?.id ?? factorId
    const userId = currentUserId.current
    const epoch = authEpoch.current
    if (busy || !id || !userId || (view !== 'enroll' && view !== 'challenge')) return
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
      if (!sameSession(epoch, userId)) return
      if (verifyError) throw new Error('MFA challenge failed')
      setCode('')
      const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!sameSession(epoch, userId)) return
      if (level.error || level.data?.currentLevel !== 'aal2') {
        throw new Error('MFA assurance level not confirmed')
      }
      setPending(null)
      setSecretRevealed(false)
      setFactorId(id)
      setView('ready')
      router.refresh()
      // Factor enumeration is only presentation data. Once aal2 is confirmed,
      // a transient list failure must not report a false authentication failure.
      try {
        const allFactors = await supabase.auth.mfa.listFactors()
        if (!sameSession(epoch, userId)) return
        if (!allFactors.error && allFactors.data) {
          const verified = allFactors.data.totp.filter((factor) => factor.status === 'verified')
          setVerifiedFactors(verified.map((factor, index) => ({
            id: factor.id,
            label: `App di autenticazione ${index + 1}`,
          })))
        }
      } catch {
        // Keep the authoritative successful aal2 state.
      }
    } catch {
      if (sameSession(epoch, userId)) {
        setCode('')
        setError('Verifica non riuscita. Controlla il codice e riprova; la sessione non è ancora confermata.')
      }
    } finally {
      if (sameSession(epoch, userId)) setBusy(false)
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
              {verifiedFactors.length > 1 ? (
                <label className="grid gap-2 text-sm font-semibold" htmlFor="mfa-factor">
                  Scegli l’app di autenticazione
                  <select
                    id="mfa-factor"
                    value={factorId ?? ''}
                    onChange={(event) => { setFactorId(event.target.value); setCode(''); setError(null) }}
                    disabled={busy}
                    className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3 text-base"
                  >
                    {verifiedFactors.map((factor) => (
                      <option key={factor.id} value={factor.id}>{factor.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}
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
                  Interrompi la configurazione
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
              <p className="m-0 text-sm text-muted-foreground">
                Supabase non fornisce codici di recupero MFA. Per evitare di perdere l’accesso
                puoi registrare un secondo fattore su un dispositivo distinto, conservato in modo sicuro.
              </p>
              <Button variant="secondary" disabled={busy} onClick={() => void startEnrollment()}>
                {busy ? 'Configurazione in corso…' : 'Aggiungi un secondo fattore di recupero'}
              </Button>
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
