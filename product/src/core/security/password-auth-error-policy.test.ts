import { describe, expect, it } from 'vitest'
import { classifyPasswordAuthError } from './password-auth-error-policy'

describe('classifyPasswordAuthError', () => {
  it('classifies only the explicit Supabase invalid_credentials code as a credential failure', () => {
    expect(classifyPasswordAuthError({ code: 'invalid_credentials', status: 400 })).toBe('INVALID_CREDENTIALS')
  })

  it('keeps provider and transport failures distinct from invalid credentials', () => {
    expect(classifyPasswordAuthError({})).toBe('TRANSIENT_OR_PROVIDER')
    expect(classifyPasswordAuthError({ code: null })).toBe('TRANSIENT_OR_PROVIDER')
    expect(classifyPasswordAuthError({ code: 'unexpected_failure', status: 500 })).toBe('TRANSIENT_OR_PROVIDER')
    expect(classifyPasswordAuthError({ code: 'over_request_rate_limit', status: 429 })).toBe('TRANSIENT_OR_PROVIDER')
  })
})
