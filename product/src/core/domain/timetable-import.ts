export type ImportConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED'
export type ImportReviewState = 'AUTO_RESOLVED' | 'REVIEW_REQUIRED' | 'CONFIRMED' | 'REJECTED'
export type ProposedSlotKind = 'LESSON' | 'CLASS_PRESENCE' | 'DISPOSITION' | 'RECEPTION' | 'OTHER'

export interface TimetableImportCandidate {
  contractVersion: '1'
  candidateId: string
  workspaceId: string
  academicYearId: string
  sourceFingerprint: string
  sourceLabel: string
  sourceKind: 'INSTITUTION_DOCUMENT'
  effectiveFromCandidate?: string
  sourceIsProvisional: boolean
  revision: number
  rows: CandidateRow[]
}

export interface CandidateRow {
  rowId: string
  weekday?: number
  ordinal?: number
  startTime?: string
  endTime?: string
  sourceClassLabel?: string
  sourceTeacherLabel?: string
  resolvedSectionId?: string
  resolvedAssignmentId?: string
  proposedSlotKind?: ProposedSlotKind
  confidence: ImportConfidence
  reviewState: ImportReviewState
  evidenceRef: string
  warnings: string[]
}

export interface TeachingAssignmentSnapshot {
  id: string
  sectionId: string
  sectionLabel: string
  disciplineId: string
  active: boolean
}

export interface TimetableResolutionSnapshot {
  assignments: TeachingAssignmentSnapshot[]
}

export type DifferenceOperation =
  | { kind: 'KEEP'; slotId: string }
  | { kind: 'ADD'; candidateRowId: string }
  | { kind: 'MOVE'; slotId: string; candidateRowId: string }
  | { kind: 'CHANGE'; slotId: string; candidateRowId: string }
  | { kind: 'REMOVE'; slotId: string; explicitlyConfirmed: true }
  | { kind: 'IGNORE'; candidateRowId: string }

export interface DifferencePlan {
  candidateId: string
  candidateRevision: number
  expectedDraftVersionId: string
  expectedDraftRevision: number
  operations: DifferenceOperation[]
}

export interface ValidationIssue {
  code: string
  rowId?: string
  message: string
}

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/

function minutes(value: string): number | null {
  const match = timePattern.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function validateTimetableImportCandidate(candidate: TimetableImportCandidate): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!candidate.sourceFingerprint.trim()) issues.push({ code: 'SOURCE_FINGERPRINT_REQUIRED', message: 'Impronta sorgente obbligatoria.' })
  if (candidate.revision < 1 || !Number.isInteger(candidate.revision)) issues.push({ code: 'INVALID_REVISION', message: 'Revisione candidata non valida.' })

  for (const row of candidate.rows) {
    if (row.weekday !== undefined && (!Number.isInteger(row.weekday) || row.weekday < 1 || row.weekday > 7)) {
      issues.push({ code: 'INVALID_WEEKDAY', rowId: row.rowId, message: 'Giorno non valido.' })
    }
    if (row.ordinal !== undefined && (!Number.isInteger(row.ordinal) || row.ordinal < 1)) {
      issues.push({ code: 'INVALID_ORDINAL', rowId: row.rowId, message: 'Ordinalità non valida.' })
    }
    if (row.startTime && row.endTime) {
      const start = minutes(row.startTime)
      const end = minutes(row.endTime)
      if (start === null || end === null || start >= end) {
        issues.push({ code: 'INVALID_TIME_RANGE', rowId: row.rowId, message: 'Intervallo orario non valido.' })
      }
    }
    if (row.proposedSlotKind === 'LESSON' && row.reviewState !== 'REJECTED' && !row.resolvedAssignmentId) {
      issues.push({ code: 'LESSON_ASSIGNMENT_REQUIRED', rowId: row.rowId, message: 'Una lezione richiede una cattedra canonica risolta.' })
    }
    if (row.reviewState === 'AUTO_RESOLVED' && row.confidence === 'UNRESOLVED') {
      issues.push({ code: 'AUTO_RESOLUTION_WITHOUT_EVIDENCE', rowId: row.rowId, message: 'Risoluzione automatica priva di evidenza sufficiente.' })
    }
  }
  return issues
}

export function resolveCandidateRow(row: CandidateRow, snapshot: TimetableResolutionSnapshot): CandidateRow {
  if (!row.sourceClassLabel) return { ...row, reviewState: 'REVIEW_REQUIRED', confidence: 'UNRESOLVED' }

  const matches = snapshot.assignments.filter(
    assignment => assignment.active && assignment.sectionLabel.trim().toLocaleLowerCase('it-IT') === row.sourceClassLabel!.trim().toLocaleLowerCase('it-IT'),
  )

  // G0/G1: il nominativo letto dal documento non determina la disciplina.
  // Solo una cattedra canonica univoca per la classe può risolvere automaticamente LESSON.
  if (matches.length !== 1) {
    return { ...row, resolvedAssignmentId: undefined, proposedSlotKind: undefined, reviewState: 'REVIEW_REQUIRED' }
  }

  return {
    ...row,
    resolvedSectionId: matches[0].sectionId,
    resolvedAssignmentId: matches[0].id,
    proposedSlotKind: 'LESSON',
    reviewState: 'AUTO_RESOLVED',
  }
}

export function validateDifferencePlan(plan: DifferencePlan): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (plan.candidateRevision < 1 || plan.expectedDraftRevision < 0) {
    issues.push({ code: 'INVALID_PLAN_REVISION', message: 'Revisione del piano non valida.' })
  }
  // REMOVE esiste solo come operazione esplicita e confermata: l'assenza dal candidato non genera rimozioni.
  for (const operation of plan.operations) {
    if (operation.kind === 'REMOVE' && operation.explicitlyConfirmed !== true) {
      issues.push({ code: 'UNCONFIRMED_REMOVE', message: 'La rimozione deve essere confermata esplicitamente.' })
    }
  }
  return issues
}
