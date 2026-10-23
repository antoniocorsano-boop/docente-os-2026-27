import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createRequire } from 'node:module'
import {
  HVA_EXPECTED_BASELINE_SNAPSHOT,
  fingerprintHvaBaselineSnapshot,
  projectHvaBaselineSnapshot,
  validateHvaBaselineSnapshot,
} from './hva-governed-baseline-contract.mjs'

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
  assert.equal(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'long' }).format(new Date(config.HVA_CANONICAL_NOW)),
    'Monday',
  )
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

test('projects the exact HVA-GOV-01/v1 semantic baseline', () => {
  const snapshot = projectHvaBaselineSnapshot(canonicalFixture())
  const { diagnostics, ...semantic } = snapshot

  assert.deepEqual(semantic, HVA_EXPECTED_BASELINE_SNAPSHOT)
  assert.deepEqual(validateHvaBaselineSnapshot(snapshot), [])
  assert.equal(diagnostics.activeVersionIds.length, 1)
  assert.equal(diagnostics.priorLessonIds.length, 1)
  assert.equal(diagnostics.currentLessonIds.length, 1)
  assert.equal(diagnostics.calendarEventIds.length, 1)
})

test('fails closed when the 07:00 canonical lesson is missing', () => {
  const fixture = canonicalFixture()
  fixture.slots = fixture.slots.filter((slot) => slot.id !== 'slot-0700')
  assert.match(errorsFor(fixture), /07:00.*08:00.*found 0/i)
})

test('fails closed when the 07:00 canonical lesson is duplicated', () => {
  const fixture = canonicalFixture()
  fixture.slots.push({ ...fixture.slots[0], id: 'slot-0700-duplicate' })
  assert.match(errorsFor(fixture), /07:00.*08:00.*found 2/i)
})

test('fails closed when the current 08:00 lesson is wrong', () => {
  const fixture = canonicalFixture()
  fixture.slots[1].start_time = '09:00:00'
  fixture.slots[1].end_time = '10:00:00'
  assert.match(errorsFor(fixture), /08:00.*09:00.*found 0|current.*found 0/i)
})

test('fails closed when the canonical class is not 2A', () => {
  const fixture = canonicalFixture()
  fixture.sections[0].section_code = 'B'
  assert.match(errorsFor(fixture), /2A/)
})

test('fails closed when the canonical discipline is not Tecnologia', () => {
  const fixture = canonicalFixture()
  fixture.disciplines[0].name = 'Scienze'
  assert.match(errorsFor(fixture), /Tecnologia/)
})

test('fails closed when the canonical assignment is not CONFIRMED', () => {
  const fixture = canonicalFixture()
  fixture.assignments[0].status = 'PROVISIONAL'
  assert.match(errorsFor(fixture), /CONFIRMED/)
})

test('fails closed when the canonical assignment is not 120 weekly minutes', () => {
  const fixture = canonicalFixture()
  fixture.assignments[0].weekly_minutes = 90
  assert.match(errorsFor(fixture), /120/)
})

test('fails closed when the 07:00 occurrence is already recorded', () => {
  const fixture = canonicalFixture()
  fixture.sessions.push({
    id: 'session-prior',
    section_id: 'section-2a',
    local_date: '2026-11-02',
    source_timetable_slot_id: 'slot-0700',
    projected_occurrence_logical_id: 'tt:version-active:slot-0700:2026-11-02',
  })
  assert.match(errorsFor(fixture), /07:00.*unregistered|07:00.*recorded/i)
})

test('fails closed when the canonical Calendar event is missing', () => {
  const fixture = canonicalFixture()
  fixture.calendarEvents = []
  assert.match(errorsFor(fixture), /Calendar.*found 0/i)
})

test('fails closed when the canonical Calendar event is duplicated', () => {
  const fixture = canonicalFixture()
  fixture.calendarEvents.push({ ...fixture.calendarEvents[0], id: 'calendar-duplicate' })
  assert.match(errorsFor(fixture), /Calendar.*found 2/i)
})

test('fails closed when the ACTIVE effective_from is not the governed boundary', () => {
  const fixture = canonicalFixture()
  fixture.versions[0].effective_from = '2026-09-28'
  assert.match(errorsFor(fixture), /effective_from.*2026-10-27/i)
})

test('semantic fingerprint is deterministic across input ordering', () => {
  const first = canonicalFixture()
  const second = canonicalFixture()
  second.sections.reverse()
  second.disciplines.reverse()
  second.assignments.reverse()
  second.versions.reverse()
  second.slots.reverse()
  second.sessions.reverse()
  second.calendarEvents.reverse()

  assert.equal(
    fingerprintHvaBaselineSnapshot(projectHvaBaselineSnapshot(first)),
    fingerprintHvaBaselineSnapshot(projectHvaBaselineSnapshot(second)),
  )
})

function errorsFor(fixture) {
  return validateHvaBaselineSnapshot(projectHvaBaselineSnapshot(fixture)).join('\n')
}

function canonicalFixture() {
  return {
    sections: [{ id: 'section-2a', grade: 'SECONDA', section_code: 'A' }],
    disciplines: [{ id: 'discipline-tech', name: 'Tecnologia', is_active: true }],
    assignments: [{
      id: 'assignment-tech',
      section_id: 'section-2a',
      discipline_id: 'discipline-tech',
      weekly_minutes: 120,
      status: 'CONFIRMED',
      source_note: 'HVA · Oggi · Cattedra canonica',
    }],
    versions: [{
      id: 'version-active',
      status: 'ACTIVE',
      effective_from: '2026-10-27',
      effective_to: null,
    }],
    slots: [
      {
        id: 'slot-0700',
        timetable_version_id: 'version-active',
        weekday: 1,
        start_time: '07:00:00',
        end_time: '08:00:00',
        slot_kind: 'LESSON',
        section_id: 'section-2a',
        discipline_id: 'discipline-tech',
        teaching_assignment_id: 'assignment-tech',
      },
      {
        id: 'slot-0800',
        timetable_version_id: 'version-active',
        weekday: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        slot_kind: 'LESSON',
        section_id: 'section-2a',
        discipline_id: 'discipline-tech',
        teaching_assignment_id: 'assignment-tech',
      },
    ],
    sessions: [],
    calendarEvents: [{
      id: 'calendar-canonical',
      starts_on: '2026-11-02',
      ends_on: '2026-11-02',
      all_day: false,
      start_time: '10:30:00',
      end_time: '11:00:00',
      event_kind: 'MEETING',
      source_ref: 'HVA-GOV-01/v1',
    }],
  }
}
