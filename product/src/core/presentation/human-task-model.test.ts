import assert from 'node:assert/strict'
import test from 'node:test'
import { humanTaskBreadcrumb, interactionBudget, resolveExperienceMode, shouldProgressivelyDisclose } from './human-task-model'

test('riduce progressivamente l interfaccia quando il contesto diventa specifico', () => {
  assert.equal(resolveExperienceMode({ specificity: 'NONE' }), 'EXPLORE')
  assert.equal(resolveExperienceMode({ specificity: 'CONTEXTUAL' }), 'GUIDED')
  assert.equal(resolveExperienceMode({ specificity: 'SPECIFIC' }), 'FOCUSED')
  assert.equal(interactionBudget('FOCUSED').primaryActions, 1)
  assert.equal(interactionBudget('FOCUSED').supportingActions, 2)
  assert.equal(interactionBudget('FOCUSED').showOverview, false)
  assert.equal(interactionBudget('FOCUSED').collapseSecondaryContent, true)
})

test('mantiene visibile il contesto umano senza esporre dettagli tecnici', () => {
  const context = {
    intent: 'PREPARE' as const,
    specificity: 'SPECIFIC' as const,
    contextLabel: '1ª A',
    objectLabel: 'Ingresso, laboratorio e metodo',
    stateLabel: 'Da preparare',
  }
  assert.deepEqual(humanTaskBreadcrumb(context), ['1ª A', 'Ingresso, laboratorio e metodo', 'Da preparare'])
  assert.equal(shouldProgressivelyDisclose(context), true)
})
