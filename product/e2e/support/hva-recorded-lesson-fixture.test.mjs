import assert from 'node:assert/strict'
import test from 'node:test'
import { HVA_RECORDED_LESSON_DATE, validateHvaRecordedLessonSource } from './hva-recorded-lesson-fixture.mjs'

function fixture() {
  return {
    session: { id: 'ts1', section_id: 's2a', local_date: HVA_RECORDED_LESSON_DATE, projected_occurrence_logical_id: 'tt:v1:slot1:2026-10-26', source_timetable_version_id: 'v1', source_timetable_slot_id: 'slot1' },
    version: { id: 'v1', status: 'ARCHIVED', effective_from: '2026-10-08', effective_to: '2026-10-26' },
    slot: { id: 'slot1', timetable_version_id: 'v1', weekday: 1, start_time: '08:00:00', end_time: '09:00:00', slot_kind: 'LESSON', section_id: 's2a' },
    allocationCount: 1,
    section: { id: 's2a', grade: 'SECONDA', section_code: 'A' },
  }
}

test('historical recorded lesson remains valid when archived timetable still covers 26 October', () => {
  assert.deepEqual(validateHvaRecordedLessonSource(fixture()), [])
})

test('historical recorded lesson rejects a source version ending before its date', () => {
  const input = fixture(); input.version.effective_to = '2026-10-25'
  assert.match(validateHvaRecordedLessonSource(input).join('\n'), /cover 2026-10-26/)
})

test('historical recorded lesson rejects DRAFT or missing source version', () => {
  const draft = fixture(); draft.version.status = 'DRAFT'
  assert.match(validateHvaRecordedLessonSource(draft).join('\n'), /cannot be DRAFT/)
  const missing = fixture(); missing.version = null
  assert.match(validateHvaRecordedLessonSource(missing).join('\n'), /version is missing/)
})

test('historical recorded lesson rejects missing or wrong source slot', () => {
  const missing = fixture(); missing.slot = null
  assert.match(validateHvaRecordedLessonSource(missing).join('\n'), /slot is missing/)
  const wrong = fixture(); wrong.slot.start_time = '09:00:00'; wrong.slot.end_time = '10:00:00'
  assert.match(validateHvaRecordedLessonSource(wrong).join('\n'), /08:00–09:00/)
})

test('historical recorded lesson rejects wrong allocation or section', () => {
  const allocation = fixture(); allocation.allocationCount = 2
  assert.match(validateHvaRecordedLessonSource(allocation).join('\n'), /exactly one B01/)
  const section = fixture(); section.section.grade = 'PRIMA'
  assert.match(validateHvaRecordedLessonSource(section).join('\n'), /second-grade/)
})
