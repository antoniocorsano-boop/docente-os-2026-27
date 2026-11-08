import assert from 'node:assert/strict'
import test from 'node:test'
import {
  recoverableDocenteDrafts,
  resolveMfaStage,
  validTotpCode,
} from './mfa-state'

test('MFA presents setup when no verified or recoverable factor exists', () => {
  assert.equal(resolveMfaStage('aal1', 0), 'setup')
  assert.equal(resolveMfaStage(null, 0), 'setup')
})

test('interrupted enrollment is recoverable without accepting aal1 as a pass', () => {
  assert.equal(resolveMfaStage('aal1', 0, 1), 'recover')
  assert.equal(resolveMfaStage(null, 0, 2), 'recover')
})

test('a verified factor takes priority over unverified drafts', () => {
  assert.equal(resolveMfaStage('aal1', 1, 2), 'challenge')
  assert.equal(resolveMfaStage(null, 2, 3), 'challenge')
})

test('only an aal2 session is complete', () => {
  assert.equal(resolveMfaStage('aal2', 0, 1), 'ready')
  assert.equal(resolveMfaStage('aal2', 1), 'ready')
})

test('only drafts created for Docente OS can be offered for removal', () => {
  const factors = [
    { id: 'draft-ours', status: 'unverified', factor_type: 'totp', friendly_name: 'Docente OS' },
    { id: 'verified', status: 'verified', factor_type: 'totp', friendly_name: 'Docente OS' },
    { id: 'draft-other', status: 'unverified', factor_type: 'totp', friendly_name: 'Other app' },
    { id: 'phone', status: 'unverified', factor_type: 'phone', friendly_name: 'Docente OS' },
  ]
  assert.deepEqual(recoverableDocenteDrafts(factors).map((factor) => factor.id), ['draft-ours'])
})

test('TOTP validation accepts exactly six decimal digits', () => {
  assert.equal(validTotpCode('012345'), true)
  for (const value of ['', '12345', '1234567', '12 456', '12a456', '123456\n']) {
    assert.equal(validTotpCode(value), false)
  }
})
