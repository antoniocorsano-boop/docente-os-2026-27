import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import { discoverNextHumanTaskTranche } from '@/core/application/human-task-tranche-compiler'
import { APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B01_B04 } from './human-task-approved-manifests-seconda-b01-b04'
import { validateApprovedHumanTaskManifest } from './human-task-approved-manifest'
import { discoverRuntimeHumanTaskCoveredBlockIds, resolveRuntimeHumanTaskLessonProjection } from './human-task-runtime'

test('Seconda B01-B04 manifests are approved, source-bound and cognitively fulfilled', () => {
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B01_B04.length, 4)
  for (const manifest of APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B01_B04) {
    assert.deepEqual(validateApprovedHumanTaskManifest(manifest), [])
    assert.equal(manifest.schemaVersion, 2)
    assert.equal(manifest.recipeFamily, 'DIRECT')
    assert.equal(manifest.approval.cognitiveFulfillment?.status, 'SATISFIED')
    assert.equal(manifest.approval.cognitiveFulfillment?.stakeholders.length, 5)
    assert.deepEqual(manifest.sourceBindings.map((source) => source.code), ['CAN-PLAN-2', 'CAN-UDA-2-01', 'CAN-PACK-2A'])
  }
})

test('runtime exposes four distinct human titles while canonical Plan segment keeps structural focus', () => {
  const blocks = buildBlocks('Seconda').slice(0, 4)
  assert.equal(new Set(blocks.map((block) => block.title)).size, 1)
  const projections = blocks.map((block) => resolveRuntimeHumanTaskLessonProjection('Seconda', block))
  assert.deepEqual(projections.map((projection) => projection?.title), [
    'Il territorio agricolo come sistema',
    'Il suolo: struttura, funzioni e rischi',
    'Dal campo al prodotto: ciclo colturale e mezzi tecnici',
    'Agricoltura sostenibile: scegliere e motivare',
  ])
})

test('Seconda runtime coverage advances to B04 and autonomous discovery selects the next segment', () => {
  const covered = discoverRuntimeHumanTaskCoveredBlockIds('Seconda')
  assert.deepEqual(covered, ['B01', 'B02', 'B03', 'B04'])
  const next = discoverNextHumanTaskTranche('Seconda', covered)
  assert.equal(next[0]?.segmentKey, 'Seconda:2')
  assert.deepEqual(next.map((block) => block.id), ['B05', 'B06', 'B07', 'B08'])
  assert.equal(next.every((block) => block.uda === '2-02' && block.pack === 'CAN-PACK-2B'), true)
})

test('approved title override does not weaken structural drift checks', () => {
  const block = buildBlocks('Seconda')[0]
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Seconda', { ...block, uda: '2-99' }), null)
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Seconda', { ...block, pack: 'CAN-PACK-OTHER' }), null)
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Seconda', { ...block, period: 'Altro periodo' }), null)
})
