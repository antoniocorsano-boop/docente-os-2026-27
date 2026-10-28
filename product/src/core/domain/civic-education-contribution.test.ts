import assert from 'node:assert/strict'
import test from 'node:test'
import {
  civicEducationMinutes,
  normalizeCivicEducationContribution,
  type TeachingSessionDraft,
  type TeachingSessionSnapshot,
} from './teaching-session'

function session(input: {
  id: string
  supersedesSessionId?: string | null
  actualMinutes?: number
  civicMinutes?: number | null
  disciplineId?: string | null
}) {
  return {
    id: input.id,
    workspaceId: 'workspace',
    academicYearId: 'year',
    sectionId: 'section-2c',
    disciplineId: input.disciplineId ?? 'technology',
    localDate: '2026-10-28',
    plannedStartAt: '2026-10-28T09:00:00',
    plannedEndAt: '2026-10-28T10:00:00',
    plannedMinutes: 60,
    actualMinutes: input.actualMinutes ?? 60,
    evidenceNote: null,
    civicEducation: input.civicMinutes
      ? { minutes: input.civicMinutes, evidenceNote: null }
      : null,
    source: {
      sourceKind: 'PROJECTED_OCCURRENCE' as const,
      projectedOccurrenceLogicalId: `occurrence:${input.id}`,
      timetableVersionId: 'version-1',
      timetableSlotId: 'slot-1',
      calendarState: 'SCHOOL_DAY',
      provenance: ['timetable_version:version-1'],
    },
    supersedesSessionId: input.supersedesSessionId ?? null,
    recordedBy: 'user',
    recordedAt: '2026-10-28T10:05:00Z',
  }
}

test('QL2-A normalizes an optional civic education contribution inside the real teaching session', () => {
  assert.deepEqual(normalizeCivicEducationContribution({
    actualMinutes: 60,
    minutes: 25,
    evidenceNote: 'Sostenibilità e responsabilità nelle scelte tecnologiche.',
  }), {
    minutes: 25,
    evidenceNote: 'Sostenibilità e responsabilità nelle scelte tecnologiche.',
  })

  assert.equal(normalizeCivicEducationContribution({
    actualMinutes: 60,
    minutes: null,
    evidenceNote: null,
  }), null)
})

test('QL2-A refuses invalid civic education minutes and oversized evidence', () => {
  for (const minutes of [0, -1, 60.5, 61]) {
    assert.throws(() => normalizeCivicEducationContribution({
      actualMinutes: 60,
      minutes,
      evidenceNote: null,
    }))
  }

  assert.throws(() => normalizeCivicEducationContribution({
    actualMinutes: 60,
    minutes: 20,
    evidenceNote: 'x'.repeat(4001),
  }))
})

test('QL2-A keeps the real discipline while adding the transverse civic contribution', () => {
  const draft: TeachingSessionDraft = {
    sectionId: 'section-2c',
    disciplineId: 'technology',
    localDate: '2026-10-28',
    plannedStartAt: '2026-10-28T09:00:00',
    plannedEndAt: '2026-10-28T10:00:00',
    plannedMinutes: 60,
    actualMinutes: 60,
    evidenceNote: null,
    civicEducation: normalizeCivicEducationContribution({
      actualMinutes: 60,
      minutes: 20,
      evidenceNote: null,
    }),
    source: {
      sourceKind: 'PROJECTED_OCCURRENCE',
      projectedOccurrenceLogicalId: 'occurrence-2c',
      timetableVersionId: 'version-1',
      timetableSlotId: 'slot-1',
      calendarState: 'SCHOOL_DAY',
      provenance: ['timetable_version:version-1'],
    },
  }

  assert.equal(draft.disciplineId, 'technology')
  assert.equal(draft.civicEducation?.minutes, 20)
})

test('QL2-A annual progress counts only current teaching sessions after corrections', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [
      session({ id: 'old', civicMinutes: 30 }),
      session({ id: 'corrected', supersedesSessionId: 'old', civicMinutes: 20 }),
      session({ id: 'second', civicMinutes: 15 }),
      session({ id: 'ordinary', civicMinutes: null }),
    ],
    allocations: [],
  }

  assert.equal(civicEducationMinutes(snapshot), 35)
})
