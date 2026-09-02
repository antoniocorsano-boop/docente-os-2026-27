export type SharedOperationalAgendaLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false }

export type OperationalAgendaLockManager = {
  withSharedIfAvailable<T>(
    name: string,
    operation: () => Promise<T>,
  ): Promise<SharedOperationalAgendaLockResult<T>>
  withExclusive<T>(
    name: string,
    operation: () => Promise<T>,
  ): Promise<T>
}

export function operationalAgendaContextLockName(userId: string, workspaceId: string, academicYearId: string) {
  return `docente-os:operational-agenda:${JSON.stringify([userId, workspaceId, academicYearId])}`
}

export function browserOperationalAgendaLockManager(): OperationalAgendaLockManager | null {
  if (typeof navigator === 'undefined' || !navigator.locks) return null
  const locks = navigator.locks
  return {
    async withSharedIfAvailable<T>(
      name: string,
      operation: () => Promise<T>,
    ): Promise<SharedOperationalAgendaLockResult<T>> {
      const result = await locks.request(
        name,
        { mode: 'shared', ifAvailable: true },
        async (lock): Promise<SharedOperationalAgendaLockResult<T>> => {
          if (!lock) return { acquired: false }
          return { acquired: true, value: await operation() }
        },
      )
      return result
    },
    async withExclusive<T>(name: string, operation: () => Promise<T>): Promise<T> {
      const result = await locks.request(
        name,
        { mode: 'exclusive' },
        async (lock): Promise<T> => {
          if (!lock) throw new Error('Impossibile acquisire il lock esclusivo dell’agenda locale.')
          return await operation()
        },
      )
      return result
    },
  }
}

export async function withSharedOperationalAgendaMutationLock<T>(
  lockManager: OperationalAgendaLockManager | null,
  lockName: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!lockManager) return operation()
  const result = await lockManager.withSharedIfAvailable(lockName, operation)
  if (!result.acquired) {
    throw new Error('Backup locale in corso in un’altra scheda: attendi il completamento prima di modificare il lavoro locale.')
  }
  return result.value
}

export async function withExclusiveOperationalAgendaBackupLock<T>(
  lockManager: OperationalAgendaLockManager | null,
  lockName: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!lockManager) {
    throw new Error('Il browser non supporta il coordinamento sicuro tra schede richiesto per importare o esportare il backup locale.')
  }
  return lockManager.withExclusive(lockName, operation)
}
