import type { TeachingSessionRecord } from './teaching-session'

export type ObservationScope = 'CLASS' | 'ANONYMOUS_GROUP'

export type ObservationState =
  | 'NOT_OBSERVED'
  | 'NEEDS_SUPPORT'
  | 'DEVELOPING'
  | 'CONSOLIDATED'

export type ObservationSource =
  | 'TEACHER_QUICK_MARK'
  | 'TEACHER_NOTE'
  | 'EVIDENCE_REVIEW'

export type EvidenceKind =
  | 'WORK_PRODUCT'
  | 'QUICK_CHECK'
  | 'ORAL_RESPONSE'
  | 'CLASS_ACTIVITY'
  | 'DOCUMENT_REFERENCE'
  | 'OTHER'

export type TeachingEvidenceDimensionKey =
  | 'UNDERSTANDING_INSTRUCTION'
  | 'AUTONOMY'
  | 'WORK_METHOD'
  | 'TECHNICAL_LANGUAGE'
  | 'DISCIPLINARY_APPLICATION'
  | 'EVIDENCE_QUALITY'
  | 'TIME_MANAGEMENT'

export type LongitudinalSignal =
  | 'SINGLE_EPISODE'
  | 'RECURRING_SIGNAL'
  | 'IMPROVING_SIGNAL'
  | 'WORSENING_SIGNAL'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONTEXT_CHANGED'

export type TeachingProposalStatus =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'MODIFIED'
  | 'DISMISSED'

export type TeachingEvidenceSessionContext = Pick<
  TeachingSessionRecord,
  | 'id'
  | 'workspaceId'
  | 'academicYearId'
  | 'sectionId'
  | 'disciplineId'
  | 'localDate'
  | 'supersedesSessionId'
  | 'recordedAt'
>

/** Ephemeral input. It is never canonical until the TeachingSession commit succeeds. */
export type TeachingObservationDraft = {
  draftKey: string
  scope: ObservationScope
  anonymousGroupKey: string | null
  dimensionKey: TeachingEvidenceDimensionKey
  state: ObservationState
  note: string | null
  source: ObservationSource
}

export type TeachingObservation = Omit<TeachingObservationDraft, 'draftKey'> & {
  id: string
  teachingSessionId: string
  recordedBy: string
  createdAt: string
}

/** Evidence is a reference, not a copy of a student work product or KB asset. */
export type TeachingEvidenceReferenceDraft = {
  kind: EvidenceKind
  description: string
  observationDraftKeys: string[]
  knowledgeAssetId: string | null
  externalReference: string | null
}

export type TeachingEvidenceReference = Omit<TeachingEvidenceReferenceDraft, 'observationDraftKeys'> & {
  id: string
  teachingSessionId: string
  observationIds: string[]
  recordedBy: string
  createdAt: string
}

export type TeachingProposal = {
  id: string
  sectionId: string
  rationale: string
  proposedAction: string
  evidenceRefs: string[]
  status: TeachingProposalStatus
  humanDecisionAt: string | null
}

export const BASELINE_TEACHING_EVIDENCE_DIMENSIONS: readonly TeachingEvidenceDimensionKey[] = [
  'UNDERSTANDING_INSTRUCTION',
  'AUTONOMY',
  'WORK_METHOD',
  'TECHNICAL_LANGUAGE',
  'DISCIPLINARY_APPLICATION',
  'EVIDENCE_QUALITY',
  'TIME_MANAGEMENT',
] as const

export type TeachingEvidenceDraftValidation = {
  valid: boolean
  codes: string[]
}

export function validateTeachingEvidenceDrafts(input: {
  observations: TeachingObservationDraft[]
  evidenceReferences: TeachingEvidenceReferenceDraft[]
}): TeachingEvidenceDraftValidation {
  const codes: string[] = []
  const observationKeys = new Set<string>()
  const observationTargets = new Set<string>()

  for (const observation of input.observations) {
    const draftKey = observation.draftKey.trim()
    if (!draftKey) codes.push('OBSERVATION_DRAFT_KEY_REQUIRED')
    if (draftKey && observationKeys.has(draftKey)) codes.push('DUPLICATE_OBSERVATION_DRAFT_KEY')
    if (draftKey) observationKeys.add(draftKey)

    const normalizedGroupKey = observation.scope === 'ANONYMOUS_GROUP'
      ? observation.anonymousGroupKey?.trim() ?? ''
      : ''
    const normalizedTarget = `${observation.scope.trim()}\u001f${normalizedGroupKey}\u001f${observation.dimensionKey.trim()}`
    if (observationTargets.has(normalizedTarget)) codes.push('DUPLICATE_OBSERVATION_TARGET')
    observationTargets.add(normalizedTarget)

    if (!BASELINE_TEACHING_EVIDENCE_DIMENSIONS.includes(observation.dimensionKey)) {
      codes.push('INVALID_OBSERVATION_DIMENSION')
    }
    if (observation.scope === 'CLASS' && observation.anonymousGroupKey !== null) {
      codes.push('CLASS_CANNOT_HAVE_ANONYMOUS_GROUP_KEY')
    }
    if (observation.scope === 'ANONYMOUS_GROUP' && !observation.anonymousGroupKey?.trim()) {
      codes.push('ANONYMOUS_GROUP_KEY_REQUIRED')
    }
    if (observation.anonymousGroupKey && observation.anonymousGroupKey.length > 120) {
      codes.push('ANONYMOUS_GROUP_KEY_TOO_LONG')
    }
    if (observation.note && observation.note.length > 1000) codes.push('OBSERVATION_NOTE_TOO_LONG')
  }

  for (const evidence of input.evidenceReferences) {
    if (!evidence.description.trim()) codes.push('EVIDENCE_DESCRIPTION_REQUIRED')
    if (evidence.description.length > 1000) codes.push('EVIDENCE_DESCRIPTION_TOO_LONG')
    if (evidence.externalReference && evidence.externalReference.length > 1000) {
      codes.push('EVIDENCE_EXTERNAL_REFERENCE_TOO_LONG')
    }

    const linked = new Set<string>()
    for (const rawKey of evidence.observationDraftKeys) {
      const key = rawKey.trim()
      if (!key || !observationKeys.has(key)) codes.push('UNKNOWN_OBSERVATION_DRAFT_KEY')
      if (key && linked.has(key)) codes.push('DUPLICATE_EVIDENCE_OBSERVATION_LINK')
      if (key) linked.add(key)
    }
  }

  const uniqueCodes = [...new Set(codes)]
  return { valid: uniqueCodes.length === 0, codes: uniqueCodes }
}

export function validateTeachingObservation(observation: TeachingObservation): string[] {
  const errors: string[] = []
  if (!observation.teachingSessionId.trim()) errors.push('teachingSessionId is required')
  if (!observation.recordedBy.trim()) errors.push('recordedBy is required')
  if (observation.scope === 'CLASS' && observation.anonymousGroupKey !== null) {
    errors.push('CLASS observations cannot carry anonymousGroupKey')
  }
  if (observation.scope === 'ANONYMOUS_GROUP' && !observation.anonymousGroupKey?.trim()) {
    errors.push('ANONYMOUS_GROUP observations require anonymousGroupKey')
  }
  return errors
}

/** Tier 1 longitudinal analysis is class-level only and requires two current comparable sessions. */
export function canInferLongitudinalSignal(input: {
  observations: TeachingObservation[]
  comparableSessionIds: string[]
}): boolean {
  const comparable = new Set(input.comparableSessionIds)
  const sessionsByDimension = new Map<string, Set<string>>()

  for (const item of input.observations) {
    if (item.scope !== 'CLASS' || item.state === 'NOT_OBSERVED' || !comparable.has(item.teachingSessionId)) continue
    const sessions = sessionsByDimension.get(item.dimensionKey) ?? new Set<string>()
    sessions.add(item.teachingSessionId)
    sessionsByDimension.set(item.dimensionKey, sessions)
  }

  return [...sessionsByDimension.values()].some((sessions) => sessions.size >= 2)
}

export function deriveEvidenceCoverage(input: {
  observations: TeachingObservation[]
  evidence: TeachingEvidenceReference[]
}): 'NONE' | 'PARTIAL' | 'PRESENT' {
  const observed = input.observations.filter((item) => item.state !== 'NOT_OBSERVED')
  if (observed.length === 0 || input.evidence.length === 0) return 'NONE'

  const supported = new Set(
    input.evidence.flatMap((reference) =>
      reference.observationIds.map((observationId) => `${reference.teachingSessionId}:${observationId}`),
    ),
  )
  const covered = observed.filter((item) => supported.has(`${item.teachingSessionId}:${item.id}`)).length
  if (covered === 0) return 'NONE'
  if (covered < observed.length) return 'PARTIAL'
  return 'PRESENT'
}

export function canApplyTeachingProposal(proposal: TeachingProposal): boolean {
  return proposal.status === 'ACCEPTED' || proposal.status === 'MODIFIED'
}
