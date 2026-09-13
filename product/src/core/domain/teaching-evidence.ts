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

export type TeachingSessionRef = {
  id: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  blockId: string | null
  udaId: string | null
  localDate: string
}

export type TeachingObservation = {
  id: string
  teachingSessionId: string
  scope: ObservationScope
  anonymousGroupKey: string | null
  dimensionKey: TeachingEvidenceDimensionKey | string
  state: ObservationState
  note: string | null
  source: ObservationSource
  createdAt: string
}

export type TeachingEvidence = {
  id: string
  teachingSessionId: string
  kind: EvidenceKind
  description: string
  knowledgeAssetId: string | null
  externalReference: string | null
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

export function validateTeachingObservation(observation: TeachingObservation): string[] {
  const errors: string[] = []

  if (!observation.teachingSessionId.trim()) errors.push('teachingSessionId is required')
  if (!observation.dimensionKey.trim()) errors.push('dimensionKey is required')

  if (observation.scope === 'CLASS' && observation.anonymousGroupKey !== null) {
    errors.push('CLASS observations cannot carry anonymousGroupKey')
  }

  if (observation.scope === 'ANONYMOUS_GROUP' && !observation.anonymousGroupKey?.trim()) {
    errors.push('ANONYMOUS_GROUP observations require anonymousGroupKey')
  }

  return errors
}

export function canInferLongitudinalSignal(input: {
  observations: TeachingObservation[]
  comparableSessionIds: string[]
}): boolean {
  const comparable = new Set(input.comparableSessionIds)
  const sessions = new Set(
    input.observations
      .filter((item) => item.state !== 'NOT_OBSERVED')
      .filter((item) => comparable.has(item.teachingSessionId))
      .map((item) => item.teachingSessionId),
  )

  return sessions.size >= 2
}

export function deriveEvidenceCoverage(input: {
  observations: TeachingObservation[]
  evidence: TeachingEvidence[]
}): 'NONE' | 'PARTIAL' | 'PRESENT' {
  const observed = input.observations.filter((item) => item.state !== 'NOT_OBSERVED')
  if (observed.length === 0 || input.evidence.length === 0) return 'NONE'

  const sessionIds = new Set(input.evidence.map((item) => item.teachingSessionId))
  const covered = observed.filter((item) => sessionIds.has(item.teachingSessionId)).length

  if (covered === 0) return 'NONE'
  if (covered < observed.length) return 'PARTIAL'
  return 'PRESENT'
}

export function canApplyTeachingProposal(proposal: TeachingProposal): boolean {
  return proposal.status === 'ACCEPTED' || proposal.status === 'MODIFIED'
}
