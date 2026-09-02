export type OperationalAgendaLockMode = 'shared' | 'exclusive'

export type OperationalAgendaLockManager = {
  request<T>(
    name: string,
    options: { mode: OperationalAgendaLockMode; ifAvailable?: boolean },
    callback: (lock: object | null) => Promise<T> | T,
  ): Promise<T>
}

export function operationalAgendaContextLockName(userId: string, workspaceId: string, academicYearId: string) {
  return `docente-os:operational-agenda:${JSON.stringify([userId, workspaceId, academicYearId])}`
}

export function browserOperationalAgendaLockManager(): OperationalAgendaLockManager | null {
  if (typeof navigator === 'undefined' || !navigator.locks) return null
  return {
    request<T>(name: string, options: { mode: OperationalAgendaLockMode; ifAvailable?: boolean }, callback: (lock: object | null) => Promise<T> | T) {
      return navigator.locks.request(name, options, (lock) => callback(lock))
    },
  }
}

export async function withSharedOperationalAgendaMutationLock<T>(
  lockManager: OperationalAgendaLockManager | null,
  lockName: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!lockManager) return operation()
  return lockManager.request(lockName, { mode: 'shared', ifAvailable: true }, async (lock) => {
    if (!lock) {
      throw new Error('Backup locale in corso in un’altra scheda: attendi il completamento prima di modificare il lavoro locale.')
    }
    return operation()
  })
}

export async function withExclusiveOperationalAgendaBackupLock<T>(
  lockManager: OperationalAgendaLockManager | null,
  lockName: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!lockManager) {
    throw new Error('Il browser non supporta il coordinamento sicuro tra schede richiesto per importare o esportare il backup locale.')
  }
  return lockManager.request(lockName, { mode: 'exclusive' }, async (lock) => {
    if (!lock) throw new Error('Impossibile acquisire il lock esclusivo dell’agenda locale.')
    return operation()
  })
}
