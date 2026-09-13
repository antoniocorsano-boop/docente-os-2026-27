export type PasswordAuthErrorLike = {
  code?: string | null
  status?: number | null
}

export type PasswordAuthErrorKind = 'INVALID_CREDENTIALS' | 'TRANSIENT_OR_PROVIDER'

export function classifyPasswordAuthError(error: PasswordAuthErrorLike): PasswordAuthErrorKind {
  return error.code === 'invalid_credentials' ? 'INVALID_CREDENTIALS' : 'TRANSIENT_OR_PROVIDER'
}
