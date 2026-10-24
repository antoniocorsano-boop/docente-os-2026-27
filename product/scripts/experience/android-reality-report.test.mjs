import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAndroidRealityReceipt,
  serializeAndroidRealityReceipt,
} from './android-reality-report.mjs'

const TESTED_SHA = '0123456789abcdef0123456789abcdef01234567'

test('missing tested SHA can never serialize as PASS', () => {
  const receipt = buildAndroidRealityReceipt({
    testedSha: '',
    requestedOutcome: 'PASS',
    infrastructure: 'PASS',
  })

  assert.equal(receipt.outcome, 'INFRA_BLOCKED')
  assert.equal(receipt.targetIntegrity, 'FAIL')
})

test('unknown outcome is rejected instead of being coerced to PASS', () => {
  assert.throws(() => buildAndroidRealityReceipt({
    testedSha: TESTED_SHA,
    requestedOutcome: 'UNKNOWN',
    infrastructure: 'PASS',
  }), /Android Reality outcome/)
})

test('infrastructure failure cannot serialize as PASS', () => {
  const receipt = buildAndroidRealityReceipt({
    testedSha: TESTED_SHA,
    requestedOutcome: 'PASS',
    infrastructure: 'INFRA_BLOCKED',
  })

  assert.equal(receipt.outcome, 'INFRA_BLOCKED')
})

test('FAIL_PRODUCT retains the first deterministic product failure', () => {
  const failures = [
    { journey: 'AR-01', code: 'FAB_BLOCKS_MATERIALS', message: 'FAB overlaps Apri materiali' },
    { journey: 'AR-02', code: 'TOUCH_DRAG_CANCELLED', message: 'Touch drag did not complete' },
  ]
  const receipt = buildAndroidRealityReceipt({
    testedSha: TESTED_SHA,
    requestedOutcome: 'FAIL_PRODUCT',
    infrastructure: 'PASS',
    failures,
  })

  assert.equal(receipt.outcome, 'FAIL_PRODUCT')
  assert.deepEqual(receipt.firstProductFailure, failures[0])
})

test('serialized receipt excludes cookies, headers, tokens and supplied secret fields', () => {
  const json = serializeAndroidRealityReceipt({
    testedSha: TESTED_SHA,
    requestedOutcome: 'PASS',
    infrastructure: 'PASS',
    device: {
      model: 'sdk_gphone64_x86_64',
      serial: 'emulator-5554',
      apiLevel: '35',
      androidRelease: '15',
      chromeVersion: '124.0.6367.219',
      cookies: 'secret-cookie',
      accessToken: 'secret-token',
    },
    headers: { authorization: 'Bearer secret-header' },
    secrets: { totp: 'secret-totp' },
  })

  for (const forbidden of ['secret-cookie', 'secret-token', 'secret-header', 'secret-totp', 'cookies', 'authorization', 'accessToken', 'secrets']) {
    assert.equal(json.includes(forbidden), false, `receipt must not contain ${forbidden}`)
  }
})
