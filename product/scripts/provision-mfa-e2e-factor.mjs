import readline from 'node:readline/promises'
import process from 'node:process'
import { stdin as input, stdout as output } from 'node:process'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const email = process.env.MFA_E2E_EMAIL
const password = process.env.MFA_E2E_PASSWORD

for (const [name, value] of [
  ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', publishableKey],
  ['MFA_E2E_EMAIL', email],
  ['MFA_E2E_PASSWORD', password],
]) {
  if (!value) throw new Error(`${name} is required`)
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  throw new Error('This provisioning command must run interactively in a trusted local terminal, never in CI.')
}

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

const rl = readline.createInterface({ input, output })

try {
  const signedIn = await supabase.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance.error) throw assurance.error
  if (assurance.data.currentLevel === 'aal2') {
    throw new Error('The account is already AAL2. Refusing to create a second unmanaged fixture.')
  }

  const factors = await supabase.auth.mfa.listFactors()
  if (factors.error) throw factors.error

  const verified = factors.data.totp.filter((factor) => factor.status === 'verified')
  if (verified.length > 0) {
    throw new Error('A verified TOTP factor already exists. Reuse its governed seed; do not rotate it from this command.')
  }

  for (const factor of factors.data.all) {
    if (factor.factor_type !== 'totp' || factor.status !== 'unverified') continue
    const cleanup = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (cleanup.error) throw cleanup.error
  }

  const enrolled = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Docente OS E2E MFA',
  })
  if (enrolled.error) throw enrolled.error

  const factorId = enrolled.data.id
  const secret = enrolled.data.totp.secret

  output.write('\n=== DOCENTE OS MFA E2E — provisioning locale ===\n')
  output.write('Il seed seguente è un segreto. Non incollarlo in issue, PR, file o log CI.\n\n')
  output.write(`TOTP seed: ${secret}\n\n`)
  output.write('Aggiungi questo seed a un autenticatore TOTP, quindi inserisci il codice corrente.\n')

  const code = (await rl.question('Codice TOTP a 6 cifre: ')).replace(/\s+/g, '')
  if (!/^\d{6}$/.test(code)) throw new Error('The TOTP code must contain exactly 6 digits.')

  const challenge = await supabase.auth.mfa.challenge({ factorId })
  if (challenge.error) throw challenge.error

  const verifiedFactor = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  })
  if (verifiedFactor.error) throw verifiedFactor.error

  const finalAssurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (finalAssurance.error) throw finalAssurance.error
  if (finalAssurance.data.currentLevel !== 'aal2') {
    throw new Error(`Expected aal2 after verification, received ${finalAssurance.data.currentLevel ?? 'null'}.`)
  }

  output.write('\nPASS: account promoted to AAL2 with a persistent verified TOTP factor.\n')
  output.write('Now store EMAIL, PASSWORD and the TOTP seed as the three GitHub Actions secrets documented for the MFA gate.\n')
} finally {
  rl.close()
  await supabase.auth.signOut().catch(() => undefined)
}
