'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

type Phase = 'loading' | 'challenge' | 'enrollment-intro' | 'enrollment' | 'error'

type TotpFactor = {
  id: string
  friendlyName: string
}

type Enrollment = {
  factorId: string
  qrCode: string
  secret: string
}

export function MfaGate({ nextPath }: { nextPath: string }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [phase, setPhase] = useState<Phase>('loading')
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [selectedFactorId, setSelectedFactorId] = useState('')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function initialize() {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!active) return
      if (assurance.error) {
        setMessage('Non è stato possibile verificare il livello di autenticazione. Ricarica la pagina.')
        setPhase('error')
        return
      }

      if (assurance.data.currentLevel === 'aal2') {
        router.replace(nextPath)
        router.refresh()
        return
      }

      const listed = await supabase.auth.mfa.listFactors()
      if (!active) return
      if (listed.error) {
        setMessage('Non è stato possibile leggere i fattori di autenticazione. Riprova.')
        setPhase('error')
        return
      }

      const verified = listed.data.totp.map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name?.trim() || 'Autenticatore',
      }))
      setFactors(verified)

      if (verified.length > 0) {
        setSelectedFactorId(verified[0].id)
        setPhase('challenge')
      } else {
        setPhase('enrollment-intro')
      }
    }

    void initialize()
    return () => {
      active = false
    }
  }, [nextPath, router, supabase])

  async function startEnrollment() {
    setBusy(true)
    setMessage(null)

    const listed = await supabase.auth.mfa.listFactors()
    if (listed.error) {
      setBusy(false)
      setMessage('Non è stato possibile preparare la configurazione MFA. Riprova.')
      return
    }

    for (const factor of listed.data.all) {
      if (factor.factor_type !== 'totp' || factor.status !== 'unverified') continue
      const cleanup = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (cleanup.error) {
        setBusy(false)
        setMessage('Esiste una configurazione MFA incompleta che non può essere sostituita automaticamente. Esci e riprova.')
        return
      }
    }

    const enrolled = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Docente OS',
    })

    setBusy(false)
    if (enrolled.error) {
      setMessage('Non è stato possibile creare il secondo fattore. Riprova.')
      return
    }

    setEnrollment({
      factorId: enrolled.data.id,
      qrCode: enrolled.data.totp.qr_code,
      secret: enrolled.data.totp.secret,
    })
    setCode('')
    setPhase('enrollment')
  }

  async function verifyCode() {
    const normalizedCode = code.replace(/\s+/g, '')
    const factorId = enrollment?.factorId ?? selectedFactorId
    if (!factorId || !/^\d{6}$/.test(normalizedCode)) {
      setMessage('Inserisci il codice di 6 cifre mostrato dall’app autenticatore.')
      return
    }

    setBusy(true)
    setMessage(null)

    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) {
      setBusy(false)
      setMessage('Non è stato possibile avviare la verifica del secondo fattore. Riprova.')
      return
    }

    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: normalizedCode,
    })

    if (verified.error) {
      setBusy(false)
      setMessage('Il codice non è valido o non è più attivo. Attendi il codice successivo e riprova.')
      return
    }

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setBusy(false)
    if (assurance.error || assurance.data.currentLevel !== 'aal2') {
      setMessage('La verifica è riuscita, ma la sessione non è ancora AAL2. Riprova.')
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  if (phase === 'loading') {
    return <p role="status" className="m-0 text-sm text-muted-foreground">Verifica della sessione in corso…</p>
  }

  if (phase === 'error') {
    return (
      <div className="grid gap-4">
        <Alert variant="warning"><AlertDescription>{message}</AlertDescription></Alert>
        <Button type="button" variant="ghost" onClick={() => window.location.reload()}>Ricarica</Button>
        <SignOutButton />
      </div>
    )
  }

  if (phase === 'enrollment-intro') {
    return (
      <div className="grid gap-5">
        {message ? <Alert variant="warning"><AlertDescription>{message}</AlertDescription></Alert> : null}
        <div className="grid gap-2">
          <h2 className="m-0 text-lg font-semibold">Configura l’autenticatore</h2>
          <p className="m-0 text-sm leading-6 text-muted-foreground">
            Il tuo account non ha ancora un fattore TOTP verificato. Configuralo ora: l’accesso alle superfici operative resterà bloccato finché la verifica non porta la sessione ad AAL2.
          </p>
        </div>
        <Button type="button" size="lg" disabled={busy} onClick={() => void startEnrollment()}>
          {busy ? 'Preparazione…' : 'Configura il secondo fattore'}
        </Button>
        <Separator />
        <SignOutButton />
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {message ? <Alert variant="warning"><AlertDescription>{message}</AlertDescription></Alert> : null}

      {phase === 'enrollment' && enrollment ? (
        <section className="grid gap-4" aria-labelledby="mfa-enrollment-title">
          <div className="grid gap-2">
            <h2 id="mfa-enrollment-title" className="m-0 text-lg font-semibold">1. Collega l’app autenticatore</h2>
            <p className="m-0 text-sm leading-6 text-muted-foreground">
              Scansiona il QR con un’app autenticatore TOTP. Se non puoi usare la fotocamera, inserisci manualmente la chiave indicata sotto.
            </p>
          </div>
          <div className="grid justify-items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-muted/35 p-4">
            <img src={enrollment.qrCode} alt="Codice QR per configurare il secondo fattore" width={220} height={220} />
            <div className="grid w-full gap-1 text-center">
              <span className="text-xs font-semibold text-muted-foreground">CHIAVE MANUALE</span>
              <code className="break-all rounded-[var(--radius-sm)] bg-card px-3 py-2 text-sm">{enrollment.secret}</code>
            </div>
          </div>
          <p className="m-0 text-xs leading-5 text-muted-foreground">
            Supabase non fornisce codici di recupero. La gestione di un fattore di backup resta una misura separata e non deve creare scorciatoie rispetto all’MFA.
          </p>
        </section>
      ) : null}

      {phase === 'challenge' && factors.length > 1 ? (
        <label className="grid gap-2 text-sm font-semibold" htmlFor="mfa-factor">
          Autenticatore
          <select
            id="mfa-factor"
            className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
            value={selectedFactorId}
            onChange={(event) => setSelectedFactorId(event.target.value)}
          >
            {factors.map((factor) => <option key={factor.id} value={factor.id}>{factor.friendlyName}</option>)}
          </select>
        </label>
      ) : null}

      <section className="grid gap-3" aria-labelledby="mfa-code-title">
        <div className="grid gap-1">
          <h2 id="mfa-code-title" className="m-0 text-lg font-semibold">{phase === 'enrollment' ? '2. Verifica il codice' : 'Inserisci il codice temporaneo'}</h2>
          <p className="m-0 text-sm leading-6 text-muted-foreground">Usa il codice di 6 cifre attualmente mostrato dall’autenticatore.</p>
        </div>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="mfa-code">
          Codice
          <input
            id="mfa-code"
            className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base tracking-[0.18em] outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15"
            name="mfa_code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </label>
        <Button type="button" size="lg" disabled={busy || code.length !== 6} onClick={() => void verifyCode()}>
          {busy ? 'Verifica…' : 'Verifica e continua'}
        </Button>
      </section>

      <Separator />
      <SignOutButton />
    </div>
  )
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <Button className="w-full" type="submit" variant="ghost">Esci dall’account</Button>
    </form>
  )
}
