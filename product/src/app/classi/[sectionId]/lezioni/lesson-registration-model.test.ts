import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveUniqueDraftSlot } from '@/core/application/lesson-register-timing'
import type { TimetableSlotReadModel, TimetableVersionReadModel } from '@/core/application/ports/temporal-projection'
import type { ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { TeachingSessionRecord, TeachingSessionSnapshot } from '@/core/domain/teaching-session'
import { hasCurrentBlockSessionOnDate, selectEligibleLessonOccurrence } from './lesson-registration-model'

function occurrence(id: string, startAt: string, sectionId = 'section-2c'): ProjectedOccurrence {
  return {
    logicalId: id,
    localDate: startAt.slice(0, 10),
    startAt,
    endAt: startAt.replace(/T(\d{2}):00:00$/, (_, hour) => `T${String(Number(hour) + 1).padStart(2, '0')}:00:00`),
    kind: 'LESSON',
    title: '2ª C · Tecnologia',
    sectionId,
    disciplineId: 'technology',
    timetableVersionId: 'version-1',
    timetableSlotId: `slot-${id}`,
    calendarEventId: null,
    calendarState: 'SCHOOL_DAY',
    exceptionState: 'NONE',
    provenance: [`occurrence:${id}`],
  }
}

function session(id: string, projectedId: string | null, overrides: Partial<TeachingSessionRecord> = {}): TeachingSessionRecord {
  return {
    id,
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-2c',
    disciplineId: 'technology',
    localDate: '2026-09-14',
    plannedStartAt: projectedId ? '2026-09-14T10:00:00' : null,
    plannedEndAt: projectedId ? '2026-09-14T11:00:00' : null,
    plannedMinutes: projectedId ? 60 : null,
    actualMinutes: 60,
    evidenceNote: null,
    source: {
      sourceKind: projectedId ? 'PROJECTED_OCCURRENCE' : 'MANUAL',
      projectedOccurrenceLogicalId: projectedId,
      timetableVersionId: projectedId ? 'version-1' : null,
      timetableSlotId: projectedId ? 'slot-1' : null,
      calendarState: projectedId ? 'SCHOOL_DAY' : null,
      provenance: projectedId ? [`occurrence:${projectedId}`] : ['manual_session:2026-09-14'],
    },
    supersedesSessionId: null,
    recordedBy: 'teacher-1',
    recordedAt: '2026-09-14T11:01:00+02:00',
    ...overrides,
  }
}

test('selects the latest started unrecorded occurrence for the same section', () => {
  const selected = selectEligibleLessonOccurrence({
    occurrences: [
      occurrence('first', '2026-09-14T08:00:00'),
      occurrence('second', '2026-09-14T10:00:00'),
      occurrence('future', '2026-09-14T12:00:00'),
      occurrence('other-section', '2026-09-14T10:30:00', 'section-1a'),
    ],
    teaching: { sessions: [], allocations: [] },
    sectionId: 'section-2c',
    nowMinutes: 11 * 60,
  })

  assert.equal(selected?.logicalId, 'second')
})

test('a projected occurrence already present in session history is never selected again', () => {
  const selected = selectEligibleLessonOccurrence({
    occurrences: [occurrence('used', '2026-09-14T10:00:00')],
    teaching: {
      sessions: [session('old', 'used'), session('correction', null, { supersedesSessionId: 'old' })],
      allocations: [],
    },
    sectionId: 'section-2c',
    nowMinutes: 11 * 60,
  })

  assert.equal(selected, null)
})

test('manual duplicate guard considers only current sessions allocated to the same block and date', () => {
  const teaching: TeachingSessionSnapshot = {
    sessions: [
      session('old', null),
      session('replacement', null, { supersedesSessionId: 'old' }),
    ],
    allocations: [
      { id: 'a-old', sessionId: 'old', blockId: 'B01', minutes: 60, canonicalPlanAssetId: 'asset', canonicalGenerationId: 'gen', createdAt: '' },
      { id: 'a-new', sessionId: 'replacement', blockId: 'B02', minutes: 60, canonicalPlanAssetId: 'asset', canonicalGenerationId: 'gen', createdAt: '' },
    ],
  }

  assert.equal(hasCurrentBlockSessionOnDate({ teaching, canonicalGenerationId: 'gen', blockId: 'B01', localDate: '2026-09-14' }), false)
  assert.equal(hasCurrentBlockSessionOnDate({ teaching, canonicalGenerationId: 'gen', blockId: 'B02', localDate: '2026-09-14' }), true)
})

const draftVersions: TimetableVersionReadModel[] = [{
  id: 'draft-2026-27',
  status: 'DRAFT',
  effectiveFrom: '2026-09-01',
  effectiveTo: null,
}]

function draftSlot(id: string, sectionId: string, startTime: string, endTime: string): TimetableSlotReadModel {
  return {
    id,
    timetableVersionId: 'draft-2026-27',
    weekday: 1,
    startTime,
    endTime,
    kind: 'LESSON',
    sectionId,
    sectionLabel: sectionId === 'section-2a' ? '2A' : '2C',
    disciplineId: 'technology',
    disciplineLabel: 'Tecnologia',
    manualClassLabel: null,
    room: null,
  }
}

test('lesson register accepts one unique provisional draft period for the section and date', () => {
  const expected = draftSlot('slot-09', 'section-2a', '09:00', '10:00')
  const resolved = resolveUniqueDraftSlot({
    localDate: '2026-09-14',
    sectionId: 'section-2a',
    versions: draftVersions,
    slots: [expected, draftSlot('other-section', 'section-2c', '10:00', '11:00')],
  })

  assert.equal(resolved?.version.id, 'draft-2026-27')
  assert.deepEqual(resolved?.slot, expected)
})

test('lesson register fails closed when more than one provisional period matches the section and date', () => {
  const resolved = resolveUniqueDraftSlot({
    localDate: '2026-09-14',
    sectionId: 'section-2a',
    versions: draftVersions,
    slots: [
      draftSlot('slot-09', 'section-2a', '09:00', '10:00'),
      draftSlot('slot-11', 'section-2a', '11:00', '12:00'),
    ],
  })

  assert.equal(resolved, null)
})
