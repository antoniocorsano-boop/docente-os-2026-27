import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveCandidateRow,
  validateDifferencePlan,
  validateTimetableImportCandidate,
  type CandidateRow,
  type TimetableImportCandidate,
  type TimetableResolutionSnapshot,
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

const candidate = (rows: CandidateRow[], overrides: Partial<TimetableImportCandidate> = {}): TimetableImportCandidate => ({
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
  ...overrides,
})

const snapshot = (assignments: TimetableResolutionSnapshot['assignments'], workspaceId = 'workspace-1'): TimetableResolutionSnapshot => ({
  workspaceId,
  scope: 'WORKSPACE_PROJECTED',
  assignments,
})

test('fixture sintetica valida conserva provenienza e provvisorieta senza attivare nulla', () => {
  const resolved = row({ resolvedAssignmentId: 'assignment-2c-tech', proposedSlotKind: 'LESSON', reviewState: 'CONFIRMED' })
  assert.deepEqual(validateTimetableImportCandidate(candidate([resolved])), [])
})

test('resolver risolve LESSON solo con una cattedra canonica univoca gia proiettata sul workspace', () => {
  const resolved = resolveCandidateRow(
    row(),
    'workspace-1',
    snapshot([{ id: 'a1', workspaceId: 'workspace-1', sectionId: 's2c', sectionLabel: '2C', disciplineId: 'tecnologia', active: true }]),
  )
  assert.equal(resolved.resolvedAssignmentId, 'a1')
  assert.equal(resolved.proposedSlotKind, 'LESSON')
  assert.equal(resolved.reviewState, 'AUTO_RESOLVED')
})

test('resolver non auto-risolve quando lo snapshot appartiene a un workspace diverso', () => {
  const unresolved = resolveCandidateRow(
    row(),
    'workspace-1',
    snapshot([{ id: 'a1', workspaceId: 'workspace-2', sectionId: 's2c', sectionLabel: '2C', disciplineId: 'tecnologia', active: true }], 'workspace-2'),
  )
  assert.equal(unresolved.resolvedAssignmentId, undefined)
  assert.equal(unresolved.reviewState, 'REVIEW_REQUIRED')
})

test('resolver non deduce la disciplina dal nominativo se due cattedre sono plausibili', () => {
  const unresolved = resolveCandidateRow(
    row({ sourceTeacherLabel: 'ROSSI' }),
    'workspace-1',
    snapshot([
      { id: 'a1', workspaceId: 'workspace-1', sectionId: 's2c', sectionLabel: '2C', disciplineId: 'tecnologia', active: true },
      { id: 'a2', workspaceId: 'workspace-1', sectionId: 's2c', sectionLabel: '2C', disciplineId: 'ed-civica', active: true },
    ]),
  )
  assert.equal(unresolved.resolvedAssignmentId, undefined)
  assert.equal(unresolved.reviewState, 'REVIEW_REQUIRED')
})

test('LESSON senza teaching assignment canonica e bloccante', () => {
  const issues = validateTimetableImportCandidate(candidate([row({ proposedSlotKind: 'LESSON' })]))
  assert.equal(issues.some(issue => issue.code === 'LESSON_ASSIGNMENT_REQUIRED'), true)
})

test('riga applicabile incompleta viene bloccata', () => {
  const issues = validateTimetableImportCandidate(candidate([row({ weekday: undefined, endTime: undefined, proposedSlotKind: 'LESSON', resolvedAssignmentId: 'a1', reviewState: 'CONFIRMED' })]))
  assert.equal(issues.some(issue => issue.code === 'WEEKDAY_REQUIRED'), true)
  assert.equal(issues.some(issue => issue.code === 'END_TIME_REQUIRED'), true)
})

test('intervallo invertito viene rifiutato', () => {
  const issues = validateTimetableImportCandidate(candidate([row({ startTime: '10:00', endTime: '09:00' })]))
  assert.equal(issues.some(issue => issue.code === 'INVALID_TIME_RANGE'), true)
})

test('piano valido lega le operazioni alla revisione candidata', () => {
  const source = candidate([row()])
  const issues = validateDifferencePlan({
    candidateId: 'candidate-1',
    candidateRevision: 1,
    expectedDraftVersionId: 'draft-1',
    expectedDraftRevision: 7,
    operations: [{ kind: 'ADD', candidateRowId: 'row-1' }],
  }, source)
  assert.deepEqual(issues, [])
})

test('piano rifiuta riga estranea e revisione candidata diversa', () => {
  const source = candidate([row()])
  const issues = validateDifferencePlan({
    candidateId: 'candidate-1',
    candidateRevision: 2,
    expectedDraftVersionId: 'draft-1',
    expectedDraftRevision: 7,
    operations: [{ kind: 'ADD', candidateRowId: 'row-x' }],
  }, source)
  assert.equal(issues.some(issue => issue.code === 'CANDIDATE_REVISION_MISMATCH'), true)
  assert.equal(issues.some(issue => issue.code === 'UNKNOWN_CANDIDATE_ROW'), true)
})

test('piano rifiuta operazioni duplicate sulla stessa riga candidata', () => {
  const source = candidate([row()])
  const issues = validateDifferencePlan({
    candidateId: 'candidate-1',
    candidateRevision: 1,
    expectedDraftVersionId: 'draft-1',
    expectedDraftRevision: 7,
    operations: [
      { kind: 'ADD', candidateRowId: 'row-1' },
      { kind: 'IGNORE', candidateRowId: 'row-1' },
    ],
  }, source)
  assert.equal(issues.some(issue => issue.code === 'DUPLICATE_CANDIDATE_OPERATION'), true)
})

test('piano rifiuta due operazioni distruttive sullo stesso slot', () => {
  const source = candidate([row(), row({ rowId: 'row-2' })])
  const issues = validateDifferencePlan({
    candidateId: 'candidate-1',
    candidateRevision: 1,
    expectedDraftVersionId: 'draft-1',
    expectedDraftRevision: 7,
    operations: [
      { kind: 'MOVE', slotId: 'slot-1', candidateRowId: 'row-1' },
      { kind: 'CHANGE', slotId: 'slot-1', candidateRowId: 'row-2' },
    ],
  }, source)
  assert.equal(issues.some(issue => issue.code === 'CONFLICTING_SLOT_OPERATION'), true)
})

test('REMOVE e valido solo quando esplicitamente confermato nel piano', () => {
  const source = candidate([row()])
  const issues = validateDifferencePlan({
    candidateId: 'candidate-1',
    candidateRevision: 1,
    expectedDraftVersionId: 'draft-1',
    expectedDraftRevision: 7,
    operations: [{ kind: 'REMOVE', slotId: 'slot-1', explicitlyConfirmed: true }],
  }, source)
  assert.deepEqual(issues, [])
})
