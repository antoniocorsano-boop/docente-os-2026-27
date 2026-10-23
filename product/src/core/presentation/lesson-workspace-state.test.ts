import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveLessonWorkspaceState } from './lesson-workspace-state'

const date = '2026-10-21'

function resolve(input: Partial<Parameters<typeof resolveLessonWorkspaceState>[0]> = {}) {
  return resolveLessonWorkspaceState({
    localDate: date,
    minuteOfDay: 10 * 60 + 30,
    occurrence: {
      localDate: date,
      startAt: `${date}T11:00:00`,
      endAt: `${date}T12:00:00`,
    },
    occurrenceAmbiguous: false,
    registered: false,
    intent: null,
    ...input,
  })
}

test('future lesson resolves to preparation', () => {
  assert.equal(resolve(), 'PREPARATION')
})

test('current lesson resolves to teaching', () => {
  assert.equal(resolve({ minuteOfDay: 11 * 60 + 15 }), 'TEACHING')
})

test('ended unregistered lesson resolves to registration', () => {
  assert.equal(resolve({ minuteOfDay: 12 * 60 + 5 }), 'REGISTRATION')
})

test('registered lesson resolves to continuity before temporal state', () => {
  assert.equal(resolve({ registered: true, minuteOfDay: 11 * 60 + 15 }), 'CONTINUITY')
})

test('ambiguous occurrence resolves fail-closed', () => {
  assert.equal(resolve({ occurrenceAmbiguous: true }), 'AMBIGUOUS')
})

test('explicit occurrence with unusable timing resolves fail-closed', () => {
  assert.equal(resolve({ occurrence: { localDate: date, startAt: null, endAt: null } }), 'AMBIGUOUS')
})

test('no occurrence falls back to preparation rather than guessing a live phase', () => {
  assert.equal(resolve({ occurrence: null }), 'PREPARATION')
})

test('start intent moves a non-registered lesson into teaching', () => {
  assert.equal(resolve({ intent: 'start' }), 'TEACHING')
})

test('close intent moves a non-registered lesson into registration', () => {
  assert.equal(resolve({ intent: 'close' }), 'REGISTRATION')
})

test('registration still wins over stale action intents', () => {
  assert.equal(resolve({ registered: true, intent: 'start' }), 'CONTINUITY')
  assert.equal(resolve({ registered: true, intent: 'close' }), 'CONTINUITY')
})
