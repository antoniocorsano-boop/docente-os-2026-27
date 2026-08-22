import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import {
  buildLessonWorkspaceHref,
  hasHumanTaskLessonProjection,
  resolveHumanTaskLessonProjection,
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
  assert.equal(projection.steps.reduce((total, step) => total + step.minutes, 0), 110)
  assert.equal(projection.resources[0]?.kind, 'STUDENT_SHEET')
  assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-00', 'CAN-PACK-1A'])
})

test('fails closed when canonical block metadata disagrees with projection', () => {
  const block = { ...buildBlocks('Prima')[0], uda: '1-01' }
  assert.equal(resolveHumanTaskLessonProjection('Prima', block), null)
})

test('exposes only modeled lesson projections', () => {
  assert.equal(hasHumanTaskLessonProjection('Prima', 'B01'), true)
  assert.equal(hasHumanTaskLessonProjection('Prima', 'B02'), false)
  assert.equal(hasHumanTaskLessonProjection('Seconda', 'B01'), false)
})

test('builds a section-safe internal lesson route', () => {
  assert.equal(
    buildLessonWorkspaceHref('section id', 'B01', 'teach'),
    '/classi/section%20id/lezioni/B01?mode=teach',
  )
})
