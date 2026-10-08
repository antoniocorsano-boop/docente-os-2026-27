import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { UIContext } from './intelligent-ui-contract'
import type { RegisteredActionDescriptor } from './intelligent-ui-registry'
import {
  composeDeterministicSurface,
  type DeterministicSurfaceDraft,
} from './intelligent-ui-composer'

const focusedContext: UIContext = {
  surface: 'HOME',
  task: {
    intent: 'PREPARE',
    specificity: 'SPECIFIC',
    contextLabel: '2ª C',
    objectLabel: 'Agricoltura come sistema tecnologico',
    stateLabel: 'Da preparare',
  },
  mode: 'FOCUSED',
  contextSummary: '2ª C · prossima lezione',
  reason: 'È il prossimo lavoro didattico utile.',
  sectionId: 'section-2c',
  blockId: 'B01',
}

function focusedDraft(): Omit<DeterministicSurfaceDraft, 'context'> {
  return {
    primaryBlock: {
      id: 'TASK_FOCUS',
      eyebrow: 'PROSSIMA LEZIONE',
      title: '2ª C',
      description: 'Il contesto è pronto.',
      meta: ['10:00–11:00'],
    },
    supportBlocks: [],
    primaryAction: {
      id: 'HOME_OPEN_CLASS',
      label: 'Apri la classe',
      sectionId: 'section-2c',
      mode: 'prepare',
      blockId: 'B01',
      returnTo: '/',
    },
    supportActions: [
      { id: 'HOME_OPEN_PLANNER', label: 'Vedi attività' },
      { id: 'HOME_OPEN_TIMETABLE', label: 'Vedi orario' },
    ],
    fullViewAction: { id: 'HOME_SHOW_ALL', label: 'Esplora tutto' },
  }
}

function fallbackDraft(): DeterministicSurfaceDraft {
  return {
    context: {
      surface: 'HOME',
      task: { intent: 'EXPLORE', specificity: 'NONE' },
      mode: 'EXPLORE',
      contextSummary: 'Spazio docente',
      reason: 'Nessun contesto specifico disponibile.',
    },
    primaryBlock: {
      id: 'TASK_FOCUS',
      eyebrow: 'RIPARTI DA QUI',
      title: 'Organizza il prossimo passo',
      description: 'Apri le attività della giornata.',
      meta: [],
    },
    primaryAction: { id: 'HOME_OPEN_PLANNER', label: 'Apri Oggi' },
    supportActions: [],
    fullViewAction: { id: 'HOME_SHOW_ALL', label: 'Esplora tutto' },
  }
}

function compose(overrides: Partial<DeterministicSurfaceDraft> = {}) {
  return composeDeterministicSurface({
    context: focusedContext,
    ...focusedDraft(),
    ...overrides,
    fallback: fallbackDraft,
  })
}

test('input deterministici equivalenti producono la stessa composizione', () => {
  assert.deepEqual(compose(), compose())
})

test('mantiene l ordine dichiarato delle azioni di supporto', () => {
  const composition = compose()
  assert.deepEqual(composition.supportActions.map((action) => action.id), [
    'HOME_OPEN_PLANNER',
    'HOME_OPEN_TIMETABLE',
  ])
})

test('descriptor sconosciuto non trapela e attiva fallback fail-closed', () => {
  const composition = compose({
    primaryAction: { id: 'OPEN_EXTERNAL', label: 'Apri', href: 'https://evil.example' } as unknown as RegisteredActionDescriptor,
  })
  assert.equal(composition.surface, 'HOME')
  assert.equal(composition.primaryAction?.id, 'HOME_OPEN_PLANNER')
  assert.equal(composition.fallbackReason, 'UNKNOWN_ACTION')
  assert.doesNotMatch(JSON.stringify(composition), /evil\.example/)
})

test('budget FOCUSED non valido viene sostituito integralmente dal fallback', () => {
  const composition = compose({
    supportActions: [
      { id: 'HOME_OPEN_PLANNER', label: 'Uno' },
      { id: 'HOME_OPEN_TIMETABLE', label: 'Due' },
      { id: 'HOME_OPEN_PLANNER', label: 'Tre' },
    ],
  })
  assert.equal(composition.mode, 'EXPLORE')
  assert.equal(composition.primaryBlock.title, 'Organizza il prossimo passo')
  assert.equal(composition.fallbackReason, 'INVALID_COMPOSITION')
})

test('contesto incoerente usa fallback senza inventare stato', () => {
  const composition = compose({ context: { ...focusedContext, mode: 'GUIDED' } })
  assert.equal(composition.mode, 'EXPLORE')
  assert.equal(composition.fallbackReason, 'INVALID_CONTEXT')
})

test('fallback di una superficie diversa viene rifiutato', () => {
  assert.throws(() => composeDeterministicSurface({
    context: focusedContext,
    ...focusedDraft(),
    fallback: () => ({
      ...fallbackDraft(),
      context: {
        surface: 'CLASS',
        task: { intent: 'REVIEW', specificity: 'CONTEXTUAL' },
        mode: 'GUIDED',
        contextSummary: '2ª C',
        reason: 'Contesto classe.',
      },
      primaryBlock: { ...fallbackDraft().primaryBlock, id: 'LESSON_FOCUS' },
      fullViewAction: { id: 'CLASS_SHOW_ALL', label: 'Vedi tutto', sectionId: 'section-2c' },
      primaryAction: null,
    }),
  }), /same surface/)
})

test('il compositore core non dipende da infrastruttura repository azioni server o provider', () => {
  const source = readFileSync(new URL('./intelligent-ui-composer.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /core\/infrastructure|Supabase|from ['"].*\/actions['"]|openai|provider/i)
})
