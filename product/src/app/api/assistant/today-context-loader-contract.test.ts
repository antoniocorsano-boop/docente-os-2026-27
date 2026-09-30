import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('Today Copilot keeps base context when optional lesson preparation fails', async () => {
  const source = await readFile(new URL('./today-context-loader.ts', import.meta.url), 'utf8')
  assert.match(source, /let preparation: LoadedNextLessonPreparation \| null = null/)
  assert.match(source, /try \{[\s\S]*loadNextLessonPreparationBundle\(/)
  assert.match(source, /catch \{[\s\S]*Today Copilot continues with base context/)
  assert.match(source, /enrichTodayCopilotContext\(base, preparation\?\.preparation \?\? null\)/)
})
