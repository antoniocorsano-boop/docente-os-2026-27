import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalPlanSupportsDisciplineName } from './canonical-plan-discipline'

test('canonical annual plan is currently bound only to Tecnologia', () => {
  assert.equal(canonicalPlanSupportsDisciplineName('Tecnologia'), true)
  assert.equal(canonicalPlanSupportsDisciplineName(' tecnologia '), true)
  assert.equal(canonicalPlanSupportsDisciplineName('Inglese'), false)
  assert.equal(canonicalPlanSupportsDisciplineName('Matematica'), false)
  assert.equal(canonicalPlanSupportsDisciplineName(null), false)
})
