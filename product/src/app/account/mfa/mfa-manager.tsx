'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type TotpFactor = {
  id: string
  friendlyName: string
}

type Enrollment = {
  factorId: string
  qrCode: string
  secret: string
}

export function MfaManager() {
  const supabase = useMemo(() => createClient(), [])
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void refreshFactors()
  }, [])

  async function refreshFactors() {
    const listed = await supabase.auth.mfa.listFactors()
    if (listed.error) {
      setMessage('Non è stato possibile leggere i fattori di autenticazione.')
      return
    }

    setFactors(listed.data.totp.map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name?.trim() || 'Autenticatore',
    })))
  }

  async function startEnrollment() {
    setBusy(true)
    setMessage(null)

    const listed = await supabase.auth.mfa.listFactors()
    if (listed.error) {
      setBusy(false)
      setMessage('Non è stato possibile preparare un nuovo autenticatore.')
      return
    }

    for (const factor of listed.data.all) {
      if (factor.factor_type !== 'totp' || factor.status !== 'unverified') continue
      const cleanup = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (cleanup.error) {
        setBusy(false)
        setMessage('Esiste una configurazione MFA incompleta che non può essere sostituita automaticamente.')
        return
      }
    }

    const enrolled = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Docente OS ${factors.length + 1}`,
    })

    setBusy(false)
    if (enrolled.error) {
      setMessage('Non è stato possibile aggiungere il nuovo autenticatore.')
      return
    }

    setEnrollment({
      factorId: enrolled.data.id,
      qrCode: enrolled.data.totp.qr_code,
      secret: enrolled.data.totp.secret,
    })
    setCode('')
  }

  async function verifyEnrollment() {
    if (!enrollment) return
    const normalizedCode = code.replace(/\D/g, '')
    if (!/^\d{6}$/.test(normalizedCode)) {
      setMessage('Inserisci il codice di 6 cifre mostrato dall’app autenticatore.')
      return
    }

    setBusy(true)
    setMessage(null)
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId })
    if (challenge.error) {
      setBusy(false)
      setMessage('Non è stato possibile avviare la verifica del nuovo autenticatore.')
      return
    }

    const verified = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: challenge.data.id,
      code: normalizedCode,
    })

    setBusy(false)
    if (verified.error) {
      setMessage('Il codice non è valido o non è più attivo. Attendi il codice successivo e riprova.')
      return
    }

    setEnrollment(null)
    setCode('')
    setMessage('Nuovo autenticatore verificato.')
    await refreshFactors()
  }

  async function cancelEnrollment() {
    if (!enrollment) return
    setBusy(true)
    const result = await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId })
    setBusy(false)
    if (result.error) {
      setMessage('Non è stato possibile annullare la configurazione incompleta.')
      return
    }
    setEnrollment(null)
    setCode('')
    setMessage(null)
  }

  async function removeFactor(factorId: string) {
    if (factors.length <= 1) {
      setMessage('Per mantenere obbligatoria la protezione MFA non puoi rimuovere l’ultimo autenticatore verificato.')
      return
    }

    setBusy(true)
    setMessage(null)
    const result = await supabase.auth.mfa.unenroll({ factorId })
    setBusy(false)
    if (result.error) {
      setMessage('Non è stato possibile rimuovere l’autenticatore.')
      return
    }

    setMessage('Autenticatore rimosso.')
    await refreshFactors()
  }

  return (
    <div className="grid gap-5">
      {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}

      <section className="grid gap-3" aria-labelledby="verified-factors-title">
        <div className="grid gap-1">
          <h2 id="verified-factors-title" className="m-0 text-lg font-semibold">Autenticatori verificati</h2>
          <p className="m-0 text-sm leading-6 text-muted-foreground">Mantieni almeno un fattore TOTP attivo. Puoi aggiungerne un secondo prima di sostituire quello principale.</p>
        </div>

        <div className="grid gap-2">
          {factors.length ? factors.map((factor, index) => (
            <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between" key={factor.id}>
              <div className="grid gap-1">
                <strong>{factor.friendlyName}</strong>
                <span className="text-xs text-muted-foreground">Fattore TOTP verificato {index === 0 ? '· principale' : ''}</span>
              </div>
              <Button type="button" variant="ghost" disabled={busy || factors.length <= 1} onClick={() => void removeFactor(factor.id)}>
                Rimuovi
              </Button>
            </div>
          )) : (
            <p className="m-0 rounded-[var(--radius-sm)] border border-border bg-muted/30 p-4 text-sm">Nessun autenticatore verificato. Configurane uno per mantenere protetto l’account.</p>
          )}
        </div>
      </section>

      {enrollment ? (
        <section className="grid gap-4 rounded-[var(--radius-sm)] border border-border bg-card p-4" aria-labelledby="new-factor-title">
          <div className="grid gap-1">
            <h2 id="new-factor-title" className="m-0 text-lg font-semibold">Configura il nuovo autenticatore</h2>
            <p className="m-0 text-sm leading-6 text-muted-foreground">Scansiona il QR con l’app autenticatore, poi inserisci il codice temporaneo per verificare il fattore.</p>
          </div>
          <div className="grid justify-items-center gap-3 rounded-[var(--radius-sm)] bg-muted/35 p-4">
            <img src={enrollment.qrCode} alt="Codice QR per il nuovo autenticatore" width={220} height={220} />
            <details className="w-full text-center">
              <summary className="cursor-pointer text-sm font-semibold">Non riesco a usare il QR</summary>
              <div className="mt-2 grid gap-1">
                <span className="text-xs text-muted-foreground">Chiave manuale</span>
                <code className="break-all rounded-[var(--radius-sm)] bg-background px-3 py-2 text-sm">{enrollment.secret}</code>
              </div>
            </details>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="new-mfa-code">
            Codice di verifica
            <input
              id="new-mfa-code"
              className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base tracking-[0.18em] outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || code.length !== 6} onClick={() => void verifyEnrollment()}>{busy ? 'Verifica…' : 'Verifica autenticatore'}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void cancelEnrollment()}>Annulla</Button>
          </div>
        </section>
      ) : (
        <Button type="button" disabled={busy} onClick={() => void startEnrollment()}>{busy ? 'Preparazione…' : 'Aggiungi autenticatore'}</Button>
      )}
    </div>
  )
}
