import assert from 'node:assert/strict'
import test from 'node:test'
import type { TimetableSlot } from '@/core/domain/timetable'
import { buildTimetableGridRows, timetableCellKey } from './timetable-grid-model'

function slot(overrides: Partial<TimetableSlot>): TimetableSlot {
  return {
    id: 'slot-1',
    timetableVersionId: 'version-1',
    weekday: 1,
    startTime: '08:00',
    endTime: '09:00',
    slotKind: 'LESSON',
    sectionId: 'section-1',
    disciplineId: 'discipline-1',
    teachingAssignmentId: 'assignment-1',
    room: null,
    note: null,
    ordinal: 1,
    createdAt: '2026-08-22T00:00:00Z',
    updatedAt: '2026-08-22T00:00:00Z',
    ...overrides,
  }
}

test('buildTimetableGridRows merges preset rows and adds custom persisted intervals', () => {
  const rows = buildTimetableGridRows(
    [
      { ordinal: 1, start: '08:00', end: '09:00' },
      { ordinal: 2, start: '09:00', end: '10:00' },
    ],
    [
      slot({ startTime: '08:00', endTime: '09:00' }),
      slot({ id: 'slot-2', weekday: 2, startTime: '10:15', endTime: '11:00', ordinal: null, slotKind: 'RECEPTION', sectionId: null, disciplineId: null, teachingAssignmentId: null }),
    ],
  )

  assert.deepEqual(rows.map((row) => [row.start, row.end, row.source]), [
    ['08:00', '09:00', 'PRESET'],
    ['09:00', '10:00', 'PRESET'],
    ['10:15', '11:00', 'CUSTOM'],
  ])
})

test('timetableCellKey is stable across persisted time strings with seconds', () => {
  assert.equal(timetableCellKey(3, '08:00:00', '09:00:00'), '3:08:00-09:00')
})
