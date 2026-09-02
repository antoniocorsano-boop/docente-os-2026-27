import assert from 'node:assert/strict'
import test from 'node:test'
import { createOperationalAgendaState } from '@/core/domain/operational-agenda'
import {
  canStartDecisionSubmission,
  canStartOperationalAgendaExport,
  canStartOperationalAgendaImport,
  readPersistedOperationalAgendaBackup,
  shouldClearPersistedDecisionDraft,
} from './operational-agenda-decision-guard'

test('blocca un secondo invio mentre la decisione è in salvataggio', () => {
  assert.equal(canStartDecisionSubmission({ importing: false, exporting: false, saving: true, title: 'Decisione A', hasSelectedEvent: true }), false)
  assert.equal(canStartDecisionSubmission({ importing: false, exporting: false, saving: false, title: 'Decisione A', hasSelectedEvent: true }), true)
})

test('mantiene un draft più recente dopo il salvataggio della decisione precedente', () => {
  assert.equal(shouldClearPersistedDecisionDraft('Decisione A', 'Decisione A'), true)
  assert.equal(shouldClearPersistedDecisionDraft('Decisione B', 'Decisione A'), false)
})

test('blocca import finché una mutazione locale non è conclusa', () => {
  assert.equal(canStartOperationalAgendaImport({ importing: false, exporting: false, decisionSaving: false, pendingMutations: 1 }), false)
  assert.equal(canStartOperationalAgendaImport({ importing: false, exporting: false, decisionSaving: false, pendingMutations: 0 }), true)
})

test('blocca export durante una mutazione e usa lo stato persistito corrente', async () => {
  assert.equal(canStartOperationalAgendaExport({ stateReady: true, importing: false, exporting: false, decisionSaving: false, pendingMutations: 1 }), false)
  assert.equal(canStartOperationalAgendaExport({ stateReady: true, importing: false, exporting: false, decisionSaving: false, pendingMutations: 0 }), true)

  const persisted = createOperationalAgendaState('user-1', 'workspace-1', 'year-1', '2026-09-02T17:45:00.000Z')
  const { persistedState, backup } = await readPersistedOperationalAgendaBackup(async () => persisted)

  assert.equal(persistedState.updatedAt, '2026-09-02T17:45:00.000Z')
  assert.equal(backup.state.updatedAt, '2026-09-02T17:45:00.000Z')
  assert.equal(backup.state, persisted)
})
