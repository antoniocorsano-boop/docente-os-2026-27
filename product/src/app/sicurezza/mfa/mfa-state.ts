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
    (typeof value === 'string' && /^Docente OS recupero (?:[2-9]|[1-9][0-9]+)$/.test(value))
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


/**
 * Supabase Auth embeds a stable session_id UUID in each user JWT. Read it
 * ONLY to invalidate local presentation state when the browser session
 * changes; never use decoded, unverified claims for access control.
 * Authorization still relies on getUser, getClaims and the database RLS.
 */
export function localSessionId(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(base64)) as { session_id?: unknown }
    const id = claims.session_id
    return typeof id === 'string' &&
      /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)
      ? id
      : null
  } catch {
    return null
  }
}
