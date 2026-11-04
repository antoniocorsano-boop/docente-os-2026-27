export type Pilot2CLegacyBaseline = {
  sourceHandoffFootprintHash: string
  alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
  acceptedAt: string
  requirements: Array<{ requirementId: string; description: string }>
}

export type Pilot2CCanonicalAlignmentPreview = {
  status: 'PROFESSIONAL_REVIEW_REQUIRED' | 'HISTORICAL_BASELINE_NOT_FOUND'
  section: '2C'
  scope: { gradeRef: 'grade-2'; disciplineRef: 'technology'; framework: 'IN2012'; schoolYearRef: string }
  provenance: {
    sourceProduct: 'CURMANLIGHT_ARENA'
    sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1'
    institutionIdDeclared: string
    institutionIdentityVerified: false
    sourceVersion: '1.3'
    releaseStructuralFootprint: string
    curricoloVigente: false
  }
  canonical: {
    segmentId: string
    nodeCount: number
    obiettivi: string[]
    conoscenze: string[]
    evidenze: string[]
    competenze: string[]
  }
  legacy: null | {
    sourceHandoffFootprintHash: string
    alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
    acceptedAt: string
    requirements: Array<{ requirementId: string; description: string; review: 'TO_REVIEW' }>
  }
  proposal: { status: 'TO_BE_ASSESSED_BY_TEACHER'; text: string }
  authorization: {
    writeAllowed: false
    replacementAllowed: false
    teacherDecisionRecorded: false
    historicalPreparationPreserved: true
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`)
  return value.trim()
}

function words(value: unknown, label: string, required = true): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string' && item.trim())) {
    throw new Error(`canonical ${label} must be a non-empty string array`)
  }
  if (required && value.length === 0) throw new Error(`canonical ${label} is missing`)
  return value.map(item => (item as string).trim())
}

function normalizedYear(value: string): string {
  return value.replaceAll('/', '-').trim()
}

/**
 * Pure, read-only comparison of the previously accepted 2C teaching context
 * and an already validated detached Arena grade-2 segment.
 *
 * This function never decides semantic equivalence, verifies a workspace
 * institution, authorizes persistence or modifies the historical receipt.
 */
export function buildPilot2CCanonicalAlignmentPreview(input: {
  selected: unknown
  section: { grade: 'PRIMA' | 'SECONDA' | 'TERZA'; sectionCode: string; schoolYearRef: string }
  legacyBaseline: Pilot2CLegacyBaseline | null
}): Pilot2CCanonicalAlignmentPreview {
  if (input.section.grade !== 'SECONDA' || input.section.sectionCode.trim().toUpperCase() !== 'C') {
    throw new Error('canonical alignment is limited to the exact 2C pilot section')
  }
  if (normalizedYear(input.section.schoolYearRef) !== '2026-2027') {
    throw new Error('2C canonical alignment requires school year 2026-2027')
  }

  const selected = object(input.selected, 'validated Arena selection')
  if (selected.schoolOrder !== 'secondaria'
    || selected.gradeRef !== 'grade-2'
    || selected.disciplineRef !== 'technology') {
    throw new Error('canonical alignment accepts only Technology grade-2')
  }
  if (normalizedYear(nonEmpty(selected.schoolYearRef, 'Arena year')) !== normalizedYear(input.section.schoolYearRef)) {
    throw new Error('Arena school year differs from class year')
  }
  const version = object(selected.version, 'Arena version')
  if (version.versionNumber !== '1.3') throw new Error('Arena version must be 1.3')
  const provenance = object(selected.provenance, 'Arena provenance')
  if (provenance.sourceProduct !== 'CURMANLIGHT_ARENA'
    || provenance.sourceContract !== 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1') {
    throw new Error('unsupported Arena source contract')
  }
  const authority = object(selected.authority, 'Arena authority')
  if (authority.state !== 'PROVISIONAL_COMPLETE'
    || authority.alignmentAuthority !== 'PROVISIONAL_BASELINE'
    || authority.requiresRevalidationOnApproval !== true) {
    throw new Error('Arena authority must remain provisional')
  }
  const policy = object(selected.downstreamPolicy, 'Arena policy')
  if (policy.acceptanceRequired !== true || policy.automaticWriteAllowed !== false) {
    throw new Error('Arena downstream policy forbids automatic writes')
  }
  const footprint = object(selected.structuralFootprint, 'Arena footprint')
  const hash = nonEmpty(footprint.hash, 'Arena structural footprint')
  if (!/^[0-9a-f]{8}$/.test(hash)) throw new Error('invalid Arena structural footprint')

  const segment = object(selected.segment, 'Arena segment')
  const segmentId = nonEmpty(segment.id, 'Arena segment id')
  const scope = object(segment.scope, 'Arena segment scope')
  if (scope.type !== 'grade' || scope.grade !== '2'
    || segment.subjectOrFieldId !== 'tecnologia') {
    throw new Error('Arena selected segment is not Tecnologia class II')
  }
  const applicability = object(segment.frameworkApplicability, 'Arena framework applicability')
  if (applicability.framework !== 'IN2012' || applicability.resolutionStatus !== 'resolved') {
    throw new Error('2C must be linked to resolved IN2012 framework')
  }
  const content = object(segment.content, 'Arena content')
  const obiettivi = words(content.obiettivi, 'obiettivi')
  const conoscenze = words(content.conoscenze, 'conoscenze')
  const evidenze = words(content.evidenze, 'evidenze')
  const competenze = words(content.competenze ?? [], 'competenze', false)

  if (!Array.isArray(selected.nodes)
    || selected.nodes.length === 0
    || selected.nodes.some(node => object(node, 'Arena node').segmentId !== segmentId)) {
    throw new Error('2C Arena selection must have nodes belonging to the same segment')
  }

  let legacy: Pilot2CCanonicalAlignmentPreview['legacy'] = null
  if (input.legacyBaseline !== null) {
    const old = input.legacyBaseline
    const sourceHandoffFootprintHash = nonEmpty(old.sourceHandoffFootprintHash, 'historic footprint')
    if (!/^[0-9a-f]{8}$/.test(sourceHandoffFootprintHash)) {
      throw new Error('historic footprint has an invalid format')
    }
    if (old.alignmentAuthority !== 'PROVISIONAL_BASELINE' && old.alignmentAuthority !== 'APPROVED_INSTITUTIONAL') {
      throw new Error('unsupported historic authority state')
    }
    const acceptedAt = nonEmpty(old.acceptedAt, 'historic acceptance timestamp')
    if (Number.isNaN(Date.parse(acceptedAt))) throw new Error('invalid historic acceptance timestamp')
    if (!Array.isArray(old.requirements)) throw new Error('historic requirements are required')
    legacy = {
      sourceHandoffFootprintHash,
      alignmentAuthority: old.alignmentAuthority,
      acceptedAt,
      requirements: old.requirements.map((row, i) => ({
        requirementId: nonEmpty(row.requirementId, `historic requirement ${i} id`),
        description: nonEmpty(row.description, `historic requirement ${i} description`),
        review: 'TO_REVIEW' as const,
      })),
    }
  }

  return {
    status: legacy ? 'PROFESSIONAL_REVIEW_REQUIRED' : 'HISTORICAL_BASELINE_NOT_FOUND',
    section: '2C',
    scope: {
      gradeRef: 'grade-2',
      disciplineRef: 'technology',
      framework: 'IN2012',
      schoolYearRef: input.section.schoolYearRef,
    },
    provenance: {
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
      institutionIdDeclared: nonEmpty(selected.institutionId, 'Arena declared institution'),
      institutionIdentityVerified: false,
      sourceVersion: '1.3',
      releaseStructuralFootprint: hash,
      curricoloVigente: false,
    },
    canonical: { segmentId, nodeCount: selected.nodes.length, obiettivi, conoscenze, evidenze, competenze },
    legacy,
    proposal: {
      status: 'TO_BE_ASSESSED_BY_TEACHER',
      text: 'L’attività Agricoltura come sistema tecnologico può essere confrontata con i riferimenti a filiere, processi produttivi e territorio; la corrispondenza didattica richiede la verifica del docente.',
    },
    authorization: {
      writeAllowed: false,
      replacementAllowed: false,
      teacherDecisionRecorded: false,
      historicalPreparationPreserved: true,
    },
  }
}
