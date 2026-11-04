import assert from 'node:assert/strict'
import test from 'node:test'
import { plan2CCanonicalReferenceDecision } from './cml-2c-reference-link-decision'

const TARGET = {
  grade: 'SECONDA' as const,
  sectionCode: 'C',
  schoolYearRef: '2026/2027',
  disciplineRef: 'technology',
}

const oldBaseline = {
  sourceHandoffFootprintHash: '7bb48175',
  alignmentAuthority: 'PROVISIONAL_BASELINE' as const,
  acceptedAt: '2026-09-21T08:37:23.959195Z',
}

const localSource = {
  status: 'LOCAL_PREVIEW' as const,
  institutionId: 'ics-lorenzo-milani',
  sourceMasterVersion: '1.3',
  sourceRevisionId: '27',
  sourceContentFootprint: '99c4ccc3',
  releaseStructuralFootprint: '8588371c',
  segmentId: 'can-curr-master-00-secondaria-tecnologia-2',
  framework: 'IN2012',
  authorityState: 'PROVISIONAL_COMPLETE',
  curricoloVigente: false,
}

const attestedSource = { ...localSource, status: 'SERVER_QUALIFIED' as const }
const attestedBinding = {
  status: 'ATTESTED' as const,
  schoolCode: 'AVIC849003',
  institutionId: 'ics-lorenzo-milani',
  attestationRef: 'institution-evidence-local-only-fixture',
  attestedBy: 'authorized-institution-role',
}

function plan(overrides: Record<string, unknown> = {}) {
  return plan2CCanonicalReferenceDecision({
    scope: TARGET,
    choice: 'REQUEST_PROVISIONAL_REFERENCE',
    baseline: oldBaseline,
    documentedP7ReceiptVerified: true,
    source: localSource,
    institutionBinding: { status: 'NOT_ATTESTED' },
    ...overrides,
  })
}

test('the default never invents a teacher decision or a current link', () => {
  const result = plan({ choice: null })
  assert.equal(result.status, 'NO_DECISION')
  assert.equal(result.teacherDecisionRecorded, false)
  assert.equal(result.writePerformed, false)
  assert.equal(result.writeAllowed, false)
  assert.equal(result.replacesHistoricalBaseline, false)
  assert.equal(result.curricoloVigente, false)
})

test('keeping the original reference never changes the historic 2C baseline', () => {
  const old = structuredClone(oldBaseline)
  const source = structuredClone(localSource)
  const result = plan({ choice: 'KEEP_CURRENT_REFERENCE' })
  assert.equal(result.status, 'KEEP_CURRENT_NO_CHANGE')
  assert.deepEqual(result.blockers, [])
  assert.equal(result.writeAllowed, false)
  assert.equal(result.replacesHistoricalBaseline, false)
  assert.deepEqual(oldBaseline, old)
  assert.deepEqual(localSource, source)
})

test('a local release and an unverified institutional alias block linking even with P7 present', () => {
  const result = plan()
  assert.equal(result.status, 'REVIEW_BLOCKED')
  assert.deepEqual(result.blockers, [
    'SOURCE_NOT_SERVER_QUALIFIED',
    'INSTITUTION_BINDING_NOT_ATTESTED',
  ])
  assert.equal(result.teacherDecisionRecorded, false)
  assert.equal(result.writeAllowed, false)
  assert.equal(result.curricoloVigente, false)
})

test('server-qualified source and institution evidence allow only a further authenticated confirmation', () => {
  const result = plan({
    source: attestedSource,
    institutionBinding: attestedBinding,
  })
  assert.equal(result.status, 'AWAITING_AUTHENTICATED_CONFIRMATION')
  assert.deepEqual(result.blockers, [])
  assert.equal(result.teacherDecisionRecorded, false)
  assert.equal(result.writePerformed, false)
  assert.equal(result.writeAllowed, false)
  assert.equal(result.replacesHistoricalBaseline, false)
  assert.equal(result.reference.sourceRevisionId, '27')
  assert.equal(result.reference.releaseStructuralFootprint, '8588371c')
})

test('missing original P7 receipt or baseline and altered authority block the request', () => {
  assert.ok(plan({ documentedP7ReceiptVerified: false }).blockers.includes('P7_RECEIPT_NOT_VERIFIED'))
  assert.ok(plan({ baseline: null }).blockers.includes('NO_HISTORICAL_BASELINE'))
  assert.ok(plan({ baseline: { ...oldBaseline, sourceHandoffFootprintHash: '00000000' } }).blockers.includes('HISTORICAL_BASELINE_DRIFT'))
  assert.ok(plan({ baseline: { ...oldBaseline, alignmentAuthority: 'APPROVED_INSTITUTIONAL' } }).blockers.includes('HISTORICAL_AUTHORITY_CHANGED'))
})

test('a mismatched or undocumented school identity cannot be accepted by declaration alone', () => {
  const result = plan({
    source: attestedSource,
    institutionBinding: { ...attestedBinding, institutionId: 'some-other-school' },
  })
  assert.equal(result.status, 'REVIEW_BLOCKED')
  assert.ok(result.blockers.includes('INSTITUTION_ID_MISMATCH'))
  const absentReceipt = plan({
    source: attestedSource,
    institutionBinding: { ...attestedBinding, attestationRef: '' },
  })
  assert.ok(absentReceipt.blockers.includes('INSTITUTION_BINDING_NOT_ATTESTED'))
  const otherCode = plan({
    source: attestedSource,
    institutionBinding: { ...attestedBinding, schoolCode: 'OTHER' },
  })
  assert.ok(otherCode.blockers.includes('INSTITUTION_BINDING_NOT_ATTESTED'))
})

test('source fingerprint, revision, framework and authority must match the exact proposed release', () => {
  const changes = [
    { sourceRevisionId: '28' },
    { sourceMasterVersion: '1.4' },
    { sourceContentFootprint: '00000000' },
    { releaseStructuralFootprint: 'ffffffff' },
    { segmentId: 'other-segment' },
    { framework: 'IN2025' },
    { authorityState: 'APPROVED' },
    { curricoloVigente: true },
  ]
  for (const change of changes) {
    const result = plan({
      source: { ...attestedSource, ...change },
      institutionBinding: attestedBinding,
    })
    assert.equal(result.status, 'REVIEW_BLOCKED')
    assert.ok(result.blockers.includes('SOURCE_REFERENCE_MISMATCH'))
    assert.equal(result.writeAllowed, false)
  }
})

test('only the exact 2C academic year and discipline can enter the decision gate', () => {
  for (const scope of [
    { ...TARGET, sectionCode: 'A' },
    { ...TARGET, grade: 'TERZA' },
    { ...TARGET, schoolYearRef: '2027/2028' },
    { ...TARGET, disciplineRef: 'italian' },
  ]) {
    assert.throws(() => plan({ scope }), /2C|scope|school year|discipline/i)
  }
})

test('the decision plan cannot be mistaken for a persisted receipt', () => {
  const result = plan({ source: attestedSource, institutionBinding: attestedBinding })
  assert.equal(Object.hasOwn(result, 'acceptanceReceiptId'), false)
  assert.equal(Object.hasOwn(result, 'approvedBy'), false)
  assert.equal(result.trustBoundary, 'SERVER_REVALIDATION_REQUIRED')
  assert.equal(result.teacherDecisionRecorded, false)
  assert.equal(result.writePerformed, false)
})
