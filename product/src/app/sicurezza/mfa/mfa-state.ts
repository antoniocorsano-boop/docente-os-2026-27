/** Presentation-only MFA state; Supabase is authoritative for authentication. */
export type MfaStage = 'setup' | 'challenge' | 'ready' | 'recover'

export type FactorSummary = {
  id: string
  status?: string
  factor_type?: string
  friendly_name?: string
}

export function isRecoverableDocenteDraft(factor: FactorSummary): boolean {
  return factor.factor_type === 'totp'
    && factor.status === 'unverified'
    && factor.friendly_name === 'Docente OS'
}

export function recoverableDocenteDrafts(factors: readonly FactorSummary[]): FactorSummary[] {
  return factors.filter(isRecoverableDocenteDraft)
}

export function resolveMfaStage(
  currentLevel: string | null,
  verifiedTotpCount: number,
  recoverableDraftCount = 0,
): MfaStage {
  if (currentLevel === 'aal2') return 'ready'
  if (verifiedTotpCount > 0) return 'challenge'
  return recoverableDraftCount > 0 ? 'recover' : 'setup'
}

export function validTotpCode(value: string): boolean {
  return /^[0-9]{6}$/.test(value)
}
