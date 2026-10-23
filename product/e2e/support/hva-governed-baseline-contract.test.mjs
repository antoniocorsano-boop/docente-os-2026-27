import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const config = require('./hva-governed-baseline-config.cjs')

test('HVA-GOV-01/v1 centralizes the canonical local clock and date', () => {
  assert.equal(config.HVA_BASELINE_ID, 'HVA-GOV-01/v1')
  assert.equal(config.HVA_EFFECTIVE_FROM, '2026-10-27')
  assert.equal(config.HVA_LOCAL_DATE, '2026-11-02')
  assert.equal(config.HVA_CANONICAL_NOW, '2026-11-02T08:30:00+01:00')
  assert.equal(config.HVA_WEEKDAY, 1)
  assert.equal(config.HVA_MINUTE_OF_DAY, 8 * 60 + 30)
  assert.equal(config.HVA_CALENDAR_SOURCE_REF, 'HVA-GOV-01/v1')
  assert.equal(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'long' }).format(new Date(config.HVA_CANONICAL_NOW)), 'Monday')
})

test('clock consumers do not hard-code a second canonical HVA date', async () => {
  const files = [
    new URL('./hva-fixed-clock.cjs', import.meta.url),
    new URL('./hva-today-fixture.mjs', import.meta.url),
    new URL('../../scripts/start-production.mjs', import.meta.url),
  ]
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    assert.doesNotMatch(source, /2026-10-19T08:30:00\+02:00|2026-10-19/)
  }
})

async function contractModule() {
  return import('./hva-governed-baseline-contract.mjs')
}

function rawBaseline() {
  return {
    disciplines: [{ id: 'd1', name: 'Tecnologia', is_active: true }],
    sections: [{ id: 's2a', grade: 'SECONDA', section_code: 'A' }],
    assignments: [{
      id: 'a1', section_id: 's2a', discipline_id: 'd1', status: 'CONFIRMED',
      weekly_minutes: 120, source_note: 'HVA · Oggi · Cattedra canonica',
    }],
    versions: [{ id: 'v2', status: 'ACTIVE', effective_from: '2026-10-27', effective_to: null }],
    slots: [
      { id: 'past', timetable_version_id: 'v2', weekday: 1, start_time: '07:00:00', end_time: '08:00:00', slot_kind: 'LESSON', section_id: 's2a', discipline_id: 'd1', teaching_assignment_id: 'a1' },
      { id: 'current', timetable_version_id: 'v2', weekday: 1, start_time: '08:00:00', end_time: '09:00:00', slot_kind: 'LESSON', section_id: 's2a', discipline_id: 'd1', teaching_assignment_id: 'a1' },
    ],
    sessions: [],
    calendarEvents: [{ id: 'e1', title: 'HVA · Impegno collegiale canonico', event_kind: 'MEETING', starts_on: '2026-11-02', ends_on: '2026-11-02', all_day: false, start_time: '10:30:00', end_time: '11:00:00', source_kind: 'MANUAL', source_ref: 'HVA-GOV-01/v1' }],
  }
}

test('semantic baseline exact happy path validates', async () => {
  const { projectHvaBaselineSnapshot, validateHvaBaselineSnapshot, HVA_EXPECTED_BASELINE_SNAPSHOT } = await contractModule()
  const snapshot = projectHvaBaselineSnapshot(rawBaseline())
  assert.deepEqual(validateHvaBaselineSnapshot(snapshot), [])
  assert.deepEqual(snapshot, HVA_EXPECTED_BASELINE_SNAPSHOT)
})

test('semantic baseline rejects missing or duplicate 07:00 lesson', async () => {
  const { projectHvaBaselineSnapshot, validateHvaBaselineSnapshot } = await contractModule()
  const missing = rawBaseline(); missing.slots = missing.slots.filter((slot) => slot.id !== 'past')
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(missing)).join('\n'), /07:00.*exactly one/i)
  const duplicate = rawBaseline(); duplicate.slots.push({ ...duplicate.slots[0], id: 'past-2' })
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(duplicate)).join('\n'), /07:00.*exactly one/i)
})

test('semantic baseline rejects wrong current lesson identity', async () => {
  const { projectHvaBaselineSnapshot, validateHvaBaselineSnapshot } = await contractModule()
  const raw = rawBaseline(); raw.slots[1].start_time = '09:00:00'; raw.slots[1].end_time = '10:00:00'
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(raw)).join('\n'), /08:00.*exactly one/i)
})

test('semantic baseline rejects wrong class discipline assignment state and weekly minutes', async () => {
  const { projectHvaBaselineSnapshot, validateHvaBaselineSnapshot } = await contractModule()
  const wrongClass = rawBaseline(); wrongClass.sections[0].section_code = 'B'
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(wrongClass)).join('\n'), /2A/)
  const wrongDiscipline = rawBaseline(); wrongDiscipline.disciplines[0].name = 'Scienze'
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(wrongDiscipline)).join('\n'), /Tecnologia/)
  const wrongStatus = rawBaseline(); wrongStatus.assignments[0].status = 'PROVISIONAL'
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(wrongStatus)).join('\n'), /CONFIRMED/)
  const wrongMinutes = rawBaseline(); wrongMinutes.assignments[0].weekly_minutes = 60
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(wrongMinutes)).join('\n'), /120/)
})

test('semantic baseline rejects recorded 07:00 occurrence', async () => {
  const { projectHvaBaselineSnapshot, validateHvaBaselineSnapshot } = await contractModule()
  const raw = rawBaseline(); raw.sessions.push({ section_id: 's2a', local_date: '2026-11-02', source_timetable_slot_id: 'past', projected_occurrence_logical_id: 'tt:v2:past:2026-11-02' })
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(raw)).join('\n'), /07:00.*unregistered/i)
})

test('semantic baseline rejects missing or duplicate canonical Calendar event', async () => {
  const { projectHvaBaselineSnapshot, validateHvaBaselineSnapshot } = await contractModule()
  const missing = rawBaseline(); missing.calendarEvents = []
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(missing)).join('\n'), /Calendar.*exactly one/i)
  const duplicate = rawBaseline(); duplicate.calendarEvents.push({ ...duplicate.calendarEvents[0], id: 'e2' })
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(duplicate)).join('\n'), /Calendar.*exactly one/i)
})

test('semantic baseline rejects wrong effective-from boundary', async () => {
  const { projectHvaBaselineSnapshot, validateHvaBaselineSnapshot } = await contractModule()
  const raw = rawBaseline(); raw.versions[0].effective_from = '2026-10-08'
  assert.match(validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(raw)).join('\n'), /2026-10-27/)
})

test('semantic fingerprint is deterministic and excludes runtime ids', async () => {
  const { projectHvaBaselineSnapshot, fingerprintHvaBaselineSnapshot } = await contractModule()
  const first = rawBaseline()
  const second = rawBaseline()
  second.disciplines[0].id = 'different-discipline-id'
  second.sections[0].id = 'different-section-id'
  second.assignments[0] = { ...second.assignments[0], id: 'different-assignment-id', section_id: 'different-section-id', discipline_id: 'different-discipline-id' }
  second.versions[0].id = 'different-version-id'
  second.slots = second.slots.map((slot, index) => ({ ...slot, id: `different-slot-${index}`, timetable_version_id: 'different-version-id', section_id: 'different-section-id', discipline_id: 'different-discipline-id', teaching_assignment_id: 'different-assignment-id' })).reverse()
  second.calendarEvents[0].id = 'different-event-id'
  assert.equal(fingerprintHvaBaselineSnapshot(projectHvaBaselineSnapshot(first)), fingerprintHvaBaselineSnapshot(projectHvaBaselineSnapshot(second)))
})
