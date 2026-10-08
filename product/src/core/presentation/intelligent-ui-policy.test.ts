import assert from 'node:assert/strict'
import test from 'node:test'
import { INTELLIGENT_UI_VERSION, type SurfaceComposition, type UIContext } from './intelligent-ui-contract'
import { resolveRegisteredAction } from './intelligent-ui-registry'
import { validateSurfaceComposition, validateUIContext } from './intelligent-ui-policy'

const focusedHomeContext: UIContext = {
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

function validFocusedHome(): SurfaceComposition {
  return {
    version: INTELLIGENT_UI_VERSION,
    surface: 'HOME',
    intent: 'PREPARE',
    mode: 'FOCUSED',
    contextSummary: focusedHomeContext.contextSummary,
    reason: focusedHomeContext.reason,
    primaryBlock: {
      id: 'TASK_FOCUS',
      eyebrow: 'PROSSIMA LEZIONE',
      title: '2ª C',
      description: 'Il contesto è pronto.',
      meta: ['10:00–11:00'],
    },
    supportBlocks: [],
    primaryAction: resolveRegisteredAction({
      id: 'HOME_OPEN_CLASS',
      label: 'Apri la classe',
      sectionId: 'section-2c',
      mode: 'prepare',
      blockId: 'B01',
      returnTo: '/',
    }),
    supportActions: [resolveRegisteredAction({ id: 'HOME_OPEN_PLANNER', label: 'Vedi attività' })],
    fullViewAction: resolveRegisteredAction({ id: 'HOME_SHOW_ALL', label: 'Esplora tutto' }),
    source: 'DETERMINISTIC',
  }
}

test('UIContext deve usare la modalita canonica derivata dalla specificita', () => {
  assert.deepEqual(validateUIContext(focusedHomeContext), { ok: true, errors: [] })
  const invalid = validateUIContext({ ...focusedHomeContext, mode: 'GUIDED' })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.errors.includes('MODE_MISMATCH'))
})

test('FOCUSED richiede una primaria e al massimo due azioni di supporto', () => {
  assert.equal(validateSurfaceComposition(validFocusedHome()).ok, true)

  const missingPrimary = validateSurfaceComposition({ ...validFocusedHome(), primaryAction: null })
  assert.equal(missingPrimary.ok, false)
  assert.ok(missingPrimary.errors.includes('FOCUSED_PRIMARY_ACTION_REQUIRED'))

  const tooMany = validateSurfaceComposition({
    ...validFocusedHome(),
    supportActions: [
      resolveRegisteredAction({ id: 'HOME_OPEN_PLANNER', label: 'Attività' }),
      resolveRegisteredAction({ id: 'HOME_OPEN_TIMETABLE', label: 'Orario' }),
      resolveRegisteredAction({ id: 'HOME_OPEN_PLANNER', label: 'Oggi' }),
    ],
  })
  assert.equal(tooMany.ok, false)
  assert.ok(tooMany.errors.includes('SUPPORT_ACTION_BUDGET_EXCEEDED'))
})

test('una composizione ristretta richiede motivo contesto e accesso alla vista completa', () => {
  const missingReason = validateSurfaceComposition({ ...validFocusedHome(), reason: '   ' })
  assert.equal(missingReason.ok, false)
  assert.ok(missingReason.errors.includes('REASON_REQUIRED'))

  const missingContext = validateSurfaceComposition({ ...validFocusedHome(), contextSummary: '' })
  assert.equal(missingContext.ok, false)
  assert.ok(missingContext.errors.includes('CONTEXT_SUMMARY_REQUIRED'))

  const wrongFullView = validateSurfaceComposition({
    ...validFocusedHome(),
    fullViewAction: resolveRegisteredAction({ id: 'CLASS_SHOW_ALL', label: 'Tutto', sectionId: 'section-2c' }),
  })
  assert.equal(wrongFullView.ok, false)
  assert.ok(wrongFullView.errors.includes('FULL_VIEW_SURFACE_MISMATCH'))
})

test('blocchi e azioni della superficie sbagliata falliscono chiuso', () => {
  const wrongBlock = validateSurfaceComposition({
    ...validFocusedHome(),
    primaryBlock: { ...validFocusedHome().primaryBlock, id: 'LESSON_FOCUS' },
  })
  assert.equal(wrongBlock.ok, false)
  assert.ok(wrongBlock.errors.includes('BLOCK_SURFACE_MISMATCH'))

  const wrongAction = validateSurfaceComposition({
    ...validFocusedHome(),
    primaryAction: resolveRegisteredAction({ id: 'CLASS_OPEN_INLINE_RECORDER', label: 'Registra' }),
  })
  assert.equal(wrongAction.ok, false)
  assert.ok(wrongAction.errors.includes('ACTION_SURFACE_MISMATCH'))
})

test('azioni non risolte dal registro vengono rifiutate anche con ID noto', () => {
  const invalid = validateSurfaceComposition({
    ...validFocusedHome(),
    primaryAction: {
      id: 'HOME_OPEN_PLANNER',
      label: 'Apri',
      href: 'https://evil.example',
    },
  })
  assert.equal(invalid.ok, false)
  assert.ok(invalid.errors.includes('UNREGISTERED_ACTION_TARGET'))
})

test('la validazione e deterministica su fixture equivalenti', () => {
  assert.deepEqual(validateSurfaceComposition(validFocusedHome()), validateSurfaceComposition(validFocusedHome()))
})
