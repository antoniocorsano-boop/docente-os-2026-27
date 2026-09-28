import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTimetableImportCandidate,
  type ExtractedTimetableSlot,
  type TimetableSourceProvenance,
} from './timetable-import-candidate'
import type { TeacherResolutionResult } from './timetable-teacher-resolution'

const digest = 'a'.repeat(64)

const resolved: TeacherResolutionResult = {
  state: 'RESOLVED',
  normalizedTeacherLabel: 'rossi',
  resolvedAssignmentId: 'assignment-1',
  compatibleAssignmentIds: ['assignment-1'],
  reasonCode: 'UNIQUE_EVIDENCE_MATCH',
  evidenceSummary: { evaluatedCandidates: 1, sameCandidates: 1, unknownCandidates: 0, distinctCandidates: 0, contradictoryCandidates: 0 },
}

const unresolved: TeacherResolutionResult = {
  state: 'REVIEW_REQUIRED',
  normalizedTeacherLabel: 'rossi',
  compatibleAssignmentIds: [],
  reasonCode: 'INSUFFICIENT_EVIDENCE',
  evidenceSummary: { evaluatedCandidates: 1, sameCandidates: 0, unknownCandidates: 1, distinctCandidates: 0, contradictoryCandidates: 0 },
}

function provenance(overrides: Partial<TimetableSourceProvenance> = {}): TimetableSourceProvenance {
  return {
    sourceFingerprint: { algorithm: 'SHA-256', digest },
    sourceKind: 'OFFICIAL_DOCUMENT',
    sourceLabel: 'orario provvisorio.pdf',
    effectiveFrom: '2026-09-28',
    ...overrides,
  }
}

function slot(overrides: Partial<ExtractedTimetableSlot> = {}): ExtractedTimetableSlot {
  return {
    day: 1,
    sourcePosition: '1',
    classLabel: '2 A',
    sourceTeacherLabel: 'Rossi',
    teacherResolution: resolved,
    ...overrides,
  }
}

test('G1.6-C builds PREVIEW_READY candidate without inventing an end date', () => {
  const result = buildTimetableImportCandidate(provenance(), [slot()])
  assert.equal(result.state, 'PREVIEW_READY')
  assert.equal(result.reasonCode, 'READY')
  assert.equal(result.provenance.effectiveFrom, '2026-09-28')
  assert.equal('effectiveTo' in result.provenance, false)
})

test('G1.6-C fails closed on invalid source fingerprint', () => {
  const result = buildTimetableImportCandidate(
    provenance({ sourceFingerprint: { algorithm: 'SHA-256', digest: 'ABC' } }),
    [slot()],
  )
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'INVALID_SOURCE_FINGERPRINT')
})

test('G1.6-C rejects impossible ISO dates', () => {
  const result = buildTimetableImportCandidate(provenance({ effectiveFrom: '2026-02-30' }), [slot()])
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'INVALID_EFFECTIVE_FROM')
})

test('G1.6-C requires human review when G1.6-B did not resolve a teacher', () => {
  const result = buildTimetableImportCandidate(provenance(), [slot({ teacherResolution: unresolved })])
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'TEACHER_REVIEW_REQUIRED')
})

test('G1.6-C rejects conflicting occupancy for the same day, position and class', () => {
  const result = buildTimetableImportCandidate(provenance(), [
    slot(),
    slot({ sourceTeacherLabel: 'Bianchi', teacherResolution: { ...resolved, normalizedTeacherLabel: 'bianchi', resolvedAssignmentId: 'assignment-2', compatibleAssignmentIds: ['assignment-2'] } }),
  ])
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'DUPLICATE_SLOT_CONFLICT')
})

test('G1.6-C exact duplicate slot is idempotent', () => {
  const one = buildTimetableImportCandidate(provenance(), [slot()])
  const duplicate = buildTimetableImportCandidate(provenance(), [slot(), slot()])
  assert.equal(duplicate.state, 'PREVIEW_READY')
  assert.equal(duplicate.slots.length, 1)
  assert.equal(duplicate.candidateId, one.candidateId)
})

test('G1.6-C slot permutation does not change candidate identity', () => {
  const first = slot()
  const second = slot({ day: 2, sourcePosition: '2', classLabel: '3 C' })
  const a = buildTimetableImportCandidate(provenance(), [first, second])
  const b = buildTimetableImportCandidate(provenance(), [second, first])
  assert.equal(a.candidateId, b.candidateId)
})

test('G1.6-C source rename and capture time do not change candidate identity', () => {
  const a = buildTimetableImportCandidate(provenance(), [slot()])
  const b = buildTimetableImportCandidate(provenance({ sourceLabel: 'rinominato.pdf', capturedAt: '2026-09-28T08:00:00+02:00' }), [slot()])
  assert.equal(a.candidateId, b.candidateId)
})

test('G1.6-C a different effective date changes candidate identity', () => {
  const a = buildTimetableImportCandidate(provenance(), [slot()])
  const b = buildTimetableImportCandidate(provenance({ effectiveFrom: '2026-10-05' }), [slot()])
  assert.notEqual(a.candidateId, b.candidateId)
})

test('G1.6-C rejects empty and structurally invalid timetables', () => {
  assert.equal(buildTimetableImportCandidate(provenance(), []).reasonCode, 'EMPTY_TIMETABLE')
  assert.equal(buildTimetableImportCandidate(provenance(), [slot({ day: 0 })]).reasonCode, 'INVALID_SLOT')
})

test('G1.6-C input objects remain byte-equivalent after building', () => {
  const p = provenance()
  const slots = [slot()]
  const before = JSON.stringify({ p, slots })
  buildTimetableImportCandidate(p, slots)
  assert.equal(JSON.stringify({ p, slots }), before)
})

test('G1.6-C canonical identity framing distinguishes values containing former separators', () => {
  const first = buildTimetableImportCandidate(provenance(), [
    slot({ sourcePosition: '1::2', classLabel: 'A|B', sourceTeacherLabel: 'Rossi::Verdi' }),
  ])
  const second = buildTimetableImportCandidate(provenance(), [
    slot({ sourcePosition: '1', classLabel: '2::A|B', sourceTeacherLabel: 'Rossi::Verdi' }),
  ])

  assert.equal(first.state, 'PREVIEW_READY')
  assert.equal(second.state, 'PREVIEW_READY')
  assert.notEqual(first.candidateId, second.candidateId)
})

test('G1.6-C fails closed instead of throwing when teacherResolution is missing at runtime', () => {
  const malformed = {
    day: 1,
    sourcePosition: '1',
    classLabel: '2 A',
    sourceTeacherLabel: 'Rossi',
  } as unknown as ExtractedTimetableSlot

  assert.doesNotThrow(() => buildTimetableImportCandidate(provenance(), [malformed]))
  const result = buildTimetableImportCandidate(provenance(), [malformed])
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'INVALID_SLOT')
})

test('G1.6-C fails closed instead of throwing when a trim-required slot field is not a string', () => {
  const malformed = {
    ...slot(),
    sourcePosition: 1,
  } as unknown as ExtractedTimetableSlot

  assert.doesNotThrow(() => buildTimetableImportCandidate(provenance(), [malformed]))
  const result = buildTimetableImportCandidate(provenance(), [malformed])
  assert.equal(result.state, 'REVIEW_REQUIRED')
  assert.equal(result.reasonCode, 'INVALID_SLOT')
})
