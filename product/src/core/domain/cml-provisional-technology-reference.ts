export type ProvisionalTechnologyGrade = 'PRIMA' | 'SECONDA' | 'TERZA'

export type ProvisionalTechnologyReference = {
  status: 'PROVISIONAL_NOT_IN_FORCE'
  source: 'CURMANLIGHT_ARENA'
  sourceVersion: '1.3'
  institutionIdDeclared: string
  institutionIdentityVerified: false
  gradeRef: 'grade-1' | 'grade-2' | 'grade-3'
  schoolYearRef: string
  framework: 'IN2025' | 'IN2012'
  segmentId: string
  releaseStructuralFootprint: string
  nodeCount: number
  obiettivi: string[]
  conoscenze: string[]
  evidenze: string[]
  writeAllowed: false
  legacyReplacementAllowed: false
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' must be an object')
  }
  return value as Record<string, unknown>
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(label + ' is required')
  return value.trim()
}

function listOfText(value: unknown, label: string, required: boolean): string[] {
  if (value === undefined && !required) return []
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string' && item.trim())) {
    throw new Error(label + ' must be a text list')
  }
  if (required && value.length === 0) throw new Error(label + ' must not be empty')
  return value.map(item => (item as string).trim())
}

export function provisionalTechnologyGradeRef(grade: ProvisionalTechnologyGrade) {
  if (grade === 'PRIMA') return 'grade-1' as const
  if (grade === 'SECONDA') return 'grade-2' as const
  if (grade === 'TERZA') return 'grade-3' as const
  throw new Error('Unsupported class grade')
}

/**
 * Projects an already verified, detached Arena segment for teacher consultation.
 * Never qualifies institution identity, stores a receipt, or replaces a baseline.
 * The caller must run verifyCanonicalArenaReleaseForThreeGrades and
 * selectArenaVerticalCurricoloSlice on the complete release first.
 */
export function projectProvisionalTechnologyReference(input: {
  selected: unknown
  grade: ProvisionalTechnologyGrade
  schoolYearRef: string
}): ProvisionalTechnologyReference {
  const selected = record(input.selected, 'Arena selection')
  const gradeRef = provisionalTechnologyGradeRef(input.grade)
  const framework = gradeRef === 'grade-1' ? 'IN2025' : 'IN2012'

  if (selected.schoolOrder !== 'secondaria'
    || selected.gradeRef !== gradeRef
    || selected.disciplineRef !== 'technology') {
    throw new Error('Selected segment does not match the class and discipline')
  }

  const schoolYearRef = nonEmpty(selected.schoolYearRef, 'Arena school year')
  if (schoolYearRef.replaceAll('/', '-') !== input.schoolYearRef.replaceAll('/', '-')
    || schoolYearRef.replaceAll('/', '-') !== '2026-2027') {
    throw new Error('Arena school year does not match the supported school year')
  }

  const version = record(selected.version, 'Arena version')
  if (version.versionNumber !== '1.3') throw new Error('Unsupported Arena version')
  const provenance = record(selected.provenance, 'Arena provenance')
  if (provenance.sourceProduct !== 'CURMANLIGHT_ARENA'
    || provenance.sourceContract !== 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1') {
    throw new Error('Unsupported Arena contract')
  }
  const authority = record(selected.authority, 'Arena authority')
  if (authority.state !== 'PROVISIONAL_COMPLETE'
    || authority.alignmentAuthority !== 'PROVISIONAL_BASELINE'
    || authority.requiresRevalidationOnApproval !== true) {
    throw new Error('Reference must remain provisional')
  }
  const policy = record(selected.downstreamPolicy, 'Arena downstream policy')
  if (policy.acceptanceRequired !== true || policy.automaticWriteAllowed !== false) {
    throw new Error('Reference cannot permit automatic writes')
  }

  const segment = record(selected.segment, 'Arena segment')
  const segmentId = nonEmpty(segment.id, 'Arena segment ID')
  if (segment.subjectOrFieldId !== 'tecnologia') {
    throw new Error('Unexpected subject in selected segment')
  }
  const scope = record(segment.scope, 'Arena grade scope')
  if (scope.type !== 'grade' || scope.grade !== gradeRef.slice(-1)) {
    throw new Error('Selected grade scope does not match the class')
  }
  const applicability = record(segment.frameworkApplicability, 'Arena framework')
  if (applicability.framework !== framework || applicability.resolutionStatus !== 'resolved') {
    throw new Error('The IN2025/IN2012 transitional regime does not match the class')
  }
  const content = record(segment.content, 'Arena segment content')
  const obiettivi = listOfText(content.obiettivi, 'Obiettivi', true)
  const conoscenze = listOfText(content.conoscenze, 'Conoscenze', false)
  const evidenze = listOfText(content.evidenze, 'Evidenze', true)
  const nodes = selected.nodes
  if (!Array.isArray(nodes) || nodes.length < 1
    || nodes.some(node => record(node, 'Arena node').segmentId !== segmentId)) {
    throw new Error('Selected nodes do not match the grade segment')
  }

  const hash = nonEmpty(
    record(selected.structuralFootprint, 'Release structural footprint').hash,
    'Release structural footprint hash',
  )
  if (!/^[0-9a-f]{8}$/.test(hash)) throw new Error('Invalid release fingerprint')

  return {
    status: 'PROVISIONAL_NOT_IN_FORCE',
    source: 'CURMANLIGHT_ARENA',
    sourceVersion: '1.3',
    institutionIdDeclared: nonEmpty(selected.institutionId, 'Declared institution'),
    institutionIdentityVerified: false,
    gradeRef,
    schoolYearRef,
    framework,
    segmentId,
    releaseStructuralFootprint: hash,
    nodeCount: nodes.length,
    obiettivi,
    conoscenze,
    evidenze,
    writeAllowed: false,
    legacyReplacementAllowed: false,
  }
}
