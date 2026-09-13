'use server'

import {
  decideVerifiedMfaRemoval,
  isVerifiedMfaFactor,
} from '@/core/security/account-security-policy'
import { hasAal2 } from '@/core/security/mfa-access-policy'
import { createClient } from '@/lib/supabase/server'

export type RemoveVerifiedMfaFactorResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'session_required'
        | 'mfa_required'
        | 'factor_not_verified'
        | 'last_factor'
        | 'factor_list_failed'
        | 'remove_failed'
    }

export async function removeVerifiedMfaFactor(
  factorId: unknown,
): Promise<RemoveVerifiedMfaFactorResult> {
  if (typeof factorId !== 'string') {
    return { ok: false, reason: 'factor_not_verified' }
  }

  const normalizedFactorId = factorId.trim()
  if (!normalizedFactorId) {
    return { ok: false, reason: 'factor_not_verified' }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  if (!claims?.sub) {
    return { ok: false, reason: 'session_required' }
  }

  if (!hasAal2(claims)) {
    return { ok: false, reason: 'mfa_required' }
  }

  const listed = await supabase.auth.mfa.listFactors()
  if (listed.error) {
    console.error('MFA factor list failed before unenroll', listed.error.code)
    return { ok: false, reason: 'factor_list_failed' }
  }

  const verifiedFactorIds = (listed.data.totp ?? [])
    .filter(isVerifiedMfaFactor)
    .map((factor) => factor.id)

  const decision = decideVerifiedMfaRemoval(verifiedFactorIds, normalizedFactorId)
  if (!decision.allowed) {
    return { ok: false, reason: decision.reason }
  }

  const result = await supabase.auth.mfa.unenroll({ factorId: normalizedFactorId })
  if (result.error) {
    console.error('MFA factor removal failed', result.error.code)
    return { ok: false, reason: 'remove_failed' }
  }

  return { ok: true }
}
