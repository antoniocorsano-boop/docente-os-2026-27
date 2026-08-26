import type { CmlCanonicalRef, CmlInteropEnvelope } from './cml-local-handoff'

export const CML_LOCAL_HANDOFF_FORMAT_V2 = 'CML_LOCAL_HANDOFF_V2' as const
export const CML_CURRICULUM_CONTEXT_CONTRACT = 'CML_CURRICULUM_CONTEXT_V1' as const

export type CurriculumApprovalState = 'APPROVED' | 'PROVISIONAL_COMPLETE'
export type CurriculumApplicabilityStatus = 'APPLICABLE' | 'TRANSITIONAL'
export type TransitionRemodulationState = 'NOT_REQUIRED' | 'HYPOTHESIS' | 'APPROVED'
export type CurriculumRequirementAuthority =
  | 'NATIONAL_PRESCRIPTIVE'
  | 'INSTITUTIONAL_REQUIRED'
  | 'TRANSITION_REQUIRED'
  | 'RECOMMENDED'
export type CurriculumRequirementKind =
  | 'COMPETENCE'
  | 'GENERAL_OBJECTIVE'
  | 'SPECIFIC_LEARNING_OBJECTIVE'
  | 'ESSENTIAL_KNOWLEDGE'
  | 'INSTITUTIONAL_REQUIREMENT'

export type CurriculumRequirementV1 = {
  requirementId: string
  kind: CurriculumRequirementKind
  authorityLevel: CurriculumRequirementAuthority
  curriculumNodeRef: CmlCanonicalRef
  description: string
  coverageRequired: boolean
  sourceRefs: CmlCanonicalRef[]
  transitionOriginRef?: CmlCanonicalRef
}

export type TransitionRemodulationV1 = {
  state: TransitionRemodulationState
  rationale: string
  sourceRefs: CmlCanonicalRef[]
  affectedRequirementIds: string[]
  usableForPlanning: boolean
  institutionallyApproved: boolean
  proposalRef?: CmlCanonicalRef
  approvalDecisionRef?: CmlCanonicalRef
}

export type CurriculumContextForClassV1 = {
  contract: typeof CML_CURRICULUM_CONTEXT_CONTRACT
  contextId: string
  institutionRef: CmlCanonicalRef
  schoolYearRef: string
  disciplineRef: string
  gradeRef: string
  sectionRef?: string
  cohortRef?: string
  curriculumRef: CmlCanonicalRef
  curriculumVersionRef: CmlCanonicalRef
  curriculumState: CurriculumApprovalState
  approvalProcessRef: CmlCanonicalRef
  approvalDecisionRef?: CmlCanonicalRef
  applicabilityStatus: CurriculumApplicabilityStatus
  transitionRuleRef: CmlCanonicalRef
  completeForPlanning: true
  requirements: CurriculumRequirementV1[]
  transitionRemodulation: TransitionRemodulationV1
  sourceRefs: CmlCanonicalRef[]
}

export type CmlLocalHandoffV2 = {
  format: typeof CML_LOCAL_HANDOFF_FORMAT_V2
  targetProduct: 'DOCENTE_OS'
  acceptanceRequired: true
  importMode: 'PREVIEW_ONLY'
  generatedAt: string
  curricularContext: CurriculumContextForClassV1
  annualPlanningFramework: CmlInteropEnvelope
  structuralFootprint: {
    algorithm: 'fnv1a'
    version: 1
    hash: string
  }
}

export type CmlLocalHandoffV2Validation = { valid: boolean; errors: string[] }

const FORBIDDEN_PERSONAL_KEYS = new Set([
  'student','studentId','studentName','pupil','pupilId','pupilName','alunno','alunna','alunni',
  'nomeAlunno','cognomeAlunno','assessmentResult','individualAssessment','pdp','pei','family','parent',
  'guardian','email','phone','fiscalCode','codiceFiscale','dateOfBirth',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validRef(value: unknown): value is CmlCanonicalRef {
  return isRecord(value)
    && nonEmpty(value.namespace)
    && nonEmpty(value.entityType)
    && nonEmpty(value.entityId)
    && (value.versionId === undefined || nonEmpty(value.versionId))
}

function sameRef(a: CmlCanonicalRef, b: CmlCanonicalRef): boolean {
  return a.namespace === b.namespace
    && a.entityType === b.entityType
    && a.entityId === b.entityId
    && (a.versionId ?? null) === (b.versionId ?? null)
}

function scanPrivacy(value: unknown, field: string, errors: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanPrivacy(entry, `${field}[${index}]`, errors))
    return
  }
  if (!isRecord(value)) return
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_PERSONAL_KEYS.has(key)) errors.push(`${field}.${key} is outside PROFESSIONAL_NON_PERSONAL interoperability`)
    scanPrivacy(entry, `${field}.${key}`, errors)
  }
}

function validateRefArray(value: unknown, field: string, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${field} must contain at least one canonical reference`)
    return
  }
  value.forEach((entry, index) => {
    if (!validRef(entry)) errors.push(`${field}[${index}] is invalid`)
  })
}

export function validateCurriculumContextForClassV1(input: unknown): CmlLocalHandoffV2Validation {
  const errors: string[] = []
  if (!isRecord(input)) return { valid: false, errors: ['curricularContext must be an object'] }
  if (input.contract !== CML_CURRICULUM_CONTEXT_CONTRACT) errors.push('unsupported curricular context contract')
  for (const field of ['contextId', 'schoolYearRef', 'disciplineRef', 'gradeRef']) {
    if (!nonEmpty(input[field])) errors.push(`${field} is required`)
  }
  if (!nonEmpty(input.sectionRef) && !nonEmpty(input.cohortRef)) errors.push('sectionRef or cohortRef is required')
  for (const field of ['institutionRef', 'curriculumRef', 'curriculumVersionRef', 'approvalProcessRef', 'transitionRuleRef']) {
    if (!validRef(input[field])) errors.push(`${field} is invalid`)
  }
  if (input.curriculumState !== 'APPROVED' && input.curriculumState !== 'PROVISIONAL_COMPLETE') errors.push('curriculumState is invalid')
  if (input.curriculumState === 'APPROVED' && !validRef(input.approvalDecisionRef)) errors.push('approved curriculum requires approvalDecisionRef')
  if (input.curriculumState === 'PROVISIONAL_COMPLETE' && input.approvalDecisionRef !== undefined) errors.push('provisional curriculum cannot claim approvalDecisionRef')
  if (input.applicabilityStatus !== 'APPLICABLE' && input.applicabilityStatus !== 'TRANSITIONAL') errors.push('applicabilityStatus is invalid')
  if (input.completeForPlanning !== true) errors.push('curriculum context must be completeForPlanning')

  if (!Array.isArray(input.requirements) || input.requirements.length === 0) {
    errors.push('requirements must contain at least one curricular requirement')
  } else {
    const seen = new Set<string>()
    input.requirements.forEach((candidate, index) => {
      if (!isRecord(candidate)) return errors.push(`requirements[${index}] is invalid`)
      if (!nonEmpty(candidate.requirementId)) errors.push(`requirements[${index}].requirementId is required`)
      else if (seen.has(candidate.requirementId)) errors.push(`duplicate requirementId ${candidate.requirementId}`)
      else seen.add(candidate.requirementId)
      if (!['COMPETENCE','GENERAL_OBJECTIVE','SPECIFIC_LEARNING_OBJECTIVE','ESSENTIAL_KNOWLEDGE','INSTITUTIONAL_REQUIREMENT'].includes(String(candidate.kind))) errors.push(`requirements[${index}].kind is invalid`)
      if (!['NATIONAL_PRESCRIPTIVE','INSTITUTIONAL_REQUIRED','TRANSITION_REQUIRED','RECOMMENDED'].includes(String(candidate.authorityLevel))) errors.push(`requirements[${index}].authorityLevel is invalid`)
      if (!validRef(candidate.curriculumNodeRef)) errors.push(`requirements[${index}].curriculumNodeRef is invalid`)
      if (!nonEmpty(candidate.description)) errors.push(`requirements[${index}].description is required`)
      if (typeof candidate.coverageRequired !== 'boolean') errors.push(`requirements[${index}].coverageRequired must be boolean`)
      if (candidate.authorityLevel !== 'RECOMMENDED' && candidate.coverageRequired !== true) errors.push(`requirements[${index}] mandatory authority requires coverageRequired=true`)
      validateRefArray(candidate.sourceRefs, `requirements[${index}].sourceRefs`, errors)
      if (candidate.authorityLevel === 'TRANSITION_REQUIRED' && !validRef(candidate.transitionOriginRef)) errors.push(`requirements[${index}].transitionOriginRef is required`)
    })
  }
  validateRefArray(input.sourceRefs, 'sourceRefs', errors)

  if (!isRecord(input.transitionRemodulation)) {
    errors.push('transitionRemodulation is required')
  } else {
    const remod = input.transitionRemodulation
    if (!['NOT_REQUIRED','HYPOTHESIS','APPROVED'].includes(String(remod.state))) errors.push('transitionRemodulation.state is invalid')
    if (!nonEmpty(remod.rationale)) errors.push('transitionRemodulation.rationale is required')
    validateRefArray(remod.sourceRefs, 'transitionRemodulation.sourceRefs', errors)
    if (!Array.isArray(remod.affectedRequirementIds)) errors.push('transitionRemodulation.affectedRequirementIds must be an array')
    if (typeof remod.usableForPlanning !== 'boolean') errors.push('transitionRemodulation.usableForPlanning must be boolean')
    if (typeof remod.institutionallyApproved !== 'boolean') errors.push('transitionRemodulation.institutionallyApproved must be boolean')
    if (input.applicabilityStatus === 'TRANSITIONAL' && remod.state === 'NOT_REQUIRED') errors.push('transitional applicability requires remodulation hypothesis or approval')
    if (remod.state === 'HYPOTHESIS') {
      if (remod.institutionallyApproved !== false) errors.push('remodulation hypothesis cannot be institutionally approved')
      if (remod.usableForPlanning !== true) errors.push('remodulation hypothesis must be explicitly usableForPlanning')
      if (!validRef(remod.proposalRef)) errors.push('remodulation hypothesis requires proposalRef')
      if (remod.approvalDecisionRef !== undefined) errors.push('remodulation hypothesis cannot claim approvalDecisionRef')
    }
    if (remod.state === 'APPROVED') {
      if (remod.institutionallyApproved !== true) errors.push('approved remodulation must be institutionallyApproved')
      if (!validRef(remod.approvalDecisionRef)) errors.push('approved remodulation requires approvalDecisionRef')
    }
  }
  scanPrivacy(input, 'curricularContext', errors)
  return { valid: errors.length === 0, errors }
}

function canonicalSerialize(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
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

function footprintPayload(handoff: Omit<CmlLocalHandoffV2, 'structuralFootprint'> | CmlLocalHandoffV2) {
  return {
    format: handoff.format,
    targetProduct: handoff.targetProduct,
    acceptanceRequired: handoff.acceptanceRequired,
    importMode: handoff.importMode,
    curricularContext: handoff.curricularContext,
    annualPlanningFramework: handoff.annualPlanningFramework,
  }
}

export function computeCmlLocalHandoffV2Footprint(handoff: Omit<CmlLocalHandoffV2, 'structuralFootprint'> | CmlLocalHandoffV2): string {
  return fnv1a(canonicalSerialize(footprintPayload(handoff)))
}

export function validateCmlLocalHandoffV2(input: unknown): CmlLocalHandoffV2Validation {
  const errors: string[] = []
  if (!isRecord(input)) return { valid: false, errors: ['handoff must be an object'] }
  if (input.format !== CML_LOCAL_HANDOFF_FORMAT_V2) errors.push('unsupported handoff v2 format')
  if (input.targetProduct !== 'DOCENTE_OS') errors.push('targetProduct must be DOCENTE_OS')
  if (input.acceptanceRequired !== true) errors.push('acceptanceRequired must remain true')
  if (input.importMode !== 'PREVIEW_ONLY') errors.push('importMode must remain PREVIEW_ONLY')
  if (!nonEmpty(input.generatedAt) || Number.isNaN(Date.parse(input.generatedAt))) errors.push('generatedAt must be an ISO-compatible date')

  const contextValidation = validateCurriculumContextForClassV1(input.curricularContext)
  errors.push(...contextValidation.errors.map((error) => `curricularContext:${error}`))

  if (!isRecord(input.annualPlanningFramework)) {
    errors.push('annualPlanningFramework envelope missing')
  } else {
    const envelope = input.annualPlanningFramework
    if (envelope.contract !== 'CML_INTEROP_V1') errors.push('annualPlanningFramework unsupported interop contract')
    if (envelope.messageType !== 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE') errors.push('annualPlanningFramework wrong message type')
    if (envelope.sourceProduct !== 'CURMANLIGHT_ARENA') errors.push('annualPlanningFramework source must be CURMANLIGHT_ARENA')
    if (envelope.payloadVersion !== 1) errors.push('annualPlanningFramework unsupported payload version')
    if (envelope.privacyClass !== 'PROFESSIONAL_NON_PERSONAL') errors.push('annualPlanningFramework privacy class rejected')
    if (!isRecord(envelope.payload)) errors.push('annualPlanningFramework payload missing')
    scanPrivacy(envelope.payload, 'annualPlanningFramework.payload', errors)
  }

  if (isRecord(input.curricularContext) && isRecord(input.annualPlanningFramework) && isRecord(input.annualPlanningFramework.payload)) {
    const context = input.curricularContext as unknown as CurriculumContextForClassV1
    const framework = input.annualPlanningFramework.payload
    if (!validRef(framework.curriculumVersionRef) || !sameRef(context.curriculumVersionRef, framework.curriculumVersionRef)) errors.push('curriculumVersionRef mismatch')
    if (context.disciplineRef !== framework.disciplineRef) errors.push('disciplineRef mismatch')
    if (context.gradeRef !== framework.gradeRef) errors.push('gradeRef mismatch')
    if (!Array.isArray(framework.periods) || framework.periods.length === 0) errors.push('planning periods missing')
    if (!Array.isArray(framework.constraints)) errors.push('planning constraints invalid')
  }

  if (!isRecord(input.structuralFootprint)
    || input.structuralFootprint.algorithm !== 'fnv1a'
    || input.structuralFootprint.version !== 1
    || !nonEmpty(input.structuralFootprint.hash)) {
    errors.push('structural footprint invalid')
  } else if (isRecord(input.curricularContext) && isRecord(input.annualPlanningFramework)) {
    const expected = computeCmlLocalHandoffV2Footprint(input as unknown as CmlLocalHandoffV2)
    if (input.structuralFootprint.hash !== expected) errors.push('structural footprint mismatch')
  }

  return { valid: errors.length === 0, errors }
}

export function parseCmlLocalHandoffV2Json(json: string): CmlLocalHandoffV2 {
  const parsed: unknown = JSON.parse(json)
  const validation = validateCmlLocalHandoffV2(parsed)
  if (!validation.valid) throw new Error(`CML local handoff v2 rejected: ${validation.errors.join('; ')}`)
  return parsed as CmlLocalHandoffV2
}
