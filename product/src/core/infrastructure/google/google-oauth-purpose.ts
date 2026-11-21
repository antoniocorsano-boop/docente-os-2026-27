import { GOOGLE_ARENA_DRIVE_READ_SCOPE } from './arena-provisional-drive-source'

export type GoogleOAuthPurpose = 'diary' | 'arena'

export const GOOGLE_DIARY_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/spreadsheets',
]

export const GOOGLE_ARENA_SCOPES = [
  'openid',
  'email',
  GOOGLE_ARENA_DRIVE_READ_SCOPE,
]

export function googleOAuthScopesForPurpose(purpose: GoogleOAuthPurpose): string[] {
  return [...(purpose === 'arena' ? GOOGLE_ARENA_SCOPES : GOOGLE_DIARY_SCOPES)]
}

type GoogleOAuthAssessment =
  | { allowed: true; synchronizeDiary: boolean }
  | { allowed: false; reason: 'scope-mismatch' | 'account-mismatch' }

/** Arena may only add read access, never silently replace a working diary grant. */
export function assessGoogleOAuthConnection(input: {
  purpose: GoogleOAuthPurpose
  grantedScopes: readonly string[]
  accountEmail: string | null
  signedInEmail: string | null
  existingAccountEmail: string | null
  existingScopes: readonly string[]
}): GoogleOAuthAssessment {
  const requiredScope = input.purpose === 'arena'
    ? GOOGLE_ARENA_DRIVE_READ_SCOPE
    : 'https://www.googleapis.com/auth/spreadsheets'
  if (!input.grantedScopes.includes(requiredScope)) {
    return { allowed: false, reason: 'scope-mismatch' }
  }

  if (input.purpose === 'arena') {
    const googleEmail = input.accountEmail?.trim().toLowerCase()
    const signedInEmail = input.signedInEmail?.trim().toLowerCase()
    const existingEmail = input.existingAccountEmail?.trim().toLowerCase()
    if (!googleEmail || !signedInEmail || googleEmail !== signedInEmail
      || (existingEmail && googleEmail !== existingEmail)) {
      return { allowed: false, reason: 'account-mismatch' }
    }
    if (input.existingScopes.some((scope) => !input.grantedScopes.includes(scope))) {
      return { allowed: false, reason: 'scope-mismatch' }
    }
  }

  return { allowed: true, synchronizeDiary: input.purpose === 'diary' }
}
