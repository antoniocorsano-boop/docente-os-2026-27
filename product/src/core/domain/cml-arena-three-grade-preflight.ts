import { selectArenaVerticalCurricoloSlice } from './cml-discipline-binding'

type GradeRef = 'grade-1' | 'grade-2' | 'grade-3'
type Framework = 'IN2025' | 'IN2012'

export type CanonicalArenaThreeGradeReceipt = {
  status: 'OFFLINE_CONTRACT_VERIFIED'
  verificationMode: 'DECLARED_TARGET_ONLY'
  workspaceAcceptanceVerified: false
  writePerformed: false
  sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1'
  institutionId: string
  schoolYearRef: string
  sourceMasterVersion: '1.3'
  sourceRevisionId: string
  sourceContentFootprint: string
  structuralFootprint: string
  scopeCount: 113
  authorityState: 'PROVISIONAL_COMPLETE'
  curricoloVigente: false
  grades: Array<{
    gradeRef: GradeRef
    framework: Framework
    segmentId: string
    nodeCount: number
  }>
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`)
  }
  return value as Record<string, unknown>
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value.trim()
}

function year(value: string): string {
  return value.trim().replaceAll('/', '-')
}

/**
 * Offline, read-only compatibility check of a complete Arena release against
 * the existing Docente OS class selector. This is not workspace acceptance,
 * institutional authorization, or a new curricular source of authority.
 */
export function verifyCanonicalArenaReleaseForThreeGrades(input: {
  release: unknown
  targetInstitutionId: string
  schoolYearRef: string
  expectedRevisionId: string
  expectedSourceContentFootprint?: string
}): CanonicalArenaThreeGradeReceipt {
  const targetInstitutionId = nonEmpty(input.targetInstitutionId, 'target institution identity')
  const schoolYearRef = nonEmpty(input.schoolYearRef, 'target school year')
  const expectedRevisionId = nonEmpty(input.expectedRevisionId, 'expected source revision')

  const release = record(input.release, 'Arena complete release')
  if (release.contract !== 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1'
    || release.contractVersion !== 1) {
    throw new Error('unsupported Arena vertical release contract')
  }
  if (nonEmpty(release.institutionId, 'Arena release institution') !== targetInstitutionId) {
    throw new Error('Arena institution identity differs from the explicitly declared target')
  }
  if (year(nonEmpty(release.schoolYearRef, 'Arena release school year')) !== year(schoolYearRef)) {
    throw new Error('Arena release school year differs from declared target')
  }

  const sourceMaster = record(release.sourceMaster, 'sourceMaster')
  if (sourceMaster.masterId !== 'CAN-CURR-MASTER-00'
    || sourceMaster.masterVersion !== '1.3'
    || sourceMaster.revisionId !== expectedRevisionId
    || sourceMaster.materializationState !== 'COMPLETE'
    || sourceMaster.humanProfessionalValidation !== 'OPEN') {
    throw new Error('Arena source master identity, version, revision or validation status rejected')
  }
  if (sourceMaster.curricoloVigente !== false
    || sourceMaster.authority !== 'INSTITUTE_CANONICAL_WORKING_BASELINE') {
    throw new Error('Arena source must remain non-vigente and provisionally authoritative')
  }

  const version = record(release.version, 'Arena version')
  if (version.versionNumber !== '1.3' || version.status !== 'under-review') {
    throw new Error('Arena release version must remain v1.3 under-review')
  }
  const authority = record(release.authority, 'Arena authority')
  if (authority.state !== 'PROVISIONAL_COMPLETE'
    || authority.requiresRevalidationOnApproval !== true) {
    throw new Error('Arena release authority must remain provisional')
  }
  const policy = record(release.downstreamPolicy, 'Arena downstream policy')
  if (policy.acceptanceRequired !== true || policy.automaticWriteAllowed !== false) {
    throw new Error('Arena release must forbid automatic writes')
  }

  const manifest = record(release.manifest, 'Arena release manifest')
  if (manifest.coverageStatus !== 'SATISFIED'
    || !Array.isArray(manifest.expected)
    || manifest.expected.length !== 113
    || !Array.isArray(release.segments)
    || release.segments.length !== 113) {
    throw new Error('Arena complete release must cover exactly 113 governed scopes')
  }

  const snapshot = record(release.sourceSnapshot, 'Arena source snapshot')
  if (snapshot.format !== 'text/plain') {
    throw new Error('Arena complete release must contain the original text/plain source snapshot')
  }
  const sourceContentFootprint = nonEmpty(
    record(snapshot.contentFootprint, 'Arena source content footprint').hash,
    'Arena source content footprint hash',
  )
  if (input.expectedSourceContentFootprint !== undefined
    && sourceContentFootprint !== nonEmpty(input.expectedSourceContentFootprint, 'expected source footprint')) {
    throw new Error('Arena source content footprint differs from declared source')
  }

  const grades = (['grade-1', 'grade-2', 'grade-3'] as const).map((gradeRef) => {
    // This selector validates the *entire* release including its outer and
    // inner fingerprints, graph, manifest, institution and authority.
    const selected = selectArenaVerticalCurricoloSlice({
      release,
      target: {
        institutionId: targetInstitutionId,
        schoolYearRef,
        schoolOrder: 'secondaria',
        gradeRef,
        disciplineRef: 'technology',
      },
    })
    const grade = gradeRef.slice(-1)
    const scope = record(selected.segment.scope, 'selected segment scope')
    if (scope.type !== 'grade' || scope.grade !== grade) {
      throw new Error(`Arena ${gradeRef} does not resolve to its exact class segment`)
    }
    const applicability = record(selected.segment.frameworkApplicability, 'selected framework applicability')
    const requiredFramework: Framework = gradeRef === 'grade-1' ? 'IN2025' : 'IN2012'
    if (applicability.framework !== requiredFramework || applicability.resolutionStatus !== 'resolved') {
      throw new Error(`Arena ${gradeRef} has an incorrect or unresolved transitional framework`)
    }
    if (selected.nodes.length < 1) {
      throw new Error(`Arena ${gradeRef} has no curricular nodes`)
    }
    if (selected.authority.state !== 'PROVISIONAL_COMPLETE'
      || selected.downstreamPolicy.automaticWriteAllowed !== false) {
      throw new Error(`Arena ${gradeRef} unexpectedly elevated authority or enabled writes`)
    }
    return {
      gradeRef,
      framework: requiredFramework,
      segmentId: selected.segment.id,
      nodeCount: selected.nodes.length,
    }
  })

  const structuralFootprint = nonEmpty(
    record(release.structuralFootprint, 'Arena release footprint').hash,
    'Arena release footprint hash',
  )
  return {
    status: 'OFFLINE_CONTRACT_VERIFIED',
    verificationMode: 'DECLARED_TARGET_ONLY',
    workspaceAcceptanceVerified: false,
    writePerformed: false,
    sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
    institutionId: targetInstitutionId,
    schoolYearRef: nonEmpty(release.schoolYearRef, 'Arena release school year'),
    sourceMasterVersion: '1.3',
    sourceRevisionId: expectedRevisionId,
    sourceContentFootprint,
    structuralFootprint,
    scopeCount: 113,
    authorityState: 'PROVISIONAL_COMPLETE',
    curricoloVigente: false,
    grades,
  }
}
