/** Only presentation state; Supabase remains authoritative for authentication. */
export type MfaStage = 'setup' | 'challenge' | 'ready'

export function resolveMfaStage(currentLevel: string | null, verifiedTotpCount: number): MfaStage {
  if (currentLevel === 'aal2') return 'ready'
  return verifiedTotpCount > 0 ? 'challenge' : 'setup'
}

export function validTotpCode(value: string): boolean {
  return /^[0-9]{6}$/.test(value)
}
