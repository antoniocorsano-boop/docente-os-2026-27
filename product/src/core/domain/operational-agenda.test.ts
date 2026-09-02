import assert from 'node:assert/strict'
import test from 'node:test'
import type { CalendarEvent } from './calendar'
import {
  createEventWorkspace,
  createOperationalAgendaState,
  makeOperationalAgendaBackup,
  parseOperationalAgendaBackup,
  snapshotOperationalAgendaEvent,
  suggestOperationalPreparation,
} from './operational-agenda'

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    title: 'Incontro per ambiti disciplinari',
    eventKind: 'MEETING',
    startsOn: '2026-09-03',
    endsOn: '2026-09-03',
    allDay: false,
    startTime: '09:00',
    endTime: '12:00',
    note: null,
    sourceKind: 'INSTITUTION_DOCUMENT',
    sourceRef: null,
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
    ...overrides,
  }
}

test('propone preparazioni deterministiche dai contenuti già registrati', () => {
  const suggestions = suggestOperationalPreparation(event({
    note: 'Curricolo verticale; revisione modulistica UDA; prove di verifica in ingresso con criteri comuni; organizzazione accoglienza alunni; avvio progettuale.',
    sourceRef: 'Circolare 1-10 settembre 2026',
  }))

  const ids = suggestions.map((item) => item.id)
  assert.ok(ids.includes('curriculum-review'))
  assert.ok(ids.includes('planning-template-review'))
  assert.ok(ids.includes('entry-test'))
  assert.ok(ids.includes('entry-test-decision'))
  assert.ok(ids.includes('welcome-plan'))
  assert.ok(ids.includes('planning-start'))
  assert.ok(ids.includes('meeting-decisions'))
  assert.ok(ids.includes('source-check'))
  assert.equal(new Set(ids).size, ids.length)
})

test('non inventa contenuti specifici per un impegno generico', () => {
  const suggestions = suggestOperationalPreparation(event({ title: 'Attività d’istituto', eventKind: 'OTHER' }))
  assert.deepEqual(suggestions.map((item) => item.id), ['generic-preparation'])
})

test('il backup è vincolato allo stesso utente, spazio e anno scolastico', () => {
  const state = createOperationalAgendaState('user-1', 'workspace-1', 'year-1', '2026-09-02T12:00:00.000Z')
  const backup = makeOperationalAgendaBackup(state, '2026-09-02T13:00:00.000Z')

  assert.deepEqual(parseOperationalAgendaBackup(backup, 'user-1', 'workspace-1', 'year-1'), state)
  assert.throws(() => parseOperationalAgendaBackup(backup, 'user-2', 'workspace-1', 'year-1'), /utente, spazio o anno scolastico diverso/)
  assert.throws(() => parseOperationalAgendaBackup(backup, 'user-1', 'workspace-2', 'year-1'), /utente, spazio o anno scolastico diverso/)
  assert.throws(() => parseOperationalAgendaBackup(backup, 'user-1', 'workspace-1', 'year-2'), /utente, spazio o anno scolastico diverso/)
})

test('il backup conserva uno snapshot minimo per rendere raggiungibile lo storico locale', () => {
  const now = '2026-09-02T12:00:00.000Z'
  const state = createOperationalAgendaState('user-1', 'workspace-1', 'year-1', now)
  state.eventWorkspaces['event-1'] = createEventWorkspace('event-1', now, snapshotOperationalAgendaEvent(event()))
  const backup = makeOperationalAgendaBackup(state, '2026-09-02T13:00:00.000Z')

  const restored = parseOperationalAgendaBackup(backup, 'user-1', 'workspace-1', 'year-1')
  assert.equal(restored.eventWorkspaces['event-1'].eventSnapshot?.title, 'Incontro per ambiti disciplinari')
  assert.equal(restored.eventWorkspaces['event-1'].eventSnapshot?.startsOn, '2026-09-03')
})

test('rifiuta un workspace evento annidato incompleto prima del ripristino', () => {
  const now = '2026-09-02T12:00:00.000Z'
  const state = createOperationalAgendaState('user-1', 'workspace-1', 'year-1', now)
  const backup = makeOperationalAgendaBackup(state, '2026-09-02T13:00:00.000Z') as unknown as {
    state: { eventWorkspaces: Record<string, unknown> }
  }
  backup.state.eventWorkspaces['event-1'] = { eventId: 'event-1' }

  assert.throws(
    () => parseOperationalAgendaBackup(backup, 'user-1', 'workspace-1', 'year-1'),
    /Contenuto workspace locale incompleto/,
  )
})

test('rifiuta checklist e decisioni annidate con forme non valide', () => {
  const now = '2026-09-02T12:00:00.000Z'
  const base = createOperationalAgendaState('user-1', 'workspace-1', 'year-1', now)
  const workspace = createEventWorkspace('event-1', now, snapshotOperationalAgendaEvent(event()))
  workspace.checklist.push({
    id: 'task-1',
    eventId: 'event-1',
    suggestionId: 'curriculum-review',
    title: 'Verifica il curricolo',
    done: false,
    createdAt: now,
    updatedAt: now,
  })
  workspace.decisions.push({
    id: 'decision-1',
    eventId: 'event-1',
    title: 'Modello UDA comune',
    status: 'TO_ACQUIRE',
    note: null,
    createdAt: now,
    updatedAt: now,
  })
  base.eventWorkspaces['event-1'] = workspace

  const invalidChecklist = structuredClone(makeOperationalAgendaBackup(base, '2026-09-02T13:00:00.000Z')) as unknown as {
    state: { eventWorkspaces: Record<string, { checklist: Array<{ done: unknown }> }> }
  }
  invalidChecklist.state.eventWorkspaces['event-1'].checklist[0].done = 'yes'
  assert.throws(() => parseOperationalAgendaBackup(invalidChecklist, 'user-1', 'workspace-1', 'year-1'), /Attività locale 1 non valida/)

  const invalidDecision = structuredClone(makeOperationalAgendaBackup(base, '2026-09-02T13:00:00.000Z')) as unknown as {
    state: { eventWorkspaces: Record<string, { decisions: Array<{ status: string }> }> }
  }
  invalidDecision.state.eventWorkspaces['event-1'].decisions[0].status = 'AUTO_APPROVED'
  assert.throws(() => parseOperationalAgendaBackup(invalidDecision, 'user-1', 'workspace-1', 'year-1'), /decisione 1 non valida/)
})
