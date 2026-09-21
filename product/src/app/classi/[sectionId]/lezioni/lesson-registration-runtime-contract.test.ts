import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./[blockId]/page.tsx', import.meta.url), 'utf8')

test('lesson recording resolves the same runtime projection as the workspace page', () => {
  assert.ok(actionSource.includes("resolveRuntimeHumanTaskLessonProjection"))
  assert.ok(pageSource.includes("resolveRuntimeHumanTaskLessonProjection"))
  assert.doesNotMatch(actionSource, /resolveHumanTaskLessonProjection\(/)
})

test('lesson recording still fails closed when no runtime projection exists', () => {
  assert.ok(actionSource.includes("if (!projection) throw new Error('Human-task lesson projection is not available for this block')"))
})
