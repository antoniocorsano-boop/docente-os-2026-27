import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const closeSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')

test('Bxx Registra routes through TeachingSession and never writes AnnualPlanBlockProgress directly', () => {
  assert.match(actionsSource, /recordTeachingSession/)
  assert.doesNotMatch(actionsSource, /saveProgress\s*\(/)
})

test('Bxx Registra preserves a resolved timetable occurrence before using manual fallback', () => {
  assert.match(actionsSource, /selectEligibleLessonOccurrence/)
  assert.match(actionsSource, /teachingSessionCandidateFromOccurrence/)
  assert.match(actionsSource, /sourceKind:\s*'MANUAL'/)
})

test('lesson close no longer asks the teacher to decide plan status as part of registration', () => {
  assert.doesNotMatch(closeSource, /name=["']status["']/)
  assert.doesNotMatch(closeSource, /Svolta come prevista/)
  assert.match(closeSource, /name=["']localDate["']/)
  assert.match(closeSource, /name=["']actualMinutes["']/)
})

test('a TeachingSession cannot be registered with a future lesson date', () => {
  assert.match(actionsSource, /Teaching session date cannot be in the future/)
  assert.match(closeSource, /max=\{defaultLocalDate\}/)
})
