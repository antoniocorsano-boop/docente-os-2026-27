export type ArenaGoogleConnectionState = 'connected' | 'failed' | 'rejected' | 'context-mismatch' | 'not-configured' | 'scope-mismatch' | 'account-mismatch'

/** Persistent teacher-facing feedback after the existing PKCE OAuth callback. */
export function arenaGoogleConnectionMessage(state: string | null | undefined): string | null {
  switch (state) {
    case 'connected':
      return 'Account Google collegato. Il curricolo privato viene verificato prima della consultazione.'
    case 'failed':
      return 'Collegamento Google non completato. Il curricolo non è stato reso disponibile.'
    case 'rejected':
      return 'Autorizzazione Google non concessa. Nessun contenuto è stato acquisito.'
    case 'context-mismatch':
      return 'Lo spazio docente è cambiato durante il collegamento. Occorre ripetere l’autorizzazione.'
    case 'scope-mismatch':
      return 'I permessi Google non sono sufficienti per la consultazione senza perdere autorizzazioni esistenti. Nessun collegamento è stato modificato.'
    case 'account-mismatch':
      return 'L’account Google non coincide con quello dello spazio docente o con un collegamento già presente. Nessun collegamento è stato modificato.'
    case 'not-configured':
      return 'Il collegamento Google non è configurato in questo ambiente sperimentale.'
    default:
      return null
  }
}
