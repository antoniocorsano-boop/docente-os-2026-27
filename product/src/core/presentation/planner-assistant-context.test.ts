import assert from 'node:assert/strict'
import test from 'node:test'
import type { PlannerTask } from '@/core/domain/planner-task'
import { validateAssistantResponseContract } from './assistant-context'
import {
  buildPlannerAssistantContext,
  PLANNER_X3_CAPABILITIES,
  PLANNER_X3_FORBIDDEN_CAPABILITIES,
  respondToPlannerAssistant,
} from './planner-assistant-context'

const TODAY = '2026-08-24'

function task(overrides: Partial<PlannerTask> & Pick<PlannerTask, 'id' | 'title'>): PlannerTask {
  return {
    id: overrides.id,
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    title: overrides.title,
    notes: overrides.notes ?? null,
    status: overrides.status ?? 'OPEN',
    priority: overrides.priority ?? 'NORMAL',
    dueAt: overrides.dueAt ?? null,
    plannedFor: overrides.plannedFor ?? null,
    sourceKind: overrides.sourceKind ?? 'MANUAL',
    sourceRef: overrides.sourceRef ?? null,
    createdBy: 'user-1',
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? '2026-08-20T08:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-08-20T08:00:00Z',
  }
}

function build() {
  return buildPlannerAssistantContext({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    localDate: TODAY,
    tasks: [
      task({ id: 'overdue', title: 'Consegna relazione dipartimento', priority: 'HIGH', dueAt: '2026-08-23T18:00:00+02:00' }),
      task({ id: 'today', title: 'Preparare materiali 3A', notes: 'Scheda sulla cittadinanza digitale', plannedFor: TODAY }),
      task({ id: 'urgent', title: 'Controllare circolare urgente', priority: 'URGENT', dueAt: '2026-08-24T12:00:00+02:00', sourceKind: 'COMMUNICATION' }),
      task({ id: 'waiting', title: 'Attendere conferma orario', status: 'WAITING', priority: 'NORMAL' }),
      task({ id: 'undated', title: 'Aggiornare rubrica valutativa', priority: 'LOW' }),
      task({ id: 'done', title: 'Attività già conclusa', status: 'DONE', completedAt: '2026-08-22T10:00:00Z' }),
    ],
  })
}

test('Planner context exposes read/propose capabilities and explicit write denylist', () => {
  const context = build()
  assert.deepEqual(context.availableCapabilities, [...PLANNER_X3_CAPABILITIES])
  assert.deepEqual(context.forbiddenCapabilities, [...PLANNER_X3_FORBIDDEN_CAPABILITIES])
  assert.equal(context.planner.activeCount, 5)
  assert.equal(context.planner.openCount, 4)
  assert.equal(context.planner.waitingCount, 1)
  assert.equal(context.planner.overdueCount, 1)
  assert.equal(context.planner.todayCount, 2)
  assert.equal(context.planner.urgentCount, 1)
})

test('Planner summary gives real counts and tasks before operational limits', () => {
  const response = respondToPlannerAssistant(build(), 'Cosa devo fare?')
  assert.equal(response.actionKind, 'READ_ONLY')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /5 attività attive/)
  assert.match(response.text, /1 sono scadute|1 sono scadut|1.*scadut/i)
  assert.match(response.text, /Consegna relazione dipartimento/)
  assert.match(response.text, /Controllare circolare urgente/)
  assert.equal(validateAssistantResponseContract(response).valid, true)
})

test('Planner prioritization puts overdue and urgent work first', () => {
  const response = respondToPlannerAssistant(build(), 'Cosa viene prima adesso?')
  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /Consegna relazione dipartimento/)
  assert.match(response.text, /Controllare circolare urgente/)
  const overdueIndex = response.text.indexOf('Consegna relazione dipartimento')
  const todayIndex = response.text.indexOf('Preparare materiali 3A')
  assert.ok(overdueIndex >= 0 && todayIndex >= 0 && overdueIndex < todayIndex)
})

test('Planner today plan is concrete and does not mutate anything', () => {
  const response = respondToPlannerAssistant(build(), 'Come organizzo la giornata di oggi?')
  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /Piano di lavoro per oggi/)
  assert.match(response.text, /Consegna relazione dipartimento|Controllare circolare urgente/)
  assert.match(response.text, /non sposto automaticamente/i)
  assert.doesNotMatch(response.text, /ho spostato|ho completato|attività completata/i)
})

test('Planner write request becomes an informative preview, never an executed action', () => {
  const response = respondToPlannerAssistant(build(), 'Completa Preparare materiali 3A')
  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /implica una modifica del Planner/i)
  assert.match(response.text, /Preparare materiali 3A/)
  assert.match(response.text, /Nessuna attività è stata creata, completata, riaperta, spostata o eliminata/i)
  assert.doesNotMatch(response.text, /ho completato/i)
})

test('Planner free question retrieves a named task instead of returning navigation advice', () => {
  const response = respondToPlannerAssistant(build(), 'Che situazione ha la rubrica valutativa?')
  assert.equal(response.actionKind, 'READ_ONLY')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /Aggiornare rubrica valutativa/)
  assert.match(response.text, /senza data/i)
  assert.doesNotMatch(response.text, /^Apri |^Vai |^Usa /)
})

test('Planner unknown question states the gap and still reports supported Planner state', () => {
  const response = respondToPlannerAssistant(build(), 'Quale aula devo prenotare?')
  assert.equal(response.actionKind, 'READ_ONLY')
  assert.equal(response.answerStatus, 'NOT_FOUND')
  assert.match(response.text, /Non trovo nel Planner una attività/i)
  assert.match(response.text, /5 attività attive/)
  assert.doesNotMatch(response.text, /aula 1|aula magna|laboratorio/i)
  assert.equal(validateAssistantResponseContract(response).valid, true)
})
