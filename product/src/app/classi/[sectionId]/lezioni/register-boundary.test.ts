import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const closeSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')

test('Bxx Registra routes through TeachingSession and never writes AnnualPlanBlockProgress directly', () => {
  assert.match(actionsSource, /recordTeachingSession/)
  assert.doesNotMatch(actionsSource, /saveProgress\s*\(/)
})

test('lesson close no longer asks the teacher to decide plan status as part of registration', () => {
  assert.doesNotMatch(closeSource, /name=["']status["']/)
  assert.doesNotMatch(closeSource, /Svolta come prevista/)
  assert.match(closeSource, /name=["']localDate["']/)
  assert.match(closeSource, /name=["']actualMinutes["']/)
})
