export const CML_LOCAL_HANDOFF_FORMAT = 'CML_LOCAL_HANDOFF_V1' as const
export const CML_INTEROP_CONTRACT = 'CML_INTEROP_V1' as const

export type CmlCanonicalRef = {
  namespace: string
  entityType: string
  entityId: string
  versionId?: string
}

export type CmlInteropEnvelope = {
  contract: typeof CML_INTEROP_CONTRACT
  messageId: string
  messageType: 'CURRICULUM_ADOPTED' | 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE'
  sourceProduct: 'CURMANLIGHT_ARENA'
  sourceVersion: string
  emittedAt: string
  payloadVersion: 1
  privacyClass: 'PROFESSIONAL_NON_PERSONAL'
  provenance: {
    sourceRefs: CmlCanonicalRef[]
    generatedBy: 'HUMAN' | 'SYSTEM_DERIVED' | 'AI_PROPOSED'
    humanConfirmed: boolean
    note?: string
  }
  payload: Record<string, unknown>
}

export type CmlLocalHandoffV1 = {
  format: typeof CML_LOCAL_HANDOFF_FORMAT
  targetProduct: 'DOCENTE_OS'
  acceptanceRequired: true
  importMode: 'PREVIEW_ONLY'
  generatedAt: string
  curriculumAdopted: CmlInteropEnvelope
  annualPlanningFramework: CmlInteropEnvelope
  structuralFootprint: {
    algorithm: 'fnv1a'
    version: 1
    hash: string
  }
}

export type AnnualPlanImportPreview = {
  status: 'READY_FOR_TEACHER_REVIEW'
  persistenceAllowed: false
  acceptanceRequired: true
  source: {
    format: typeof CML_LOCAL_HANDOFF_FORMAT
    curriculumMessageId: string
    frameworkMessageId: string
  }
  context: {
    schoolYearRef: string
    disciplineRef: string
    gradeRef: string
    curriculumVersionRef: CmlCanonicalRef
  }
  periods: Array<{
    periodId: string
    label: string
    suggestedNodeRefs: CmlCanonicalRef[]
  }>
  constraints: Array<{
    id: string
    kind: 'REQUIRED' | 'RECOMMENDED' | 'INFORMATIONAL'
    description: string
    sourceRef?: CmlCanonicalRef
  }>
}

export type CmlLocalHandoffValidation = {
  valid: boolean
  errors: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRef(value: unknown): value is CmlCanonicalRef {
  return isRecord(value)
    && nonEmpty(value.namespace)
    && nonEmpty(value.entityType)
    && nonEmpty(value.entityId)
    && (value.versionId === undefined || nonEmpty(value.versionId))
}

function sameRef(a: CmlCanonicalRef, b: CmlCanonicalRef) {
  return a.namespace === b.namespace
    && a.entityType === b.entityType
    && a.entityId === b.entityId
    && (a.versionId ?? null) === (b.versionId ?? null)
}

function validateEnvelope(value: unknown, expectedType: CmlInteropEnvelope['messageType'], errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${expectedType}: envelope missing`)
    return
  }
  if (value.contract !== CML_INTEROP_CONTRACT) errors.push(`${expectedType}: unsupported interop contract`)
  if (value.messageType !== expectedType) errors.push(`${expectedType}: wrong message type`)
  if (value.sourceProduct !== 'CURMANLIGHT_ARENA') errors.push(`${expectedType}: source must be CURMANLIGHT_ARENA`)
  if (value.payloadVersion !== 1) errors.push(`${expectedType}: unsupported payload version`)
  if (value.privacyClass !== 'PROFESSIONAL_NON_PERSONAL') errors.push(`${expectedType}: privacy class rejected`)
  if (!nonEmpty(value.messageId) || !nonEmpty(value.sourceVersion)) errors.push(`${expectedType}: message identity missing`)
  if (!isRecord(value.provenance) || !Array.isArray(value.provenance.sourceRefs) || value.provenance.sourceRefs.length === 0) errors.push(`${expectedType}: provenance missing`)
  if (expectedType === 'CURRICULUM_ADOPTED' && (!isRecord(value.provenance) || value.provenance.humanConfirmed !== true)) errors.push(`${expectedType}: adopted curriculum must be human confirmed`)
  if (!isRecord(value.payload)) errors.push(`${expectedType}: payload missing`)
}

function canonicalSerialize(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(',')}]`
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalSerialize(value[key])}`).join(',')}}`
  throw new Error(`Unsupported canonical value: ${typeof value}`)
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function footprintPayload(handoff: Omit<CmlLocalHandoffV1, 'structuralFootprint'> | CmlLocalHandoffV1) {
  return {
    format: handoff.format,
    targetProduct: handoff.targetProduct,
    acceptanceRequired: handoff.acceptanceRequired,
    importMode: handoff.importMode,
    curriculumAdopted: handoff.curriculumAdopted,
    annualPlanningFramework: handoff.annualPlanningFramework,
  }
}

export function computeCmlLocalHandoffFootprint(handoff: Omit<CmlLocalHandoffV1, 'structuralFootprint'> | CmlLocalHandoffV1) {
  return fnv1a(canonicalSerialize(footprintPayload(handoff)))
}

export function validateCmlLocalHandoff(input: unknown): CmlLocalHandoffValidation {
  const errors: string[] = []
  if (!isRecord(input)) return { valid: false, errors: ['handoff must be an object'] }
  if (input.format !== CML_LOCAL_HANDOFF_FORMAT) errors.push('unsupported handoff format')
  if (input.targetProduct !== 'DOCENTE_OS') errors.push('targetProduct must be DOCENTE_OS')
  if (input.acceptanceRequired !== true) errors.push('acceptanceRequired must remain true')
  if (input.importMode !== 'PREVIEW_ONLY') errors.push('importMode must remain PREVIEW_ONLY')
  if (!nonEmpty(input.generatedAt) || Number.isNaN(Date.parse(input.generatedAt))) errors.push('generatedAt must be an ISO-compatible date')

  validateEnvelope(input.curriculumAdopted, 'CURRICULUM_ADOPTED', errors)
  validateEnvelope(input.annualPlanningFramework, 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE', errors)

  if (isRecord(input.curriculumAdopted) && isRecord(input.annualPlanningFramework)
    && isRecord(input.curriculumAdopted.payload) && isRecord(input.annualPlanningFramework.payload)) {
    const adopted = input.curriculumAdopted.payload
    const framework = input.annualPlanningFramework.payload
    if (!isRef(adopted.curriculumVersionRef) || !isRef(framework.curriculumVersionRef)) errors.push('curriculumVersionRef missing')
    else if (!sameRef(adopted.curriculumVersionRef, framework.curriculumVersionRef)) errors.push('curriculumVersionRef mismatch')
    if (!nonEmpty(adopted.disciplineRef) || adopted.disciplineRef !== framework.disciplineRef) errors.push('disciplineRef mismatch')
    if (!nonEmpty(adopted.gradeRef) || adopted.gradeRef !== framework.gradeRef) errors.push('gradeRef mismatch')
    if (!nonEmpty(adopted.schoolYearRef)) errors.push('schoolYearRef missing')
    if (!Array.isArray(framework.periods) || framework.periods.length === 0) errors.push('planning periods missing')
    if (!Array.isArray(framework.constraints)) errors.push('planning constraints invalid')
  }

  if (!isRecord(input.structuralFootprint)
    || input.structuralFootprint.algorithm !== 'fnv1a'
    || input.structuralFootprint.version !== 1
    || !nonEmpty(input.structuralFootprint.hash)) {
    errors.push('structural footprint invalid')
  } else {
    const expected = computeCmlLocalHandoffFootprint(input as unknown as CmlLocalHandoffV1)
    if (input.structuralFootprint.hash !== expected) errors.push('structural footprint mismatch')
  }

  return { valid: errors.length === 0, errors }
}

export function parseCmlLocalHandoffJson(json: string): CmlLocalHandoffV1 {
  const parsed: unknown = JSON.parse(json)
  const validation = validateCmlLocalHandoff(parsed)
  if (!validation.valid) throw new Error(`CML local handoff rejected: ${validation.errors.join('; ')}`)
  return parsed as CmlLocalHandoffV1
}

export function buildAnnualPlanImportPreview(handoff: CmlLocalHandoffV1): AnnualPlanImportPreview {
  const validation = validateCmlLocalHandoff(handoff)
  if (!validation.valid) throw new Error(`CML local handoff rejected: ${validation.errors.join('; ')}`)

  const adopted = handoff.curriculumAdopted.payload as Record<string, unknown>
  const framework = handoff.annualPlanningFramework.payload as Record<string, unknown>

  return {
    status: 'READY_FOR_TEACHER_REVIEW',
    persistenceAllowed: false,
    acceptanceRequired: true,
    source: {
      format: CML_LOCAL_HANDOFF_FORMAT,
      curriculumMessageId: handoff.curriculumAdopted.messageId,
      frameworkMessageId: handoff.annualPlanningFramework.messageId,
    },
    context: {
      schoolYearRef: adopted.schoolYearRef as string,
      disciplineRef: adopted.disciplineRef as string,
      gradeRef: adopted.gradeRef as string,
      curriculumVersionRef: adopted.curriculumVersionRef as CmlCanonicalRef,
    },
    periods: (framework.periods as AnnualPlanImportPreview['periods']).map((period) => ({ ...period, suggestedNodeRefs: [...period.suggestedNodeRefs] })),
    constraints: (framework.constraints as AnnualPlanImportPreview['constraints']).map((constraint) => ({ ...constraint })),
  }
}
