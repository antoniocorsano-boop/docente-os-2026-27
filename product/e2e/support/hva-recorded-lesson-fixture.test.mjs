import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HVA_RECORDED_LESSON_DATE,
  validateHvaRecordedLessonFixtureState,
} from './hva-recorded-lesson-fixture.mjs'

test('accepts the historical B01 source version after it is archived on 2026-10-26', () => {
  const fixture = canonicalFixture()
  fixture.versions[0].status = 'ARCHIVED'
  fixture.versions[0].effective_to = HVA_RECORDED_LESSON_DATE

  assert.deepEqual(validateHvaRecordedLessonFixtureState(fixture), [])
})

test('rejects a source timetable version that ended before the recorded lesson date', () => {
  const fixture = canonicalFixture()
  fixture.versions[0].status = 'ARCHIVED'
  fixture.versions[0].effective_to = '2026-10-25'

  assert.match(errorsFor(fixture), /source timetable version.*2026-10-26/i)
})

test('rejects a recorded fixture whose source timetable slot is missing', () => {
  const fixture = canonicalFixture()
  fixture.slots = []

  assert.match(errorsFor(fixture), /source timetable slot.*missing/i)
})

test('rejects a source slot that is not the canonical Monday 08:00–09:00 lesson', () => {
  const fixture = canonicalFixture()
  fixture.slots[0].start_time = '09:00:00'
  fixture.slots[0].end_time = '10:00:00'

  assert.match(errorsFor(fixture), /08:00.*09:00/i)
})

test('rejects multiple independent current recorded-lesson fixture records', () => {
  const fixture = canonicalFixture()
  fixture.sessions.push({
    ...fixture.sessions[0],
    id: 'session-b01-duplicate',
    projected_occurrence_logical_id: 'tt:version-old:slot-old:2026-10-26:duplicate',
  })

  assert.match(errorsFor(fixture), /exactly one.*fixture.*found 2|multiple independent/i)
})

function errorsFor(fixture) {
  return validateHvaRecordedLessonFixtureState(fixture).join('\n')
}

function canonicalFixture() {
  return {
    sessions: [{
      id: 'session-b01',
      section_id: 'section-2a',
      local_date: HVA_RECORDED_LESSON_DATE,
      projected_occurrence_logical_id: 'tt:version-old:slot-old:2026-10-26',
      source_timetable_version_id: 'version-old',
      source_timetable_slot_id: 'slot-old',
      evidence_note: 'HVA · Legacy recorded lesson · 2026-10-26 · B01',
    }],
    allocations: [{
      id: 'allocation-b01',
      session_id: 'session-b01',
      block_id: 'B01',
      minutes: 60,
    }],
    sections: [{
      id: 'section-2a',
      grade: 'SECONDA',
      section_code: 'A',
    }],
    versions: [{
      id: 'version-old',
      status: 'ACTIVE',
      effective_from: '2026-09-28',
      effective_to: null,
    }],
    slots: [{
      id: 'slot-old',
      timetable_version_id: 'version-old',
      weekday: 1,
      start_time: '08:00:00',
      end_time: '09:00:00',
      slot_kind: 'LESSON',
      section_id: 'section-2a',
    }],
  }
}
