export type SemanticDerivativeCompositionToken = {
  revision: number
  requestId: number
}

export function createSemanticDerivativeRevisionGate() {
  let revision = 0
  let requestId = 0
  let confirmedRevision: number | null = null

  return {
    invalidate() {
      revision += 1
      requestId += 1
      confirmedRevision = null
      return revision
    },
    confirmCurrentRevision() {
      requestId += 1
      confirmedRevision = revision
      return revision
    },
    revokeConfirmation() {
      requestId += 1
      confirmedRevision = null
    },
    beginComposition(): SemanticDerivativeCompositionToken | null {
      if (confirmedRevision !== revision) return null
      requestId += 1
      return { revision, requestId }
    },
    isCurrent(token: SemanticDerivativeCompositionToken) {
      return token.revision === revision
        && token.requestId === requestId
        && confirmedRevision === revision
    },
  }
}
