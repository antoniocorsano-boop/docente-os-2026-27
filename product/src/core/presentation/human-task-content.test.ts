import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import {
  buildLessonWorkspaceHref,
  hasHumanTaskLessonProjection,
  resolveHumanTaskLessonProjection,
  resolveHumanTaskLessonTiming,
  resolveHumanTaskResourcesForSurface,
  resolveHumanTaskStepResources,
} from './human-task-content'

test('resolves the canonical Prima B01 human-task projection', () => {
  const block = buildBlocks('Prima')[0]
  const projection = resolveHumanTaskLessonProjection('Prima', block)

  assert.ok(projection)
  assert.equal(projection.blockId, 'B01')
  assert.equal(projection.udaCode, '1-00')
  assert.equal(projection.packCode, 'CAN-PACK-1A')
  assert.equal(projection.sourceAlignment.level, 'DIRECT')
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
  assert.deepEqual(
    resolveHumanTaskResourcesForSurface(projection, 'PREPARE').map((resource) => resource.id),
    ['STUDENT-A'],
  )
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[3]).map((resource) => resource.id),
    ['STUDENT-A'],
  )
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[7]).map((resource) => resource.id),
    ['EXIT-B01'],
  )
})

test('resolves B02 without inventing activity timings', () => {
  const block = buildBlocks('Prima')[1]
  const projection = resolveHumanTaskLessonProjection('Prima', block)

  assert.ok(projection)
  assert.equal(projection.blockId, 'B02')
  assert.equal(projection.title, 'Laboratorio, strumenti e sicurezza')
  assert.equal(projection.steps.length, 5)
  assert.ok(projection.steps.every((step) => step.minutes === null))
  assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[3]).map((resource) => resource.id),
    ['STUDENT-B'],
  )
  assert.equal(projection.evidence, 'Scheda strumenti + Patto del laboratorio.')
})

test('models B03 and B04 as composed guidance without fabricated timings', () => {
  const b03 = resolveHumanTaskLessonProjection('Prima', buildBlocks('Prima')[2])
  const b04 = resolveHumanTaskLessonProjection('Prima', buildBlocks('Prima')[3])

  assert.ok(b03)
  assert.ok(b04)
  assert.equal(b03.sourceAlignment.level, 'COMPOSED')
  assert.match(b03.sourceAlignment.note ?? '', /Piano annuale separa/i)
  assert.equal(b04.sourceAlignment.level, 'COMPOSED')
  assert.ok(b03.steps.every((step) => step.minutes === null))
  assert.ok(b04.steps.every((step) => step.minutes === null))
  assert.equal(resolveHumanTaskLessonTiming(b03).status, 'UNSPECIFIED')
  assert.equal(resolveHumanTaskLessonTiming(b04).status, 'UNSPECIFIED')
  assert.deepEqual(
    resolveHumanTaskResourcesForSurface(b04, 'PREPARE').map((resource) => resource.id),
    ['STUDENT-C'],
  )
  assert.deepEqual(
    resolveHumanTaskStepResources(b04, b04.steps[3]).map((resource) => resource.id),
    ['STUDENT-C'],
  )
})

test('models B05 as a directly aligned systems lesson', () => {
  const projection = resolveHumanTaskLessonProjection('Prima', buildBlocks('Prima')[4])

  assert.ok(projection)
  assert.equal(projection.title, 'Pensare per sistemi')
  assert.equal(projection.sourceAlignment.level, 'DIRECT')
  assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
  assert.deepEqual(
    resolveHumanTaskResourcesForSurface(projection, 'PREPARE').map((resource) => resource.id),
    ['STUDENT-D'],
  )
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[1]).map((resource) => resource.id),
    ['STUDENT-D'],
  )
  assert.equal(projection.evidence, 'Diagramma di un sistema tecnologico.')
})

test('models B06 task, assessment structure and observation rubric without inventing questions', () => {
  const projection = resolveHumanTaskLessonProjection('Prima', buildBlocks('Prima')[5])

  assert.ok(projection)
  assert.equal(projection.title, 'Compito significativo e verifica')
  assert.equal(projection.sourceAlignment.level, 'COMPOSED')
  assert.match(projection.sourceAlignment.note ?? '', /quesiti specifici non sono presenti/i)
  assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
  assert.deepEqual(
    resolveHumanTaskResourcesForSurface(projection, 'PREPARE').map((resource) => resource.id),
    ['TASK-B06'],
  )
  assert.deepEqual(
    resolveHumanTaskResourcesForSurface(projection, 'OBSERVE').map((resource) => resource.id),
    ['RUBRIC-B06'],
  )
  assert.deepEqual(
    resolveHumanTaskStepResources(projection, projection.steps[3]).map((resource) => resource.id),
    ['ASSESS-B06'],
  )
  const assessment = projection.resources.find((resource) => resource.id === 'ASSESS-B06')
  assert.ok(assessment)
  assert.match(assessment.instruction, /non i quesiti specifici/i)
  assert.equal(projection.evidence, 'Scheda A4/A3 + breve verifica individuale.')
})

test('fails closed when canonical block metadata disagrees with projection', () => {
  const block = { ...buildBlocks('Prima')[0], uda: '1-01' }
  assert.equal(resolveHumanTaskLessonProjection('Prima', block), null)
})

test('exposes modeled Prima lessons through B06 and no farther', () => {
  for (const blockId of ['B01', 'B02', 'B03', 'B04', 'B05', 'B06']) {
    assert.equal(hasHumanTaskLessonProjection('Prima', blockId), true)
  }
  assert.equal(hasHumanTaskLessonProjection('Prima', 'B07'), false)
  assert.equal(hasHumanTaskLessonProjection('Seconda', 'B01'), false)
})

test('builds a section-safe internal lesson route', () => {
  assert.equal(
    buildLessonWorkspaceHref('section id', 'B01', 'teach'),
    '/classi/section%20id/lezioni/B01?mode=teach',
  )
})
