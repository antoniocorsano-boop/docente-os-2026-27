import assert from 'node:assert/strict'
import test from 'node:test'
import {
  verifyDocumentedPilot2CP7Receipt,
  PILOT_2C_P7_DOCUMENTED_RECEIPT_ID,
} from './cml-2c-p7-documented-receipt'

const scope = {
  workspaceId: 'pilot-workspace-test',
  academicYearId: 'pilot-year-test',
  sectionId: '5c8a86a5-529e-4a84-ac57-65e5a5e704d4',
}

const documentedReceipt = {
  id: PILOT_2C_P7_DOCUMENTED_RECEIPT_ID,
  workspace_id: scope.workspaceId,
  academic_year_id: scope.academicYearId,
  section_id: scope.sectionId,
  block_id: 'B01',
  projection_id: 'HTC-SECONDA-B01-v1',
  curriculum_source_handoff_footprint_hash: '7bb48175',
  preparation_fingerprint: '311770ecff1401c4d9c7db855f4eeb3be983c6ece2ff39a1143889dd4782667e',
  confirmed_at: '2026-09-21T08:37:23.959195+00:00',
}

function verify(receipt: unknown, override?: Partial<typeof scope>) {
  return verifyDocumentedPilot2CP7Receipt({
    scope: { ...scope, ...override },
    receipt,
  })
}

test('P7 is verified only when the actual receipt matches source, preparation and exact authorized scope', () => {
  const input = structuredClone(documentedReceipt)
  const before = structuredClone(input)
  const result = verify(input)
  assert.equal(result.status, 'DOCUMENTED_RECEIPT_VERIFIED')
  assert.equal(result.historicalReceiptVerified, true)
  assert.equal(result.schoolAuthorityVerified, false)
  assert.equal(result.writePerformed, false)
  assert.deepEqual(input, before)
  assert.equal(JSON.stringify(result).includes(scope.workspaceId), false)
  assert.equal(JSON.stringify(result).includes(input.preparation_fingerprint), false)
})

test('a non-existent P7 receipt is not inferred from the baseline fingerprint', () => {
  const result = verify(null)
  assert.equal(result.status, 'DOCUMENTED_RECEIPT_NOT_FOUND')
  assert.equal(result.historicalReceiptVerified, false)
})

test('a receipt for any other source or preparation exact state is rejected', () => {
  for (const difference of [
    { id: '11111111-1111-4111-8111-111111111111' },
    { block_id: 'B02' },
    { projection_id: 'OTHER-PROJECTION' },
    { curriculum_source_handoff_footprint_hash: '8588371c' },
    { preparation_fingerprint: '00000000' },
    { confirmed_at: '2026-09-22T08:37:23.959195Z' },
  ]) {
    const result = verify({ ...documentedReceipt, ...difference })
    assert.equal(result.status, 'DOCUMENTED_RECEIPT_MISMATCH')
    assert.equal(result.historicalReceiptVerified, false)
    assert.equal(result.writePerformed, false)
  }
})

test('a receipt from another workspace, year or section cannot attest this pilot', () => {
  for (const difference of [
    { workspace_id: 'other-workspace' },
    { academic_year_id: 'other-year' },
    { section_id: '11111111-1111-4111-8111-111111111111' },
  ]) {
    assert.equal(verify({ ...documentedReceipt, ...difference }).status, 'DOCUMENTED_RECEIPT_MISMATCH')
  }
  assert.throws(() => verify(documentedReceipt, { sectionId: '11111111-1111-4111-8111-111111111111' }), /2C|section/i)
  assert.throws(() => verify(documentedReceipt, { workspaceId: '' }), /workspace/i)
  assert.throws(() => verify(documentedReceipt, { academicYearId: '' }), /year/i)
})

test('malformed receipts fail closed without exposing private data', () => {
  for (const value of [[], {}, 42, 'untrusted', { ...documentedReceipt, confirmed_at: 'bad' }]) {
    const status = verify(value)
    assert.equal(status.historicalReceiptVerified, false)
    assert.equal(status.writePerformed, false)
  }
})
