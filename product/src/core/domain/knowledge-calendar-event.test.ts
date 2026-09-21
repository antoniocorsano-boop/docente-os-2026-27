import assert from 'node:assert/strict'
import test from 'node:test'
import { knowledgeCalendarEventProposal } from './knowledge-calendar-event'

test('accetta soltanto una proposta calendario completa e modificabile dal docente', () => {
  assert.deepEqual(knowledgeCalendarEventProposal({ calendarEvent: {
    title: 'Formazione sulla sicurezza',
    date: '2026-09-28',
    startTime: '17:00',
    endTime: '19:00',
    eventKind: 'TRAINING',
    location: 'Plesso Covotta',
    mandatory: true,
    attendanceMode: 'IN_PERSON',
    evidence: 'Convocazione in presenza dalle ore 17:00 alle ore 19:00.',
  } }), {
    title: 'Formazione sulla sicurezza',
    date: '2026-09-28',
    startTime: '17:00',
    endTime: '19:00',
    eventKind: 'TRAINING',
    location: 'Plesso Covotta',
    mandatory: true,
    attendanceMode: 'IN_PERSON',
    evidence: 'Convocazione in presenza dalle ore 17:00 alle ore 19:00.',
  })
})

test('rifiuta proposte incomplete, non valide o con orari invertiti', () => {
  assert.equal(knowledgeCalendarEventProposal({}), null)
  assert.equal(knowledgeCalendarEventProposal({ calendarEvent: { title: 'Evento' } }), null)
  assert.equal(knowledgeCalendarEventProposal({ calendarEvent: {
    title: 'Evento', date: '2026-09-31', startTime: '19:00', endTime: '17:00', eventKind: 'TRAINING', attendanceMode: 'IN_PERSON', evidence: 'Testo',
  } }), null)
})
