import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  HVA_TODAY_ASSIGNMENT_NOTE,
  HVA_TODAY_LOCAL_DATE,
  validateHvaTodayFixture,
} from './hva-today-fixture.mjs'
import { validateHvaTodayCoexistence } from './hva-today-coexistence-fixture.mjs'

const coexistenceFixtureSource = new URL('./hva-today-coexistence-fixture.mjs', import.meta.url)
const todayJourneySource = new URL('../experience/today-teacher-first.spec.mjs', import.meta.url)

function canonicalFixture() {
  return {
    disciplines: [{ id: 'd1', name: 'Tecnologia', is_active: true }],
    assignments: [{ id: 'a1', discipline_id: 'd1', status: 'CONFIRMED', source_note: HVA_TODAY_ASSIGNMENT_NOTE }],
    versions: [{ id: 'v1', status: 'ACTIVE', effective_from: '2026-09-28', effective_to: null }],
    slots: [{ id: 's1', timetable_version_id: 'v1', weekday: 1, start_time: '08:00:00', end_time: '09:00:00', slot_kind: 'LESSON', discipline_id: 'd1', teaching_assignment_id: 'a1' }],
  }
}

function coexistenceFixture() {
  return {
    slots: [
      { id: 'past', timetable_version_id: 'v1', weekday: 1, start_time: '07:00:00', end_time: '08:00:00', slot_kind: 'LESSON', section_id: 'section-1' },
      { id: 'current', timetable_version_id: 'v1', weekday: 1, start_time: '08:00:00', end_time: '09:00:00', slot_kind: 'LESSON', section_id: 'section-2' },
    ],
    sessions: [],
  }
}

test('accepts one canonical current lesson', () => assert.deepEqual(validateHvaTodayFixture(canonicalFixture()), []))
test('rejects a provisional canonical assignment', () => { const fixture = canonicalFixture(); fixture.assignments[0].status = 'PROVISIONAL'; assert.match(validateHvaTodayFixture(fixture).join('\n'), /CONFIRMED/) })
test('rejects a canonical assignment that still owns the textbooks marker', () => { const fixture = canonicalFixture(); fixture.assignments[0].source_note = 'HVA · Libri di testo · Cattedra tecnica'; assert.match(validateHvaTodayFixture(fixture).join('\n'), /Oggi/) })
test('rejects an inactive canonical discipline', () => { const fixture = canonicalFixture(); fixture.disciplines[0].is_active = false; assert.match(validateHvaTodayFixture(fixture).join('\n'), /active/i) })
test('rejects a different or ambiguous current lesson', () => { const fixture = canonicalFixture(); fixture.slots[0].start_time = '09:00:00'; assert.match(validateHvaTodayFixture(fixture).join('\n'), /Monday lesson at 08:30/) })
test('coexistence accepts a natural prior unregistered lesson plus the canonical current lesson', () => assert.deepEqual(validateHvaTodayCoexistence(coexistenceFixture()), []))
test('coexistence fails closed when the ACTIVE timetable exposes only the canonical current lesson', () => { const fixture = coexistenceFixture(); fixture.slots = fixture.slots.filter((slot) => slot.id !== 'past'); assert.match(validateHvaTodayCoexistence(fixture).join('\n'), /prior unregistered lesson/i) })
test('coexistence rejects a prior lesson that is already recorded', () => {
  const fixture = coexistenceFixture()
  fixture.sessions = [{ section_id: 'section-1', local_date: HVA_TODAY_LOCAL_DATE, source_timetable_slot_id: 'past', projected_occurrence_logical_id: `tt:v1:past:${HVA_TODAY_LOCAL_DATE}` }]
  assert.match(validateHvaTodayCoexistence(fixture).join('\n'), /prior unregistered lesson/i)
})

test('Today coexistence fixture contains no baseline mutation path', async () => {
  const text = await readFile(coexistenceFixtureSource, 'utf8')
  assert.doesNotMatch(text, /\.(?:insert|update|delete)\s*\(/)
  assert.doesNotMatch(text, /activate_timetable_version/)
  assert.doesNotMatch(text, /createHvaTodayCoexistenceFixture|restore\s*[:=(]/)
  for (const table of ['calendar_events', 'timetable_versions', 'timetable_slots', 'teaching_sessions']) {
    assert.doesNotMatch(text, new RegExp(`\\.from\\(['\"]${table}['\"]\\)[\\s\\S]*?\\.(?:insert|update|delete)\\s*\\(`))
  }
})

test('Today browser journey is explicitly local-only and has no fixture cleanup semantics', async () => {
  const text = await readFile(todayJourneySource, 'utf8')
  assert.match(text, /test\.skip\(process\.env\.EXPERIENCE_TARGET !== 'local'/)
  assert.match(text, /assertHvaTodayCoexistenceRuntime/)
  assert.doesNotMatch(text, /createHvaTodayCoexistenceFixture|fixture\.restore/)
})
