import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyPasswordAuthError } from './password-auth-error-policy'

test('classifies only explicit invalid credentials as a credential failure', () => {
  assert.equal(
    classifyPasswordAuthError({ code: 'invalid_credentials', status: 400 }),
    'INVALID_CREDENTIALS',
  )
})

test('classifies missing-code, rate-limit, and 5xx failures as transient/provider', () => {
  assert.equal(classifyPasswordAuthError({}), 'TRANSIENT_OR_PROVIDER')
  assert.equal(classifyPasswordAuthError({ code: null }), 'TRANSIENT_OR_PROVIDER')
  assert.equal(
    classifyPasswordAuthError({ code: 'over_request_rate_limit', status: 429 }),
    'TRANSIENT_OR_PROVIDER',
  )
  assert.equal(
    classifyPasswordAuthError({ code: 'unexpected_failure', status: 500 }),
    'TRANSIENT_OR_PROVIDER',
  )
})

test('does not retry defined permanent auth rejections', () => {
  assert.equal(classifyPasswordAuthError({ code: 'email_not_confirmed', status: 400 }), 'AUTH_REJECTED')
  assert.equal(classifyPasswordAuthError({ code: 'user_banned', status: 403 }), 'AUTH_REJECTED')
})
