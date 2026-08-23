import assert from 'node:assert/strict'
import test from 'node:test'
import { APPROVED_HUMAN_TASK_MANIFESTS_B31_B33 } from './human-task-approved-manifests-b31-b33'
import { materializeApprovedHumanTaskManifests, validateApprovedHumanTaskManifest } from './human-task-approved-manifest'

test('B31-B33 manifests are valid schema v2 approvals with cognitive fulfillment', () => {
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS_B31_B33.length, 3)

  for (const manifest of APPROVED_HUMAN_TASK_MANIFESTS_B31_B33) {
    assert.equal(manifest.schemaVersion, 2)
    assert.deepEqual(validateApprovedHumanTaskManifest(manifest), [])
    assert.equal(manifest.approval.cognitiveFulfillment?.status, 'SATISFIED')
    assert.equal(manifest.approval.cognitiveFulfillment?.stakeholders.length, 4)
    assert.equal(manifest.projection.steps.every((step) => step.minutes === null), true)

    const pack = manifest.sourceBindings.find((source) => source.code === 'CAN-PACK-1D')
    assert.equal(pack?.contribution, 'STRUCTURAL')
    assert.equal(manifest.projection.sources.some((source) => source.code === 'CAN-PACK-1D'), false)
    assert.equal(manifest.projection.sources.some((source) => source.code === 'CAN-PLAN-1'), true)
    assert.equal(manifest.projection.sources.some((source) => source.code === 'CAN-UDA-1-07'), true)
    assert.match(manifest.projection.sourceAlignment.note ?? '', /derivata deterministicamente/i)
  }
})

test('B31-B33 materialize exactly once and preserve the complete final segment', () => {
  const projections = materializeApprovedHumanTaskManifests(APPROVED_HUMAN_TASK_MANIFESTS_B31_B33)
  assert.deepEqual(projections.map((projection) => projection.blockId), ['B31', 'B32', 'B33'])
  assert.deepEqual(projections.map((projection) => projection.durationMinutes), [120, 120, 120])
  assert.deepEqual(projections.map((projection) => projection.packCode), ['CAN-PACK-1D', 'CAN-PACK-1D', 'CAN-PACK-1D'])
})
