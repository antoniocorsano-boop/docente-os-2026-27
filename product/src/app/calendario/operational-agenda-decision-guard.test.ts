import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createOperationalAgendaState } from '@/core/domain/operational-agenda'
import {
  canStartDecisionSubmission,
  canStartOperationalAgendaExport,
  canStartOperationalAgendaImport,
  readPersistedOperationalAgendaBackup,
  shouldClearPersistedDecisionDraft,
} from './operational-agenda-decision-guard'

const calendarPageSource = fs.readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

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

test('Calendario keeps operational focus and add path ahead of structural detail', () => {
  const focusIndex = calendarPageSource.indexOf('className="humanTaskFocus"')
  const agendaIndex = calendarPageSource.indexOf('<OperationalAgendaPanel')
  const addIndex = calendarPageSource.indexOf('className="calendarAdd"')
  const structureIndex = calendarPageSource.indexOf('className="humanTaskSecondary calendarStructureDisclosure"')

  assert.ok(focusIndex >= 0, 'missing next-event focus')
  assert.ok(agendaIndex > focusIndex, 'operational agenda must follow the next-event focus')
  assert.ok(addIndex > agendaIndex, 'add-event path must follow the operational agenda')
  assert.ok(structureIndex > addIndex, 'structural calendar detail must be demoted after the add-event path')
})

test('Calendario removes internal project terminology while preserving the timetable boundary in teacher language', () => {
  assert.doesNotMatch(calendarPageSource, /\bwave\s+T3C\b|\bT3C\b/i)
  assert.match(calendarPageSource, /L’Orario resta lo schema ricorrente della settimana/)
})
