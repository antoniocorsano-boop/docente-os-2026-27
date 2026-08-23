import assert from 'node:assert/strict'
import test from 'node:test'
import { allocatedMinutesByBlock, currentTeachingSessions, type TeachingSessionSnapshot } from './teaching-session'

function session(id: string, supersedesSessionId: string | null, actualMinutes: number) {
  return {
    id,
    workspaceId: 'workspace',
    academicYearId: 'year',
    sectionId: 'section',
    disciplineId: null,
    localDate: '2026-09-07',
    plannedStartAt: null,
    plannedEndAt: null,
    plannedMinutes: null,
    actualMinutes,
    evidenceNote: null,
    source: {
      sourceKind: 'MANUAL' as const,
      projectedOccurrenceLogicalId: null,
      timetableVersionId: null,
      timetableSlotId: null,
      calendarState: null,
      provenance: [],
    },
    supersedesSessionId,
    recordedBy: 'user',
    recordedAt: '2026-09-07T12:00:00Z',
  }
}

test('superseded sessions remain in history but stop contributing to current minute totals', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [session('old', null, 60), session('new', 'old', 50)],
    allocations: [
      { id: 'a-old', sessionId: 'old', blockId: 'B01', minutes: 60, canonicalPlanAssetId: 'plan', canonicalGenerationId: 'gen', createdAt: '2026-09-07T12:00:00Z' },
      { id: 'a-new', sessionId: 'new', blockId: 'B01', minutes: 50, canonicalPlanAssetId: 'plan', canonicalGenerationId: 'gen', createdAt: '2026-09-07T12:10:00Z' },
    ],
  }

  assert.deepEqual(currentTeachingSessions(snapshot).map((item) => item.id), ['new'])
  assert.equal(allocatedMinutesByBlock(snapshot, 'gen').get('B01'), 50)
})

test('allocations from another canonical generation never leak into current totals', () => {
  const snapshot: TeachingSessionSnapshot = {
    sessions: [session('s1', null, 60)],
    allocations: [
      { id: 'a1', sessionId: 's1', blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan', canonicalGenerationId: 'gen-current', createdAt: '2026-09-07T12:00:00Z' },
      { id: 'a2', sessionId: 's1', blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan-old', canonicalGenerationId: 'gen-old', createdAt: '2026-09-07T12:00:00Z' },
    ],
  }

  assert.equal(allocatedMinutesByBlock(snapshot, 'gen-current').get('B01'), 30)
})
