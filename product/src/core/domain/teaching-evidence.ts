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

export type TeachingEvidenceDimensionKey =
  | 'UNDERSTANDING_INSTRUCTION'
  | 'AUTONOMY'
  | 'WORK_METHOD'
  | 'TECHNICAL_LANGUAGE'
  | 'DISCIPLINARY_APPLICATION'
  | 'EVIDENCE_QUALITY'
  | 'TIME_MANAGEMENT'

/**
 * Read-only context projected from the canonical TeachingSession domain.
 * Bxx/UDA context is intentionally not duplicated here: when present it is
 * resolved through TeachingSessionAllocation records.
 */
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

/**
 * Ephemeral in-class observation. `draftKey` only correlates local inputs in
 * the same registration transaction; it is not a canonical identifier.
 */
export type TeachingObservationDraft = {
  draftKey: string
  scope: ObservationScope
  anonymousGroupKey: string | null
  dimensionKey: TeachingEvidenceDimensionKey | string
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

/**
 * Ephemeral evidence reference. Links use observation draft keys until the
 * authoritative TeachingSession transaction resolves canonical observation ids.
 */
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

/** @deprecated Use TeachingEvidenceReference. Kept as a source-compatible alias during TE-0. */
export type TeachingEvidence = TeachingEvidenceReference

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

export function validateTeachingObservation(observation: TeachingObservation): string[] {
  const errors: string[] = []

  if (!observation.teachingSessionId.trim()) errors.push('teachingSessionId is required')
  if (!observation.recordedBy.trim()) errors.push('recordedBy is required')
  if (!observation.dimensionKey.trim()) errors.push('dimensionKey is required')

  if (observation.scope === 'CLASS' && observation.anonymousGroupKey !== null) {
    errors.push('CLASS observations cannot carry anonymousGroupKey')
  }

  if (observation.scope === 'ANONYMOUS_GROUP' && !observation.anonymousGroupKey?.trim()) {
    errors.push('ANONYMOUS_GROUP observations require anonymousGroupKey')
  }

  return errors
}

/**
 * Tier 1 longitudinal analysis is class-level only. Anonymous groups are
 * deliberately session-local so a temporary grouping cannot become a hidden
 * persistent profile. The caller still owns session-currentness and context
 * comparability.
 */
export function canInferLongitudinalSignal(input: {
  observations: TeachingObservation[]
  comparableSessionIds: string[]
}): boolean {
  const comparable = new Set(input.comparableSessionIds)
  const sessions = new Set(
    input.observations
      .filter((item) => item.scope === 'CLASS')
      .filter((item) => item.state !== 'NOT_OBSERVED')
      .filter((item) => comparable.has(item.teachingSessionId))
      .map((item) => item.teachingSessionId),
  )

  return sessions.size >= 2
}

/**
 * Coverage is based on explicit observation links, never merely on evidence
 * existing in the same session. This keeps `Insight -> Perché?` explainable.
 */
export function deriveEvidenceCoverage(input: {
  observations: TeachingObservation[]
  evidence: TeachingEvidenceReference[]
}): 'NONE' | 'PARTIAL' | 'PRESENT' {
  const observed = input.observations.filter((item) => item.state !== 'NOT_OBSERVED')
  if (observed.length === 0 || input.evidence.length === 0) return 'NONE'

  const supportedObservationKeys = new Set(
    input.evidence.flatMap((reference) =>
      reference.observationIds.map((observationId) => `${reference.teachingSessionId}:${observationId}`),
    ),
  )
  const covered = observed.filter((item) =>
    supportedObservationKeys.has(`${item.teachingSessionId}:${item.id}`),
  ).length

  if (covered === 0) return 'NONE'
  if (covered < observed.length) return 'PARTIAL'
  return 'PRESENT'
}

export function canApplyTeachingProposal(proposal: TeachingProposal): boolean {
  return proposal.status === 'ACCEPTED' || proposal.status === 'MODIFIED'
}
