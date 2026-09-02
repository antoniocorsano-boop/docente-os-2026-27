'use client'

import {
  createOperationalAgendaState,
  type OperationalAgendaState,
} from '@/core/domain/operational-agenda'

const DATABASE_NAME = 'docente-os-local'
const DATABASE_VERSION = 1
const STORE_NAME = 'operational-agenda'

export class IndexedDbOperationalAgendaRepository {
  async get(workspaceId: string, academicYearId: string): Promise<OperationalAgendaState> {
    const database = await openDatabase()
    const key = contextKey(workspaceId, academicYearId)
    const stored = await request<OperationalAgendaState | undefined>(database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key))
    database.close()
    return stored ?? createOperationalAgendaState(workspaceId, academicYearId)
  }

  async save(state: OperationalAgendaState): Promise<void> {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(state, contextKey(state.workspaceId, state.academicYearId))
    await transactionDone(transaction)
    database.close()
  }

  async replace(workspaceId: string, academicYearId: string, state: OperationalAgendaState): Promise<void> {
    if (state.workspaceId !== workspaceId || state.academicYearId !== academicYearId) {
      throw new Error('Contesto agenda non coerente')
    }
    await this.save(state)
  }
}

function contextKey(workspaceId: string, academicYearId: string) {
  return `${workspaceId}:${academicYearId}`
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
