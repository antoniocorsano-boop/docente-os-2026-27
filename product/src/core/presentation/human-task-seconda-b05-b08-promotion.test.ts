import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import { discoverNextHumanTaskTranche } from '@/core/application/human-task-tranche-compiler'
import { APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B05_B08 } from './human-task-approved-manifests-seconda-b05-b08'
import { validateApprovedHumanTaskManifest } from './human-task-approved-manifest'
import { discoverRuntimeHumanTaskCoveredBlockIds, resolveRuntimeHumanTaskLessonProjection } from './human-task-runtime'

test('Seconda B05-B08 manifests are approved, source-bound and cognitively fulfilled', () => {
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B05_B08.length, 4)
  for (const manifest of APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B05_B08) {
    assert.deepEqual(validateApprovedHumanTaskManifest(manifest), [])
    assert.equal(manifest.schemaVersion, 2)
    assert.equal(manifest.recipeFamily, 'DIRECT')
    assert.equal(manifest.approval.cognitiveFulfillment?.status, 'SATISFIED')
    assert.equal(manifest.approval.cognitiveFulfillment?.stakeholders.length, 5)
    assert.deepEqual(manifest.sourceBindings.map((source) => source.code), ['CAN-PLAN-2', 'CAN-UDA-2-02', 'CAN-PACK-2B'])
    assert.equal(manifest.approval.reviewPackageId, 'HTC-REVIEW-PACKAGE:Seconda:Seconda:2:B05-B08:v1')
  }
})

test('runtime exposes the four approved food-chain lesson titles without rewriting Plan focus', () => {
  const blocks = buildBlocks('Seconda').slice(4, 8)
  assert.equal(new Set(blocks.map((block) => block.title)).size, 1)
  assert.deepEqual(blocks.map((block) => block.title), Array(4).fill('Alimenti, trasformazione e conservazione'))

  const projections = blocks.map((block) => resolveRuntimeHumanTaskLessonProjection('Seconda', block))
  assert.deepEqual(projections.map((projection) => projection?.title), [
    'Dal campo al prodotto',
    'Come si conserva un alimento',
    'Packaging, etichetta e consumo consapevole',
    'Spreco, scelte e filiera responsabile',
  ])
})

test('packaging block preserves the approved technological disciplinary boundary', () => {
  const block = buildBlocks('Seconda')[6]
  const projection = resolveRuntimeHumanTaskLessonProjection('Seconda', block)
  assert.ok(projection)
  assert.match(projection.objective, /focus tecnologico/i)
  assert.match(projection.resources[0]?.instruction ?? '', /non.*educazione nutrizionale specialistica/i)
  assert.match(projection.observation.join(' '), /nutrizionali specialistici/i)
})

test('Seconda runtime coverage advances through B08 and autonomous discovery selects the next real segment', () => {
  const covered = discoverRuntimeHumanTaskCoveredBlockIds('Seconda')
  assert.deepEqual(covered, ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08'])

  const next = discoverNextHumanTaskTranche('Seconda', covered)
  assert.equal(next[0]?.segmentKey, 'Seconda:3')
  assert.deepEqual(next.map((block) => block.id), ['B09', 'B10', 'B11', 'B12'])
  assert.equal(next.every((block) => block.uda === '2-03' && block.pack === 'CAN-PACK-2C'), true)
})

test('approved title override for B05-B08 does not weaken structural drift checks', () => {
  const block = buildBlocks('Seconda')[4]
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Seconda', { ...block, uda: '2-99' }), null)
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Seconda', { ...block, pack: 'CAN-PACK-OTHER' }), null)
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Seconda', { ...block, period: 'Altro periodo' }), null)
})
