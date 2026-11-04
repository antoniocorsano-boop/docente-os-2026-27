/**
 * Pilot 2C: a non-persistent decision preflight for one exact provisional
 * Technology II Arena reference. It NEVER writes or records teacher consent.
 *
 * Inputs are documentary observations, NOT authorization grants. A future
 * server-side action must independently revalidate every input inside the
 * authenticated workspace before creating an append-only receipt.
 */
export type Pilot2CReferenceChoice =
  | 'KEEP_CURRENT_REFERENCE'
  | 'REQUEST_PROVISIONAL_REFERENCE'

export type Pilot2CReferenceSource = {
  status: 'LOCAL_PREVIEW' | 'SERVER_QUALIFIED'
  institutionId: string
  sourceMasterVersion: string
  sourceRevisionId: string
  sourceContentFootprint: string
  releaseStructuralFootprint: string
  segmentId: string
  framework: string
  authorityState: string
  curricoloVigente: boolean
}

export type Pilot2CInstitutionBinding =
  | { status: 'NOT_ATTESTED' }
  | {
      status: 'ATTESTED'
      schoolCode: string
      institutionId: string
      attestationRef: string
      attestedBy: string
    }

export type Pilot2CReferenceDecisionBlocker =
  | 'P7_RECEIPT_NOT_VERIFIED'
  | 'NO_HISTORICAL_BASELINE'
  | 'HISTORICAL_BASELINE_DRIFT'
  | 'HISTORICAL_AUTHORITY_CHANGED'
  | 'SOURCE_NOT_SERVER_QUALIFIED'
  | 'SOURCE_REFERENCE_MISMATCH'
  | 'INSTITUTION_BINDING_NOT_ATTESTED'
  | 'INSTITUTION_ID_MISMATCH'

export type Pilot2CReferenceDecisionPlan = {
  status: 'NO_DECISION'
    | 'KEEP_CURRENT_NO_CHANGE'
    | 'REVIEW_BLOCKED'
    | 'AWAITING_AUTHENTICATED_CONFIRMATION'
  blockers: Pilot2CReferenceDecisionBlocker[]
  reference: {
    sourceMasterVersion: '1.3'
    sourceRevisionId: '27'
    sourceContentFootprint: '99c4ccc3'
    releaseStructuralFootprint: '8588371c'
    segmentId: 'can-curr-master-00-secondaria-tecnologia-2'
    framework: 'IN2012'
  }
  trustBoundary: 'SERVER_REVALIDATION_REQUIRED'
  teacherDecisionRecorded: false
  writeAllowed: false
  writePerformed: false
  replacesHistoricalBaseline: false
  curricoloVigente: false
}

const REFERENCE = {
  sourceMasterVersion: '1.3',
  sourceRevisionId: '27',
  sourceContentFootprint: '99c4ccc3',
  releaseStructuralFootprint: '8588371c',
  segmentId: 'can-curr-master-00-secondaria-tecnologia-2',
  framework: 'IN2012',
} as const

const P7_SOURCE_HASH = '7bb48175'
const SCHOOL_CODE = 'AVIC849003'
const ARENA_INSTITUTION_ID = 'ics-lorenzo-milani'

function year(value: string): string {
  return value.trim().replace('/', '-')
}

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function exactScope(scope: {
  grade: string
  sectionCode: string
  schoolYearRef: string
  disciplineRef: string
}): void {
  if (scope.grade !== 'SECONDA' || scope.sectionCode.trim().toUpperCase() !== 'C') {
    throw new Error('2C reference decision requires exact 2C scope')
  }
  if (year(scope.schoolYearRef) !== '2026-2027') {
    throw new Error('2C reference decision requires school year 2026/2027')
  }
  if (scope.disciplineRef !== 'technology') {
    throw new Error('2C reference decision requires Technology discipline')
  }
}

function matchingSource(source: Pilot2CReferenceSource | null): boolean {
  return source !== null
    && source.institutionId === ARENA_INSTITUTION_ID
    && source.sourceMasterVersion === REFERENCE.sourceMasterVersion
    && source.sourceRevisionId === REFERENCE.sourceRevisionId
    && source.sourceContentFootprint === REFERENCE.sourceContentFootprint
    && source.releaseStructuralFootprint === REFERENCE.releaseStructuralFootprint
    && source.segmentId === REFERENCE.segmentId
    && source.framework === REFERENCE.framework
    && source.authorityState === 'PROVISIONAL_COMPLETE'
    && source.curricoloVigente === false
}

function bindingAttested(binding: Pilot2CInstitutionBinding): boolean {
  return binding.status === 'ATTESTED'
    && binding.schoolCode === SCHOOL_CODE
    && binding.institutionId === ARENA_INSTITUTION_ID
      ? isNonBlank(binding.attestationRef) && isNonBlank(binding.attestedBy)
      : false
}

/**
 * Plans but NEVER performs the adoption. This is not a write authorization,
 * even when every documentary condition is met in the calling code.
 */
export function plan2CCanonicalReferenceDecision(input: {
  scope: { grade: string; sectionCode: string; schoolYearRef: string; disciplineRef: string }
  choice: Pilot2CReferenceChoice | null
  baseline: null | {
    sourceHandoffFootprintHash: string
    alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
    acceptedAt: string
  }
  documentedP7ReceiptVerified: boolean
  source: Pilot2CReferenceSource | null
  institutionBinding: Pilot2CInstitutionBinding
}): Pilot2CReferenceDecisionPlan {
  exactScope(input.scope)
  const output = (
    status: Pilot2CReferenceDecisionPlan['status'],
    blockers: Pilot2CReferenceDecisionBlocker[] = [],
  ): Pilot2CReferenceDecisionPlan => ({
    status,
    blockers,
    reference: { ...REFERENCE },
    trustBoundary: 'SERVER_REVALIDATION_REQUIRED',
    teacherDecisionRecorded: false,
    writeAllowed: false,
    writePerformed: false,
    replacesHistoricalBaseline: false,
    curricoloVigente: false,
  })

  if (input.choice === null) return output('NO_DECISION')
  if (input.choice === 'KEEP_CURRENT_REFERENCE') return output('KEEP_CURRENT_NO_CHANGE')
  if (input.choice !== 'REQUEST_PROVISIONAL_REFERENCE') {
    throw new Error('unsupported 2C reference choice')
  }

  const blockers: Pilot2CReferenceDecisionBlocker[] = []
  if (input.documentedP7ReceiptVerified !== true) {
    blockers.push('P7_RECEIPT_NOT_VERIFIED')
  }
  if (input.baseline === null) {
    blockers.push('NO_HISTORICAL_BASELINE')
  } else {
    const old = input.baseline
    if (old.sourceHandoffFootprintHash !== P7_SOURCE_HASH
      || !isNonBlank(old.acceptedAt)
      || Number.isNaN(Date.parse(old.acceptedAt))) {
      blockers.push('HISTORICAL_BASELINE_DRIFT')
    }
    if (old.alignmentAuthority !== 'PROVISIONAL_BASELINE') {
      blockers.push('HISTORICAL_AUTHORITY_CHANGED')
    }
  }

  if (input.source?.status !== 'SERVER_QUALIFIED') {
    blockers.push('SOURCE_NOT_SERVER_QUALIFIED')
  }
  if (!matchingSource(input.source)) {
    blockers.push('SOURCE_REFERENCE_MISMATCH')
  }

  if (!bindingAttested(input.institutionBinding)) {
    blockers.push('INSTITUTION_BINDING_NOT_ATTESTED')
  } else if (input.source?.institutionId !== input.institutionBinding.institutionId) {
    blockers.push('INSTITUTION_ID_MISMATCH')
  }
  // A claimed attestation for another institution must not silently count as
  // an attestation for the target even if the source itself is malformed.
  if (input.institutionBinding.status === 'ATTESTED'
    && input.institutionBinding.institutionId !== ARENA_INSTITUTION_ID
    && isNonBlank(input.institutionBinding.attestationRef)
    && isNonBlank(input.institutionBinding.attestedBy)
    && input.institutionBinding.schoolCode === SCHOOL_CODE) {
    if (!blockers.includes('INSTITUTION_ID_MISMATCH')) {
      blockers.push('INSTITUTION_ID_MISMATCH')
    }
  }

  return blockers.length
    ? output('REVIEW_BLOCKED', blockers)
    : output('AWAITING_AUTHENTICATED_CONFIRMATION')
}
