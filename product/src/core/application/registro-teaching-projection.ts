import { createHash } from 'node:crypto'

export const REGISTRO_TEACHING_PROJECTION_CONTRACT = 'DOCENTE_OS_REGISTRO_TEACHING_PROJECTION_V1' as const

export type RegistroTeachingProjectionGrade = 1 | 2 | 3
export type RegistroTeachingProjectionSectionStatus = 'PROVVISORIA' | 'DA_CONFERMARE' | 'CONFERMATA'

export type RegistroTeachingProjectionUdaV1 = {
  sourceUdaRef: string
  projectedUdaId: string
  title: string
  focus: string
  plannedHours: number
  period: string
  packRefs: string[]
  canonicalGenerationId: string
}

export type RegistroTeachingProjectionClassV1 = {
  sourceSectionId: string
  grade: RegistroTeachingProjectionGrade
  sectionCode: string
  compactLabel: string
  displayLabel: string
  sectionStatus: RegistroTeachingProjectionSectionStatus
  canonicalPlan: {
    code: string
    assetId: string
    generationId: string
  }
  udas: RegistroTeachingProjectionUdaV1[]
}

export type RegistroTeachingProjectionV1 = {
  contract: typeof REGISTRO_TEACHING_PROJECTION_CONTRACT
  contractVersion: 1
  sourceProduct: 'DOCENTE_OS'
  targetProduct: 'REGISTRO_DOCENTE'
  importMode: 'READ_ONLY_PROJECTION'
  acceptanceRequired: true
  automaticWriteAllowed: false
  schoolYear: string
  disciplineName: string
  generatedAt: string
  projectionFingerprint: {
    algorithm: 'SHA-256'
    hash: string
  }
  provenance: {
    repository: 'antoniocorsano-boop/docente-os-2026-27'
    sourceCommit: string
    sourceBranch: string
  }
  classes: RegistroTeachingProjectionClassV1[]
  privacyClass: 'PROFESSIONAL_NON_PERSONAL'
}

export type BuildRegistroTeachingProjectionInput = {
  schoolYear: string
  disciplineName: string
  generatedAt: string
  provenance: {
    sourceCommit: string
    sourceBranch: string
  }
  classes: Array<{
    sourceSectionId: string
    grade: RegistroTeachingProjectionGrade
    sectionCode: string
    compactLabel: string
    displayLabel: string
    sectionStatus: RegistroTeachingProjectionSectionStatus
    canonicalPlan: {
      code: string
      assetId: string
      generationId: string
    }
    udas: Array<{
      sourceUdaRef: string
      title: string
      focus: string
      plannedHours: number
      period: string
      packRefs: string[]
    }>
  }>
}

export type RegistroTeachingProjectionValidationResult =
  | { ok: true; value: RegistroTeachingProjectionV1 }
  | { ok: false; code: string; message: string }

const ROOT_KEYS = [
  'contract',
  'contractVersion',
  'sourceProduct',
  'targetProduct',
  'importMode',
  'acceptanceRequired',
  'automaticWriteAllowed',
  'schoolYear',
  'disciplineName',
  'generatedAt',
  'projectionFingerprint',
  'provenance',
  'classes',
  'privacyClass',
] as const

const FINGERPRINT_KEYS = ['algorithm', 'hash'] as const
const PROVENANCE_KEYS = ['repository', 'sourceCommit', 'sourceBranch'] as const
const CLASS_KEYS = [
  'sourceSectionId',
  'grade',
  'sectionCode',
  'compactLabel',
  'displayLabel',
  'sectionStatus',
  'canonicalPlan',
  'udas',
] as const
const PLAN_KEYS = ['code', 'assetId', 'generationId'] as const
const UDA_KEYS = [
  'sourceUdaRef',
  'projectedUdaId',
  'title',
  'focus',
  'plannedHours',
  'period',
  'packRefs',
  'canonicalGenerationId',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index])
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function fingerprintPayload(projection: Omit<RegistroTeachingProjectionV1, 'projectionFingerprint'>) {
  const { generatedAt: _generatedAt, ...stable } = projection
  return stable
}

export function computeRegistroTeachingProjectionFingerprint(
  projection: Omit<RegistroTeachingProjectionV1, 'projectionFingerprint'>,
): string {
  return createHash('sha256').update(stableJson(fingerprintPayload(projection))).digest('hex')
}

export function buildRegistroTeachingProjection(
  input: BuildRegistroTeachingProjectionInput,
): RegistroTeachingProjectionV1 {
  const withoutFingerprint: Omit<RegistroTeachingProjectionV1, 'projectionFingerprint'> = {
    contract: REGISTRO_TEACHING_PROJECTION_CONTRACT,
    contractVersion: 1,
    sourceProduct: 'DOCENTE_OS',
    targetProduct: 'REGISTRO_DOCENTE',
    importMode: 'READ_ONLY_PROJECTION',
    acceptanceRequired: true,
    automaticWriteAllowed: false,
    schoolYear: input.schoolYear,
    disciplineName: input.disciplineName,
    generatedAt: input.generatedAt,
    provenance: {
      repository: 'antoniocorsano-boop/docente-os-2026-27',
      sourceCommit: input.provenance.sourceCommit,
      sourceBranch: input.provenance.sourceBranch,
    },
    classes: input.classes.map((section) => ({
      sourceSectionId: section.sourceSectionId,
      grade: section.grade,
      sectionCode: section.sectionCode,
      compactLabel: section.compactLabel,
      displayLabel: section.displayLabel,
      sectionStatus: section.sectionStatus,
      canonicalPlan: { ...section.canonicalPlan },
      udas: section.udas.map((uda) => ({
        sourceUdaRef: uda.sourceUdaRef,
        projectedUdaId: `docente-os:${section.sourceSectionId}:${section.canonicalPlan.generationId}:${uda.sourceUdaRef}`,
        title: uda.title,
        focus: uda.focus,
        plannedHours: uda.plannedHours,
        period: uda.period,
        packRefs: [...uda.packRefs],
        canonicalGenerationId: section.canonicalPlan.generationId,
      })),
    })),
    privacyClass: 'PROFESSIONAL_NON_PERSONAL',
  }

  return {
    ...withoutFingerprint,
    projectionFingerprint: {
      algorithm: 'SHA-256',
      hash: computeRegistroTeachingProjectionFingerprint(withoutFingerprint),
    },
  }
}

function invalid(code: string, message: string): RegistroTeachingProjectionValidationResult {
  return { ok: false, code, message }
}

export function validateRegistroTeachingProjection(input: unknown): RegistroTeachingProjectionValidationResult {
  if (!isRecord(input) || !hasExactKeys(input, ROOT_KEYS)) {
    return invalid('INVALID_ROOT_SHAPE', 'Projection root must contain exactly the v1 contract properties.')
  }
  if (input.contract !== REGISTRO_TEACHING_PROJECTION_CONTRACT || input.contractVersion !== 1) {
    return invalid('INVALID_CONTRACT', 'Unsupported Registro teaching projection contract.')
  }
  if (input.sourceProduct !== 'DOCENTE_OS' || input.targetProduct !== 'REGISTRO_DOCENTE') {
    return invalid('INVALID_PRODUCT_BOUNDARY', 'Projection product boundary is invalid.')
  }
  if (input.importMode !== 'READ_ONLY_PROJECTION' || input.acceptanceRequired !== true || input.automaticWriteAllowed !== false) {
    return invalid('INVALID_AUTHORITY_BOUNDARY', 'Projection must remain explicit, read-only and non-automatic.')
  }
  if (input.privacyClass !== 'PROFESSIONAL_NON_PERSONAL') {
    return invalid('INVALID_PRIVACY_CLASS', 'Projection must be professional and non-personal.')
  }
  if (!isNonEmptyString(input.schoolYear) || !isNonEmptyString(input.disciplineName) || !isNonEmptyString(input.generatedAt)) {
    return invalid('INVALID_METADATA', 'Projection metadata is incomplete.')
  }

  if (!isRecord(input.projectionFingerprint) || !hasExactKeys(input.projectionFingerprint, FINGERPRINT_KEYS)) {
    return invalid('INVALID_FINGERPRINT', 'Projection fingerprint shape is invalid.')
  }
  if (input.projectionFingerprint.algorithm !== 'SHA-256' || typeof input.projectionFingerprint.hash !== 'string' || !/^[0-9a-f]{64}$/.test(input.projectionFingerprint.hash)) {
    return invalid('INVALID_FINGERPRINT', 'Projection fingerprint must be a lower-case SHA-256 hex digest.')
  }

  if (!isRecord(input.provenance) || !hasExactKeys(input.provenance, PROVENANCE_KEYS)) {
    return invalid('INVALID_PROVENANCE', 'Projection provenance shape is invalid.')
  }
  if (
    input.provenance.repository !== 'antoniocorsano-boop/docente-os-2026-27' ||
    typeof input.provenance.sourceCommit !== 'string' ||
    !/^[0-9a-f]{40}$/.test(input.provenance.sourceCommit) ||
    !isNonEmptyString(input.provenance.sourceBranch)
  ) {
    return invalid('INVALID_PROVENANCE', 'Projection provenance is invalid.')
  }

  if (!Array.isArray(input.classes)) return invalid('INVALID_CLASSES', 'Projection classes must be an array.')
  const sourceSectionIds = new Set<string>()
  const projectedUdaIds = new Set<string>()

  for (const section of input.classes) {
    if (!isRecord(section) || !hasExactKeys(section, CLASS_KEYS)) {
      return invalid('INVALID_CLASS_SHAPE', 'Projected class contains unexpected or missing properties.')
    }
    if (!isNonEmptyString(section.sourceSectionId)) return invalid('INVALID_CLASS', 'Projected class source id is required.')
    if (sourceSectionIds.has(section.sourceSectionId)) {
      return invalid('DUPLICATE_SOURCE_SECTION_ID', 'Projected class source ids must be unique.')
    }
    sourceSectionIds.add(section.sourceSectionId)
    if (section.grade !== 1 && section.grade !== 2 && section.grade !== 3) return invalid('INVALID_CLASS', 'Projected class grade is invalid.')
    if (!isNonEmptyString(section.sectionCode) || !isNonEmptyString(section.compactLabel) || !isNonEmptyString(section.displayLabel)) {
      return invalid('INVALID_CLASS', 'Projected class labels are incomplete.')
    }
    if (section.sectionStatus !== 'PROVVISORIA' && section.sectionStatus !== 'DA_CONFERMARE' && section.sectionStatus !== 'CONFERMATA') {
      return invalid('INVALID_CLASS', 'Projected class status is invalid.')
    }
    if (!isRecord(section.canonicalPlan) || !hasExactKeys(section.canonicalPlan, PLAN_KEYS)) {
      return invalid('INVALID_CANONICAL_PLAN', 'Canonical plan identity is invalid.')
    }
    if (!isNonEmptyString(section.canonicalPlan.code) || !isNonEmptyString(section.canonicalPlan.assetId) || !isNonEmptyString(section.canonicalPlan.generationId)) {
      return invalid('INVALID_CANONICAL_PLAN', 'Canonical plan identity is incomplete.')
    }
    if (!Array.isArray(section.udas)) return invalid('INVALID_UDAS', 'Projected UDAs must be an array.')

    for (const uda of section.udas) {
      if (!isRecord(uda) || !hasExactKeys(uda, UDA_KEYS)) {
        return invalid('INVALID_UDA_SHAPE', 'Projected UDA contains unexpected or missing properties.')
      }
      if (
        !isNonEmptyString(uda.sourceUdaRef) ||
        !isNonEmptyString(uda.projectedUdaId) ||
        !isNonEmptyString(uda.title) ||
        !isNonEmptyString(uda.focus) ||
        typeof uda.plannedHours !== 'number' ||
        !Number.isFinite(uda.plannedHours) ||
        uda.plannedHours <= 0 ||
        !isNonEmptyString(uda.period) ||
        !Array.isArray(uda.packRefs) ||
        !uda.packRefs.every(isNonEmptyString) ||
        !isNonEmptyString(uda.canonicalGenerationId)
      ) {
        return invalid('INVALID_UDA', 'Projected UDA is incomplete or invalid.')
      }
      if (uda.canonicalGenerationId !== section.canonicalPlan.generationId) {
        return invalid('INVALID_UDA_GENERATION', 'Projected UDA generation must match its canonical plan generation.')
      }
      const expectedId = `docente-os:${section.sourceSectionId}:${section.canonicalPlan.generationId}:${uda.sourceUdaRef}`
      if (uda.projectedUdaId !== expectedId) {
        return invalid('INVALID_PROJECTED_UDA_ID', 'Projected UDA identity does not match canonical source identity.')
      }
      if (projectedUdaIds.has(uda.projectedUdaId)) {
        return invalid('DUPLICATE_PROJECTED_UDA_ID', 'Projected UDA identities must be unique.')
      }
      projectedUdaIds.add(uda.projectedUdaId)
    }
  }

  const projection = input as RegistroTeachingProjectionV1
  const { projectionFingerprint, ...withoutFingerprint } = projection
  const expectedHash = computeRegistroTeachingProjectionFingerprint(withoutFingerprint)
  if (projectionFingerprint.hash !== expectedHash) {
    return invalid('FINGERPRINT_MISMATCH', 'Projection fingerprint does not match the stable payload.')
  }

  return { ok: true, value: projection }
}
