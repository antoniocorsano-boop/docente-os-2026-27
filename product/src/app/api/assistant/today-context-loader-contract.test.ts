import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

async function source() {
  return readFile(new URL('./today-context-loader.ts', import.meta.url), 'utf8')
}

test('Today exposes one operational loader and Copilot delegates to it', async () => {
  const text = await source()
  assert.match(text, /export type LoadedTodayOperationalContext = \{/)
  assert.match(text, /export async function loadCurrentTodayOperationalContext\(\): Promise<LoadedTodayOperationalContext \| null>/)
  assert.match(
    text,
    /export async function loadCurrentTodayCopilotContext\(\)[\s\S]*loadCurrentTodayOperationalContext\(\)/,
  )
})

test('Today operational loading keeps optional lesson preparation fail-soft', async () => {
  const text = await source()
  assert.match(text, /let preparation: LoadedNextLessonPreparation \| null = null/)
  assert.match(text, /try \{[\s\S]*loadNextLessonPreparationBundle\(/)
  assert.match(text, /catch \{[\s\S]*Lesson preparation unavailable/)
  assert.match(text, /preparation,\n\s*\}/)
})

test('Today operational context exists without an academic year', async () => {
  const text = await source()
  assert.match(
    text,
    /if \(!workspaceContext\.academicYear\) \{[\s\S]*projectedDay: null,[\s\S]*homeDaily: emptyDailyContext\(clock\.localDate\),[\s\S]*preparation: null/,
  )
})
