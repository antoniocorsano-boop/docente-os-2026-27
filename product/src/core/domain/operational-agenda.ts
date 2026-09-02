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

export type OperationalAgendaEventSnapshot = Pick<
  CalendarEvent,
  'id' | 'title' | 'eventKind' | 'startsOn' | 'endsOn' | 'allDay' | 'startTime' | 'endTime' | 'note' | 'sourceRef'
>

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
  eventSnapshot: OperationalAgendaEventSnapshot | null
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

const DECISION_STATUSES = new Set<OperationalAgendaDecisionStatus>(['TO_ACQUIRE', 'PROPOSED', 'TO_VERIFY', 'CONFIRMED'])
const EVENT_KINDS = new Set<CalendarEvent['eventKind']>(['INSTITUTION', 'MEETING', 'DEADLINE', 'TRAINING', 'OTHER'])
const FORBIDDEN_RECORD_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

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

export function snapshotOperationalAgendaEvent(event: OperationalAgendaEventSnapshot): OperationalAgendaEventSnapshot {
  return {
    id: event.id,
    title: event.title,
    eventKind: event.eventKind,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    allDay: event.allDay,
    startTime: event.startTime,
    endTime: event.endTime,
    note: event.note,
    sourceRef: event.sourceRef,
  }
}

export function createEventWorkspace(
  eventId: string,
  now = new Date().toISOString(),
  eventSnapshot: OperationalAgendaEventSnapshot | null = null,
): OperationalAgendaEventWorkspace {
  return {
    eventId,
    eventSnapshot: eventSnapshot ? snapshotOperationalAgendaEvent(eventSnapshot) : null,
    note: '',
    checklist: [],
    decisions: [],
    updatedAt: now,
  }
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
  return {
    format: 'DOCENTE_OS_OPERATIONAL_AGENDA',
    schemaVersion: OPERATIONAL_AGENDA_SCHEMA_VERSION,
    exportedAt: now,
    state,
  }
}

export function parseOperationalAgendaBackup(value: unknown, userId: string, workspaceId: string, academicYearId: string): OperationalAgendaState {
  if (!isRecord(value)) throw new Error('Backup agenda non valido')
  if (value.format !== 'DOCENTE_OS_OPERATIONAL_AGENDA' || value.schemaVersion !== OPERATIONAL_AGENDA_SCHEMA_VERSION) {
    throw new Error('Formato o versione del backup agenda non supportati')
  }
  if (!isTimestamp(value.exportedAt)) throw new Error('Data di esportazione del backup non valida')
  return validateOperationalAgendaState(value.state, userId, workspaceId, academicYearId)
}

export function validateOperationalAgendaState(value: unknown, userId: string, workspaceId: string, academicYearId: string): OperationalAgendaState {
  if (!isRecord(value)) throw new Error('Stato agenda non valido')
  if (value.schemaVersion !== OPERATIONAL_AGENDA_SCHEMA_VERSION) throw new Error('Versione stato agenda non supportata')
  if (value.userId !== userId || value.workspaceId !== workspaceId || value.academicYearId !== academicYearId) {
    throw new Error('Il backup appartiene a un utente, spazio o anno scolastico diverso')
  }
  if (!isNonEmptyString(value.userId) || !isNonEmptyString(value.workspaceId) || !isNonEmptyString(value.academicYearId)) {
    throw new Error('Contesto agenda non valido')
  }
  if (!isRecord(value.eventWorkspaces) || !Array.isArray(value.standaloneDecisions) || !isTimestamp(value.updatedAt)) {
    throw new Error('Contenuto del backup agenda incompleto')
  }

  for (const [eventId, workspace] of Object.entries(value.eventWorkspaces)) {
    if (!isSafeRecordKey(eventId) || !isNonEmptyString(eventId)) throw new Error('Identificatore workspace evento non valido')
    validateEventWorkspace(workspace, eventId)
  }

  value.standaloneDecisions.forEach((decision, index) => validateDecision(decision, null, `decisione autonoma ${index + 1}`))
  return value as OperationalAgendaState
}

function validateEventWorkspace(value: unknown, eventId: string) {
  if (!isRecord(value)) throw new Error(`Workspace locale malformato per ${eventId}`)
  if (value.eventId !== eventId || !isNonEmptyString(value.eventId)) throw new Error(`Identità workspace locale non valida per ${eventId}`)
  if (typeof value.note !== 'string' || !Array.isArray(value.checklist) || !Array.isArray(value.decisions) || !isTimestamp(value.updatedAt)) {
    throw new Error(`Contenuto workspace locale incompleto per ${eventId}`)
  }
  if (value.eventSnapshot !== null) validateEventSnapshot(value.eventSnapshot, eventId)

  value.checklist.forEach((item, index) => validateChecklistItem(item, eventId, index))
  value.decisions.forEach((decision, index) => validateDecision(decision, eventId, `decisione ${index + 1}`))
}

function validateEventSnapshot(value: unknown, eventId: string) {
  if (!isRecord(value)) throw new Error(`Snapshot evento locale malformato per ${eventId}`)
  if (
    value.id !== eventId ||
    !isNonEmptyString(value.title) ||
    !EVENT_KINDS.has(value.eventKind as CalendarEvent['eventKind']) ||
    !isDateOnly(value.startsOn) ||
    !isDateOnly(value.endsOn) ||
    typeof value.allDay !== 'boolean' ||
    !isNullableTime(value.startTime) ||
    !isNullableTime(value.endTime) ||
    !isNullableString(value.note) ||
    !isNullableString(value.sourceRef)
  ) {
    throw new Error(`Snapshot evento locale non valido per ${eventId}`)
  }
}

function validateChecklistItem(value: unknown, eventId: string, index: number) {
  if (!isRecord(value)) throw new Error(`Attività locale ${index + 1} malformata per ${eventId}`)
  if (
    !isNonEmptyString(value.id) ||
    value.eventId !== eventId ||
    !isNullableString(value.suggestionId) ||
    !isNonEmptyString(value.title) ||
    typeof value.done !== 'boolean' ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt)
  ) {
    throw new Error(`Attività locale ${index + 1} non valida per ${eventId}`)
  }
}

function validateDecision(value: unknown, expectedEventId: string | null, label: string) {
  if (!isRecord(value)) throw new Error(`${label} malformata`)
  if (
    !isNonEmptyString(value.id) ||
    !isNullableString(value.eventId) ||
    (expectedEventId !== null && value.eventId !== expectedEventId) ||
    !isNonEmptyString(value.title) ||
    !DECISION_STATUSES.has(value.status as OperationalAgendaDecisionStatus) ||
    !isNullableString(value.note) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt)
  ) {
    throw new Error(`${label} non valida`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return false
  return Object.keys(value).every(isSafeRecordKey)
}

function isSafeRecordKey(value: string) {
  return !FORBIDDEN_RECORD_KEYS.has(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isNullableTime(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value))
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
