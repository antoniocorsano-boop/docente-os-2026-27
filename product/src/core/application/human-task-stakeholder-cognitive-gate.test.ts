import assert from 'node:assert/strict'
import test from 'node:test'
import {
  APPROVED_HUMAN_TASK_MANIFESTS_B31_B33_V2,
  B31_B33_EVIDENCE_PROVENANCE_V2,
  B31_PROJECTION_V2,
  B32_PROJECTION_V2,
  B33_PROJECTION_V2,
} from '@/core/presentation/human-task-approved-manifests-b31-b33-v2'
import { validateApprovedHumanTaskManifest } from '@/core/presentation/human-task-approved-manifest'
import { evaluateHumanTaskStakeholderCognitiveGate } from './human-task-stakeholder-cognitive-gate'

const APPROVAL_RATIONALE = 'Approvato a condizione che il raccordo garantisca l’adempimento cognitivo di tutti gli stakeholder di contesto.'

const cases = [
  ['B31', B31_PROJECTION_V2, B31_B33_EVIDENCE_PROVENANCE_V2.B31],
  ['B32', B32_PROJECTION_V2, B31_B33_EVIDENCE_PROVENANCE_V2.B32],
  ['B33', B33_PROJECTION_V2, B31_B33_EVIDENCE_PROVENANCE_V2.B33],
] as const

test('B31-B33 satisfy the cognitive gate including learner fulfillment', () => {
  for (const [blockId, projection, evidenceProvenance] of cases) {
    const gate = evaluateHumanTaskStakeholderCognitiveGate({
      projection,
      evidenceProvenance,
      humanDecision: { decision: 'APPROVE', rationale: APPROVAL_RATIONALE },
    })

    assert.equal(gate.status, 'PASS', `${blockId}: ${JSON.stringify(gate.stakeholders)}`)
    assert.deepEqual(gate.stakeholders.map((item) => [item.stakeholder, item.status]), [
      ['TEACHER', 'PASS'],
      ['LEARNER', 'PASS'],
      ['COORDINATION', 'PASS'],
      ['GOVERNANCE', 'PASS'],
      ['SYSTEM', 'PASS'],
    ])
  }
})

test('learner fulfillment fails closed when the projection loses observable criteria and self-regulation cues', () => {
  const invalid = {
    ...B31_PROJECTION_V2,
    observation: [],
    steps: B31_PROJECTION_V2.steps.map((step) => ({ ...step, instruction: 'Esegui il passaggio.' })),
    objective: 'Completa il lavoro.',
    assessmentNote: 'Formativa.',
    continuation: 'Continua.',
  }
  const gate = evaluateHumanTaskStakeholderCognitiveGate({
    projection: invalid,
    evidenceProvenance: B31_B33_EVIDENCE_PROVENANCE_V2.B31,
    humanDecision: { decision: 'APPROVE', rationale: APPROVAL_RATIONALE },
  })
  assert.equal(gate.status, 'FAIL')
  const learner = gate.stakeholders.find((item) => item.stakeholder === 'LEARNER')
  assert.equal(learner?.status, 'FAIL')
  assert.ok(learner?.missing.includes('criteri per controllare il lavoro'))
  assert.ok(learner?.missing.includes('possibilità di confronto, verifica, miglioramento o autovalutazione'))
})

test('B31-B33 evidence provenance uses exact UDA bindings and PACK 1D is not a didactic source', () => {
  assert.deepEqual(B31_B33_EVIDENCE_PROVENANCE_V2.B31.binding, {
    kind: 'UDA_SECTION_ITEMS', sectionHeading: 'PRODOTTO ATTESO', itemIndexes: [1, 2, 3],
  })
  assert.deepEqual(B31_B33_EVIDENCE_PROVENANCE_V2.B32.binding, {
    kind: 'UDA_SECTION_ITEMS', sectionHeading: 'PRODOTTO ATTESO', itemIndexes: [4, 5, 6, 7, 8],
  })
  assert.deepEqual(B31_B33_EVIDENCE_PROVENANCE_V2.B33.binding, {
    kind: 'UDA_PHASES', phaseOrdinals: [5, 6],
  })

  for (const [, projection, evidenceProvenance] of cases) {
    assert.equal(evidenceProvenance.sourceRole, 'UDA')
    assert.equal(evidenceProvenance.sourceCode, 'CAN-UDA-1-07')
    assert.equal(projection.sources.some((source) => source.code === 'CAN-PACK-1D'), false)
    assert.equal(projection.sources.some((source) => source.code === 'CAN-PLAN-1'), true)
    assert.equal(projection.sources.some((source) => source.code === 'CAN-UDA-1-07'), true)
  }
})

test('approved B31-B33 manifests are schema v2, source-bound and cognitively receipted', () => {
  assert.equal(APPROVED_HUMAN_TASK_MANIFESTS_B31_B33_V2.length, 3)
  for (const manifest of APPROVED_HUMAN_TASK_MANIFESTS_B31_B33_V2) {
    assert.equal(manifest.schemaVersion, 2)
    assert.deepEqual(validateApprovedHumanTaskManifest(manifest), [])
    assert.equal(manifest.sourceBindings.find((source) => source.code === 'CAN-PACK-1D')?.contribution, 'STRUCTURAL')
    assert.deepEqual(manifest.sourceBindings.map((source) => [source.code, source.generationId]), [
      ['CAN-PLAN-1', 'd327355b-76a9-496f-99cb-dc942fd950e4'],
      ['CAN-UDA-1-07', '92194b46-b7e5-4c52-82a7-b1d75403b8b1'],
      ['CAN-PACK-1D', '1d150f77-6a7f-4f8b-8e85-2fa370956e29'],
    ])
    assert.deepEqual(manifest.approval.cognitiveFulfillment?.stakeholders.map((item) => item.stakeholder), [
      'TEACHER', 'LEARNER', 'COORDINATION', 'GOVERNANCE', 'SYSTEM',
    ])
  }
})

test('the cognitive gate fails closed when human approval or deterministic evidence binding is missing', () => {
  const pending = evaluateHumanTaskStakeholderCognitiveGate({
    projection: B31_PROJECTION_V2,
    evidenceProvenance: {
      sourceRole: 'UDA', sourceCode: 'CAN-UDA-1-07', rationale: '',
      binding: { kind: 'UDA_SECTION_ITEMS', sectionHeading: '', itemIndexes: [] },
    },
    humanDecision: { decision: 'PENDING', rationale: '' },
  })

  assert.equal(pending.status, 'FAIL')
  assert.equal(pending.stakeholders.find((item) => item.stakeholder === 'COORDINATION')?.status, 'FAIL')
  assert.equal(pending.stakeholders.find((item) => item.stakeholder === 'GOVERNANCE')?.status, 'FAIL')
  assert.equal(pending.stakeholders.find((item) => item.stakeholder === 'SYSTEM')?.status, 'FAIL')
})
