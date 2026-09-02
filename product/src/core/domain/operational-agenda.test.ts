import assert from 'node:assert/strict'
import test from 'node:test'
import type { CalendarEvent } from './calendar'
import {
  createOperationalAgendaState,
  makeOperationalAgendaBackup,
  parseOperationalAgendaBackup,
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

test('il backup è vincolato allo stesso spazio e anno scolastico', () => {
  const state = createOperationalAgendaState('workspace-1', 'year-1', '2026-09-02T12:00:00.000Z')
  const backup = makeOperationalAgendaBackup(state, '2026-09-02T13:00:00.000Z')

  assert.deepEqual(parseOperationalAgendaBackup(backup, 'workspace-1', 'year-1'), state)
  assert.throws(() => parseOperationalAgendaBackup(backup, 'workspace-2', 'year-1'), /spazio o anno scolastico diverso/)
})
