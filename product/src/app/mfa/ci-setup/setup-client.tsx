'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

type Enrollment = {
  factorId: string
  qrCode: string
  secret: string
}

type Phase = 'intro' | 'enrollment' | 'verified'

const GITHUB_SECRETS_URL = 'https://github.com/antoniocorsano-boop/docente-os-2026-27/settings/secrets/actions'

export function MfaCiFactorSetup() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function begin() {
    setBusy(true)
    setMessage(null)
    const supabase = createClient()

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assurance.error || assurance.data.currentLevel !== 'aal2') {
      setBusy(false)
      setMessage('La sessione non è AAL2. Torna alla verifica MFA ordinaria e riprova.')
      return
    }

    const listed = await supabase.auth.mfa.listFactors()
    if (listed.error) {
      setBusy(false)
      setMessage('Non è stato possibile leggere i fattori MFA. Riprova.')
      return
    }

    const existingVerifiedCi = listed.data.totp.find(
      (factor) => factor.status === 'verified' && factor.friendly_name?.trim() === 'Docente OS CI',
    )
    if (existingVerifiedCi) {
      setBusy(false)
      setMessage('Esiste già un fattore verificato “Docente OS CI”. Non ne creo un duplicato. Se non possiedi più la chiave, va rimosso esplicitamente prima di ricrearlo.')
      return
    }

    for (const factor of listed.data.all) {
      if (factor.factor_type !== 'totp' || factor.status !== 'unverified') continue
      if (factor.friendly_name?.trim() !== 'Docente OS CI') continue
      const cleanup = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (cleanup.error) {
        setBusy(false)
        setMessage('Esiste una configurazione CI incompleta che non può essere rimossa automaticamente. Riprova più tardi.')
        return
      }
    }

    const enrolled = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Docente OS CI',
    })

    setBusy(false)
    if (enrolled.error) {
      setMessage('Non è stato possibile creare il fattore CI. Riprova.')
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

  async function verify() {
    if (!enrollment) return
    const normalizedCode = code.replace(/\D/g, '')
    if (!/^\d{6}$/.test(normalizedCode)) {
      setMessage('Inserisci il codice di 6 cifre mostrato dall’app autenticatore.')
      return
    }

    setBusy(true)
    setMessage(null)
    const supabase = createClient()

    const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId })
    if (challenge.error) {
      setBusy(false)
      setMessage('Non è stato possibile avviare la verifica del fattore CI. Riprova.')
      return
    }

    const verified = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: challenge.data.id,
      code: normalizedCode,
    })

    setBusy(false)
    if (verified.error) {
      setMessage('Il codice non è valido o è scaduto. Attendi il codice successivo e riprova.')
      return
    }

    setPhase('verified')
    setMessage('Fattore “Docente OS CI” verificato. Ora salva la chiave nei GitHub Actions secrets.')
  }

  async function copySecret() {
    if (!enrollment?.secret) return
    await navigator.clipboard.writeText(enrollment.secret)
    setMessage('Chiave TOTP copiata negli appunti. Incollala soltanto nel secret GitHub DOCENTE_OS_MFA_E2E_TOTP_SECRET.')
  }

  return (
    <div className="grid gap-5">
      {message ? <Alert variant={phase === 'verified' ? 'info' : 'warning'}><AlertDescription>{message}</AlertDescription></Alert> : null}

      {phase === 'intro' ? (
        <div className="grid gap-4">
          <p className="m-0 text-sm leading-6 text-muted-foreground">
            Premi il pulsante: verrà creato un secondo fattore TOTP chiamato “Docente OS CI”. Il fattore personale già configurato resta invariato.
          </p>
          <Button type="button" size="lg" disabled={busy} onClick={() => void begin()}>
            {busy ? 'Preparazione…' : 'Crea fattore CI'}
          </Button>
        </div>
      ) : null}

      {phase !== 'intro' && enrollment ? (
        <>
          <section className="grid gap-4" aria-labelledby="ci-factor-title">
            <div className="grid gap-2">
              <h2 id="ci-factor-title" className="m-0 text-lg font-semibold">1. Collega “Docente OS CI” all’autenticatore</h2>
              <p className="m-0 text-sm leading-6 text-muted-foreground">Scansiona il QR oppure usa la chiave manuale. Non inviare questa chiave in chat.</p>
            </div>
            <div className="grid justify-items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-muted/35 p-4">
              <img src={enrollment.qrCode} alt="QR del fattore Docente OS CI" width={220} height={220} />
              <div className="grid w-full gap-1 text-center">
                <span className="text-xs font-semibold text-muted-foreground">CHIAVE TOTP CI</span>
                <code className="break-all rounded-[var(--radius-sm)] bg-card px-3 py-2 text-sm">{enrollment.secret}</code>
              </div>
            </div>
          </section>

          {phase === 'enrollment' ? (
            <section className="grid gap-3" aria-labelledby="ci-code-title">
              <h2 id="ci-code-title" className="m-0 text-lg font-semibold">2. Verifica il fattore CI</h2>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="ci-mfa-code">
                Codice a 6 cifre
                <input
                  id="ci-mfa-code"
                  className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-card px-3.5 text-base tracking-[0.18em] outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
              <Button type="button" size="lg" disabled={busy || code.length !== 6} onClick={() => void verify()}>
                {busy ? 'Verifica…' : 'Verifica fattore CI'}
              </Button>
            </section>
          ) : null}

          {phase === 'verified' ? (
            <section className="grid gap-4" aria-labelledby="ci-secrets-title">
              <h2 id="ci-secrets-title" className="m-0 text-lg font-semibold">3. Salva i tre GitHub Secrets</h2>
              <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                <p className="m-0"><strong className="text-foreground">DOCENTE_OS_MFA_E2E_EMAIL</strong> → email dell’utente tecnico.</p>
                <p className="m-0"><strong className="text-foreground">DOCENTE_OS_MFA_E2E_PASSWORD</strong> → password dell’utente tecnico.</p>
                <p className="m-0"><strong className="text-foreground">DOCENTE_OS_MFA_E2E_TOTP_SECRET</strong> → chiave mostrata sopra.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => void copySecret()}>Copia chiave TOTP CI</Button>
              <Button asChild size="lg">
                <a href={GITHUB_SECRETS_URL} target="_blank" rel="noreferrer">Apri GitHub Secrets</a>
              </Button>
            </section>
          ) : null}

          <Separator />
          <p className="m-0 text-xs leading-5 text-muted-foreground">
            Questa superficie è temporanea e verrà rimossa dal branch dopo la configurazione dei secrets e il PASS del gate browser.
          </p>
        </>
      ) : null}
    </div>
  )
}
