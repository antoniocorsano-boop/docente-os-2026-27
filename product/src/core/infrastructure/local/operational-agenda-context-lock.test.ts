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
  let seenOptions: { mode: string; ifAvailable?: boolean } | null = null
  const manager: OperationalAgendaLockManager = {
    async request(_name, options, callback) {
      seenOptions = options
      return callback(null)
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
  assert.deepEqual(seenOptions, { mode: 'shared', ifAvailable: true })
})

test('il backup usa un lock esclusivo cross-tab', async () => {
  let seenOptions: { mode: string; ifAvailable?: boolean } | null = null
  const manager: OperationalAgendaLockManager = {
    async request(_name, options, callback) {
      seenOptions = options
      return callback({})
    },
  }

  const result = await withExclusiveOperationalAgendaBackupLock(manager, 'agenda', async () => 'backup')
  assert.equal(result, 'backup')
  assert.deepEqual(seenOptions, { mode: 'exclusive' })
})

test('import/export falliscono chiusi senza Web Locks', async () => {
  await assert.rejects(
    withExclusiveOperationalAgendaBackupLock(null, 'agenda', async () => 'backup'),
    /non supporta il coordinamento sicuro tra schede/,
  )
})
