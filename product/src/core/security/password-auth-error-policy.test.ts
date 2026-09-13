import { describe, expect, it } from 'vitest'
import { classifyPasswordAuthError } from './password-auth-error-policy'

describe('classifyPasswordAuthError', () => {
  it('classifies only the explicit Supabase invalid_credentials code as a credential failure', () => {
    expect(classifyPasswordAuthError({ code: 'invalid_credentials', status: 400 })).toBe('INVALID_CREDENTIALS')
  })

  it.each([
    [{ code: undefined }, 'missing code'],
    [{ code: null }, 'null code'],
    [{ code: 'unexpected_failure', status: 500 }, 'provider failure'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'rate limit'],
  ])('classifies %s as transient/provider instead of blaming the credentials', (error) => {
    expect(classifyPasswordAuthError(error)).toBe('TRANSIENT_OR_PROVIDER')
  })
})
