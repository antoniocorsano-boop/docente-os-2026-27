export const PILOT_2C_P7_SOURCE_FOOTPRINT = '7bb48175' as const

export type Pilot2CP7BaselineStatus =
  | 'NO_CURRENT_BASELINE'
  | 'P7_SOURCE_FOOTPRINT_MATCH'
  | 'CURRENT_BASELINE_DIFFERS_FROM_P7'
  | 'P7_FOOTPRINT_WITH_CHANGED_AUTHORITY'

export type Pilot2CP7BaselineReceipt = {
  status: Pilot2CP7BaselineStatus
  scope: '2C'
  academicYear: '2026/2027'
  provenanceEvidence: 'ECO02_P7_CLOSURE_EVIDENCE'
  proofLevel: 'SOURCE_FOOTPRINT_ONLY'
  historicalSourceFootprintHash: typeof PILOT_2C_P7_SOURCE_FOOTPRINT
  currentSourceFootprintHash: string | null
  historicalReceiptVerified: false
  institutionIdentityVerified: false
  writePerformed: false
  teacherDecisionRecorded: false
}

type Pilot2CP7CurrentBaseline = {
  sourceHandoffFootprintHash: string
  alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
  acceptedAt: string
}

function checkPilotScope(scope: {
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
  schoolYearRef: string
}): void {
  if (scope.grade !== 'SECONDA' || scope.sectionCode.trim().toUpperCase() !== 'C') {
    throw new Error('P7 source comparison is limited to the exact 2C section')
  }
  if (scope.schoolYearRef.trim().replace('/', '-') !== '2026-2027') {
    throw new Error('P7 source comparison requires school year 2026/2027')
  }
}

/**
 * Compares only the currently loaded, workspace-scoped 2C baseline with the
 * *documented* September P7 handoff source fingerprint. It neither retrieves
 * nor attests the continued existence of the actual preparation receipt.
 */
export function classify2CPilotBaselineAgainstP7(input: {
  scope: { grade: 'PRIMA' | 'SECONDA' | 'TERZA'; sectionCode: string; schoolYearRef: string }
  currentBaseline: Pilot2CP7CurrentBaseline | null
}): Pilot2CP7BaselineReceipt {
  checkPilotScope(input.scope)
  let status: Pilot2CP7BaselineStatus = 'NO_CURRENT_BASELINE'
  let currentSourceFootprintHash: string | null = null

  if (input.currentBaseline !== null) {
    const baseline = input.currentBaseline
    if (!/^[0-9a-f]{8}$/.test(baseline.sourceHandoffFootprintHash)) {
      throw new Error('current baseline source footprint is invalid')
    }
    if (baseline.alignmentAuthority !== 'PROVISIONAL_BASELINE'
      && baseline.alignmentAuthority !== 'APPROVED_INSTITUTIONAL') {
      throw new Error('current baseline authority is invalid')
    }
    if (typeof baseline.acceptedAt !== 'string'
      || !baseline.acceptedAt.trim()
      || Number.isNaN(Date.parse(baseline.acceptedAt))) {
      throw new Error('current baseline acceptance timestamp is invalid')
    }
    currentSourceFootprintHash = baseline.sourceHandoffFootprintHash
    if (currentSourceFootprintHash !== PILOT_2C_P7_SOURCE_FOOTPRINT) {
      status = 'CURRENT_BASELINE_DIFFERS_FROM_P7'
    } else if (baseline.alignmentAuthority === 'APPROVED_INSTITUTIONAL') {
      status = 'P7_FOOTPRINT_WITH_CHANGED_AUTHORITY'
    } else {
      status = 'P7_SOURCE_FOOTPRINT_MATCH'
    }
  }

  return {
    status,
    scope: '2C',
    academicYear: '2026/2027',
    provenanceEvidence: 'ECO02_P7_CLOSURE_EVIDENCE',
    proofLevel: 'SOURCE_FOOTPRINT_ONLY',
    historicalSourceFootprintHash: PILOT_2C_P7_SOURCE_FOOTPRINT,
    currentSourceFootprintHash,
    historicalReceiptVerified: false,
    institutionIdentityVerified: false,
    writePerformed: false,
    teacherDecisionRecorded: false,
  }
}
