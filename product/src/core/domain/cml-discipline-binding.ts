import type { AnnualPlanTargetScope } from './cml-curriculum-applicability'
import type { CurriculumContextForClassV1 } from './cml-local-handoff-v2'

export const ECO02_PILOT_UPLOAD_MAX_BYTES = 500_000

export type Eco02PilotIdentity = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
}

export function bindArenaDisciplineRefToDocenteOs(source: string): string {
  const value = source.trim()
  if (!value) throw new Error('Curriculum disciplineRef is required')
  if (value.toLocaleLowerCase('it') === 'tecnologia' || value.toLowerCase() === 'technology') {
    return 'technology'
  }
  return value
}

export function isEco02PilotClass(
  input: Eco02PilotIdentity,
  authorized: Eco02PilotIdentity | null,
): boolean {
  if (!authorized) return false
  return input.workspaceId === authorized.workspaceId
    && input.academicYearId === authorized.academicYearId
    && input.sectionId === authorized.sectionId
    && input.grade === authorized.grade
    && input.sectionCode.trim().toUpperCase() === authorized.sectionCode.trim().toUpperCase()
}

export function assertEco02PilotCurriculumIntakeScope(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
  disciplineRef: string
}, authorized: Eco02PilotIdentity | null): void {
  if (!isEco02PilotClass(input, authorized)) {
    throw new Error('ECO-02 curriculum intake is limited to the explicitly authorized Technology 2C pilot identity')
  }
  if (bindArenaDisciplineRefToDocenteOs(input.disciplineRef) !== 'technology') {
    throw new Error('ECO-02 curriculum intake accepts only Technology handoffs')
  }
}

export function hasUploadedArenaAuthorityClaim(
  context: CurriculumContextForClassV1,
): boolean {
  const remodulation = context.transitionRemodulation
  return context.curriculumState === 'APPROVED'
    || context.approvalDecisionRef !== undefined
    || remodulation.state === 'APPROVED'
    || remodulation.institutionallyApproved
    || remodulation.approvalDecisionRef !== undefined
}

export function assertUploadedArenaAuthorityContextAllowed(
  context: CurriculumContextForClassV1,
): void {
  if (hasUploadedArenaAuthorityClaim(context)) {
    throw new Error('local Arena upload cannot establish institutional approval authority')
  }
}

export function buildArenaCurriculumTargetScope(input: {
  context: CurriculumContextForClassV1
  localSectionRef: string
}): AnnualPlanTargetScope {
  const target: AnnualPlanTargetScope = {
    schoolYearRef: input.context.schoolYearRef,
    disciplineRef: input.context.disciplineRef,
    gradeRef: input.context.gradeRef,
  }

  if (input.context.sectionRef) target.sectionRef = input.localSectionRef
  if (input.context.cohortRef) target.cohortRef = input.context.cohortRef

  return target
}

type ArenaVerticalCurricoloTarget = {
  institutionId: string
  schoolYearRef: string
  schoolOrder: 'secondaria'
  gradeRef: 'grade-1' | 'grade-2' | 'grade-3'
  disciplineRef: string
}

type ArenaVerticalCurricoloSlice = {
  institutionId: string
  schoolYearRef: string
  schoolOrder: 'secondaria'
  gradeRef: ArenaVerticalCurricoloTarget['gradeRef']
  disciplineRef: string
  version: { id: string; versionNumber: string }
  structuralFootprint: {
    algorithm: 'fnv1a'
    version: 1
    hash: string
    computedAt: string
  }
  provenance: {
    sourceProduct: 'CURMANLIGHT_ARENA'
    sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1'
    issuedAt: string
  }
  authority: {
    state: 'PROVISIONAL_COMPLETE'
    alignmentAuthority: 'PROVISIONAL_BASELINE'
    requiresRevalidationOnApproval: true
  }
  downstreamPolicy: {
    acceptanceRequired: true
    automaticWriteAllowed: false
  }
  segment: Record<string, unknown> & { id: string; subjectOrFieldId: string }
  nodes: Array<Record<string, unknown> & { id: string; segmentId: string }>
}

function arenaRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} rejected: expected object`)
  }
  return value as Record<string, unknown>
}

function arenaString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} rejected: expected non-empty string`)
  }
  return value.trim()
}

function arenaArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} rejected: expected array`)
  return value
}

function normalizedSchoolYear(value: string): string {
  return value.trim().replace('/', '-')
}

function gradeNumber(gradeRef: ArenaVerticalCurricoloTarget['gradeRef']): string {
  if (gradeRef === 'grade-1') return '1'
  if (gradeRef === 'grade-2') return '2'
  if (gradeRef === 'grade-3') return '3'
  throw new Error('unsupported gradeRef for Arena curricolo intake')
}

export function selectArenaVerticalCurricoloSlice(input: {
  release: unknown
  target: ArenaVerticalCurricoloTarget
}): ArenaVerticalCurricoloSlice {
  const release = arenaRecord(input.release, 'Arena release')
  if (release.contract !== 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1' || release.contractVersion !== 1) {
    throw new Error('Arena release rejected: unsupported contract')
  }

  const institutionId = arenaString(release.institutionId, 'Arena institutionId')
  if (institutionId !== input.target.institutionId) {
    throw new Error('Arena institution does not match target')
  }

  const schoolYearRef = arenaString(release.schoolYearRef, 'Arena schoolYearRef')
  if (normalizedSchoolYear(schoolYearRef) !== normalizedSchoolYear(input.target.schoolYearRef)) {
    throw new Error('Arena school year does not match target')
  }
  if (input.target.schoolOrder !== 'secondaria') {
    throw new Error('unsupported school order for Arena curricolo intake')
  }

  const requestedGrade = gradeNumber(input.target.gradeRef)
  const requestedDiscipline = bindArenaDisciplineRefToDocenteOs(input.target.disciplineRef)

  const manifest = arenaRecord(release.manifest, 'Arena manifest')
  if (manifest.coverageStatus !== 'SATISFIED') {
    throw new Error('Arena manifest incomplete: release rejected')
  }

  const releaseAuthority = arenaRecord(release.authority, 'Arena authority')
  if (releaseAuthority.state !== 'PROVISIONAL_COMPLETE'
    || releaseAuthority.requiresRevalidationOnApproval !== true) {
    throw new Error('Arena authority rejected: intake requires provisional authority')
  }

  const downstreamPolicy = arenaRecord(release.downstreamPolicy, 'Arena downstream policy')
  if (downstreamPolicy.acceptanceRequired !== true || downstreamPolicy.automaticWriteAllowed !== false) {
    throw new Error('Arena downstream policy rejected: automatic write is not allowed')
  }

  const version = arenaRecord(release.version, 'Arena version')
  const versionId = arenaString(version.id, 'Arena version id')
  const versionNumber = arenaString(version.versionNumber, 'Arena version number')
  if (version.institutionId !== undefined && version.institutionId !== institutionId) {
    throw new Error('Arena version rejected: institution does not match release')
  }

  const footprint = arenaRecord(release.structuralFootprint, 'Arena structural footprint')
  const footprintHash = arenaString(footprint.hash, 'Arena structural footprint hash')
  const footprintComputedAt = arenaString(footprint.computedAt, 'Arena structural footprint computedAt')
  if (footprint.algorithm !== 'fnv1a' || footprint.version !== 1) {
    throw new Error('Arena structural footprint rejected: unsupported fingerprint format')
  }

  const segments = arenaArray(release.segments, 'Arena segments')
  const matchingSegments = segments.map((value) => arenaRecord(value, 'Arena segment')).filter((segment) => {
    if (segment.schoolLevel !== 'secondaria') return false
    const subjectOrFieldId = typeof segment.subjectOrFieldId === 'string' ? segment.subjectOrFieldId : ''
    if (bindArenaDisciplineRefToDocenteOs(subjectOrFieldId) !== requestedDiscipline) return false
    const scope = arenaRecord(segment.scope, 'Arena segment scope')
    return scope.type === 'grade-range'
      && Array.isArray(scope.grades)
      && scope.grades.includes(requestedGrade)
  })

  if (matchingSegments.length !== 1) {
    throw new Error('no applicable unique Arena curricolo segment for target')
  }

  const selectedSegment = matchingSegments[0]
  if (selectedSegment.versionId !== versionId) {
    throw new Error('Arena segment version rejected: does not match release version')
  }
  const segmentId = arenaString(selectedSegment.id, 'Arena segment id')
  const subjectOrFieldId = arenaString(selectedSegment.subjectOrFieldId, 'Arena segment discipline')

  const nodes = arenaArray(release.nodes, 'Arena nodes')
    .map((value) => arenaRecord(value, 'Arena node'))
    .filter((node) => node.segmentId === segmentId)
  if (nodes.length === 0) throw new Error('no applicable Arena curricolo nodes for target')

  for (const node of nodes) {
    if (node.versionId !== versionId) {
      throw new Error('Arena node version rejected: does not match release version')
    }
    arenaString(node.id, 'Arena node id')
  }

  const issuedAt = arenaString(release.issuedAt, 'Arena issuedAt')

  return {
    institutionId,
    schoolYearRef,
    schoolOrder: 'secondaria',
    gradeRef: input.target.gradeRef,
    disciplineRef: requestedDiscipline,
    version: { id: versionId, versionNumber },
    structuralFootprint: {
      algorithm: 'fnv1a',
      version: 1,
      hash: footprintHash,
      computedAt: footprintComputedAt,
    },
    provenance: {
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
      issuedAt,
    },
    authority: {
      state: 'PROVISIONAL_COMPLETE',
      alignmentAuthority: 'PROVISIONAL_BASELINE',
      requiresRevalidationOnApproval: true,
    },
    downstreamPolicy: {
      acceptanceRequired: true,
      automaticWriteAllowed: false,
    },
    segment: { ...selectedSegment, id: segmentId, subjectOrFieldId },
    nodes: nodes.map((node) => ({
      ...node,
      id: arenaString(node.id, 'Arena node id'),
      segmentId,
    })),
  }
}
