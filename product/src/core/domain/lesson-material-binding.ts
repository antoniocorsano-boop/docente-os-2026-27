export type LessonMaterialRole =
  | 'TEACHER_BRIEF'
  | 'LIM_VIEW'
  | 'STUDENT_HANDOUT'
  | 'MINI_DECK'
  | 'VISUAL_AID'
  | 'ASSESSMENT'

export type LessonMaterialArtifactKind =
  | 'PRESENTATION'
  | 'WORKSHEET'
  | 'GUIDE'
  | 'RUBRIC'
  | 'VISUAL'
  | 'ASSESSMENT'
  | 'OTHER'

export type LessonMaterialAudience = 'TEACHER' | 'STUDENT' | 'MIXED'

export type MaterialContentDigestV1 = {
  algorithm: 'SHA-256'
  canonicalization: 'docente-os.material-content.v1'
  value: string
}

export type CanonicalMaterialRefV1 =
  | {
      kind: 'KNOWLEDGE_GENERATION'
      assetId: string
      generationId: string
      contentDigest: MaterialContentDigestV1
    }
  | {
      kind: 'IMMUTABLE_REVISION'
      assetId: string
      revisionRef: string
      contentDigest: MaterialContentDigestV1
    }

export type MaterialProposalProvenanceV1 = {
  sourceArtifactRefs: readonly string[]
  derivationRefs: readonly string[]
  providerType?: string
  providerId?: string
  adapterId?: string
  adapterVersion?: string
  requestId?: string
  evidenceRefs: readonly string[]
  rightsState: 'KNOWN' | 'UNKNOWN' | 'RESTRICTED'
  licenseRef?: string
  attributionRequirements: readonly string[]
}

export type LessonMaterialBindingV1 = {
  schema: 'docente-os.lesson-material-binding.v1'
  role: LessonMaterialRole
  artifactKind: LessonMaterialArtifactKind
  audience: LessonMaterialAudience
  materialRef: CanonicalMaterialRefV1
  provenance: MaterialProposalProvenanceV1
}

export type LessonDesignExtensionPayload = Record<string, unknown> & {
  materialBinding?: unknown
}

export type LessonMaterialBindingPayloadClassification =
  | { classification: 'MATERIAL_BINDING_V1'; binding: LessonMaterialBindingV1 }
  | { classification: 'LEGACY_EXTENSION'; binding: null }

const ROLES = new Set<LessonMaterialRole>([
  'TEACHER_BRIEF',
  'LIM_VIEW',
  'STUDENT_HANDOUT',
  'MINI_DECK',
  'VISUAL_AID',
  'ASSESSMENT',
])

const ARTIFACT_KINDS = new Set<LessonMaterialArtifactKind>([
  'PRESENTATION',
  'WORKSHEET',
  'GUIDE',
  'RUBRIC',
  'VISUAL',
  'ASSESSMENT',
  'OTHER',
])

const AUDIENCES = new Set<LessonMaterialAudience>(['TEACHER', 'STUDENT', 'MIXED'])
const RIGHTS_STATES = new Set<MaterialProposalProvenanceV1['rightsState']>(['KNOWN', 'UNKNOWN', 'RESTRICTED'])

export function parseLessonMaterialBindingV1(input: unknown): LessonMaterialBindingV1 {
  const binding = requireRecord(input, 'Material binding')
  if (binding.schema !== 'docente-os.lesson-material-binding.v1') {
    throw new Error('Unsupported material binding schema')
  }

  const role = binding.role
  if (typeof role !== 'string' || !ROLES.has(role as LessonMaterialRole)) {
    throw new Error('Invalid material role')
  }

  const artifactKind = binding.artifactKind
  if (typeof artifactKind !== 'string' || !ARTIFACT_KINDS.has(artifactKind as LessonMaterialArtifactKind)) {
    throw new Error('Invalid material artifact kind')
  }

  const audience = binding.audience
  if (typeof audience !== 'string' || !AUDIENCES.has(audience as LessonMaterialAudience)) {
    throw new Error('Invalid material audience')
  }

  return {
    schema: 'docente-os.lesson-material-binding.v1',
    role: role as LessonMaterialRole,
    artifactKind: artifactKind as LessonMaterialArtifactKind,
    audience: audience as LessonMaterialAudience,
    materialRef: parseCanonicalMaterialRefV1(binding.materialRef),
    provenance: parseMaterialProposalProvenanceV1(binding.provenance),
  }
}

export function classifyLessonMaterialBindingPayload(payload: unknown): LessonMaterialBindingPayloadClassification {
  if (!isRecord(payload) || !Object.prototype.hasOwnProperty.call(payload, 'materialBinding')) {
    return { classification: 'LEGACY_EXTENSION', binding: null }
  }

  return {
    classification: 'MATERIAL_BINDING_V1',
    binding: parseLessonMaterialBindingV1(payload.materialBinding),
  }
}

function parseCanonicalMaterialRefV1(input: unknown): CanonicalMaterialRefV1 {
  const ref = requireRecord(input, 'Material ref')
  if (ref.kind === 'KNOWLEDGE_GENERATION') {
    return {
      kind: 'KNOWLEDGE_GENERATION',
      assetId: requireNonEmptyString(ref.assetId, 'Material ref assetId'),
      generationId: requireNonEmptyString(ref.generationId, 'Material ref generationId'),
      contentDigest: parseContentDigestV1(ref.contentDigest),
    }
  }

  if (ref.kind === 'IMMUTABLE_REVISION') {
    return {
      kind: 'IMMUTABLE_REVISION',
      assetId: requireNonEmptyString(ref.assetId, 'Material ref assetId'),
      revisionRef: requireNonEmptyString(ref.revisionRef, 'Material ref revisionRef'),
      contentDigest: parseContentDigestV1(ref.contentDigest),
    }
  }

  throw new Error('Invalid material ref kind')
}

function parseContentDigestV1(input: unknown): MaterialContentDigestV1 {
  const digest = requireRecord(input, 'Content digest')
  if (digest.algorithm !== 'SHA-256') throw new Error('Unsupported content digest algorithm')
  if (digest.canonicalization !== 'docente-os.material-content.v1') {
    throw new Error('Unsupported content digest canonicalization')
  }

  const value = requireNonEmptyString(digest.value, 'Content digest value')
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('Content digest value must be a SHA-256 hex digest')

  return {
    algorithm: 'SHA-256',
    canonicalization: 'docente-os.material-content.v1',
    value: value.toLowerCase(),
  }
}

function parseMaterialProposalProvenanceV1(input: unknown): MaterialProposalProvenanceV1 {
  const provenance = requireRecord(input, 'Material provenance')
  const rightsState = provenance.rightsState
  if (typeof rightsState !== 'string' || !RIGHTS_STATES.has(rightsState as MaterialProposalProvenanceV1['rightsState'])) {
    throw new Error('Invalid material provenance rights state')
  }

  const parsed: MaterialProposalProvenanceV1 = {
    sourceArtifactRefs: requireStringArray(provenance.sourceArtifactRefs, 'Material provenance sourceArtifactRefs'),
    derivationRefs: requireStringArray(provenance.derivationRefs, 'Material provenance derivationRefs'),
    providerType: optionalNonEmptyString(provenance.providerType, 'Material provenance providerType'),
    providerId: optionalNonEmptyString(provenance.providerId, 'Material provenance providerId'),
    adapterId: optionalNonEmptyString(provenance.adapterId, 'Material provenance adapterId'),
    adapterVersion: optionalNonEmptyString(provenance.adapterVersion, 'Material provenance adapterVersion'),
    requestId: optionalNonEmptyString(provenance.requestId, 'Material provenance requestId'),
    evidenceRefs: requireStringArray(provenance.evidenceRefs, 'Material provenance evidenceRefs'),
    rightsState: rightsState as MaterialProposalProvenanceV1['rightsState'],
    licenseRef: optionalNonEmptyString(provenance.licenseRef, 'Material provenance licenseRef'),
    attributionRequirements: requireStringArray(
      provenance.attributionRequirements,
      'Material provenance attributionRequirements',
    ),
  }

  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  ) as MaterialProposalProvenanceV1
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${label} must be an array of non-empty strings`)
  }
  return value.map((item) => item.trim())
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`)
  return value.trim()
}

function optionalNonEmptyString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined
  return requireNonEmptyString(value, label)
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
