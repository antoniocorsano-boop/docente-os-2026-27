import assert from 'node:assert/strict'
import test from 'node:test'
import {
  B31_B33_EVIDENCE_PROVENANCE,
  B31_PROJECTION,
  B32_PROJECTION,
  B33_PROJECTION,
  APPROVED_HUMAN_TASK_MANIFESTS_B31_B33,
} from '@/core/presentation/human-task-approved-manifests-b31-b33'
import { validateApprovedHumanTaskManifest } from '@/core/presentation/human-task-approved-manifest'
import { evaluateHumanTaskStakeholderCognitiveGate } from './human-task-stakeholder-cognitive-gate'

const APPROVAL_RATIONALE = 'Approvato a condizione che il raccordo garantisca l’adempimento cognitivo di tutti gli stakeholder di contesto.'

const cases = [
  ['B31', B31_PROJECTION, B31_B33_EVIDENCE_PROVENANCE.B31],
  ['B32', B32_PROJECTION, B31_B33_EVIDENCE_PROVENANCE.B32],
  ['B33', B33_PROJECTION, B31_B33_EVIDENCE_PROVENANCE.B33],
] as const

test('B31-B33 satisfy the cognitive gate for teacher, coordination, governance and system', () => {
  for (const [blockId, projection, evidenceProvenance] of cases) {
    const gate = evaluateHumanTaskStakeholderCognitiveGate({
      projection,
      evidenceProvenance,
      humanDecision: { decision: 'APPROVE', rationale: APPROVAL_RATIONALE },
    })

    assert.equal(gate.status, 'PASS', `${blockId}: ${JSON.stringify(gate.stakeholders)}`)
    assert.deepEqual(gate.stakeholders.map((item) => [item.stakeholder, item.status]), [
      ['TEACHER', 'PASS'],
      ['COORDINATION', 'PASS'],
      ['GOVERNANCE', 'PASS'],
      ['SYSTEM', 'PASS'],
    ])
  }
})

test('B31-B33 evidence is explicitly attributed to UDA 1-07 rather than invented as Plan evidence', () => {
  for (const [, projection, evidenceProvenance] of cases) {
    assert.equal(evidenceProvenance.sourceRole, 'UDA')
    assert.equal(evidenceProvenance.sourceCode, 'CAN-UDA-1-07')
    assert.ok(projection.sources.some((source) => source.code === 'CAN-UDA-1-07' && source.role === 'UDA'))
    assert.match(projection.sourceAlignment.note ?? '', /UDA 1-07/)
  }
})

test('PACK 1D stays structurally visible but never becomes the didactic authority for B31-B33', () => {
  for (const [, projection] of cases) {
    const pack = projection.sources.find((source) => source.code === 'CAN-PACK-1D')
    assert.ok(pack)
    assert.match(pack.label, /collegamento strutturale/i)
    assert.match(projection.sourceAlignment.note ?? '', /non (determina|viene usato|sostituisce)|resta distinto/i)
  }
})

test('approved manifests are structurally valid and remain source-generation bound', () => {
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS_B31_B33.length, 3)
  for (const manifest of APPROVED_HUMAN_TASK_MANIFESTS_B31_B33) {
    assert.deepEqual(validateApprovedHumanTaskManifest(manifest), [])
    assert.deepEqual(manifest.sourceBindings.map((source) => [source.code, source.generationId]), [
      ['CAN-PLAN-1', 'd327355b-76a9-496f-99cb-dc942fd950e4'],
      ['CAN-UDA-1-07', '92194b46-b7e5-4c52-82a7-b1d75403b8b1'],
      ['CAN-PACK-1D', '1d150f77-6a7f-4f8b-8e85-2fa370956e29'],
    ])
  }
})

test('the cognitive gate fails closed when human approval or evidence provenance is missing', () => {
  const pending = evaluateHumanTaskStakeholderCognitiveGate({
    projection: B31_PROJECTION,
    evidenceProvenance: { sourceRole: 'UDA', sourceCode: 'CAN-UDA-1-07', rationale: '' },
    humanDecision: { decision: 'PENDING', rationale: '' },
  })

  assert.equal(pending.status, 'FAIL')
  assert.equal(pending.stakeholders.find((item) => item.stakeholder === 'COORDINATION')?.status, 'FAIL')
  assert.equal(pending.stakeholders.find((item) => item.stakeholder === 'GOVERNANCE')?.status, 'FAIL')
})
