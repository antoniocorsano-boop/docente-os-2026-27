import assert from 'node:assert/strict'
import test from 'node:test'
import { createOperationalAgendaState } from '@/core/domain/operational-agenda'
import {
  OperationalAgendaStaleRestoreGenerationError,
  assertOperationalAgendaRestoreGeneration,
  makeOperationalAgendaMutationStorageRecord,
  makeOperationalAgendaRestoreStorageRecord,
  readOperationalAgendaRestoreGenerationForReplacement,
  readOperationalAgendaStorageRecord,
  shouldRefreshOperationalAgendaEditors,
} from './operational-agenda-storage-record'

const context = {
  userId: 'user-1',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
}

function state(note: string) {
  const value = createOperationalAgendaState(context.userId, context.workspaceId, context.academicYearId, '2026-09-02T12:00:00.000Z')
  value.standaloneDecisions = [{
    id: `decision:${note}`,
    eventId: null,
    title: note,
    status: 'TO_ACQUIRE',
    note: null,
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
  }]
  return value
}

test('legge i record locali V1 precedenti come generazione di ripristino zero', () => {
  const legacy = state('legacy')
  const snapshot = readOperationalAgendaStorageRecord(legacy, context.userId, context.workspaceId, context.academicYearId)

  assert.equal(snapshot.restoreGeneration, 0)
  assert.equal(snapshot.state.standaloneDecisions[0].title, 'legacy')
})

test('una mutazione ordinaria conserva la generazione di ripristino', () => {
  const current = { state: state('corrente'), restoreGeneration: 4 }
  const nextState = state('modificato')
  const record = makeOperationalAgendaMutationStorageRecord(current, nextState)

  assert.equal(record.restoreGeneration, 4)
  assert.equal(record.state.standaloneDecisions[0].title, 'modificato')
})

test('un import incrementa la generazione e rende stale le schede precedenti', () => {
  const beforeRestore = { state: state('prima'), restoreGeneration: 7 }
  const restored = makeOperationalAgendaRestoreStorageRecord(beforeRestore, state('ripristinato'))

  assert.equal(restored.snapshot.restoreGeneration, 8)
  assert.equal(restored.snapshot.state.standaloneDecisions[0].title, 'ripristinato')
  assert.throws(
    () => assertOperationalAgendaRestoreGeneration(restored.snapshot.restoreGeneration, beforeRestore.restoreGeneration),
    OperationalAgendaStaleRestoreGenerationError,
  )
  assert.doesNotThrow(
    () => assertOperationalAgendaRestoreGeneration(restored.snapshot.restoreGeneration, restored.snapshot.restoreGeneration),
  )
})

test('una scheda stale non può trasformare il nuovo stato ripristinato', () => {
  const oldTabGeneration = 2
  const restored = makeOperationalAgendaRestoreStorageRecord(
    { state: state('vecchio'), restoreGeneration: oldTabGeneration },
    state('backup ripristinato'),
  )

  assert.throws(
    () => {
      assertOperationalAgendaRestoreGeneration(restored.snapshot.restoreGeneration, oldTabGeneration)
      makeOperationalAgendaMutationStorageRecord(restored.snapshot, state('scrittura stale'))
    },
    /ripristinato da un’altra scheda/,
  )
  assert.equal(restored.snapshot.state.standaloneDecisions[0].title, 'backup ripristinato')
})

test('un backup valido può sostituire un record versionato con stato corrotto', () => {
  const corruptStored = {
    storageRecordVersion: 1,
    restoreGeneration: 12,
    state: { broken: true },
  }

  assert.throws(
    () => readOperationalAgendaStorageRecord(corruptStored, context.userId, context.workspaceId, context.academicYearId),
  )

  const currentRestoreGeneration = readOperationalAgendaRestoreGenerationForReplacement(corruptStored)
  const restored = makeOperationalAgendaRestoreStorageRecord(
    { state: state('placeholder'), restoreGeneration: currentRestoreGeneration },
    state('backup valido'),
  )

  assert.equal(currentRestoreGeneration, 12)
  assert.equal(restored.snapshot.restoreGeneration, 13)
  assert.equal(restored.snapshot.state.standaloneDecisions[0].title, 'backup valido')
})

test('un payload legacy corrotto può essere sostituito partendo dalla generazione zero', () => {
  const corruptLegacy = { broken: true }

  assert.throws(
    () => readOperationalAgendaStorageRecord(corruptLegacy, context.userId, context.workspaceId, context.academicYearId),
  )
  assert.equal(readOperationalAgendaRestoreGenerationForReplacement(corruptLegacy), 0)
})

test('il recovery resta fail-closed se la generazione del record versionato è corrotta', () => {
  assert.throws(
    () => readOperationalAgendaRestoreGenerationForReplacement({
      storageRecordVersion: 1,
      restoreGeneration: -1,
      state: { broken: true },
    }),
    /Generazione di ripristino agenda locale non valida/,
  )
})

test('il recovery resta fail-closed su una versione storage sconosciuta', () => {
  assert.throws(
    () => readOperationalAgendaRestoreGenerationForReplacement({
      storageRecordVersion: 2,
      restoreGeneration: 1,
      state: { broken: true },
    }),
    /Versione record agenda locale non supportata/,
  )
})

test('il recovery resta fail-closed su un marker storage corrotto', () => {
  assert.throws(
    () => readOperationalAgendaRestoreGenerationForReplacement({
      storageRecordVersion: 'corrupt',
      restoreGeneration: 1,
      state: { broken: true },
    }),
    /Versione record agenda locale non supportata/,
  )
})

test('gli editor vanno rimontati quando una lettura osserva una generazione diversa', () => {
  assert.equal(shouldRefreshOperationalAgendaEditors(5, 5), false)
  assert.equal(shouldRefreshOperationalAgendaEditors(5, 6), true)
})
