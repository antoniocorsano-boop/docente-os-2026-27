import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveMfaStage, validTotpCode } from './mfa-state'

test('MFA presents setup only when no verified TOTP factor exists', () => {
  assert.equal(resolveMfaStage('aal1', 0), 'setup')
  assert.equal(resolveMfaStage(null, 0), 'setup')
})

test('MFA requires a challenge when a factor exists but session is aal1', () => {
  assert.equal(resolveMfaStage('aal1', 1), 'challenge')
  assert.equal(resolveMfaStage(null, 2), 'challenge')
})

test('MFA considers only aal2 a completed second-factor session', () => {
  assert.equal(resolveMfaStage('aal2', 1), 'ready')
  assert.equal(resolveMfaStage('aal2', 0), 'ready')
})

test('TOTP validation accepts exactly six decimal digits', () => {
  assert.equal(validTotpCode('012345'), true)
  for (const value of ['', '12345', '1234567', '12 456', '12a456', '123456\n']) {
    assert.equal(validTotpCode(value), false)
  }
})
