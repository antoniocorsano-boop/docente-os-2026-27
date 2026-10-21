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

type ArenaCurricoloScope =
  | { type: 'grade'; grade: string }
  | { type: 'grade-range'; grades: string[] }
  | { type: 'school-level' }

type ArenaExpectedScope = {
  schoolOrder: string
  scope: ArenaCurricoloScope
  domainId: string
  domainKind: string
}

function arenaRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} rejected: expected object`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} rejected: Arena release material must be a plain JSON object with no custom prototype`)
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

function arenaScope(value: unknown, label: string): ArenaCurricoloScope {
  const scope = arenaRecord(value, label)
  if (scope.type === 'school-level') return { type: 'school-level' }
  if (scope.type === 'grade') {
    return { type: 'grade', grade: arenaString(scope.grade, `${label} grade`) }
  }
  if (scope.type === 'grade-range') {
    const grades = arenaArray(scope.grades, `${label} grades`).map((grade) => arenaString(grade, `${label} grade`))
    if (grades.length === 0) throw new Error(`${label} rejected: grade-range cannot be empty`)
    return { type: 'grade-range', grades: grades.sort((left, right) => Number(left) - Number(right)) }
  }
  throw new Error(`${label} rejected: unsupported scope type`)
}

function arenaScopeIncludesGrade(scope: ArenaCurricoloScope, grade: string): boolean {
  if (scope.type === 'school-level') return true
  if (scope.type === 'grade') return scope.grade === grade
  return scope.grades.includes(grade)
}

function canonicalizeArena(value: unknown): unknown {
  if (value === undefined) throw new Error('Arena release material cannot contain undefined values')
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) return value.map(canonicalizeArena)
  if (typeof value === 'object') {
    const sorted = Object.create(null) as Record<string, unknown>
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalizeArena((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  throw new Error(`Arena release material cannot canonicalize ${typeof value}`)
}

function canonicalSerializeArena(value: unknown): string {
  return JSON.stringify(canonicalizeArena(value))
}

function arenaFnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function normalizedExpectedScope(value: unknown, label: string): ArenaExpectedScope {
  const entry = arenaRecord(value, label)
  const schoolOrder = arenaString(entry.schoolOrder, `${label} schoolOrder`)
  const domainId = arenaString(entry.domainId, `${label} domainId`)
  const domainKind = arenaString(entry.domainKind, `${label} domainKind`)
  if (!['infanzia', 'primaria', 'secondaria'].includes(schoolOrder)) {
    throw new Error(`${label} rejected: unsupported school order`)
  }
  if (!['DISCIPLINA', 'CAMPO_ESPERIENZA', 'PERCORSO_CURRICOLARE', 'AMBITO_TRASVERSALE'].includes(domainKind)) {
    throw new Error(`${label} rejected: unsupported domain kind`)
  }
  return {
    schoolOrder,
    scope: arenaScope(entry.scope, `${label} scope`),
    domainId,
    domainKind,
  }
}

function expectedScopeKey(value: ArenaExpectedScope): string {
  return canonicalSerializeArena({
    schoolOrder: value.schoolOrder,
    domainId: value.domainId,
    domainKind: value.domainKind,
    scope: value.scope,
  })
}

function expectedSegmentKey(value: ArenaExpectedScope): string {
  return canonicalSerializeArena({
    schoolOrder: value.schoolOrder,
    domainId: value.domainId,
    scope: value.scope,
  })
}

function segmentScopeKey(segment: Record<string, unknown>): string {
  return canonicalSerializeArena({
    schoolOrder: arenaString(segment.schoolLevel, 'Arena segment schoolLevel'),
    domainId: arenaString(segment.subjectOrFieldId, 'Arena segment discipline'),
    scope: arenaScope(segment.scope, 'Arena segment scope'),
  })
}

function sortedUniqueExpected(values: ArenaExpectedScope[]): ArenaExpectedScope[] {
  const unique = new Map<string, ArenaExpectedScope>()
  for (const value of values) unique.set(expectedScopeKey(value), value)
  return [...unique.values()].sort((left, right) => expectedScopeKey(left).localeCompare(expectedScopeKey(right)))
}

function assertNoCrossKindCoverageCollisions(values: ArenaExpectedScope[]): void {
  const domainKindsBySegmentKey = new Map<string, string>()
  for (const value of values) {
    const segmentKey = expectedSegmentKey(value)
    const existingDomainKind = domainKindsBySegmentKey.get(segmentKey)
    if (existingDomainKind !== undefined && existingDomainKind !== value.domainKind) {
      throw new Error('Arena manifest rejected: coverage identity collides across domain kinds')
    }
    domainKindsBySegmentKey.set(segmentKey, value.domainKind)
  }
}

function rebuildArenaManifest(release: Record<string, unknown>, segments: Record<string, unknown>[]): Record<string, unknown> {
  const perimeter = arenaRecord(release.perimeter, 'Arena perimeter')
  const expected = sortedUniqueExpected(
    arenaArray(perimeter.expected, 'Arena expected perimeter')
      .map((value, index) => normalizedExpectedScope(value, `Arena expected perimeter ${index}`)),
  )
  const intentionallyNotApplicable = sortedUniqueExpected(
    arenaArray(perimeter.intentionallyNotApplicable, 'Arena intentionally not applicable perimeter')
      .map((value, index) => normalizedExpectedScope(value, `Arena intentionally not applicable perimeter ${index}`)),
  )
  if (expected.length + intentionallyNotApplicable.length === 0) {
    throw new Error('Arena manifest rejected: perimeter is empty')
  }

  assertNoCrossKindCoverageCollisions(expected)

  const expectedKeys = new Set(expected.map(expectedScopeKey))
  if (intentionallyNotApplicable.some((item) => expectedKeys.has(expectedScopeKey(item)))) {
    throw new Error('Arena manifest rejected: expected perimeter overlaps intentionally not applicable perimeter')
  }

  const presentSegmentKeys = new Set(segments.map(segmentScopeKey))
  const notApplicableKeys = new Set(intentionallyNotApplicable.map(expectedScopeKey))
  const present = expected.filter((item) => presentSegmentKeys.has(expectedSegmentKey(item)))
  const missing = expected.filter((item) => (
    !presentSegmentKeys.has(expectedSegmentKey(item)) && !notApplicableKeys.has(expectedScopeKey(item))
  ))
  const orderRank: Record<string, number> = { infanzia: 0, primaria: 1, secondaria: 2 }
  const schoolOrders = [...new Set([...expected, ...intentionallyNotApplicable].map((item) => item.schoolOrder))]
    .sort((left, right) => orderRank[left] - orderRank[right])

  return {
    coverageStatus: missing.length === 0 && segments.length > 0 ? 'SATISFIED' : 'INCOMPLETE',
    schoolOrders,
    expected,
    present,
    missing,
    intentionallyNotApplicable,
  }
}

function assertArenaManifestMatches(release: Record<string, unknown>, segments: Record<string, unknown>[]): void {
  const manifest = arenaRecord(release.manifest, 'Arena manifest')
  const rebuilt = rebuildArenaManifest(release, segments)
  if (canonicalSerializeArena(rebuilt) !== canonicalSerializeArena(manifest)) {
    throw new Error('Arena manifest rejected: coverage does not match actual segments and perimeter')
  }
  if (rebuilt.coverageStatus !== 'SATISFIED') {
    throw new Error('Arena manifest incomplete: release rejected')
  }
}

function assertArenaSegmentsMatchReleaseVersion(
  segments: Record<string, unknown>[],
  versionId: string,
): Set<string> {
  const segmentIds = new Set<string>()
  for (const segment of segments) {
    const segmentId = arenaString(segment.id, 'Arena segment id')
    if (segmentIds.has(segmentId)) {
      throw new Error('Arena segment rejected: duplicate segment id')
    }
    segmentIds.add(segmentId)
    if (segment.versionId !== versionId) {
      throw new Error('Arena segment version rejected: does not match release version')
    }
  }
  return segmentIds
}

function assertArenaNodesMatchReleaseVersion(
  nodes: Record<string, unknown>[],
  versionId: string,
  segmentIds: Set<string>,
): Set<string> {
  const nodeIds = new Set<string>()
  for (const node of nodes) {
    const nodeId = arenaString(node.id, 'Arena node id')
    if (nodeIds.has(nodeId)) {
      throw new Error('Arena node rejected: duplicate node id')
    }
    nodeIds.add(nodeId)
    if (node.versionId !== versionId) {
      throw new Error('Arena node version rejected: does not match release version')
    }
    const segmentId = arenaString(node.segmentId, 'Arena node segment id')
    if (!segmentIds.has(segmentId)) {
      throw new Error('Arena node segment reference rejected: segment id is not present in release')
    }
  }
  return nodeIds
}

function assertArenaVerticalLinksReferenceNodes(
  value: unknown,
  versionId: string,
  nodeIds: Set<string>,
): void {
  const verticalLinks = arenaArray(value, 'Arena verticalLinks')
  const linkIds = new Set<string>()
  for (const [index, linkValue] of verticalLinks.entries()) {
    const link = arenaRecord(linkValue, `Arena vertical link ${index}`)
    const linkId = arenaString(link.id, `Arena vertical link ${index} id`)
    if (linkIds.has(linkId)) {
      throw new Error('Arena vertical link rejected: duplicate vertical link id')
    }
    linkIds.add(linkId)
    if (link.versionId !== versionId) {
      throw new Error('Arena vertical link version rejected: does not match release version')
    }
    const sourceNodeId = arenaString(link.sourceNodeId, `Arena vertical link ${index} sourceNodeId`)
    const targetNodeId = arenaString(link.targetNodeId, `Arena vertical link ${index} targetNodeId`)
    if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) {
      throw new Error('Arena vertical link rejected: endpoint references node outside release')
    }
  }
}

function assertArenaStructuralFootprintMatches(release: Record<string, unknown>): {
  hash: string
  computedAt: string
} {
  const footprint = arenaRecord(release.structuralFootprint, 'Arena structural footprint')
  const footprintHash = arenaString(footprint.hash, 'Arena structural footprint hash')
  const footprintComputedAt = arenaString(footprint.computedAt, 'Arena structural footprint computedAt')
  if (footprint.algorithm !== 'fnv1a' || footprint.version !== 1) {
    throw new Error('Arena structural footprint rejected: unsupported fingerprint format')
  }

  const { structuralFootprint: _footprint, issuedAt: _issuedAt, ...stable } = release
  const recomputedHash = arenaFnv1a(canonicalSerializeArena(stable))
  if (recomputedHash !== footprintHash) {
    throw new Error('Arena structural footprint rejected: footprint does not match release material')
  }
  return { hash: footprintHash, computedAt: footprintComputedAt }
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
  const version = arenaRecord(release.version, 'Arena version')
  const versionId = arenaString(version.id, 'Arena version id')
  const versionNumber = arenaString(version.versionNumber, 'Arena version number')
  if (version.institutionId !== undefined && version.institutionId !== institutionId) {
    throw new Error('Arena version rejected: institution does not match release')
  }

  const segments = arenaArray(release.segments, 'Arena segments')
    .map((value) => arenaRecord(value, 'Arena segment'))
  const allNodes = arenaArray(release.nodes, 'Arena nodes')
    .map((value) => arenaRecord(value, 'Arena node'))

  assertArenaStructuralFootprintMatches(release)
  const segmentIds = assertArenaSegmentsMatchReleaseVersion(segments, versionId)
  const nodeIds = assertArenaNodesMatchReleaseVersion(allNodes, versionId, segmentIds)
  assertArenaVerticalLinksReferenceNodes(release.verticalLinks, versionId, nodeIds)
  assertArenaManifestMatches(release, segments)

  const perimeter = arenaRecord(release.perimeter, 'Arena perimeter')
  const matchingPerimeter = arenaArray(perimeter.expected, 'Arena expected perimeter')
    .map((value, index) => normalizedExpectedScope(value, `Arena perimeter entry ${index}`))
    .filter((entry) => {
      if (entry.schoolOrder !== 'secondaria' || entry.domainKind !== 'DISCIPLINA') return false
      if (bindArenaDisciplineRefToDocenteOs(entry.domainId) !== requestedDiscipline) return false
      return arenaScopeIncludesGrade(entry.scope, requestedGrade)
    })
  if (matchingPerimeter.length !== 1) {
    throw new Error('no applicable unique Arena curricolo perimeter entry for target')
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

  const footprint = arenaRecord(release.structuralFootprint, 'Arena structural footprint')
  const footprintHash = arenaString(footprint.hash, 'Arena structural footprint hash')
  const footprintComputedAt = arenaString(footprint.computedAt, 'Arena structural footprint computedAt')

  const matchingSegments = segments.filter((segment) => {
    if (segment.schoolLevel !== 'secondaria') return false
    const subjectOrFieldId = typeof segment.subjectOrFieldId === 'string' ? segment.subjectOrFieldId : ''
    if (bindArenaDisciplineRefToDocenteOs(subjectOrFieldId) !== requestedDiscipline) return false
    const scope = arenaScope(segment.scope, 'Arena segment scope')
    return arenaScopeIncludesGrade(scope, requestedGrade)
  })

  if (matchingSegments.length !== 1) {
    throw new Error('no applicable unique Arena curricolo segment for target')
  }

  const selectedSegment = matchingSegments[0]
  const segmentId = arenaString(selectedSegment.id, 'Arena segment id')
  const subjectOrFieldId = arenaString(selectedSegment.subjectOrFieldId, 'Arena segment discipline')

  const matchingNodes = allNodes.filter((node) => node.segmentId === segmentId)
  if (matchingNodes.length === 0) throw new Error('no applicable Arena curricolo nodes for target')

  const issuedAt = arenaString(release.issuedAt, 'Arena issuedAt')
  const detachedSegment = structuredClone(selectedSegment) as Record<string, unknown>

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
    segment: { ...detachedSegment, id: segmentId, subjectOrFieldId },
    nodes: matchingNodes.map((node) => ({
      ...(structuredClone(node) as Record<string, unknown>),
      id: arenaString(node.id, 'Arena node id'),
      segmentId,
    })),
  }
}
