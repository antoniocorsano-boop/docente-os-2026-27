import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolveTimetableLessonEntrypoint } from './timetable-lesson-entrypoint'

const timetableExperienceSource = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')

test('view mode opens the canonical lesson directly when section and block are resolved', () => {
  assert.deepEqual(resolveTimetableLessonEntrypoint({
    mode: 'view',
    sectionId: '2C',
    blockId: 'B01',
    localDate: '2026-10-22',
    occurrenceLogicalId: 'tt:slot:1',
    ambiguous: false,
  }), {
    kind: 'LESSON',
    href: '/classi/2C/lezioni/B01?date=2026-10-22&occurrence=tt%3Aslot%3A1',
  })
})

test('view mode falls back to the known class when the canonical block is unresolved', () => {
  assert.deepEqual(resolveTimetableLessonEntrypoint({
    mode: 'view',
    sectionId: '2C',
    blockId: null,
    localDate: '2026-10-22',
    occurrenceLogicalId: 'tt:slot:1',
    ambiguous: false,
  }), {
    kind: 'CLASS',
    href: '/classi/2C',
  })
})

test('view mode falls back to the known class when no unique projected occurrence is available', () => {
  assert.deepEqual(resolveTimetableLessonEntrypoint({
    mode: 'view',
    sectionId: '2C',
    blockId: 'B01',
    localDate: null,
    occurrenceLogicalId: null,
    ambiguous: false,
  }), {
    kind: 'CLASS',
    href: '/classi/2C',
  })
})

test('view mode treats only a missing canonical binding as an unresolved grade source', () => {
  assert.match(timetableExperienceSource, /CanonicalPlanSourceError/)
  assert.match(timetableExperienceSource, /CANONICAL_PLAN_BINDING_MISSING/)
  assert.match(timetableExperienceSource, /throw error/)
})

test('view mode keeps the lesson block unresolved when the canonical generation is missing', () => {
  assert.match(
    timetableExperienceSource,
    /const generationId = generationByGrade\.get\(grade\)\s+if \(!generationId\) return \[section\.id, null\] as const/,
  )
})

test('view mode fails closed when lesson context is ambiguous', () => {
  assert.deepEqual(resolveTimetableLessonEntrypoint({
    mode: 'view',
    sectionId: '2C',
    blockId: 'B01',
    localDate: '2026-10-22',
    occurrenceLogicalId: 'tt:slot:1',
    ambiguous: true,
  }), {
    kind: 'AMBIGUOUS',
  })
})

test('view mode produces no navigation without a known section', () => {
  assert.equal(resolveTimetableLessonEntrypoint({
    mode: 'view',
    sectionId: null,
    blockId: null,
    localDate: '2026-10-22',
    occurrenceLogicalId: 'tt:slot:1',
    ambiguous: false,
  }), null)
})

test('update and manage modes never produce lesson navigation', () => {
  for (const mode of ['update', 'manage'] as const) {
    assert.equal(resolveTimetableLessonEntrypoint({
      mode,
      sectionId: '2C',
      blockId: 'B01',
      localDate: '2026-10-22',
      occurrenceLogicalId: 'tt:slot:1',
      ambiguous: false,
    }), null)
  }
})
