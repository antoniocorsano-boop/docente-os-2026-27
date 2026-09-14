import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeLessonObservationDraft,
  parseStoredLessonObservationDraft,
  persistLessonObservationDraft,
  serializeLessonObservationDraft,
  toTeachingObservationDraft,
} from './lesson-observation-model'

test('empty lesson observation input remains optional', () => {
  assert.equal(normalizeLessonObservationDraft({ dimensionKey: '', state: '', note: '' }), null)
})

test('lesson observation requires explicit canonical dimension and state', () => {
  assert.throws(
    () => normalizeLessonObservationDraft({ dimensionKey: 'AUTONOMY', state: '', note: 'Da rivedere' }),
    /Observation state invalid/,
  )
  assert.throws(
    () => normalizeLessonObservationDraft({ dimensionKey: 'made-up', state: 'DEVELOPING' }),
    /Observation dimension invalid/,
  )
})

test('stored class observation round-trips without adding individual identity', () => {
  const draft = normalizeLessonObservationDraft({
    dimensionKey: 'AUTONOMY',
    state: 'DEVELOPING',
    note: 'La classe richiede ancora una guida iniziale.',
  })
  assert.ok(draft)

  const stored = parseStoredLessonObservationDraft(serializeLessonObservationDraft(draft))
  assert.deepEqual(stored, draft)

  const canonical = toTeachingObservationDraft(stored!, 'b03')
  assert.deepEqual(canonical, {
    draftKey: 'class:B03:AUTONOMY',
    scope: 'CLASS',
    anonymousGroupKey: null,
    dimensionKey: 'AUTONOMY',
    state: 'DEVELOPING',
    note: 'La classe richiede ancora una guida iniziale.',
    source: 'TEACHER_NOTE',
  })
})

test('quick mark without a note stays class-level and uses teacher quick mark source', () => {
  const draft = normalizeLessonObservationDraft({
    dimensionKey: 'TECHNICAL_LANGUAGE',
    state: 'NEEDS_SUPPORT',
  })
  assert.ok(draft)

  const canonical = toTeachingObservationDraft(draft, 'B01')
  assert.equal(canonical.scope, 'CLASS')
  assert.equal(canonical.anonymousGroupKey, null)
  assert.equal(canonical.source, 'TEACHER_QUICK_MARK')
  assert.equal(canonical.state, 'NEEDS_SUPPORT')
})

test('observation note is bounded before it reaches the atomic writer', () => {
  assert.throws(
    () => normalizeLessonObservationDraft({
      dimensionKey: 'WORK_METHOD',
      state: 'CONSOLIDATED',
      note: 'x'.repeat(1001),
    }),
    /Observation note exceeds 1000 characters/,
  )
})

test('class-level observation rejects individual student identifiers before canonical persistence', () => {
  assert.throws(
    () => normalizeLessonObservationDraft({
      dimensionKey: 'AUTONOMY',
      state: 'DEVELOPING',
      note: 'Studente Mario Rossi richiede una guida iniziale.',
    }),
    /nominativo di studente/i,
  )
})

test('observation-free navigation is not blocked when browser storage is unavailable', () => {
  const storage = {
    setItem() {
      throw new Error('storage unavailable')
    },
    removeItem() {
      throw new Error('storage unavailable')
    },
  }

  assert.equal(
    persistLessonObservationDraft(storage, 'lesson', { dimensionKey: '', state: '', note: '' }),
    null,
  )
})

test('authored observation fails closed when browser storage cannot preserve it', () => {
  const storage = {
    setItem() {
      throw new Error('storage unavailable')
    },
    removeItem() {},
  }

  assert.throws(
    () => persistLessonObservationDraft(storage, 'lesson', {
      dimensionKey: 'WORK_METHOD',
      state: 'CONSOLIDATED',
      note: 'La classe conclude la verifica con maggiore autonomia.',
    }),
    /storage unavailable/,
  )
})
