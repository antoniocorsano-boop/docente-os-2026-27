import assert from 'node:assert/strict'
import test from 'node:test'
import { curriculumDisciplineRefForCanonicalPlan } from './curriculum-source-binding'

test('canonical Technology annual plans bind to the CML discipline reference', () => {
  assert.equal(curriculumDisciplineRefForCanonicalPlan('CAN-PLAN-1'), 'technology')
  assert.equal(curriculumDisciplineRefForCanonicalPlan('CAN-PLAN-2'), 'technology')
  assert.equal(curriculumDisciplineRefForCanonicalPlan('CAN-PLAN-3'), 'technology')
})

test('unknown canonical plan fails closed instead of guessing a curriculum discipline', () => {
  assert.equal(curriculumDisciplineRefForCanonicalPlan('CAN-PLAN-X'), null)
})
