import assert from 'node:assert/strict'
import test from 'node:test'
import type { TeacherEvidenceOccurrence, TeacherEvidenceProfile } from './timetable-teacher-evidence'
import {
  resolveTeacherAssignment,
  type TeacherAssignmentCandidate,
  type TeacherResolutionInput,
} from './timetable-teacher-resolution'

const profile: TeacherEvidenceProfile = {
  profileId: 'tt-teacher-resolution-test',
  profileVersion: '1',
  parserFamily: 'fixture',
  parserVersion: '1',
  allowedSignalKinds: ['teacher-key'],
  sameRules: [{ kind: 'teacher-key', comparator: 'EQUAL' }],
  distinctRules: [],
}

const evidence = (value: string): TeacherEvidenceOccurrence => ({
  occurrenceId: `source-${value}`,
  signals: [{ kind: 'teacher-key', value }],
})

const candidate = (assignmentId: string, value: string, classLabel = '2C'): TeacherAssignmentCandidate => ({
  assignmentId,
  workspaceId: 'ws',
  academicYearId: '2026-27',
  sectionId: `section-${classLabel}`,
  normalizedClassLabel: classLabel,
  teacherEvidence: {
    occurrenceId: `candidate-${assignmentId}`,
    signals: [{ kind: 'teacher-key', value }],
  },
})

const input = (overrides: Partial<TeacherResolutionInput> = {}): TeacherResolutionInput => ({
  sourceTeacherLabel: 'Rossi',
  sourceClassLabel: '2C',
  workspaceId: 'ws',
  academicYearId: '2026-27',
  evidence: evidence('teacher-1'),
  evidenceProfile: profile,
  assignmentCandidates: [candidate('a1', 'teacher-1')],
  ...overrides,
})

test('G1.6-B resolves exactly one evidence-compatible assignment', () => {
  const result = resolveTeacherAssignment(input())
  assert.equal(result.state, 'RESOLVED')
  assert.equal(result.resolvedAssignmentId, 'a1')
  assert.deepEqual(result.compatibleAssignmentIds, ['a1'])
  assert.equal(result.reasonCode, 'UNIQUE_EVIDENCE_MATCH')
})

test('G1.6-B normalizes canonically equivalent Unicode labels without using the label as identity evidence', () => {
  const composed = resolveTeacherAssignment(input({ sourceTeacherLabel: 'Róssi' }))
  const decomposed = resolveTeacherAssignment(input({ sourceTeacherLabel: 'Ro\u0301ssi' }))
  assert.equal(composed.normalizedTeacherLabel, decomposed.normalizedTeacherLabel)
  assert.equal(composed.resolvedAssignmentId, 'a1')
})

test('G1.6-B requires review when two assignments have the same positive evidence', () => {
  const result = resolveTeacherAssignment(input({
    assignmentCandidates: [candidate('a2', 'teacher-1'), candidate('a1', 'teacher-1')],
  }))
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'AMBIGUOUS_ASSIGNMENT')
  assert.deepEqual(result.compatibleAssignmentIds, ['a1', 'a2'])
  assert.equal('resolvedAssignmentId' in result, false)
})

test('G1.6-B does not resolve a surname match when class context is incompatible', () => {
  const result = resolveTeacherAssignment(input({ assignmentCandidates: [candidate('a1', 'teacher-1', '3C')] }))
  assert.equal(result.reasonCode, 'NO_COMPATIBLE_ASSIGNMENT')
  assert.equal(result.state, 'REVIEW_REQUIRED')
})

test('G1.6-B does not infer a discipline from a known class when evidence is insufficient', () => {
  const result = resolveTeacherAssignment(input({
    evidence: { occurrenceId: 'source', signals: [] },
    assignmentCandidates: [candidate('technology', 't1'), candidate('math', 't2')],
  }))
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'INSUFFICIENT_EVIDENCE')
})

test('G1.6-B returns NO_COMPATIBLE_ASSIGNMENT for an empty candidate set', () => {
  assert.equal(resolveTeacherAssignment(input({ assignmentCandidates: [] })).reasonCode, 'NO_COMPATIBLE_ASSIGNMENT')
})

test('G1.6-B fails closed on an invalid evidence profile', () => {
  const invalid = { ...profile, sameRules: [], distinctRules: [] }
  const result = resolveTeacherAssignment(input({ evidenceProfile: invalid }))
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'INVALID_EVIDENCE_PROFILE')
})

test('G1.6-B does not promote UNKNOWN alongside a positive match to RESOLVED', () => {
  const unknown: TeacherAssignmentCandidate = {
    ...candidate('a2', 'teacher-2'),
    teacherEvidence: { occurrenceId: 'candidate-a2', signals: [] },
  }
  const result = resolveTeacherAssignment(input({ assignmentCandidates: [candidate('a1', 'teacher-1'), unknown] }))
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'AMBIGUOUS_ASSIGNMENT')
})

test('G1.6-B fails closed for invalid Unicode scalar input', () => {
  const result = resolveTeacherAssignment(input({ sourceTeacherLabel: '\ud800' }))
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'INVALID_UNICODE_INPUT')
})

test('G1.6-B is independent from candidate input order', () => {
  const candidates = [candidate('a2', 'teacher-1'), candidate('a1', 'teacher-1')]
  const forward = resolveTeacherAssignment(input({ assignmentCandidates: candidates }))
  const reverse = resolveTeacherAssignment(input({ assignmentCandidates: [...candidates].reverse() }))
  assert.equal(JSON.stringify(forward), JSON.stringify(reverse))
})

test('G1.6-B is a pure boundary: its input remains byte-equivalent after resolution', () => {
  const value = input()
  const before = JSON.stringify(value)
  resolveTeacherAssignment(value)
  assert.equal(JSON.stringify(value), before)
})
