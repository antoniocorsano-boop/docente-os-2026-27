/** Presentation-only MFA state; Supabase is authoritative for authentication. */
export type MfaStage = 'setup' | 'challenge' | 'ready' | 'recover'

export type FactorSummary = {
  id: string
  status?: string
  factor_type?: string
  friendly_name?: string
}

const PRIMARY_FACTOR = 'Docente OS'
const RECOVERY_FACTOR_PREFIX = 'Docente OS recupero '

export function isDocenteFactorName(value: string | undefined): boolean {
  return value === PRIMARY_FACTOR ||
    (typeof value === 'string' && /^Docente OS recupero [2-9][0-9]*$/.test(value))
}

export function nextDocenteFactorName(factors: readonly FactorSummary[]): string {
  const existing = new Set(factors.map((factor) => factor.friendly_name))
  if (!existing.has(PRIMARY_FACTOR)) return PRIMARY_FACTOR
  let suffix = 2
  while (existing.has(RECOVERY_FACTOR_PREFIX + suffix)) suffix += 1
  return RECOVERY_FACTOR_PREFIX + suffix
}

export function isRecoverableDocenteDraft(factor: FactorSummary): boolean {
  return factor.factor_type === 'totp'
    && factor.status === 'unverified'
    && isDocenteFactorName(factor.friendly_name)
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
