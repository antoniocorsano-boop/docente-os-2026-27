import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HVA_TODAY_ASSIGNMENT_NOTE,
  validateHvaTodayFixture,
} from './hva-today-fixture.mjs'

function canonicalFixture() {
  return {
    disciplines: [{ id: 'd1', name: 'Tecnologia', is_active: true }],
    assignments: [{
      id: 'a1',
      discipline_id: 'd1',
      status: 'CONFIRMED',
      source_note: HVA_TODAY_ASSIGNMENT_NOTE,
    }],
    versions: [{
      id: 'v1',
      status: 'ACTIVE',
      effective_from: '2026-09-28',
      effective_to: null,
    }],
    slots: [{
      id: 's1',
      timetable_version_id: 'v1',
      weekday: 1,
      start_time: '08:00:00',
      end_time: '09:00:00',
      slot_kind: 'LESSON',
      discipline_id: 'd1',
      teaching_assignment_id: 'a1',
    }],
  }
}

test('accepts one canonical current lesson', () => {
  assert.deepEqual(validateHvaTodayFixture(canonicalFixture()), [])
})

test('rejects a provisional canonical assignment', () => {
  const fixture = canonicalFixture()
  fixture.assignments[0].status = 'PROVISIONAL'
  assert.match(validateHvaTodayFixture(fixture).join('\n'), /CONFIRMED/)
})

test('rejects a canonical assignment that still owns the textbooks marker', () => {
  const fixture = canonicalFixture()
  fixture.assignments[0].source_note = 'HVA · Libri di testo · Cattedra tecnica'
  assert.match(validateHvaTodayFixture(fixture).join('\n'), /Oggi/)
})

test('rejects an inactive canonical discipline', () => {
  const fixture = canonicalFixture()
  fixture.disciplines[0].is_active = false
  assert.match(validateHvaTodayFixture(fixture).join('\n'), /active/i)
})

test('rejects a different or ambiguous current lesson', () => {
  const fixture = canonicalFixture()
  fixture.slots[0].start_time = '09:00:00'
  assert.match(validateHvaTodayFixture(fixture).join('\n'), /Monday lesson at 08:30/)
})
