/**
 * The fixed P7 evidence is documented in docs/pilots/ECO02_P7_CLOSURE_EVIDENCE.md.
 * This does not grant authority to any incoming Arena reference.
 */
export const PILOT_2C_P7_DOCUMENTED_RECEIPT_ID = '1fe4769d-16a8-4cf1-bf1b-af6f12177b24'
const P7_SECTION_ID = '5c8a86a5-529e-4a84-ac57-65e5a5e704d4'
const P7_SOURCE_HASH = '7bb48175'
const P7_PREPARATION_FINGERPRINT = '311770ecff1401c4d9c7db855f4eeb3be983c6ece2ff39a1143889dd4782667e'
const P7_CONFIRMED_AT = '2026-09-21T08:37:23.959195Z'

export type DocumentedPilot2CP7ReceiptResult = {
  status: 'DOCUMENTED_RECEIPT_VERIFIED' | 'DOCUMENTED_RECEIPT_NOT_FOUND' | 'DOCUMENTED_RECEIPT_MISMATCH'
  historicalReceiptVerified: boolean
  schoolAuthorityVerified: false
  writePerformed: false
}

function receiptRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

/**
 * Validates the exact historical preparation receipt, already loaded from a
 * workspace-scoped authenticated RLS read. A matching source hash alone is
 * insufficient: the original lesson decision must also be present.
 */
export function verifyDocumentedPilot2CP7Receipt(input: {
  scope: { workspaceId: string; academicYearId: string; sectionId: string }
  receipt: unknown
}): DocumentedPilot2CP7ReceiptResult {
  const { workspaceId, academicYearId, sectionId } = input.scope
  if (typeof workspaceId !== 'string' || !workspaceId.trim()) {
    throw new Error('2C authenticated workspace is required')
  }
  if (typeof academicYearId !== 'string' || !academicYearId.trim()) {
    throw new Error('2C academic year is required')
  }
  if (sectionId !== P7_SECTION_ID) {
    throw new Error('P7 documented receipt is limited to exact 2C section')
  }

  const result = (status: DocumentedPilot2CP7ReceiptResult['status']): DocumentedPilot2CP7ReceiptResult => ({
    status,
    historicalReceiptVerified: status === 'DOCUMENTED_RECEIPT_VERIFIED',
    schoolAuthorityVerified: false,
    writePerformed: false,
  })
  if (input.receipt === null || input.receipt === undefined) return result('DOCUMENTED_RECEIPT_NOT_FOUND')

  const receipt = receiptRecord(input.receipt)
  if (!receipt) return result('DOCUMENTED_RECEIPT_MISMATCH')
  const confirmedAt = typeof receipt.confirmedAt === 'string' ? receipt.confirmedAt : ''
  if (
    receipt.id !== PILOT_2C_P7_DOCUMENTED_RECEIPT_ID
    || receipt.workspaceId !== workspaceId
    || receipt.academicYearId !== academicYearId
    || receipt.sectionId !== P7_SECTION_ID
    || receipt.blockId !== 'B01'
    || receipt.projectionId !== 'HTC-SECONDA-B01-v1'
    || receipt.sourceHandoffFootprintHash !== P7_SOURCE_HASH
    || receipt.preparationFingerprint !== P7_PREPARATION_FINGERPRINT
    || Number.isNaN(Date.parse(confirmedAt))
    || Date.parse(confirmedAt) !== Date.parse(P7_CONFIRMED_AT)
  ) return result('DOCUMENTED_RECEIPT_MISMATCH')

  return result('DOCUMENTED_RECEIPT_VERIFIED')
}
