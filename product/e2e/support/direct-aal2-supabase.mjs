import { createClient } from '@supabase/supabase-js'
import {
  E2E_EMAIL,
  E2E_PASSWORD,
  E2E_TOTP_SECRET,
  requireE2ECredentials,
} from './e2e-auth.mjs'
import { generateTotp, governedMfaRetryJitterMs, millisecondsUntilNextTotpStep } from './totp.mjs'

export async function authenticatedAal2Supabase({ supabaseUrl, supabasePublishableKey, label = 'E2E direct client' }) {
  requireE2ECredentials()

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
  })
  if (authError || !authData.user) {
    throw new Error(`${label} identity failed: ${authError?.message ?? 'missing user'}`)
  }

  const initialAal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (initialAal.error) {
    throw new Error(`${label} AAL read failed: ${initialAal.error.message}`)
  }
  if (initialAal.data?.currentLevel === 'aal2') {
    return { supabase, userId: authData.user.id }
  }

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) {
    throw new Error(`${label} MFA factor lookup failed: ${factorsError.message}`)
  }

  const verifiedTotp = factors?.totp?.filter((factor) => factor.status === 'verified') ?? []
  const ciFactor = verifiedTotp.find((factor) => factor.friendly_name === 'Docente OS CI')
    ?? (verifiedTotp.length === 1 ? verifiedTotp[0] : null)

  if (!ciFactor) {
    throw new Error(`${label} has no unique verified TOTP factor for governed AAL2`)
  }

  const jitter = governedMfaRetryJitterMs()
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const remaining = millisecondsUntilNextTotpStep()
    if (remaining < 6_000 + jitter) {
      await delay(remaining + 750 + jitter)
    } else if (jitter) {
      await delay(jitter)
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: ciFactor.id,
      code: generateTotp(E2E_TOTP_SECRET),
    })

    if (!verifyError) {
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!aal.error && aal.data?.currentLevel === 'aal2') {
        return { supabase, userId: authData.user.id }
      }
    }

    if (attempt === 4) {
      throw new Error(`${label} did not reach governed AAL2: ${verifyError?.message ?? 'assurance level remained aal1'}`)
    }

    await delay(millisecondsUntilNextTotpStep() + 750 + jitter)
  }

  throw new Error(`${label} did not reach governed AAL2`)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
