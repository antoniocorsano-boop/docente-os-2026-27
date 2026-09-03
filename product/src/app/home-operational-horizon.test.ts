import assert from 'node:assert/strict'
import test from 'node:test'
import type { CalendarEvent } from '@/core/domain/calendar'
import { createOperationalAgendaState, type OperationalAgendaState } from '@/core/domain/operational-agenda'
import { buildDailyOperationalHorizon } from './home-operational-horizon'

const baseEvent: CalendarEvent = {
  id: 'event-1',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  title: 'Dipartimento — revisione curricolo verticale',
  eventKind: 'MEETING',
  startsOn: '2026-09-07',
  endsOn: '2026-09-07',
  allDay: false,
  startTime: '15:00',
  endTime: '17:00',
  note: 'Revisione del curricolo alla luce delle Indicazioni nazionali',
  sourceKind: 'INSTITUTION_DOCUMENT',
  sourceRef: 'circolare-12',
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
}

test('porta in primo piano il prossimo impegno e suggerisce cosa preparare', () => {
  const horizon = buildDailyOperationalHorizon([baseEvent], null, '2026-09-04')

  assert.ok(horizon)
  assert.equal(horizon.event.id, 'event-1')
  assert.equal(horizon.historical, false)
  assert.equal(horizon.localStarted, false)
  assert.equal(horizon.preparationTitle, 'Verifica il curricolo e i riferimenti pertinenti')
  assert.equal(horizon.decisionTitle, 'Registra gli esiti collegiali')
})

test('preferisce il lavoro locale già avviato alle proposte generiche', () => {
  const state = createOperationalAgendaState('user-1', 'workspace-1', 'year-1', '2026-09-03T10:00:00.000Z')
  const withWorkspace: OperationalAgendaState = {
    ...state,
    eventWorkspaces: {
      'event-1': {
        eventId: 'event-1',
        eventSnapshot: baseEvent,
        note: '',
        checklist: [{
          id: 'check-1',
          eventId: 'event-1',
          suggestionId: 'curriculum-review',
          title: 'Portare il curricolo vigente',
          done: false,
          createdAt: '2026-09-03T10:00:00.000Z',
          updatedAt: '2026-09-03T10:00:00.000Z',
        }],
        decisions: [{
          id: 'decision-1',
          eventId: 'event-1',
          title: 'Definire la progressione verticale',
          status: 'TO_VERIFY',
          note: null,
          createdAt: '2026-09-03T10:00:00.000Z',
          updatedAt: '2026-09-03T10:00:00.000Z',
        }],
        updatedAt: '2026-09-03T10:00:00.000Z',
      },
    },
  }

  const horizon = buildDailyOperationalHorizon([baseEvent], withWorkspace, '2026-09-04')

  assert.ok(horizon)
  assert.equal(horizon.localStarted, true)
  assert.equal(horizon.pendingChecklistCount, 1)
  assert.equal(horizon.openDecisionCount, 1)
  assert.equal(horizon.preparationTitle, 'Portare il curricolo vigente')
  assert.equal(horizon.decisionTitle, 'Definire la progressione verticale')
})

test('recupera un impegno passato solo quando contiene lavoro locale ancora aperto', () => {
  const state = createOperationalAgendaState('user-1', 'workspace-1', 'year-1', '2026-09-08T10:00:00.000Z')
  state.eventWorkspaces['event-1'] = {
    eventId: 'event-1',
    eventSnapshot: baseEvent,
    note: '',
    checklist: [],
    decisions: [{
      id: 'decision-1',
      eventId: 'event-1',
      title: 'Acquisire il verbale',
      status: 'TO_ACQUIRE',
      note: null,
      createdAt: '2026-09-07T17:00:00.000Z',
      updatedAt: '2026-09-07T17:00:00.000Z',
    }],
    updatedAt: '2026-09-07T17:00:00.000Z',
  }

  const horizon = buildDailyOperationalHorizon([], state, '2026-09-08')

  assert.ok(horizon)
  assert.equal(horizon.historical, true)
  assert.equal(horizon.openDecisionCount, 1)
  assert.equal(horizon.decisionTitle, 'Acquisire il verbale')
})
