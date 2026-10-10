import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INTELLIGENT_UI_VERSION,
  type CompositionAction,
  type CompositionBlock,
  type RegisteredActionId,
  type SurfaceComposition,
  type UIContext,
} from './intelligent-ui-contract'
import type { HumanTaskContext } from './human-task-model'

test('riusa il contesto Human Task canonico per HOME e CLASS', () => {
  const task: HumanTaskContext = {
    intent: 'PREPARE',
    specificity: 'SPECIFIC',
    contextLabel: '2ª C',
    objectLabel: 'Agricoltura come sistema tecnologico',
    stateLabel: 'Da preparare',
  }

  const home: UIContext = {
    surface: 'HOME',
    task,
    mode: 'FOCUSED',
    contextSummary: '2ª C · prossima lezione',
    reason: 'È il prossimo lavoro didattico utile.',
    sectionId: 'section-2c',
    blockId: 'B01',
  }
  const classContext: UIContext = { ...home, surface: 'CLASS' }

  assert.equal(home.task, task)
  assert.equal(home.task.intent, 'PREPARE')
  assert.equal(home.mode, 'FOCUSED')
  assert.equal(classContext.surface, 'CLASS')
})

test('SurfaceComposition contiene solo dati serializzabili di presentazione', () => {
  const actionId: RegisteredActionId = 'HOME_OPEN_PLANNER'
  const block: CompositionBlock = {
    id: 'TASK_FOCUS',
    eyebrow: 'ADESSO',
    title: 'Organizza il prossimo passo',
    description: 'Apri le attività della giornata.',
    meta: ['Nessuna urgenza rilevata'],
  }
  const action: CompositionAction = {
    id: actionId,
    label: 'Apri Oggi',
    href: '/planner',
  }
  const composition: SurfaceComposition = {
    version: INTELLIGENT_UI_VERSION,
    surface: 'HOME',
    intent: 'EXPLORE',
    mode: 'EXPLORE',
    contextSummary: 'Spazio docente',
    reason: 'Non c’è un compito operativo prioritario.',
    primaryBlock: block,
    supportBlocks: [],
    primaryAction: action,
    supportActions: [],
    fullViewAction: {
      id: 'HOME_SHOW_ALL',
      label: 'Esplora tutto',
      href: '#home-full-view',
    },
    source: 'DETERMINISTIC',
  }

  const serialized = JSON.stringify(composition)
  const parsed = JSON.parse(serialized) as Record<string, unknown>

  assert.equal(parsed.version, 'iui.v1')
  assert.equal(parsed.source, 'DETERMINISTIC')
  assert.doesNotMatch(serialized, /<script|<style|jsx|dangerouslySetInnerHTML|function\s*\(/i)
  assert.deepEqual(Object.keys(block).sort(), ['description', 'eyebrow', 'id', 'meta', 'title'])
  assert.deepEqual(Object.keys(action).sort(), ['href', 'id', 'label'])
})
