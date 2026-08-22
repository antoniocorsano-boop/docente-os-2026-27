import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import {
  buildLessonWorkspaceHref,
  hasHumanTaskLessonProjection,
  resolveHumanTaskLessonProjection,
  resolveHumanTaskLessonTiming,
  resolveHumanTaskStepResources,
} from './human-task-content'

test('resolves the canonical Prima B01 human-task projection', () => {
  const block = buildBlocks('Prima')[0]
  const projection = resolveHumanTaskLessonProjection('Prima', block)

  assert.ok(projection)
  assert.equal(projection.blockId, 'B01')
  assert.equal(projection.udaCode, '1-00')
  assert.equal(projection.packCode, 'CAN-PACK-1A')
  assert.equal(projection.durationMinutes, 120)
  assert.equal(projection.steps.length, 8)
  assert.deepEqual(resolveHumanTaskLessonTiming(projection), {
    durationMinutes: 120,
    knownMinutes: 110,
    timedSteps: 8,
    untimedSteps: 0,
    unallocatedMinutes: 10,
    status: 'PARTIAL',
  })
  assert.equal(projection.resources[0]?.kind, 'STUDENT_SHEET')
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[3]).map((resource) => resource.id),
    ['STUDENT-A'],
  )
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[7]).map((resource) => resource.id),
    ['EXIT-B01'],
  )
  assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-00', 'CAN-PACK-1A'])
})

test('resolves B02 without inventing activity timings', () => {
  const block = buildBlocks('Prima')[1]
  const projection = resolveHumanTaskLessonProjection('Prima', block)

  assert.ok(projection)
  assert.equal(projection.blockId, 'B02')
  assert.equal(projection.title, 'Laboratorio, strumenti e sicurezza')
  assert.equal(projection.steps.length, 5)
  assert.ok(projection.steps.every((step) => step.minutes === null))
  assert.deepEqual(resolveHumanTaskLessonTiming(projection), {
    durationMinutes: 120,
    knownMinutes: 0,
    timedSteps: 0,
    untimedSteps: 5,
    unallocatedMinutes: null,
    status: 'UNSPECIFIED',
  })
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[3]).map((resource) => resource.id),
    ['STUDENT-B'],
  )
  assert.equal(projection.evidence, 'Scheda strumenti + Patto del laboratorio.')
  assert.match(projection.assessmentNote, /non deve essere automaticamente trasformato in voto/i)
})

test('fails closed when canonical block metadata disagrees with projection', () => {
  const block = { ...buildBlocks('Prima')[0], uda: '1-01' }
  assert.equal(resolveHumanTaskLessonProjection('Prima', block), null)
})

test('exposes the two modeled Prima lesson projections only', () => {
  assert.equal(hasHumanTaskLessonProjection('Prima', 'B01'), true)
  assert.equal(hasHumanTaskLessonProjection('Prima', 'B02'), true)
  assert.equal(hasHumanTaskLessonProjection('Prima', 'B03'), false)
  assert.equal(hasHumanTaskLessonProjection('Seconda', 'B01'), false)
})

test('builds a section-safe internal lesson route', () => {
  assert.equal(
    buildLessonWorkspaceHref('section id', 'B01', 'teach'),
    '/classi/section%20id/lezioni/B01?mode=teach',
  )
})
