import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateCandidateLease,
  evaluateCandidateQualification,
} from './cv2-lifecycle.mjs'

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

const greenLease = () => evaluateCandidateLease({
  expectedSha: SHA_A,
  liveSha: SHA_A,
  developmentStatus: 'success',
})

test('same SHA plus successful DEVELOPMENT status authorizes candidate lease', () => {
  const lease = greenLease()
  assert.equal(lease.authorized, true)
  assert.equal(lease.reason, 'AUTHORIZED')
  assert.equal(lease.mergeAuthorized, false)
})

test('stale head denies candidate lease', () => {
  const lease = evaluateCandidateLease({ expectedSha: SHA_A, liveSha: SHA_B, developmentStatus: 'success' })
  assert.equal(lease.authorized, false)
  assert.equal(lease.reason, 'STALE_HEAD')
  assert.equal(lease.mergeAuthorized, false)
})

test('missing pending failed or malformed DEVELOPMENT evidence denies candidate lease', () => {
  for (const developmentStatus of [null, 'pending', 'failure', 'error', 'wat']) {
    const lease = evaluateCandidateLease({ expectedSha: SHA_A, liveSha: SHA_A, developmentStatus })
    assert.equal(lease.authorized, false, `status ${developmentStatus} must deny`)
    assert.equal(lease.mergeAuthorized, false)
  }
  for (const badSha of ['', 'abc', null]) {
    const lease = evaluateCandidateLease({ expectedSha: badSha, liveSha: SHA_A, developmentStatus: 'success' })
    assert.equal(lease.authorized, false)
    assert.equal(lease.reason, 'MALFORMED_INPUT')
  }
})

test('required success passes candidate qualification', () => {
  const receipt = evaluateCandidateQualification({
    lease: greenLease(),
    required: { HVA: true, WCAG_2_2_AA: true },
    results: { HVA: 'success', WCAG_2_2_AA: 'success' },
  })
  assert.equal(receipt.outcome, 'PASS')
  assert.equal(receipt.mergeAuthorized, false)
})

test('required failure missing or pending fails candidate qualification', () => {
  for (const state of ['failure', 'pending', undefined]) {
    const receipt = evaluateCandidateQualification({
      lease: greenLease(),
      required: { HVA: true },
      results: state === undefined ? {} : { HVA: state },
    })
    assert.equal(receipt.outcome, 'FAIL', `state ${state} must fail`)
    assert.equal(receipt.mergeAuthorized, false)
  }
})

test('skipped is accepted only when authoritative required=false', () => {
  const allowed = evaluateCandidateQualification({
    lease: greenLease(),
    required: { HVA: false },
    results: { HVA: 'skipped' },
  })
  assert.equal(allowed.outcome, 'PASS')

  const denied = evaluateCandidateQualification({
    lease: greenLease(),
    required: { HVA: true },
    results: { HVA: 'skipped' },
  })
  assert.equal(denied.outcome, 'FAIL')
})

test('invalid lease or malformed gate inputs fail closed', () => {
  const badLease = evaluateCandidateQualification({
    lease: evaluateCandidateLease({ expectedSha: SHA_A, liveSha: SHA_B, developmentStatus: 'success' }),
    required: { HVA: true },
    results: { HVA: 'success' },
  })
  assert.equal(badLease.outcome, 'FAIL')
  assert.equal(badLease.mergeAuthorized, false)

  for (const [required, results] of [[null, {}], [{ HVA: 'yes' }, { HVA: 'success' }], [{ HVA: true }, null]]) {
    const receipt = evaluateCandidateQualification({ lease: greenLease(), required, results })
    assert.equal(receipt.outcome, 'FAIL')
    assert.equal(receipt.mergeAuthorized, false)
  }
})
