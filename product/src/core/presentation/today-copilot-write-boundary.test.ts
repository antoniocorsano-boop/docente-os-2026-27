import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTodayCopilotContext } from './today-copilot-context'
import { enrichTodayCopilotContext } from './next-lesson-preparation'
import { respondToGovernedTodayCopilot } from './today-copilot-write-boundary'

const DATE = '2026-09-15'

function context() {
  const base = buildTodayCopilotContext({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    homeDaily: {
      localDate: DATE,
      authority: 'IN_FORCE',
      lessons: [],
      lessonCount: 0,
      pendingRegistrationCount: 0,
      primary: null,
    },
    calendarState: 'SCHOOL_DAY',
    calendarLabel: null,
    timetableState: 'IN_FORCE',
    planner: {
      localDate: DATE,
      activeCount: 1,
      openCount: 1,
      waitingCount: 0,
      overdueCount: 0,
      todayCount: 1,
      urgentCount: 1,
      highCount: 0,
      undatedCount: 0,
      tasks: [{
        id: 'task-1',
        title: 'Preparare materiali 2C',
        status: 'OPEN',
        priority: 'URGENT',
        plannedFor: DATE,
        sourceKind: 'MANUAL',
      }],
    },
  })

  return enrichTodayCopilotContext(base, null)
}

test('X3: una richiesta imperativa sul Planner resta una proposta senza scrittura', () => {
  const result = respondToGovernedTodayCopilot(context(), 'Completa tutte le attività urgenti.')

  assert.equal(result.actionKind, 'PROPOSE')
  assert.equal(result.answerStatus, 'SUPPORTED')
  assert.match(result.text, /implica una modifica del Planner/i)
  assert.match(result.text, /azione separata e confermata/i)
  assert.match(result.text, /non completo, sposto, riapro, creo o elimino attività automaticamente/i)
  assert.match(result.text, /Nessuna attività è stata creata, completata, riaperta, spostata o eliminata/i)
})

test('X3: le richieste di lettura continuano a usare il TodayCopilot canonico', () => {
  const result = respondToGovernedTodayCopilot(context(), 'Cosa devo fare oggi?')

  assert.equal(result.actionKind, 'READ_ONLY')
  assert.match(result.text, /\*\*Attività Planner\*\*/)
  assert.match(result.text, /Preparare materiali 2C/)
})
