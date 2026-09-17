import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./lesson-design-tools.tsx', import.meta.url), 'utf8')

test('teaching adjustments use a dedicated replanning review boundary', () => {
  assert.ok(source.includes("extension.status === 'PROPOSED' && !isTeachingAdjustment(extension)"))
  assert.ok(source.includes("extension.status === 'PROPOSED' || extension.status === 'MODIFIED'"))
  assert.ok(source.includes('Riprogettazione da riesaminare'))
  assert.ok(source.includes('Conferma riprogettazione'))
  assert.ok(source.includes('senza modificare automaticamente Piano annuale o UDA'))
})

test('accepted teaching adjustments stay separate from lesson sequence and resources', () => {
  assert.ok(source.includes('const acceptedLessonAdditions = accepted.filter((extension) => !isTeachingAdjustment(extension))'))
  assert.ok(source.includes('const acceptedReplanning = accepted.filter((extension) => isTeachingAdjustment(extension))'))
  assert.ok(source.includes('Decisioni di riprogettazione accettate'))
  assert.ok(source.includes('Non sono aggiunte alla sequenza'))
  assert.ok(source.includes("if (kind === 'TEACHING_ADJUSTMENT') return 'RIPROGETTAZIONE'"))
})
