import assert from 'node:assert/strict'
import test from 'node:test'
import type { AssistantContext } from '@/core/presentation/assistant-context'
import {
  confirmAssistantWriteProposal,
  evaluateAssistantWriteExecution,
  preparePlannerCreateTaskProposal,
} from './assistant-write-contract'

const context: AssistantContext = {
  surface: 'KNOWLEDGE',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  object: { type: 'KNOWLEDGE_ASSET', id: 'asset-1', title: 'Circolare' },
  provenance: [{ kind: 'DOCUMENT', ref: 'asset:asset-1', label: 'Circolare' }],
  availableCapabilities: [
    'KNOWLEDGE_EXPLAIN_CONTEXT',
    'KNOWLEDGE_LIST_PROPOSALS',
  ],
  forbiddenCapabilities: ['PLANNER_CREATE_TASK'],
  missingInformation: [],
}

function proposal() {
  return preparePlannerCreateTaskProposal({
    proposalId: 'proposal-1',
    context,
    title: ' Preparare documentazione ',
    plannedFor: '2026-09-01',
    priority: 'HIGH',
    sourceKind: 'DOCUMENT',
    sourceRef: 'asset:asset-1',
    rationale: 'La fonte contiene un adempimento.',
  })
}

test('X4 planner proposal is structured as preview and never executes during X3', () => {
  const value = proposal()
  assert.equal(value.actionKind, 'WRITE_REVERSIBLE')
  assert.equal(value.status, 'PREVIEW_READY')
  assert.equal(value.requiresConfirmation, true)
  assert.equal(value.reversible, true)
  assert.equal(value.payload.title, 'Preparare documentazione')
  assert.ok(value.effectPreview.changes.some((item) => item.includes('Planner')))
  assert.ok(value.effectPreview.doesNotChange.some((item) => item.includes('Piano annuale')))
  assert.equal(value.evidenceRefs.includes('asset:asset-1'), true)

  assert.deepEqual(evaluateAssistantWriteExecution({
    proposal: value,
    confirmation: null,
    policy: {
      x4Enabled: false,
      availableCapabilities: context.availableCapabilities,
      forbiddenCapabilities: context.forbiddenCapabilities,
    },
  }), { allowed: false, reason: 'X4_NOT_ENABLED' })
})

test('confirmation is bound to both proposal id and payload fingerprint', () => {
  const value = proposal()
  const confirmed = confirmAssistantWriteProposal(value, {
    confirmedBy: 'user-1',
    confirmedAt: '2026-08-23T20:00:00+02:00',
  })

  assert.equal(confirmed.proposal.status, 'CONFIRMED')
  assert.equal(confirmed.confirmation.proposalId, value.proposalId)
  assert.equal(confirmed.confirmation.payloadFingerprint, value.payloadFingerprint)
})

test('X4 execution remains forbidden while capability is on the X3 denylist', () => {
  const value = proposal()
  const confirmed = confirmAssistantWriteProposal(value, {
    confirmedBy: 'user-1',
    confirmedAt: '2026-08-23T20:00:00+02:00',
  })

  assert.deepEqual(evaluateAssistantWriteExecution({
    proposal: confirmed.proposal,
    confirmation: confirmed.confirmation,
    policy: {
      x4Enabled: true,
      availableCapabilities: ['PLANNER_CREATE_TASK'],
      forbiddenCapabilities: ['PLANNER_CREATE_TASK'],
    },
  }), { allowed: false, reason: 'CAPABILITY_FORBIDDEN' })
})

test('confirmed proposal can pass only when X4 is enabled and capability is explicitly allowed', () => {
  const value = proposal()
  const confirmed = confirmAssistantWriteProposal(value, {
    confirmedBy: 'user-1',
    confirmedAt: '2026-08-23T20:00:00+02:00',
  })

  assert.deepEqual(evaluateAssistantWriteExecution({
    proposal: confirmed.proposal,
    confirmation: confirmed.confirmation,
    policy: {
      x4Enabled: true,
      availableCapabilities: ['PLANNER_CREATE_TASK'],
      forbiddenCapabilities: [],
    },
  }), { allowed: true })
})

test('payload mutation after preview is rejected even after human confirmation', () => {
  const value = proposal()
  const confirmed = confirmAssistantWriteProposal(value, {
    confirmedBy: 'user-1',
    confirmedAt: '2026-08-23T20:00:00+02:00',
  })
  const tampered = {
    ...confirmed.proposal,
    payload: { ...confirmed.proposal.payload, title: 'Titolo cambiato dopo la preview' },
  }

  assert.deepEqual(evaluateAssistantWriteExecution({
    proposal: tampered,
    confirmation: confirmed.confirmation,
    policy: {
      x4Enabled: true,
      availableCapabilities: ['PLANNER_CREATE_TASK'],
      forbiddenCapabilities: [],
    },
  }), { allowed: false, reason: 'PAYLOAD_CHANGED_AFTER_PREVIEW' })
})

test('proposal validation fails closed for malformed dates or empty titles', () => {
  assert.throws(() => preparePlannerCreateTaskProposal({ proposalId: 'p', context, title: '   ' }))
  assert.throws(() => preparePlannerCreateTaskProposal({ proposalId: 'p', context, title: 'Task', plannedFor: '01/09/2026' }))
  assert.throws(() => preparePlannerCreateTaskProposal({ proposalId: 'p', context, title: 'Task', dueAt: 'not-a-date' }))
})
