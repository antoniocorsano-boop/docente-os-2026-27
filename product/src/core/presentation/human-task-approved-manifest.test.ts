import assert from 'node:assert/strict'
import test from 'node:test'
import { APPROVED_HUMAN_TASK_MANIFESTS } from './human-task-approved-manifests'
import {
  materializeApprovedHumanTaskManifests,
  validateApprovedHumanTaskManifest,
} from './human-task-approved-manifest'

test('B28-B30 are approved declarative manifests, not tranche-specific runtime code', () => {
  assert.deepEqual(APPROVED_HUMAN_TASK_MANIFESTS.map((manifest) => manifest.structuralBinding.blockId), ['B28', 'B29', 'B30'])
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS.every((manifest) => manifest.recipeFamily === 'PACK_COMPOSED'), true)
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS.every((manifest) => manifest.timingSpecificity === 'UNSPECIFIED'), true)
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS.every((manifest) => validateApprovedHumanTaskManifest(manifest).length === 0), true)
})

test('materializer exposes all approved manifest projections and preserves current source generations', () => {
  const projections = materializeApprovedHumanTaskManifests(APPROVED_HUMAN_TASK_MANIFESTS)
  assert.deepEqual(projections.map((projection) => projection.blockId), ['B28', 'B29', 'B30'])

  for (const manifest of APPROVED_HUMAN_TASK_MANIFESTS) {
    assert.deepEqual(manifest.sourceBindings.map((source) => [source.code, source.generationId]), [
      ['CAN-PLAN-1', 'd327355b-76a9-496f-99cb-dc942fd950e4'],
      ['CAN-UDA-1-06', '7b438474-22ad-4f00-99af-c84701c8dfbe'],
      ['CAN-PACK-1F', '3b884504-990b-4c70-a1a6-51439ad66894'],
    ])
    assert.equal(manifest.approval.decision, 'APPROVE')
    assert.equal(manifest.approval.improvementDisposition, 'SYSTEM_IMPROVEMENT_APPLIED')
  }
})

test('B30 binds the canonical student sheet only to the explicit laboratory/restoration step', () => {
  const b30 = materializeApprovedHumanTaskManifests(APPROVED_HUMAN_TASK_MANIFESTS).find((projection) => projection.blockId === 'B30')
  assert.ok(b30)
  assert.deepEqual(b30.steps.map((step) => step.minutes), [null, null])
  assert.deepEqual(b30.steps[0].resourceIds ?? [], [])
  assert.deepEqual(b30.steps[1].resourceIds, ['STUDENT-DATA-INFO'])
  assert.equal(b30.resources[0].prompts.includes('Limiti o dati da controllare'), true)
})

test('manifest validation fails closed on source-generation or structural drift', () => {
  const current = APPROVED_HUMAN_TASK_MANIFESTS[0]
  const generationDrift = {
    ...current,
    sourceBindings: current.sourceBindings.map((source, index) => index === 1 ? { ...source, generationId: '' } : source),
  }
  assert.ok(validateApprovedHumanTaskManifest(generationDrift).includes('SOURCE_GENERATION_BINDING_MISSING'))

  const structuralDrift = {
    ...current,
    structuralBinding: { ...current.structuralBinding, udaCode: '9-99' },
  }
  assert.ok(validateApprovedHumanTaskManifest(structuralDrift).includes('UDA_MISMATCH'))
})
