export function canStartDecisionSubmission(input: {
  importing: boolean
  saving: boolean
  title: string
  hasSelectedEvent: boolean
}) {
  return !input.importing && !input.saving && input.hasSelectedEvent && input.title.trim().length > 0
}

export function shouldClearPersistedDecisionDraft(currentDraft: string, persistedTitle: string) {
  return currentDraft.trim() === persistedTitle
}
