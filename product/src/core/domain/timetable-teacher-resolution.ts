import {
  diagnoseTeacherEvidence,
  normalizeTeacherLabel,
  validateTeacherEvidenceProfile,
  type TeacherEvidenceOccurrence,
  type TeacherEvidenceProfile,
} from './timetable-teacher-evidence'

export type TeacherResolutionReason =
  | 'UNIQUE_EVIDENCE_MATCH'
  | 'NO_COMPATIBLE_ASSIGNMENT'
  | 'AMBIGUOUS_ASSIGNMENT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'INVALID_EVIDENCE_PROFILE'
  | 'CONTRADICTORY_EVIDENCE'
  | 'INVALID_UNICODE_INPUT'

export type TeacherAssignmentCandidate = Readonly<{
  assignmentId: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  normalizedClassLabel?: string
  teacherEvidence: TeacherEvidenceOccurrence
}>

export type TeacherResolutionInput = Readonly<{
  sourceTeacherLabel: string
  sourceClassLabel?: string
  workspaceId: string
  academicYearId: string
  evidence: TeacherEvidenceOccurrence
  evidenceProfile: TeacherEvidenceProfile | null | undefined
  assignmentCandidates: readonly TeacherAssignmentCandidate[]
}>

export type TeacherResolutionResult = Readonly<{
  state: 'RESOLVED' | 'REVIEW_REQUIRED'
  normalizedTeacherLabel: string
  resolvedAssignmentId?: string
  compatibleAssignmentIds: readonly string[]
  reasonCode: TeacherResolutionReason
  evidenceSummary: Readonly<{
    evaluatedCandidates: number
    sameCandidates: number
    unknownCandidates: number
    distinctCandidates: number
    contradictoryCandidates: number
  }>
}>

/** Pure G1.6-B boundary: deterministic, fail-closed and side-effect free. */
export function resolveTeacherAssignment(input: TeacherResolutionInput): TeacherResolutionResult {
  let normalizedTeacherLabel: string
  try {
    normalizedTeacherLabel = normalizeTeacherLabel(input.sourceTeacherLabel)
  } catch {
    return review('', 'INVALID_UNICODE_INPUT', [], 0, 0, 0, 0, 0)
  }

  if (!validateTeacherEvidenceProfile(input.evidenceProfile) || !input.evidenceProfile) {
    return review(normalizedTeacherLabel, 'INVALID_EVIDENCE_PROFILE', [], 0, 0, 0, 0, 0)
  }

  const candidates = input.assignmentCandidates
    .filter((candidate) =>
      candidate.workspaceId === input.workspaceId &&
      candidate.academicYearId === input.academicYearId &&
      classCompatible(input.sourceClassLabel, candidate.normalizedClassLabel),
    )
    .slice()
    .sort((a, b) => a.assignmentId.localeCompare(b.assignmentId))

  if (candidates.length === 0) {
    return review(normalizedTeacherLabel, 'NO_COMPATIBLE_ASSIGNMENT', [], 0, 0, 0, 0, 0)
  }

  const same: string[] = []
  let insufficient = 0
  let contradictory = 0
  let distinct = 0

  for (const candidate of candidates) {
    const diagnostic = diagnoseTeacherEvidence(input.evidence, candidate.teacherEvidence, input.evidenceProfile)
    if (diagnostic === 'SAME') same.push(candidate.assignmentId)
    else if (diagnostic === 'CONTRADICTORY') contradictory += 1
    else if (diagnostic === 'INSUFFICIENT') insufficient += 1
    else distinct += 1
  }

  const compatibleAssignmentIds = [...same].sort()
  const summary = {
    evaluatedCandidates: candidates.length,
    sameCandidates: same.length,
    unknownCandidates: insufficient + contradictory,
    distinctCandidates: distinct,
    contradictoryCandidates: contradictory,
  }

  // Contradiction has precedence: it must never be hidden by another positive candidate.
  if (contradictory > 0) {
    return reviewWithSummary(normalizedTeacherLabel, 'CONTRADICTORY_EVIDENCE', compatibleAssignmentIds, summary)
  }

  // Any unresolved evidence alongside a positive match prevents silent auto-resolution.
  if (same.length === 1 && insufficient === 0) {
    return {
      state: 'RESOLVED',
      normalizedTeacherLabel,
      resolvedAssignmentId: same[0],
      compatibleAssignmentIds,
      reasonCode: 'UNIQUE_EVIDENCE_MATCH',
      evidenceSummary: summary,
    }
  }

  if (same.length > 1 || (same.length === 1 && insufficient > 0)) {
    return reviewWithSummary(normalizedTeacherLabel, 'AMBIGUOUS_ASSIGNMENT', compatibleAssignmentIds, summary)
  }

  if (insufficient > 0) {
    return reviewWithSummary(normalizedTeacherLabel, 'INSUFFICIENT_EVIDENCE', compatibleAssignmentIds, summary)
  }

  return reviewWithSummary(normalizedTeacherLabel, 'NO_COMPATIBLE_ASSIGNMENT', compatibleAssignmentIds, summary)
}

function classCompatible(sourceClassLabel: string | undefined, candidateClassLabel: string | undefined): boolean {
  if (!sourceClassLabel) return true
  if (!candidateClassLabel) return false
  return normalizeSimpleClassLabel(sourceClassLabel) === normalizeSimpleClassLabel(candidateClassLabel)
}

function normalizeSimpleClassLabel(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toUpperCase()
}

function review(
  normalizedTeacherLabel: string,
  reasonCode: TeacherResolutionReason,
  compatibleAssignmentIds: readonly string[],
  evaluatedCandidates: number,
  sameCandidates: number,
  unknownCandidates: number,
  distinctCandidates: number,
  contradictoryCandidates: number,
): TeacherResolutionResult {
  return reviewWithSummary(normalizedTeacherLabel, reasonCode, compatibleAssignmentIds, {
    evaluatedCandidates,
    sameCandidates,
    unknownCandidates,
    distinctCandidates,
    contradictoryCandidates,
  })
}

function reviewWithSummary(
  normalizedTeacherLabel: string,
  reasonCode: TeacherResolutionReason,
  compatibleAssignmentIds: readonly string[],
  evidenceSummary: TeacherResolutionResult['evidenceSummary'],
): TeacherResolutionResult {
  return {
    state: 'REVIEW_REQUIRED',
    normalizedTeacherLabel,
    compatibleAssignmentIds: [...compatibleAssignmentIds].sort(),
    reasonCode,
    evidenceSummary,
  }
}
