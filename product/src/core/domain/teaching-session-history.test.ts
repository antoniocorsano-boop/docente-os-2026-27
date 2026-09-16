import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTeachingSessionEvidenceNote,
  parseTeachingSessionEvidenceNote,
} from './teaching-session-reflection'
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

test('lesson report V2 preserves next activity without material or Drive identifiers', () => {
  const note = buildTeachingSessionEvidenceNote({
    reflection: {
      activityDone: 'Prospettiva centrale',
      observations: 'Impostazione compresa dalla maggior parte della classe.',
      difficulties: '',
      ideas: '',
      udaChangeProposal: '',
      nextActivity: 'Riprendere la prospettiva centrale e completare l’esercizio 2.',
    },
  })

  assert.match(note, /^DOCENTE_OS_LESSON_REPORT_V2\n/)
  const parsed = parseTeachingSessionEvidenceNote(note)
  assert.equal(parsed?.contract, 'DOCENTE_OS_LESSON_REPORT_V2')
  assert.equal(parsed?.materialAssetId, null)
  assert.equal(parsed?.driveRecordId, null)
  assert.equal(parsed?.reflection.nextActivity, 'Riprendere la prospettiva centrale e completare l’esercizio 2.')
  assert.equal(parsed?.reflection.activityDone, 'Prospettiva centrale')
})

test('historical lesson report V1 remains readable with its material and Drive identifiers', () => {
  const contract = 'DOCENTE_OS_LESSON_REPORT_V1'
  const note = `${contract}\n${JSON.stringify({
    contract,
    materialAssetId: 'asset-legacy',
    driveRecordId: 'drive-legacy',
    activityDone: 'Osservazione di un oggetto tecnico',
    observations: 'Consegna completata.',
    difficulties: '',
    ideas: '',
    udaChangeProposal: '',
    nextActivity: 'Confrontare materiali e funzioni.',
  })}`

  const parsed = parseTeachingSessionEvidenceNote(note)
  assert.equal(parsed?.contract, contract)
  assert.equal(parsed?.materialAssetId, 'asset-legacy')
  assert.equal(parsed?.driveRecordId, 'drive-legacy')
  assert.equal(parsed?.reflection.nextActivity, 'Confrontare materiali e funzioni.')
})
