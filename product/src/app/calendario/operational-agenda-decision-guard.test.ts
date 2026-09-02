import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canStartDecisionSubmission,
  shouldClearPersistedDecisionDraft,
} from './operational-agenda-decision-guard'

test('blocca un secondo invio mentre la decisione è in salvataggio', () => {
  assert.equal(canStartDecisionSubmission({ importing: false, saving: true, title: 'Decisione A', hasSelectedEvent: true }), false)
  assert.equal(canStartDecisionSubmission({ importing: false, saving: false, title: 'Decisione A', hasSelectedEvent: true }), true)
})

test('mantiene un draft più recente dopo il salvataggio della decisione precedente', () => {
  assert.equal(shouldClearPersistedDecisionDraft('Decisione A', 'Decisione A'), true)
  assert.equal(shouldClearPersistedDecisionDraft('Decisione B', 'Decisione A'), false)
})
