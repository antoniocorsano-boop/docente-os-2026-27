export function canRemoveVerifiedMfaFactor(verifiedFactorCount: number) {
  return Number.isInteger(verifiedFactorCount) && verifiedFactorCount > 1
}
