'use client'

import {
  validateOperationalAgendaState,
  type OperationalAgendaState,
} from '@/core/domain/operational-agenda'
import {
  browserOperationalAgendaLockManager,
  operationalAgendaContextLockName,
  withExclusiveOperationalAgendaBackupLock,
  withSharedOperationalAgendaMutationLock,
  type OperationalAgendaLockManager,
} from './operational-agenda-context-lock'
import {
  assertOperationalAgendaRestoreGeneration,
  makeOperationalAgendaMutationStorageRecord,
  makeOperationalAgendaRestoreStorageRecord,
  readOperationalAgendaRestoreGenerationForReplacement,
  readOperationalAgendaStorageRecord,
  type OperationalAgendaRepositorySnapshot,
} from './operational-agenda-storage-record'

const DATABASE_NAME = 'docente-os-local'
const DATABASE_VERSION = 1
const STORE_NAME = 'operational-agenda'

export class IndexedDbOperationalAgendaRepository {
  constructor(private readonly lockManager: OperationalAgendaLockManager | null = browserOperationalAgendaLockManager()) {}

  async get(userId: string, workspaceId: string, academicYearId: string): Promise<OperationalAgendaState> {
    return (await this.getSnapshot(userId, workspaceId, academicYearId)).state
  }

  async getSnapshot(userId: string, workspaceId: string, academicYearId: string): Promise<OperationalAgendaRepositorySnapshot> {
    const database = await openDatabase()
    try {
      const key = contextKey(userId, workspaceId, academicYearId)
      const stored = await request<unknown>(database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key))
      return readOperationalAgendaStorageRecord(stored, userId, workspaceId, academicYearId)
    } finally {
      database.close()
    }
  }

  async mutate(
    userId: string,
    workspaceId: string,
    academicYearId: string,
    expectedRestoreGeneration: number,
    mutation: (current: OperationalAgendaState) => OperationalAgendaState,
  ): Promise<OperationalAgendaState> {
    const lockName = operationalAgendaContextLockName(userId, workspaceId, academicYearId)
    return withSharedOperationalAgendaMutationLock(this.lockManager, lockName, async () => {
      const database = await openDatabase()
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      try {
        const store = transaction.objectStore(STORE_NAME)
        const key = contextKey(userId, workspaceId, academicYearId)
        const stored = await request<unknown>(store.get(key))
        const snapshot = readOperationalAgendaStorageRecord(stored, userId, workspaceId, academicYearId)
        assertOperationalAgendaRestoreGeneration(snapshot.restoreGeneration, expectedRestoreGeneration)
        const next = validateOperationalAgendaState(mutation(snapshot.state), userId, workspaceId, academicYearId)
        store.put(makeOperationalAgendaMutationStorageRecord(snapshot, next), key)
        await transactionDone(transaction)
        return next
      } catch (error) {
        try {
          transaction.abort()
        } catch {
          // The transaction may already have completed or aborted.
        }
        throw error
      } finally {
        database.close()
      }
    })
  }

  async replace(
    userId: string,
    workspaceId: string,
    academicYearId: string,
    state: OperationalAgendaState,
  ): Promise<OperationalAgendaRepositorySnapshot> {
    const validated = validateOperationalAgendaState(state, userId, workspaceId, academicYearId)
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    try {
      const store = transaction.objectStore(STORE_NAME)
      const key = contextKey(userId, workspaceId, academicYearId)
      const stored = await request<unknown>(store.get(key))
      const currentRestoreGeneration = readOperationalAgendaRestoreGenerationForReplacement(stored)
      const restored = makeOperationalAgendaRestoreStorageRecord(
        { state: validated, restoreGeneration: currentRestoreGeneration },
        validated,
      )
      store.put(restored.record, key)
      await transactionDone(transaction)
      return restored.snapshot
    } catch (error) {
      try {
        transaction.abort()
      } catch {
        // The transaction may already have completed or aborted.
      }
      throw error
    } finally {
      database.close()
    }
  }

  async withExclusiveContextLock<T>(
    userId: string,
    workspaceId: string,
    academicYearId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return withExclusiveOperationalAgendaBackupLock(
      this.lockManager,
      operationalAgendaContextLockName(userId, workspaceId, academicYearId),
      operation,
    )
  }
}

function contextKey(userId: string, workspaceId: string, academicYearId: string) {
  return `${userId}:${workspaceId}:${academicYearId}`
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB non disponibile in questo browser'))
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    openRequest.onupgradeneeded = () => {
      const database = openRequest.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME)
    }
    openRequest.onsuccess = () => resolve(openRequest.result)
    openRequest.onerror = () => reject(openRequest.error ?? new Error('Apertura archivio locale non riuscita'))
    openRequest.onblocked = () => reject(new Error('Archivio locale bloccato da un’altra scheda'))
  })
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result)
    value.onerror = () => reject(value.error ?? new Error('Operazione locale non riuscita'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Salvataggio locale non riuscito'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Salvataggio locale annullato'))
  })
}
