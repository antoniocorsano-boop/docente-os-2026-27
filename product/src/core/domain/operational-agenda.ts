import type { CalendarEvent } from './calendar'

export const OPERATIONAL_AGENDA_SCHEMA_VERSION = 1 as const

export type OperationalAgendaSuggestionKind = 'PREPARATION' | 'DOCUMENT' | 'DECISION'

export type OperationalAgendaSuggestion = {
  id: string
  kind: OperationalAgendaSuggestionKind
  title: string
  description: string
  referenceHint: string | null
}

export type OperationalAgendaChecklistItem = {
  id: string
  eventId: string
  suggestionId: string | null
  title: string
  done: boolean
  createdAt: string
  updatedAt: string
}

export type OperationalAgendaDecisionStatus = 'TO_ACQUIRE' | 'PROPOSED' | 'TO_VERIFY' | 'CONFIRMED'

export type OperationalAgendaDecision = {
  id: string
  eventId: string | null
  title: string
  status: OperationalAgendaDecisionStatus
  note: string | null
  createdAt: string
  updatedAt: string
}

export type OperationalAgendaEventWorkspace = {
  eventId: string
  note: string
  checklist: OperationalAgendaChecklistItem[]
  decisions: OperationalAgendaDecision[]
  updatedAt: string
}

export type OperationalAgendaState = {
  schemaVersion: typeof OPERATIONAL_AGENDA_SCHEMA_VERSION
  userId: string
  workspaceId: string
  academicYearId: string
  eventWorkspaces: Record<string, OperationalAgendaEventWorkspace>
  standaloneDecisions: OperationalAgendaDecision[]
  updatedAt: string
}

export type OperationalAgendaBackup = {
  format: 'DOCENTE_OS_OPERATIONAL_AGENDA'
  schemaVersion: typeof OPERATIONAL_AGENDA_SCHEMA_VERSION
  exportedAt: string
  state: OperationalAgendaState
}

export function createOperationalAgendaState(userId: string, workspaceId: string, academicYearId: string, now = new Date().toISOString()): OperationalAgendaState {
  return {
    schemaVersion: OPERATIONAL_AGENDA_SCHEMA_VERSION,
    userId,
    workspaceId,
    academicYearId,
    eventWorkspaces: {},
    standaloneDecisions: [],
    updatedAt: now,
  }
}

export function createEventWorkspace(eventId: string, now = new Date().toISOString()): OperationalAgendaEventWorkspace {
  return { eventId, note: '', checklist: [], decisions: [], updatedAt: now }
}

export function suggestOperationalPreparation(event: Pick<CalendarEvent, 'id' | 'title' | 'note' | 'eventKind' | 'sourceRef'>): OperationalAgendaSuggestion[] {
  const text = normalize(`${event.title} ${event.note ?? ''}`)
  const suggestions: OperationalAgendaSuggestion[] = []

  const add = (suggestion: OperationalAgendaSuggestion) => {
    if (!suggestions.some((item) => item.id === suggestion.id)) suggestions.push(suggestion)
  }

  if (containsAny(text, ['curricolo verticale', 'curricolo', 'indicazioni nazionali'])) {
    add({
      id: 'curriculum-review',
      kind: 'DOCUMENT',
      title: 'Verifica il curricolo e i riferimenti pertinenti',
      description: 'Porta al confronto il curricolo vigente e annota separatamente proposte, parti da verificare e decisioni effettivamente assunte.',
      referenceHint: 'Conoscenza · curricolo / Indicazioni nazionali',
    })
  }

  if (containsAny(text, ['modulistica', 'modello uda', 'unita di apprendimento', 'uda'])) {
    add({
      id: 'planning-template-review',
      kind: 'DOCUMENT',
      title: 'Controlla la modulistica di progettazione',
      description: 'Verifica che il modello renda leggibili obiettivi, attività, evidenze, verifica, criteri, inclusione, durata prevista ed effettiva e rimodulazioni.',
      referenceHint: 'Progetta · modelli e UDA',
    })
  }

  if (containsAny(text, ['prova di verifica in ingresso', 'prove di verifica in ingresso', 'prova d ingresso', 'prove d ingresso'])) {
    add({
      id: 'entry-test',
      kind: 'PREPARATION',
      title: 'Prepara una bozza di prova d’ingresso',
      description: 'Predisponi una proposta disciplinare e mantieni separati i criteri personali da quelli che saranno condivisi o deliberati collegialmente.',
      referenceHint: 'Progetta · verifiche e criteri',
    })
    add({
      id: 'entry-test-decision',
      kind: 'DECISION',
      title: 'Acquisisci la decisione sui criteri comuni',
      description: 'Registra soltanto dopo il confronto se la prova e i criteri saranno comuni per disciplina, ambito o classi parallele.',
      referenceHint: null,
    })
  }

  if (containsAny(text, ['accoglienza alunni', 'accoglienza'])) {
    add({
      id: 'welcome-plan',
      kind: 'PREPARATION',
      title: 'Prepara l’accoglienza',
      description: 'Raccogli attività iniziali, materiali, tempi e osservazioni utili all’avvio, distinguendo la funzione diagnostico-formativa dalla valutazione sommativa.',
      referenceHint: 'Progetta · attività iniziali',
    })
  }

  if (containsAny(text, ['avvio progettuale', 'programmazione', 'progettazione'])) {
    add({
      id: 'planning-start',
      kind: 'PREPARATION',
      title: 'Allinea l’avvio progettuale',
      description: 'Verifica ciò che è già stabile, ciò che dipende dal calendario e dall’orario reale e ciò che richiede un adattamento di classe o sezione.',
      referenceHint: 'Progetta · programmazione annuale',
    })
  }

  if (event.eventKind === 'MEETING' || containsAny(text, ['collegio docenti', 'dipartimento', 'ambiti disciplinari', 'riunione'])) {
    add({
      id: 'meeting-decisions',
      kind: 'DECISION',
      title: 'Registra gli esiti collegiali',
      description: 'Durante o dopo la riunione separa decisioni confermate, proposte e punti ancora da verificare.',
      referenceHint: null,
    })
  }

  if (event.sourceRef) {
    add({
      id: 'source-check',
      kind: 'DOCUMENT',
      title: 'Tieni disponibile la fonte dell’impegno',
      description: 'Verifica il riferimento prima di trasformare l’ordine del giorno in attività o decisioni operative.',
      referenceHint: event.sourceRef,
    })
  }

  if (!suggestions.length) {
    add({
      id: 'generic-preparation',
      kind: 'PREPARATION',
      title: 'Prepara l’impegno',
      description: 'Rileggi titolo, nota e fonte; annota ciò che devi portare, ciò che deve essere deciso e ciò che resta da verificare.',
      referenceHint: null,
    })
  }

  return suggestions
}

export function makeOperationalAgendaBackup(state: OperationalAgendaState, now = new Date().toISOString()): OperationalAgendaBackup {
  return { format: 'DOCENTE_OS_OPERATIONAL_AGENDA', schemaVersion: OPERATIONAL_AGENDA_SCHEMA_VERSION, exportedAt: now, state }
}

export function parseOperationalAgendaBackup(value: unknown, userId: string, workspaceId: string, academicYearId: string): OperationalAgendaState {
  if (!value || typeof value !== 'object') throw new Error('Backup agenda non valido')
  const backup = value as Partial<OperationalAgendaBackup>
  if (backup.format !== 'DOCENTE_OS_OPERATIONAL_AGENDA' || backup.schemaVersion !== OPERATIONAL_AGENDA_SCHEMA_VERSION) {
    throw new Error('Formato o versione del backup agenda non supportati')
  }
  const state = backup.state
  if (!state || state.schemaVersion !== OPERATIONAL_AGENDA_SCHEMA_VERSION) throw new Error('Stato agenda non valido')
  if (state.userId !== userId || state.workspaceId !== workspaceId || state.academicYearId !== academicYearId) {
    throw new Error('Il backup appartiene a un utente, spazio o anno scolastico diverso')
  }
  if (!state.eventWorkspaces || typeof state.eventWorkspaces !== 'object' || !Array.isArray(state.standaloneDecisions)) {
    throw new Error('Contenuto del backup agenda incompleto')
  }
  return state
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function containsAny(text: string, values: string[]) {
  return values.some((value) => text.includes(normalize(value)))
}
