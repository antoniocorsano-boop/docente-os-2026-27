import {
  createOperationalAgendaState,
  validateOperationalAgendaState,
  type OperationalAgendaState,
} from '@/core/domain/operational-agenda'

const STORAGE_RECORD_VERSION = 1 as const

export type OperationalAgendaRepositorySnapshot = {
  state: OperationalAgendaState
  restoreGeneration: number
}

type OperationalAgendaStorageRecord = {
  storageRecordVersion: typeof STORAGE_RECORD_VERSION
  restoreGeneration: number
  state: OperationalAgendaState
}

export class OperationalAgendaStaleRestoreGenerationError extends Error {
  constructor() {
    super('Il lavoro locale è stato ripristinato da un’altra scheda. Lo stato corrente deve essere ricaricato prima di salvare altre modifiche.')
    this.name = 'OperationalAgendaStaleRestoreGenerationError'
  }
}

export function readOperationalAgendaStorageRecord(
  stored: unknown,
  userId: string,
  workspaceId: string,
  academicYearId: string,
): OperationalAgendaRepositorySnapshot {
  if (stored === undefined) {
    return {
      state: createOperationalAgendaState(userId, workspaceId, academicYearId),
      restoreGeneration: 0,
    }
  }

  if (isStorageRecordCandidate(stored)) {
    if (!isRestoreGeneration(stored.restoreGeneration)) {
      throw new Error('Generazione di ripristino agenda locale non valida')
    }
    return {
      state: validateOperationalAgendaState(stored.state, userId, workspaceId, academicYearId),
      restoreGeneration: stored.restoreGeneration,
    }
  }

  // Compatibilità con i record V1 già persistiti prima dell'introduzione
  // della generazione di ripristino: il payload storico è lo stato stesso.
  return {
    state: validateOperationalAgendaState(stored, userId, workspaceId, academicYearId),
    restoreGeneration: 0,
  }
}

export function assertOperationalAgendaRestoreGeneration(actual: number, expected: number) {
  if (actual !== expected) throw new OperationalAgendaStaleRestoreGenerationError()
}

export function makeOperationalAgendaMutationStorageRecord(
  snapshot: OperationalAgendaRepositorySnapshot,
  nextState: OperationalAgendaState,
): OperationalAgendaStorageRecord {
  return {
    storageRecordVersion: STORAGE_RECORD_VERSION,
    restoreGeneration: snapshot.restoreGeneration,
    state: nextState,
  }
}

export function makeOperationalAgendaRestoreStorageRecord(
  snapshot: OperationalAgendaRepositorySnapshot,
  restoredState: OperationalAgendaState,
): { record: OperationalAgendaStorageRecord; snapshot: OperationalAgendaRepositorySnapshot } {
  if (snapshot.restoreGeneration >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Generazione di ripristino agenda locale esaurita')
  }
  const restoreGeneration = snapshot.restoreGeneration + 1
  return {
    record: {
      storageRecordVersion: STORAGE_RECORD_VERSION,
      restoreGeneration,
      state: restoredState,
    },
    snapshot: { state: restoredState, restoreGeneration },
  }
}

function isStorageRecordCandidate(value: unknown): value is Record<string, unknown> & {
  storageRecordVersion: typeof STORAGE_RECORD_VERSION
  restoreGeneration: unknown
  state: unknown
} {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    (value as { storageRecordVersion?: unknown }).storageRecordVersion === STORAGE_RECORD_VERSION &&
    Object.prototype.hasOwnProperty.call(value, 'restoreGeneration') &&
    Object.prototype.hasOwnProperty.call(value, 'state'),
  )
}

function isRestoreGeneration(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
