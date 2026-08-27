import type { CmlCanonicalRef } from './cml-local-handoff'

export const CML_INTEROP_CONTRACT = 'CML_INTEROP_V1' as const
export const CML_CURRICULUM_FEEDBACK_MESSAGE = 'CURRICULUM_FEEDBACK_SUBMITTED' as const
export const CML_CURRICULUM_FEEDBACK_PRIVACY = 'PROFESSIONAL_NON_PERSONAL' as const

export type CurriculumFeedbackCategory =
  | 'SEQUENCING'
  | 'PREREQUISITE'
  | 'SCOPE'
  | 'WORDING'
  | 'FEASIBILITY'
  | 'OTHER'

export type CurriculumFeedbackSourceBaseline = {
  curricularContextId: string
  curriculumVersionRef: CmlCanonicalRef
  sourceHandoffFootprintHash: string
  sourceFrameworkMessageId: string
}

export type CurriculumFeedbackDraft = {
  feedbackId: string
  sourceVersion: string
  submittedAt: string
  baseline: CurriculumFeedbackSourceBaseline
  category: CurriculumFeedbackCategory
  alignedNodeRefs: CmlCanonicalRef[]
  evidenceRefs: CmlCanonicalRef[]
  summary: string
  privacyAttestation: 'NO_STUDENT_PERSONAL_DATA'
}

export type CurriculumFeedbackEnvelopeV1 = {
  contract: typeof CML_INTEROP_CONTRACT
  messageId: string
  messageType: typeof CML_CURRICULUM_FEEDBACK_MESSAGE
  sourceProduct: 'DOCENTE_OS'
  sourceVersion: string
  emittedAt: string
  payloadVersion: 1
  privacyClass: typeof CML_CURRICULUM_FEEDBACK_PRIVACY
  provenance: {
    sourceRefs: CmlCanonicalRef[]
    generatedBy: 'HUMAN'
    humanConfirmed: true
    note: string
  }
  payload: {
    curriculumVersionRef: CmlCanonicalRef
    alignedNodeRefs: CmlCanonicalRef[]
    summary: string
    evidenceRefs: CmlCanonicalRef[]
    teacherConfirmed: true
  }
}

export type CurriculumFeedbackPreview = {
  status: 'READY_FOR_TEACHER_CONFIRMATION'
  persistenceAllowed: false
  transportAllowed: false
  targetProduct: 'CURMANLIGHT_ARENA'
  category: CurriculumFeedbackCategory
  summary: string
  alignedNodeRefs: CmlCanonicalRef[]
  evidenceRefs: CmlCanonicalRef[]
  baseline: CurriculumFeedbackSourceBaseline
  excludedData: readonly ['STUDENT_IDENTIFIERS', 'GRADES', 'ATTENDANCE', 'PRIVATE_NOTES', 'RAW_CLASSROOM_EVENTS']
}

export type CurriculumFeedbackSubmission = {
  status: 'SUBMITTED_LOCALLY'
  transportAllowed: false
  envelope: CurriculumFeedbackEnvelopeV1
  idempotencyKey: string
}

const FORBIDDEN_PERSONAL_KEYS = new Set([
  'student','studentId','studentName','pupil','pupilId','pupilName','alunno','alunna','alunni',
  'nomeAlunno','cognomeAlunno','assessmentResult','individualAssessment','grade','grades','attendance',
  'pdp','pei','family','parent','guardian','email','phone','fiscalCode','codiceFiscale','dateOfBirth',
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

function scanForbiddenKeys(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => scanForbiddenKeys(entry, `${path}[${index}]`))
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(FORBIDDEN_PERSONAL_KEYS.has(key) ? [`${path}.${key}`] : []),
    ...scanForbiddenKeys(entry, `${path}.${key}`),
  ])
}

function assertDraft(draft: CurriculumFeedbackDraft): void {
  if (!nonEmpty(draft.feedbackId) || !nonEmpty(draft.sourceVersion)) throw new Error('feedback identity is required')
  if (!nonEmpty(draft.submittedAt) || Number.isNaN(Date.parse(draft.submittedAt))) throw new Error('submittedAt must be an ISO-compatible date')
  if (!nonEmpty(draft.baseline.curricularContextId)) throw new Error('curricularContextId is required')
  if (!validRef(draft.baseline.curriculumVersionRef)) throw new Error('curriculumVersionRef is invalid')
  if (!/^[0-9a-f]{8}$/.test(draft.baseline.sourceHandoffFootprintHash)) throw new Error('sourceHandoffFootprintHash is invalid')
  if (!nonEmpty(draft.baseline.sourceFrameworkMessageId)) throw new Error('sourceFrameworkMessageId is required')
  if (!['SEQUENCING','PREREQUISITE','SCOPE','WORDING','FEASIBILITY','OTHER'].includes(draft.category)) throw new Error('feedback category is invalid')
  if (!Array.isArray(draft.alignedNodeRefs) || draft.alignedNodeRefs.length === 0 || !draft.alignedNodeRefs.every(validRef)) throw new Error('alignedNodeRefs must contain canonical references')
  if (!Array.isArray(draft.evidenceRefs) || draft.evidenceRefs.length === 0 || !draft.evidenceRefs.every(validRef)) throw new Error('evidenceRefs must contain professional canonical references')
  const summary = draft.summary.trim()
  if (summary.length < 10 || summary.length > 2000) throw new Error('summary must contain 10-2000 characters')
  if (draft.privacyAttestation !== 'NO_STUDENT_PERSONAL_DATA') throw new Error('explicit privacy attestation is required')
  const forbidden = scanForbiddenKeys(draft)
  if (forbidden.length > 0) throw new Error(`feedback contains forbidden personal-data fields: ${forbidden.join(', ')}`)
}

export function buildCurriculumFeedbackPreview(draft: CurriculumFeedbackDraft): CurriculumFeedbackPreview {
  assertDraft(draft)
  return {
    status: 'READY_FOR_TEACHER_CONFIRMATION',
    persistenceAllowed: false,
    transportAllowed: false,
    targetProduct: 'CURMANLIGHT_ARENA',
    category: draft.category,
    summary: draft.summary.trim(),
    alignedNodeRefs: draft.alignedNodeRefs.map((ref) => ({ ...ref })),
    evidenceRefs: draft.evidenceRefs.map((ref) => ({ ...ref })),
    baseline: {
      ...draft.baseline,
      curriculumVersionRef: { ...draft.baseline.curriculumVersionRef },
    },
    excludedData: ['STUDENT_IDENTIFIERS', 'GRADES', 'ATTENDANCE', 'PRIVATE_NOTES', 'RAW_CLASSROOM_EVENTS'],
  }
}

export function submitCurriculumFeedback(input: {
  draft: CurriculumFeedbackDraft
  teacherConfirmed: boolean
}): CurriculumFeedbackSubmission {
  const preview = buildCurriculumFeedbackPreview(input.draft)
  if (input.teacherConfirmed !== true) throw new Error('teacher confirmation is required before curriculum feedback submission')

  const baselineRef: CmlCanonicalRef = {
    namespace: 'docente.os',
    entityType: 'CurricularContext',
    entityId: preview.baseline.curricularContextId,
    versionId: preview.baseline.sourceHandoffFootprintHash,
  }
  const provenanceRefs = [baselineRef, preview.baseline.curriculumVersionRef, ...preview.evidenceRefs]
  const envelope: CurriculumFeedbackEnvelopeV1 = {
    contract: CML_INTEROP_CONTRACT,
    messageId: input.draft.feedbackId,
    messageType: CML_CURRICULUM_FEEDBACK_MESSAGE,
    sourceProduct: 'DOCENTE_OS',
    sourceVersion: input.draft.sourceVersion,
    emittedAt: input.draft.submittedAt,
    payloadVersion: 1,
    privacyClass: CML_CURRICULUM_FEEDBACK_PRIVACY,
    provenance: {
      sourceRefs: provenanceRefs.map((ref) => ({ ...ref })),
      generatedBy: 'HUMAN',
      humanConfirmed: true,
      note: `Accepted curriculum context ${preview.baseline.curricularContextId}; source handoff ${preview.baseline.sourceHandoffFootprintHash}; framework ${preview.baseline.sourceFrameworkMessageId}; category ${preview.category}.`,
    },
    payload: {
      curriculumVersionRef: { ...preview.baseline.curriculumVersionRef },
      alignedNodeRefs: preview.alignedNodeRefs.map((ref) => ({ ...ref })),
      summary: preview.summary,
      evidenceRefs: preview.evidenceRefs.map((ref) => ({ ...ref })),
      teacherConfirmed: true,
    },
  }

  return {
    status: 'SUBMITTED_LOCALLY',
    transportAllowed: false,
    envelope,
    idempotencyKey: `${envelope.sourceProduct}:${envelope.messageType}:${envelope.messageId}`,
  }
}
