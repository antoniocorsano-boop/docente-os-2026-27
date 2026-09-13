export type PasswordAuthErrorLike = {
  code?: string | null
  status?: number | null
}

export type PasswordAuthErrorKind = 'INVALID_CREDENTIALS' | 'TRANSIENT_OR_PROVIDER' | 'AUTH_REJECTED'

export function classifyPasswordAuthError(error: PasswordAuthErrorLike): PasswordAuthErrorKind {
  if (error.code === 'invalid_credentials') return 'INVALID_CREDENTIALS'
  if (!error.code || error.status === 429 || (typeof error.status === 'number' && error.status >= 500)) {
    return 'TRANSIENT_OR_PROVIDER'
  }
  return 'AUTH_REJECTED'
}
