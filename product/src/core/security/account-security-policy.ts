export type MfaFactorLike = {
  status?: string | null
}

export type VerifiedMfaRemovalDecision =
  | { allowed: true }
  | { allowed: false; reason: 'factor_not_verified' | 'last_factor' }

export function isVerifiedMfaFactor(factor: MfaFactorLike) {
  return factor.status === 'verified'
}

export function canRemoveVerifiedMfaFactor(verifiedFactorCount: number) {
  return Number.isInteger(verifiedFactorCount) && verifiedFactorCount > 1
}

export function decideVerifiedMfaRemoval(
  verifiedFactorIds: readonly string[],
  targetFactorId: string,
): VerifiedMfaRemovalDecision {
  const uniqueVerifiedFactorIds = [...new Set(verifiedFactorIds.filter(Boolean))]

  if (!uniqueVerifiedFactorIds.includes(targetFactorId)) {
    return { allowed: false, reason: 'factor_not_verified' }
  }

  if (!canRemoveVerifiedMfaFactor(uniqueVerifiedFactorIds.length)) {
    return { allowed: false, reason: 'last_factor' }
  }

  return { allowed: true }
}
