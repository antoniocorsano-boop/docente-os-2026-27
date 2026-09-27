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
  workspaceId: string
  sectionId: string
  sectionLabel: string
  disciplineId: string
  active: boolean
}

export interface TimetableResolutionSnapshot {
  workspaceId: string
  scope: 'WORKSPACE_PROJECTED'
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

function isApplicableRow(row: CandidateRow): boolean {
  return row.reviewState === 'AUTO_RESOLVED' || row.reviewState === 'CONFIRMED'
}

export function validateTimetableImportCandidate(candidate: TimetableImportCandidate): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!candidate.sourceFingerprint.trim()) issues.push({ code: 'SOURCE_FINGERPRINT_REQUIRED', message: 'Impronta sorgente obbligatoria.' })
  if (candidate.revision < 1 || !Number.isInteger(candidate.revision)) issues.push({ code: 'INVALID_REVISION', message: 'Revisione candidata non valida.' })

  const seenRowIds = new Set<string>()
  for (const row of candidate.rows) {
    if (seenRowIds.has(row.rowId)) issues.push({ code: 'DUPLICATE_ROW_ID', rowId: row.rowId, message: 'Identificativo riga duplicato.' })
    seenRowIds.add(row.rowId)

    if (isApplicableRow(row)) {
      if (row.weekday === undefined) issues.push({ code: 'WEEKDAY_REQUIRED', rowId: row.rowId, message: 'Giorno obbligatorio per una riga applicabile.' })
      if (row.ordinal === undefined) issues.push({ code: 'ORDINAL_REQUIRED', rowId: row.rowId, message: 'Ordinalità obbligatoria per una riga applicabile.' })
      if (!row.startTime) issues.push({ code: 'START_TIME_REQUIRED', rowId: row.rowId, message: 'Ora di inizio obbligatoria per una riga applicabile.' })
      if (!row.endTime) issues.push({ code: 'END_TIME_REQUIRED', rowId: row.rowId, message: 'Ora di fine obbligatoria per una riga applicabile.' })
      if (!row.proposedSlotKind) issues.push({ code: 'SLOT_KIND_REQUIRED', rowId: row.rowId, message: 'Tipo di slot obbligatorio per una riga applicabile.' })
    }

    if (row.weekday !== undefined && (!Number.isInteger(row.weekday) || row.weekday < 1 || row.weekday > 7)) {
      issues.push({ code: 'INVALID_WEEKDAY', rowId: row.rowId, message: 'Giorno non valido.' })
    }
    if (row.ordinal !== undefined && (!Number.isInteger(row.ordinal) || row.ordinal < 1)) {
      issues.push({ code: 'INVALID_ORDINAL', rowId: row.rowId, message: 'Ordinalità non valida.' })
    }
    if (row.startTime || row.endTime) {
      const start = row.startTime ? minutes(row.startTime) : null
      const end = row.endTime ? minutes(row.endTime) : null
      if ((row.startTime && start === null) || (row.endTime && end === null) || (start !== null && end !== null && start >= end)) {
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

export function resolveCandidateRow(row: CandidateRow, candidateWorkspaceId: string, snapshot: TimetableResolutionSnapshot): CandidateRow {
  if (!row.sourceClassLabel || snapshot.scope !== 'WORKSPACE_PROJECTED' || snapshot.workspaceId !== candidateWorkspaceId) {
    return { ...row, resolvedAssignmentId: undefined, proposedSlotKind: undefined, reviewState: 'REVIEW_REQUIRED', confidence: 'UNRESOLVED' }
  }

  const matches = snapshot.assignments.filter(
    assignment =>
      assignment.active &&
      assignment.workspaceId === candidateWorkspaceId &&
      assignment.sectionLabel.trim().toLocaleLowerCase('it-IT') === row.sourceClassLabel!.trim().toLocaleLowerCase('it-IT'),
  )

  // G0/G1: il nominativo letto dal documento non determina la disciplina.
  // Solo una cattedra canonica univoca, già proiettata sul workspace del docente, può risolvere automaticamente LESSON.
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

function candidateRowId(operation: DifferenceOperation): string | undefined {
  return 'candidateRowId' in operation ? operation.candidateRowId : undefined
}

function destructiveSlotId(operation: DifferenceOperation): string | undefined {
  return operation.kind === 'MOVE' || operation.kind === 'CHANGE' || operation.kind === 'REMOVE' ? operation.slotId : undefined
}

export function validateDifferencePlan(plan: DifferencePlan, candidate: TimetableImportCandidate): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (plan.candidateRevision < 1 || plan.expectedDraftRevision < 0) {
    issues.push({ code: 'INVALID_PLAN_REVISION', message: 'Revisione del piano non valida.' })
  }
  if (plan.candidateId !== candidate.candidateId || plan.candidateRevision !== candidate.revision) {
    issues.push({ code: 'CANDIDATE_REVISION_MISMATCH', message: 'Il piano non corrisponde al candidato e alla revisione validati.' })
  }

  const validRowIds = new Set(candidate.rows.map(row => row.rowId))
  const referencedRows = new Set<string>()
  const destructiveSlots = new Set<string>()

  for (const operation of plan.operations) {
    const rowId = candidateRowId(operation)
    if (rowId) {
      if (!validRowIds.has(rowId)) issues.push({ code: 'UNKNOWN_CANDIDATE_ROW', rowId, message: 'Il piano riferisce una riga non appartenente al candidato.' })
      if (referencedRows.has(rowId)) issues.push({ code: 'DUPLICATE_CANDIDATE_OPERATION', rowId, message: 'La stessa riga candidata è usata da più operazioni.' })
      referencedRows.add(rowId)
    }

    const slotId = destructiveSlotId(operation)
    if (slotId) {
      if (destructiveSlots.has(slotId)) issues.push({ code: 'CONFLICTING_SLOT_OPERATION', message: 'Lo stesso slot è oggetto di più operazioni distruttive.' })
      destructiveSlots.add(slotId)
    }

    if (operation.kind === 'REMOVE' && operation.explicitlyConfirmed !== true) {
      issues.push({ code: 'UNCONFIRMED_REMOVE', message: 'La rimozione deve essere confermata esplicitamente.' })
    }
  }
  return issues
}
