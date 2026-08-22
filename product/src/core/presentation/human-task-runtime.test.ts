import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import { resolveHumanTaskLessonTiming, resolveHumanTaskStepResources } from './human-task-content'
import { resolveRuntimeHumanTaskLessonProjection } from './human-task-runtime'

function primaBlock(blockId: string) {
  const block = buildBlocks('Prima').find((item) => item.id === blockId)
  assert.ok(block, `Blocco ${blockId} non trovato`)
  return block
}

test('runtime exposes approved B07-B10 and stops before B11', () => {
  const expected = [
    ['B07', 'HTC-PRIMA-B07-v1'],
    ['B08', 'HTC-PRIMA-B08-v1'],
    ['B09', 'HTC-PRIMA-B09-v1'],
    ['B10', 'HTC-PRIMA-B10-UDA-v1'],
  ] as const

  for (const [blockId, projectionId] of expected) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.equal(projection.projectionId, projectionId)
    assert.equal(projection.durationMinutes, 120)
  }

  assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B11')), null)
})

test('B07 keeps its classified material sheet binding', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B07'))
  assert.ok(projection)
  assert.deepEqual(projection.steps.map((step) => step.minutes), [null, null, null])
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[2]).map((resource) => resource.id), ['STUDENT-E'])
})

test('B08 keeps unspecified timing and binds Scheda F to the experimental activity', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B08'))
  assert.ok(projection)
  const timing = resolveHumanTaskLessonTiming(projection)
  assert.equal(timing.status, 'UNSPECIFIED')
  assert.equal(timing.durationMinutes, 120)
  assert.equal(projection.steps.length, 1)
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[0]).map((resource) => resource.id), ['STUDENT-F'])
  assert.match(projection.steps[0].cue ?? '', /una variabile alla volta/i)
})

test('B09 exposes two source-derived decision steps and binds Scheda G only to criteria', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B09'))
  assert.ok(projection)
  assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
  assert.equal(projection.steps.length, 2)
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[0]).map((resource) => resource.id), [])
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[1]).map((resource) => resource.id), ['STUDENT-G'])
})

test('B10 exposes only the approved UDA phase without inventing timings or resources', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B10'))
  assert.ok(projection)
  const timing = resolveHumanTaskLessonTiming(projection)
  assert.equal(timing.status, 'UNSPECIFIED')
  assert.equal(timing.durationMinutes, 120)
  assert.equal(projection.steps.length, 2)
  assert.deepEqual(projection.steps.map((step) => step.minutes), [null, null])
  assert.deepEqual(projection.resources, [])
  assert.deepEqual(projection.preparation, [])
  assert.equal(projection.sourceAlignment.level, 'COMPOSED')
  assert.match(projection.sourceAlignment.note ?? '', /fase 4|uda/i)
  assert.match(projection.steps[0].instruction, /filiere esemplificative/i)
  assert.match(projection.steps[1].instruction, /diagrammi lineari o di flusso/i)
})

test('approved material projections fail closed when canonical plan metadata drifts', () => {
  for (const blockId of ['B07', 'B08', 'B09', 'B10']) {
    const block = primaBlock(blockId)
    assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, uda: '1-03' }), null)
    assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, pack: 'CAN-PACK-1A' }), null)
    assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, title: 'Titolo diverso' }), null)
  }
})

test('direct projections expose PLAN UDA PACK while B10 exposes only sources that supplied operational content', () => {
  for (const blockId of ['B07', 'B08', 'B09']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-02', 'CAN-PACK-1B'])
  }

  const b10 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B10'))
  assert.ok(b10)
  assert.deepEqual(b10.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-02'])
})
