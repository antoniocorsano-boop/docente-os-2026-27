import assert from 'node:assert/strict'
import test from 'node:test'
import {
  operationalAgendaContextLockName,
  withExclusiveOperationalAgendaBackupLock,
  withSharedOperationalAgendaMutationLock,
  type OperationalAgendaLockManager,
} from './operational-agenda-context-lock'

test('usa un lock stabile per lo stesso contesto agenda', () => {
  assert.equal(
    operationalAgendaContextLockName('user-1', 'workspace-1', 'year-1'),
    'docente-os:operational-agenda:["user-1","workspace-1","year-1"]',
  )
})

test('la mutazione usa un lock condiviso solo se immediatamente disponibile', async () => {
  let operationCalled = false
  let sharedRequested = false
  const manager: OperationalAgendaLockManager = {
    async withSharedIfAvailable() {
      sharedRequested = true
      return { acquired: false }
    },
    async withExclusive(_name, operation) {
      return operation()
    },
  }

  await assert.rejects(
    withSharedOperationalAgendaMutationLock(manager, 'agenda', async () => {
      operationCalled = true
      return 'saved'
    }),
    /Backup locale in corso in un’altra scheda/,
  )
  assert.equal(operationCalled, false)
  assert.equal(sharedRequested, true)
})

test('la mutazione restituisce il valore quando il lock condiviso è disponibile', async () => {
  const manager: OperationalAgendaLockManager = {
    async withSharedIfAvailable(_name, operation) {
      return { acquired: true, value: await operation() }
    },
    async withExclusive(_name, operation) {
      return operation()
    },
  }

  const result = await withSharedOperationalAgendaMutationLock(manager, 'agenda', async () => 'saved')
  assert.equal(result, 'saved')
})

test('il backup usa un lock esclusivo cross-tab', async () => {
  let exclusiveRequested = false
  const manager: OperationalAgendaLockManager = {
    async withSharedIfAvailable(_name, operation) {
      return { acquired: true, value: await operation() }
    },
    async withExclusive(_name, operation) {
      exclusiveRequested = true
      return operation()
    },
  }

  const result = await withExclusiveOperationalAgendaBackupLock(manager, 'agenda', async () => 'backup')
  assert.equal(result, 'backup')
  assert.equal(exclusiveRequested, true)
})

test('import/export falliscono chiusi senza Web Locks', async () => {
  await assert.rejects(
    withExclusiveOperationalAgendaBackupLock(null, 'agenda', async () => 'backup'),
    /non supporta il coordinamento sicuro tra schede/,
  )
})
