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

test('promotes approved B07 into the runtime without changing B08', () => {
  const b07 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B07'))
  assert.ok(b07)
  assert.equal(b07.projectionId, 'HTC-PRIMA-B07-v1')
  assert.equal(b07.title, 'Riconoscere e classificare i materiali')
  assert.equal(b07.durationMinutes, 120)
  assert.equal(b07.steps.length, 3)
  assert.deepEqual(b07.steps.map((step) => step.minutes), [null, null, null])
  assert.deepEqual(resolveHumanTaskStepResources(b07, b07.steps[2]).map((resource) => resource.id), ['STUDENT-E'])

  const b08 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B08'))
  assert.equal(b08, null)
})

test('B07 keeps unspecified activity timing instead of inventing a 120-minute split', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B07'))
  assert.ok(projection)
  const timing = resolveHumanTaskLessonTiming(projection)
  assert.equal(timing.status, 'UNSPECIFIED')
  assert.equal(timing.durationMinutes, 120)
  assert.equal(timing.knownMinutes, 0)
})

test('B07 fails closed when canonical plan metadata drifts', () => {
  const block = primaBlock('B07')
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, uda: '1-03' }), null)
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, pack: 'CAN-PACK-1A' }), null)
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, title: 'Titolo diverso' }), null)
})

test('B07 exposes the three approved canonical sources', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B07'))
  assert.ok(projection)
  assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-02', 'CAN-PACK-1B'])
})
