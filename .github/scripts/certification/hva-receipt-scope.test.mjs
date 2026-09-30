import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHvaSpecs, resolveHvaReceiptScope } from './hva-receipt-scope.mjs'

test('full HVA keeps canonical surface and journey coverage', () => {
  const scope = resolveHvaReceiptScope({ mode: 'FULL', specs: [], surfaceCount: 12, projectCount: 2 })
  assert.equal(scope.mode, 'FULL')
  assert.equal(scope.expectedObservationCount, 24)
  assert.equal(scope.expectedJourneyCount, 8)
  assert.deepEqual(scope.expectedJourneyIds, ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls'])
})

test('focused Knowledge HVA requires only evidence produced by selected specs', () => {
  const scope = resolveHvaReceiptScope({
    mode: 'FOCUSED',
    specs: parseHvaSpecs('e2e/experience/contextual-capabilities.spec.mjs e2e/experience/surfaces.spec.mjs'),
    surfaceCount: 12,
    projectCount: 2,
  })
  assert.equal(scope.mode, 'FOCUSED')
  assert.equal(scope.expectedObservationCount, 24)
  assert.equal(scope.expectedJourneyCount, 2)
  assert.deepEqual(scope.expectedJourneyIds, ['ux0e-contextual-capabilities'])
})

test('focused HVA without surfaces does not invent full-suite observation coverage', () => {
  const scope = resolveHvaReceiptScope({
    mode: 'FOCUSED',
    specs: ['e2e/experience/lesson-register.spec.mjs'],
    surfaceCount: 12,
    projectCount: 2,
  })
  assert.equal(scope.expectedObservationCount, 0)
  assert.equal(scope.expectedJourneyCount, 0)
})
