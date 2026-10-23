import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseHvaSpecs, resolveHvaReceiptScope } from './hva-receipt-scope.mjs'

const workflowSource = new URL('../../workflows/experience-acceptance.yml', import.meta.url)

test('full local HVA keeps canonical surface and journey coverage including Today', () => {
  const scope = resolveHvaReceiptScope({ target: 'local', mode: 'FULL', specs: [], surfaceCount: 12, projectCount: 2 })
  assert.equal(scope.target, 'local')
  assert.equal(scope.mode, 'FULL')
  assert.equal(scope.expectedObservationCount, 24)
  assert.equal(scope.expectedJourneyCount, 10)
  assert.deepEqual(scope.expectedJourneyIds, ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls', 'today-teacher-first'])
})

test('full beta and preview HVA exclude governed Today without converting omission into PASS', () => {
  for (const target of ['beta', 'preview']) {
    const scope = resolveHvaReceiptScope({ target, mode: 'FULL', specs: [], surfaceCount: 12, projectCount: 2 })
    assert.equal(scope.target, target)
    assert.equal(scope.expectedObservationCount, 24)
    assert.equal(scope.expectedJourneyCount, 8)
    assert.deepEqual(scope.expectedJourneyIds, ['class-next-task', 'uda-reading', 'knowledge-document', 'calendar-controls'])
    assert.equal(scope.expectedJourneyIds.includes('today-teacher-first'), false)
  }
})

test('focused Knowledge HVA requires only evidence produced by selected specs', () => {
  const scope = resolveHvaReceiptScope({
    target: 'local',
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

test('focused local Oggi HVA requires two mandatory today-teacher-first receipts', () => {
  const scope = resolveHvaReceiptScope({
    target: 'local',
    mode: 'FOCUSED',
    specs: ['e2e/experience/today-teacher-first.spec.mjs'],
    surfaceCount: 12,
    projectCount: 2,
  })
  assert.equal(scope.expectedObservationCount, 0)
  assert.equal(scope.expectedJourneyCount, 2)
  assert.deepEqual(scope.expectedJourneyIds, ['today-teacher-first'])
})

test('focused remote Oggi scope excludes the local-only journey rather than claiming it passed', () => {
  for (const target of ['beta', 'preview']) {
    const scope = resolveHvaReceiptScope({
      target,
      mode: 'FOCUSED',
      specs: ['e2e/experience/today-teacher-first.spec.mjs'],
      surfaceCount: 12,
      projectCount: 2,
    })
    assert.equal(scope.expectedObservationCount, 0)
    assert.equal(scope.expectedJourneyCount, 0)
    assert.deepEqual(scope.expectedJourneyIds, [])
  }
})

test('focused HVA without surfaces does not invent full-suite observation coverage', () => {
  const scope = resolveHvaReceiptScope({
    target: 'local',
    mode: 'FOCUSED',
    specs: ['e2e/experience/lesson-register.spec.mjs'],
    surfaceCount: 12,
    projectCount: 2,
  })
  assert.equal(scope.expectedObservationCount, 0)
  assert.equal(scope.expectedJourneyCount, 0)
})

test('workflow runs governed baseline preflight and postflight only in local application acceptance', async () => {
  const text = await readFile(workflowSource, 'utf8')
  const runtimeMarker = '\n  runtime-acceptance:'
  const splitAt = text.indexOf(runtimeMarker)
  assert.ok(splitAt > 0, 'runtime-acceptance job marker must exist')
  const applicationJob = text.slice(0, splitAt)
  const runtimeJob = text.slice(splitAt)

  const preflight = 'node scripts/experience/hva-baseline-integrity.mjs preflight'
  const postflight = 'node scripts/experience/hva-baseline-integrity.mjs postflight'
  assert.equal(applicationJob.split(preflight).length - 1, 1)
  assert.equal(applicationJob.split(postflight).length - 1, 1)
  assert.equal(runtimeJob.includes(preflight), false)
  assert.equal(runtimeJob.includes(postflight), false)

  assert.ok(applicationJob.indexOf(preflight) > applicationJob.indexOf('Install product dependencies'))
  assert.ok(applicationJob.indexOf(preflight) < applicationJob.indexOf('Build tested application'))
  assert.ok(applicationJob.indexOf(postflight) > applicationJob.indexOf('Run Human + Visual Acceptance'))
  assert.ok(applicationJob.indexOf(postflight) < applicationJob.indexOf('Generate acceptance receipt'))
})
