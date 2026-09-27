import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveCandidateRow,
  validateDifferencePlan,
  validateTimetableImportCandidate,
  type CandidateRow,
  type TimetableImportCandidate,
} from './timetable-import'

const row = (overrides: Partial<CandidateRow> = {}): CandidateRow => ({
  rowId: 'row-1',
  weekday: 1,
  ordinal: 1,
  startTime: '08:00',
  endTime: '09:00',
  sourceClassLabel: '2C',
  sourceTeacherLabel: 'DOCENTE',
  confidence: 'HIGH',
  reviewState: 'REVIEW_REQUIRED',
  evidenceRef: 'cell:L1-H1',
  warnings: [],
  ...overrides,
})

const candidate = (rows: CandidateRow[]): TimetableImportCandidate => ({
  contractVersion: '1',
  candidateId: 'candidate-1',
  workspaceId: 'workspace-1',
  academicYearId: '2026-27',
  sourceFingerprint: 'sha256:synthetic-fixture',
  sourceLabel: 'Fixture sintetica equivalente al 28-09-2026',
  sourceKind: 'INSTITUTION_DOCUMENT',
  effectiveFromCandidate: '2026-09-28',
  sourceIsProvisional: true,
  revision: 1,
  rows,
})

test('fixture sintetica valida conserva provenienza e provvisorieta senza attivare nulla', () => {
  const resolved = row({ resolvedAssignmentId: 'assignment-2c-tech', proposedSlotKind: 'LESSON', reviewState: 'CONFIRMED' })
  assert.deepEqual(validateTimetableImportCandidate(candidate([resolved])), [])
})

test('resolver risolve LESSON solo con una cattedra canonica univoca per la classe', () => {
  const resolved = resolveCandidateRow(row(), {
    assignments: [{ id: 'a1', sectionId: 's2c', sectionLabel: '2C', disciplineId: 'tecnologia', active: true }],
  })
  assert.equal(resolved.resolvedAssignmentId, 'a1')
  assert.equal(resolved.proposedSlotKind, 'LESSON')
  assert.equal(resolved.reviewState, 'AUTO_RESOLVED')
})

test('resolver non deduce la disciplina dal nominativo se due cattedre sono plausibili', () => {
  const unresolved = resolveCandidateRow(row({ sourceTeacherLabel: 'ROSSI' }), {
    assignments: [
      { id: 'a1', sectionId: 's2c', sectionLabel: '2C', disciplineId: 'tecnologia', active: true },
      { id: 'a2', sectionId: 's2c', sectionLabel: '2C', disciplineId: 'ed-civica', active: true },
    ],
  })
  assert.equal(unresolved.resolvedAssignmentId, undefined)
  assert.equal(unresolved.reviewState, 'REVIEW_REQUIRED')
})

test('LESSON senza teaching assignment canonica e bloccante', () => {
  const issues = validateTimetableImportCandidate(candidate([row({ proposedSlotKind: 'LESSON' })]))
  assert.equal(issues.some(issue => issue.code === 'LESSON_ASSIGNMENT_REQUIRED'), true)
})

test('intervallo invertito viene rifiutato', () => {
  const issues = validateTimetableImportCandidate(candidate([row({ startTime: '10:00', endTime: '09:00' })]))
  assert.equal(issues.some(issue => issue.code === 'INVALID_TIME_RANGE'), true)
})

test('piano senza REMOVE non inventa cancellazioni per assenza', () => {
  const issues = validateDifferencePlan({
    candidateId: 'candidate-1',
    candidateRevision: 1,
    expectedDraftVersionId: 'draft-1',
    expectedDraftRevision: 7,
    operations: [{ kind: 'ADD', candidateRowId: 'row-1' }],
  })
  assert.deepEqual(issues, [])
})
