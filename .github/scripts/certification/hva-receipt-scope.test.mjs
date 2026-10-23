import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHvaSpecs, resolveHvaReceiptScope } from './hva-receipt-scope.mjs'

test('full local HVA includes mandatory Today journey', () => {
  const scope = resolveHvaReceiptScope({ mode: 'FULL', target: 'local', specs: [], surfaceCount: 12, projectCount: 2 })
  assert.equal(scope.expectedObservationCount, 24)
  assert.equal(scope.expectedJourneyCount, 10)
  assert.deepEqual(scope.expectedJourneyIds, ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls', 'today-teacher-first'])
})

test('full beta and preview HVA exclude local-only Today journey', () => {
  for (const target of ['beta', 'preview']) {
    const scope = resolveHvaReceiptScope({ mode: 'FULL', target, specs: [], surfaceCount: 12, projectCount: 2 })
    assert.equal(scope.expectedJourneyCount, 8)
    assert.deepEqual(scope.expectedJourneyIds, ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls'])
  }
})

test('focused Knowledge HVA requires only selected evidence', () => {
  const scope = resolveHvaReceiptScope({ mode: 'FOCUSED', target: 'local', specs: parseHvaSpecs('e2e/experience/contextual-capabilities.spec.mjs e2e/experience/surfaces.spec.mjs'), surfaceCount: 12, projectCount: 2 })
  assert.equal(scope.expectedObservationCount, 24)
  assert.equal(scope.expectedJourneyCount, 2)
  assert.deepEqual(scope.expectedJourneyIds, ['ux0e-contextual-capabilities'])
})

test('focused local Today requires two receipts while remote Today requires none', () => {
  const local = resolveHvaReceiptScope({ mode: 'FOCUSED', target: 'local', specs: ['e2e/experience/today-teacher-first.spec.mjs'], surfaceCount: 12, projectCount: 2 })
  assert.equal(local.expectedJourneyCount, 2)
  assert.deepEqual(local.expectedJourneyIds, ['today-teacher-first'])
  const remote = resolveHvaReceiptScope({ mode: 'FOCUSED', target: 'beta', specs: ['e2e/experience/today-teacher-first.spec.mjs'], surfaceCount: 12, projectCount: 2 })
  assert.equal(remote.expectedJourneyCount, 0)
  assert.deepEqual(remote.expectedJourneyIds, [])
})

test('focused HVA without surfaces does not invent coverage', () => {
  const scope = resolveHvaReceiptScope({ mode: 'FOCUSED', target: 'local', specs: ['e2e/experience/lesson-register.spec.mjs'], surfaceCount: 12, projectCount: 2 })
  assert.equal(scope.expectedObservationCount, 0)
  assert.equal(scope.expectedJourneyCount, 0)
})
