import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTimetableImportPreview } from './timetable-import-preview'

const baseInput = {
  sourceKind: 'DOCUMENT' as const,
  sourceName: 'orario-provvisorio.pdf',
  teacherSurname: '  Rossi  ',
  effectiveFrom: '2026-09-28',
  candidateSlots: [
    {
      weekday: 1,
      startTime: '08:00',
      endTime: '09:00',
      classLabel: ' 2A ',
      slotKind: 'LESSON' as const,
    },
  ],
}

test('prepares a structural preview without applying or replanning anything', () => {
  const preview = buildTimetableImportPreview(baseInput)
  assert.equal(preview.teacherSurname, 'Rossi')
  assert.equal(preview.candidateSlots[0]?.classLabel, '2A')
  assert.equal(preview.canConfirmDraft, true)
  assert.deepEqual(preview.blockingReasons, [])
})

test('fails closed when surname is missing', () => {
  const preview = buildTimetableImportPreview({ ...baseInput, teacherSurname: ' ' })
  assert.equal(preview.canConfirmDraft, false)
  assert.ok(preview.blockingReasons.includes('TEACHER_SURNAME_MISSING'))
})

test('fails closed on an invalid effective-from date', () => {
  const preview = buildTimetableImportPreview({ ...baseInput, effectiveFrom: '2026-02-31' })
  assert.equal(preview.canConfirmDraft, false)
  assert.ok(preview.blockingReasons.includes('EFFECTIVE_FROM_INVALID'))
})

test('fails closed when no lessons were extracted', () => {
  const preview = buildTimetableImportPreview({ ...baseInput, candidateSlots: [] })
  assert.equal(preview.canConfirmDraft, false)
  assert.ok(preview.blockingReasons.includes('NO_LESSONS_FOUND'))
})

test('keeps later lesson specialisations outside structural import', () => {
  const preview = buildTimetableImportPreview({
    ...baseInput,
    candidateSlots: [{ ...baseInput.candidateSlots[0], slotKind: 'DISPOSITION' as const }],
  })
  assert.equal(preview.canConfirmDraft, false)
  assert.ok(preview.blockingReasons.includes('INVALID_LESSON_SLOT'))
})

test('fails closed on ambiguous lessons in the same time cell', () => {
  const preview = buildTimetableImportPreview({
    ...baseInput,
    candidateSlots: [
      baseInput.candidateSlots[0],
      { ...baseInput.candidateSlots[0], classLabel: '3A' },
    ],
  })
  assert.equal(preview.canConfirmDraft, false)
  assert.ok(preview.blockingReasons.includes('AMBIGUOUS_OVERLAPPING_LESSONS'))
})
