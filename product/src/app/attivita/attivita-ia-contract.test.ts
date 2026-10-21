import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const board = readFileSync(new URL('./planner-task-board.tsx', import.meta.url), 'utf8')
const actions = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const plannerBridge = readFileSync(new URL('../planner/actions.ts', import.meta.url), 'utf8')
const todayPage = readFileSync(new URL('../planner/page.tsx', import.meta.url), 'utf8')

test('Attivita is the canonical PlannerTask surface under Altro', () => {
  assert.match(page, /active="activities"/)
  assert.match(page, /<h1>Attività<\/h1>/)
  assert.match(page, /<PlannerTaskBoard tasks=\{tasks\}/)
})

test('Attivita owns complete PlannerTask interactions', () => {
  for (const action of [
    'createPlannerTask',
    'completePlannerTask',
    'waitPlannerTask',
    'reopenPlannerTask',
    'movePlannerTaskToday',
    'movePlannerTaskTomorrow',
    'movePlannerTaskWeek',
    'unschedulePlannerTask',
  ]) {
    assert.match(actions, new RegExp(`export async function ${action}\\b`))
    assert.match(board, new RegExp(`\\b${action}\\b`))
  }
  assert.match(actions, /const ACTIVITIES_PATH = '\/attivita'/)
  assert.match(actions, /revalidatePath\(ACTIVITIES_PATH\)/)
})

test('legacy Planner actions are only a temporary compatibility bridge', () => {
  assert.match(plannerBridge, /from '@\/app\/attivita\/actions'/)
  assert.doesNotMatch(plannerBridge, /new SupabasePlannerRepository/)
})


test('Oggi no longer owns PlannerTask mutations', () => {
  for (const action of [
    'createPlannerTask',
    'completePlannerTask',
    'waitPlannerTask',
    'reopenPlannerTask',
    'movePlannerTaskToday',
    'movePlannerTaskTomorrow',
    'movePlannerTaskWeek',
    'unschedulePlannerTask',
  ]) {
    assert.doesNotMatch(todayPage, new RegExp(`\\b${action}\\b`))
  }
})
