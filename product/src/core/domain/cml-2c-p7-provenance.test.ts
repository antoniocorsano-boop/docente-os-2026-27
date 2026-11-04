import assert from 'node:assert/strict'
import test from 'node:test'
import { classify2CPilotBaselineAgainstP7 } from './cml-2c-p7-provenance'

const scope = { grade: 'SECONDA' as const, sectionCode: 'C', schoolYearRef: '2026/2027' }
const baseline = {
  sourceHandoffFootprintHash: '7bb48175',
  alignmentAuthority: 'PROVISIONAL_BASELINE' as const,
  acceptedAt: '2026-09-21T08:00:00.000Z',
}

test('the current 2C baseline can match only the documented P7 handoff footprint', () => {
  const source = structuredClone(baseline)
  const result = classify2CPilotBaselineAgainstP7({ scope, currentBaseline: source })
  assert.equal(result.status, 'P7_SOURCE_FOOTPRINT_MATCH')
  assert.equal(result.historicalSourceFootprintHash, '7bb48175')
  assert.equal(result.currentSourceFootprintHash, '7bb48175')
  assert.equal(result.historicalReceiptVerified, false)
  assert.equal(result.institutionIdentityVerified, false)
  assert.equal(result.writePerformed, false)
  assert.equal(result.teacherDecisionRecorded, false)
  assert.deepEqual(source, baseline)
})

test('no baseline cannot be inferred to be a lost P7 receipt or an empty new adoption', () => {
  const result = classify2CPilotBaselineAgainstP7({ scope, currentBaseline: null })
  assert.equal(result.status, 'NO_CURRENT_BASELINE')
  assert.equal(result.currentSourceFootprintHash, null)
  assert.equal(result.historicalReceiptVerified, false)
  assert.equal(result.writePerformed, false)
})

test('a different source fingerprint requires explicit review, never implicit replacement', () => {
  const result = classify2CPilotBaselineAgainstP7({
    scope, currentBaseline: { ...baseline, sourceHandoffFootprintHash: '12ab34cd' },
  })
  assert.equal(result.status, 'CURRENT_BASELINE_DIFFERS_FROM_P7')
  assert.equal(result.currentSourceFootprintHash, '12ab34cd')
  assert.equal(result.writePerformed, false)
  assert.equal(result.teacherDecisionRecorded, false)
})

test('identical footprint with institutional approval is not classified as unchanged P7', () => {
  const result = classify2CPilotBaselineAgainstP7({
    scope, currentBaseline: { ...baseline, alignmentAuthority: 'APPROVED_INSTITUTIONAL' },
  })
  assert.equal(result.status, 'P7_FOOTPRINT_WITH_CHANGED_AUTHORITY')
  assert.equal(result.historicalReceiptVerified, false)
  assert.equal(result.writePerformed, false)
})

test('a wrong class or year is rejected before inspecting any baseline', () => {
  assert.throws(() => classify2CPilotBaselineAgainstP7({
    scope: { ...scope, sectionCode: 'A' }, currentBaseline: null,
  }), /2C|section/i)
  assert.throws(() => classify2CPilotBaselineAgainstP7({
    scope: { ...scope, grade: 'TERZA' }, currentBaseline: null,
  }), /2C|grade/i)
  assert.throws(() => classify2CPilotBaselineAgainstP7({
    scope: { ...scope, schoolYearRef: '2027/2028' }, currentBaseline: null,
  }), /school year|2026/i)
})

test('invalid input fails closed without echoing source data', () => {
  assert.throws(() => classify2CPilotBaselineAgainstP7({
    scope, currentBaseline: { ...baseline, sourceHandoffFootprintHash: '' },
  }), /footprint/i)
  assert.throws(() => classify2CPilotBaselineAgainstP7({
    scope, currentBaseline: { ...baseline, acceptedAt: 'invalid' },
  }), /timestamp/i)
})
