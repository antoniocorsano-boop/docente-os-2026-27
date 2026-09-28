import { describe, expect, it } from 'vitest'
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

describe('G1.6-B teacher resolution boundary', () => {
  it('resolves exactly one evidence-compatible assignment', () => {
    expect(resolveTeacherAssignment(input())).toMatchObject({
      state: 'RESOLVED',
      resolvedAssignmentId: 'a1',
      compatibleAssignmentIds: ['a1'],
      reasonCode: 'UNIQUE_EVIDENCE_MATCH',
    })
  })

  it('normalizes canonically equivalent Unicode labels without using the label as identity evidence', () => {
    const composed = resolveTeacherAssignment(input({ sourceTeacherLabel: 'Róssi' }))
    const decomposed = resolveTeacherAssignment(input({ sourceTeacherLabel: 'Ro\u0301ssi' }))
    expect(composed.normalizedTeacherLabel).toBe(decomposed.normalizedTeacherLabel)
    expect(composed.resolvedAssignmentId).toBe('a1')
  })

  it('requires review when two assignments have the same positive evidence', () => {
    const result = resolveTeacherAssignment(input({
      assignmentCandidates: [candidate('a2', 'teacher-1'), candidate('a1', 'teacher-1')],
    }))
    expect(result).toMatchObject({
      state: 'REVIEW_REQUIRED',
      reasonCode: 'AMBIGUOUS_ASSIGNMENT',
      compatibleAssignmentIds: ['a1', 'a2'],
    })
    expect(result).not.toHaveProperty('resolvedAssignmentId')
  })

  it('does not resolve a surname match when class context is incompatible', () => {
    const result = resolveTeacherAssignment(input({ assignmentCandidates: [candidate('a1', 'teacher-1', '3C')] }))
    expect(result.reasonCode).toBe('NO_COMPATIBLE_ASSIGNMENT')
    expect(result.state).toBe('REVIEW_REQUIRED')
  })

  it('does not infer a discipline from a known class when evidence is insufficient', () => {
    const result = resolveTeacherAssignment(input({
      evidence: { occurrenceId: 'source', signals: [] },
      assignmentCandidates: [candidate('technology', 't1'), candidate('math', 't2')],
    }))
    expect(result.state).toBe('REVIEW_REQUIRED')
    expect(result.reasonCode).toBe('INSUFFICIENT_EVIDENCE')
  })

  it('returns NO_COMPATIBLE_ASSIGNMENT for an empty candidate set', () => {
    expect(resolveTeacherAssignment(input({ assignmentCandidates: [] })).reasonCode).toBe('NO_COMPATIBLE_ASSIGNMENT')
  })

  it('fails closed on an invalid evidence profile', () => {
    const invalid = { ...profile, sameRules: [], distinctRules: [] }
    const result = resolveTeacherAssignment(input({ evidenceProfile: invalid }))
    expect(result.state).toBe('REVIEW_REQUIRED')
    expect(result.reasonCode).toBe('INVALID_EVIDENCE_PROFILE')
  })

  it('does not promote UNKNOWN alongside a positive match to RESOLVED', () => {
    const unknown: TeacherAssignmentCandidate = {
      ...candidate('a2', 'teacher-2'),
      teacherEvidence: { occurrenceId: 'candidate-a2', signals: [] },
    }
    const result = resolveTeacherAssignment(input({ assignmentCandidates: [candidate('a1', 'teacher-1'), unknown] }))
    expect(result.state).toBe('REVIEW_REQUIRED')
    expect(result.reasonCode).toBe('AMBIGUOUS_ASSIGNMENT')
  })

  it('fails closed for invalid Unicode scalar input', () => {
    const result = resolveTeacherAssignment(input({ sourceTeacherLabel: '\ud800' }))
    expect(result.state).toBe('REVIEW_REQUIRED')
    expect(result.reasonCode).toBe('INVALID_UNICODE_INPUT')
  })

  it('is independent from candidate input order', () => {
    const candidates = [candidate('a2', 'teacher-1'), candidate('a1', 'teacher-1')]
    const forward = resolveTeacherAssignment(input({ assignmentCandidates: candidates }))
    const reverse = resolveTeacherAssignment(input({ assignmentCandidates: [...candidates].reverse() }))
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse))
  })

  it('is a pure boundary: its input remains byte-equivalent after resolution', () => {
    const value = input()
    const before = JSON.stringify(value)
    resolveTeacherAssignment(value)
    expect(JSON.stringify(value)).toBe(before)
  })
})
