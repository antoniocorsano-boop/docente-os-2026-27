import { describe, expect, it } from 'vitest'
import { classifyPasswordAuthError } from './password-auth-error-policy'

describe('classifyPasswordAuthError', () => {
  it('classifies only explicit invalid credentials as a credential failure', () => {
    expect(classifyPasswordAuthError({ code: 'invalid_credentials', status: 400 })).toBe('INVALID_CREDENTIALS')
  })

  it('classifies missing-code, rate-limit, and 5xx failures as transient/provider', () => {
    expect(classifyPasswordAuthError({})).toBe('TRANSIENT_OR_PROVIDER')
    expect(classifyPasswordAuthError({ code: null })).toBe('TRANSIENT_OR_PROVIDER')
    expect(classifyPasswordAuthError({ code: 'over_request_rate_limit', status: 429 })).toBe('TRANSIENT_OR_PROVIDER')
    expect(classifyPasswordAuthError({ code: 'unexpected_failure', status: 500 })).toBe('TRANSIENT_OR_PROVIDER')
  })

  it('does not retry defined permanent auth rejections', () => {
    expect(classifyPasswordAuthError({ code: 'email_not_confirmed', status: 400 })).toBe('AUTH_REJECTED')
    expect(classifyPasswordAuthError({ code: 'user_banned', status: 403 })).toBe('AUTH_REJECTED')
  })
})
