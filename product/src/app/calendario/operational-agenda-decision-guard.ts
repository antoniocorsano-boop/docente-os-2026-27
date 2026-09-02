export function canStartDecisionSubmission(input: {
  importing: boolean
  exporting: boolean
  saving: boolean
  title: string
  hasSelectedEvent: boolean
}) {
  return !input.importing && !input.exporting && !input.saving && input.hasSelectedEvent && input.title.trim().length > 0
}

export function shouldClearPersistedDecisionDraft(currentDraft: string, persistedTitle: string) {
  return currentDraft.trim() === persistedTitle
}

type BackupOperationGuardInput = {
  importing: boolean
  exporting: boolean
  decisionSaving: boolean
  pendingMutations: number
}

export function canStartOperationalAgendaImport(input: BackupOperationGuardInput) {
  return !input.importing
    && !input.exporting
    && !input.decisionSaving
    && input.pendingMutations === 0
}

export function canStartOperationalAgendaExport(input: BackupOperationGuardInput & { stateReady: boolean }) {
  return input.stateReady && canStartOperationalAgendaImport(input)
}
